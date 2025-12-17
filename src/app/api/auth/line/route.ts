export const runtime = 'nodejs';

import admin from 'firebase-admin';
import axios from 'axios';
import { NextResponse } from 'next/server';

// Initialize Firebase Admin SDK if not already initialized
let appInitialized = false;
function initFirebase() {
  if (appInitialized || admin.apps.length > 0) return;
  
  const rawCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!rawCreds) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not set in environment variables');
    throw new Error('Firebase Admin initialization failed: GOOGLE_APPLICATION_CREDENTIALS_JSON not found');
  }

  try {
    // Handle both Base64-encoded and plain JSON
    let serviceAccount: any;
    try {
      // Try to decode as Base64 first
      const decoded = Buffer.from(rawCreds, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decoded);
      console.log('Firebase Admin: Used Base64-decoded credentials');
    } catch (decodeError) {
      // If Base64 decode fails, try parsing as plain JSON
      serviceAccount = JSON.parse(rawCreds);
      console.log('Firebase Admin: Used plain JSON credentials');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    appInitialized = true;
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw new Error(`Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Don't initialize on module load - wait for first request
// This allows the build to complete even if environment variables aren't set

// Helper function (not exported as a route handler)
async function createCustomToken(lineIdToken: string) {
  const res = await axios.get('https://api.line.me/oauth2/v2.1/verify', {
    params: { id_token: lineIdToken, client_id: process.env.LINE_CHANNEL_ID },
  });
  const { sub: lineUserId } = res.data;
  const uid = `line_${lineUserId}`;

  try {
    await admin.auth().getUser(uid);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      await admin.auth().createUser({ uid });
    } else {
      throw error; // Re-throw other errors
    }
  }

  return admin.auth().createCustomToken(uid);
}

// POST handler for the API route
export async function POST(request: Request) {
  try {
    // Ensure Firebase is initialized
    initFirebase();
    
    const { lineIdToken } = await request.json();

    if (!lineIdToken) {
      return NextResponse.json({ error: 'LINE ID token is required' }, { status: 400 });
    }

    const firebaseCustomToken = await createCustomToken(lineIdToken);
    return NextResponse.json({ firebaseCustomToken });
  } catch (error: any) {
    console.error('Error in LINE auth API route:', error);
    const errorMessage = error?.message || 'Internal Server Error';
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}