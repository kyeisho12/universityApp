// server/hf-proxy.ts
//
// Production proxy server for Render deployment.
//
// WHY THIS EXISTS:
//   The Vite dev proxy (/hf-api → HuggingFace) only works during local dev.
//   In production, the built React app is served as static files on Render.
//   The browser still calls /hf-api/... but there's no Vite proxy to forward it.
//   This Express server:
//     1. Serves your built React frontend (dist/)
//     2. Proxies /hf-api/* → https://router.huggingface.co/*
//
// Render start command: node dist-server/hf-proxy.js
// (after building: tsc server/hf-proxy.ts --outDir dist-server)
//
// Or just use ts-node:  npx ts-node server/hf-proxy.ts

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// ── 1. Proxy /hf-api/* → HuggingFace ────────────────────────────────────────
app.use(
  '/hf-api',
  createProxyMiddleware({
    target: 'https://router.huggingface.co',
    changeOrigin: true,
    pathRewrite: { '^/hf-api': '' },
    secure: true,
    on: {
      error: (err, req, res) => {
        console.error('[HF Proxy Error]', err.message);
        (res as express.Response).status(502).json({ error: 'HuggingFace proxy error' });
      },
    },
  })
);

// ── 2. Serve built React frontend ────────────────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`  Serving React app from: ${distPath}`);
  console.log(`  Proxying /hf-api → https://router.huggingface.co`);
});
