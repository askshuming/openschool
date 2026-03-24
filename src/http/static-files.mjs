import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { MIME_TYPES } from '../config/constants.mjs';
import { sendText } from './response.mjs';

async function serveFile(res, filePath) {
  try {
    const ext = path.extname(filePath);
    const content = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(content);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

export async function serveIndex(res, publicDir) {
  await serveFile(res, path.join(publicDir, 'index.html'));
}

export async function servePublicAsset(res, publicDir, requestPathname) {
  const target = path.normalize(requestPathname).replace(/^(\.\.[/\\])+/, '');
  await serveFile(res, path.join(publicDir, target));
}
