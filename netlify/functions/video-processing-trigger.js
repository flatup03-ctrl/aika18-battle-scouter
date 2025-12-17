// frontend/netlify/functions/video-processing-trigger.js

// Netlify Functions (AWS Lambda) で動く Webhook 受け口。
// 目的: 動画のアップロード完了通知（object name, contentType など）を受け取り、
// Firestore に処理ステータス（pending/processing）を記録する。
// 後続の解析ワーカーがこのドキュメントを参照して処理を進める設計。

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 認証方式:
// GOOGLE_APPLICATION_CREDENTIALS_JSON にサービスアカウントJSONを入れて初期化
let appInitialized = false;
function initFirebase() {
  if (appInitialized) return;
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (credsJson) {
    const serviceAccount = JSON.parse(credsJson);
    initializeApp({ credential: cert(serviceAccount) });
    appInitialized = true;
  } else {
    // 認証情報がない場合はエラー。ADCは使わない方針に統一。
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not set.');
  }
}

function badRequest(message) {
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: false, error: message }),
  };
}

export default async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return badRequest('Invalid JSON body');
  }

  const { bucket, name, contentType, size } = payload || {};
  if (!bucket || !name) {
    return badRequest('Missing required fields: bucket, name');
  }
  if (!contentType || !String(contentType).startsWith('video/')) {
    return badRequest('Not a video contentType');
  }
  if (!name.startsWith('users/')) {
    return badRequest('Unsupported object path');
  }

  const parts = name.split('/');
  const uid = parts.length >= 2 ? parts[1] : null;
  if (!uid) {
    return badRequest('Could not extract uid from object name');
  }

  try {
    initFirebase();
    const db = getFirestore();
    const docId = Buffer.from(name).toString('base64url');
    const now = new Date().toISOString();

    await db.collection('videos').doc(docId).set({
      uid,
      bucket,
      inputPath: name,
      contentType,
      size: size ? Number(size) : null,
      status: 'processing',
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, message: 'Video processing queued', docId }),
    };
  } catch (error) {
    console.error('Failed to record processing status', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(error?.message || error) }),
    };
  }
};
