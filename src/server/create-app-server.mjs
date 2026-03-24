import { createServer } from 'node:http';
import { parseJsonBody } from '../http/body-parser.mjs';
import { sendJson, sendText } from '../http/response.mjs';
import { serveIndex, servePublicAsset } from '../http/static-files.mjs';
import { buildCourseBlueprint } from '../domain/course/blueprint.mjs';
import { buildMaterialContext } from '../domain/material/parser.mjs';
import { extractMaterialFromUpload } from '../domain/material/upload-extractor.mjs';
import { generateBlueprintWithMiniMax } from '../services/minimax/blueprint-generation.mjs';

export function createAppServer({ publicDir }) {
  return createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true, app: 'LessonForge Family MVP' });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/generate-course') {
      try {
        const payload = await parseJsonBody(req);
        const baseBlueprint = buildCourseBlueprint(payload);
        const { blueprint, generation } = await generateBlueprintWithMiniMax(
          payload,
          baseBlueprint,
        );
        sendJson(res, 200, { ok: true, blueprint, generation });
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error: error instanceof Error ? error.message : 'Invalid request body',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/parse-material') {
      try {
        const payload = await parseJsonBody(req);
        const materialContext = buildMaterialContext(payload);
        sendJson(res, 200, {
          ok: true,
          keywords: materialContext.keywords,
          focusSignals: materialContext.focusSignals,
          topicCandidates: materialContext.topicCandidates.slice(0, 8),
          materialAnalysis: materialContext.analysis,
        });
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error: error instanceof Error ? error.message : 'Invalid request body',
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/upload-material') {
      try {
        const payload = await parseJsonBody(req);
        const result = extractMaterialFromUpload(payload);
        sendJson(res, 200, { ok: true, ...result });
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error: error instanceof Error ? error.message : 'Invalid upload payload',
        });
      }
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      await serveIndex(res, publicDir);
      return;
    }

    if (req.method === 'GET') {
      await servePublicAsset(res, publicDir, url.pathname);
      return;
    }

    sendText(res, 405, 'Method not allowed');
  });
}
