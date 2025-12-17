// public/cnm-sw.js
// 無害化・自己解除用の Service Worker。既存の壊れた SW を置き換えます。

// 新 SW を即時適用
self.skipWaiting();
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // 既存クライアントを制御し、リロードして SW の影響を外す
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      try {
        await client.navigate(client.url);
      } catch (_) {
        // navigate が拒否された場合は無視
      }
    }
    // 自身を登録解除（以降 SW なしで動作）
    try {
      await self.registration.unregister();
    } catch (_) {}
  })());
});

// すべてのフェッチをネットワークへ素通し。失敗時はエラー応答で整合を保つ
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // Response.error() はボディ無しのエラー応答なので整合が取れて安全
      return Response.error();
    })
  );
});