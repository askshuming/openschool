const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_TEXT_CHARS = 6000;

function inferTextFromFilename(name = '') {
  return /\.(txt|md|markdown|csv|json|tsv)$/i.test(name);
}

function isTextLikeType(type = '') {
  return type.startsWith('text/') || /(json|csv|markdown|xml)/i.test(type);
}

function isPdfLike(name = '', type = '') {
  return type === 'application/pdf' || /\.pdf$/i.test(name);
}

function toExcerpt(text) {
  return String(text || '').replace(/\0/g, '').trim().slice(0, MAX_TEXT_CHARS);
}

function buildWarnings({ type, name, bytes, excerpt }) {
  const warnings = [];

  if (bytes > MAX_UPLOAD_BYTES) {
    warnings.push(`文件过大（${bytes} bytes），请控制在 ${MAX_UPLOAD_BYTES} bytes 内`);
  }

  if (!excerpt) {
    if (type === 'application/pdf' || /\.pdf$/i.test(name)) {
      warnings.push('PDF 当前仅做元信息处理，未做 OCR 抽取');
    } else {
      warnings.push('当前文件未抽取到有效文本，可在“教材摘要”手动补充要点');
    }
  }

  return warnings;
}

function buildMetadataOnlyResult({ name, type, size, reason }) {
  const warnings = [];
  if (reason) warnings.push(reason);
  if (isPdfLike(name, type)) {
    warnings.push('PDF 当前仅做元信息处理，未做 OCR 抽取');
  } else {
    warnings.push('当前文件仅记录元信息，可在“教材摘要”手动补充要点');
  }

  return {
    material: {
      name,
      type,
      size,
      excerpt: '',
      detectedMode: 'metadata-only',
      parsedAt: new Date().toISOString(),
    },
    analysis: {
      detectedMode: 'metadata-only',
      extractedChars: 0,
      warnings: warnings.slice(0, 3),
    },
  };
}

export function extractMaterialFromUpload(payload) {
  const name = String(payload?.name || '').trim();
  const type = String(payload?.type || 'application/octet-stream').trim();
  const size = Number(payload?.size) || 0;
  const mode = String(payload?.mode || '').trim();
  const base64 = String(payload?.base64 || '').trim();

  if (!name) {
    throw new Error('缺少文件名');
  }

  if (mode === 'metadata-only') {
    return buildMetadataOnlyResult({
      name,
      type,
      size,
      reason: '已按元信息模式处理（未上传文件正文）',
    });
  }

  if (!base64) {
    if (isPdfLike(name, type)) {
      return buildMetadataOnlyResult({
        name,
        type,
        size,
        reason: 'PDF 未提供正文，自动按元信息模式处理',
      });
    }
    throw new Error('缺少文件内容');
  }

  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length) {
    throw new Error('文件内容为空');
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    if (isPdfLike(name, type)) {
      return buildMetadataOnlyResult({
        name,
        type,
        size: size || bytes.length,
        reason: `PDF 文件较大（${bytes.length} bytes），已自动降级为元信息模式`,
      });
    }
    throw new Error(`文件过大，请控制在 ${MAX_UPLOAD_BYTES} bytes 内`);
  }

  const textMode = isTextLikeType(type) || inferTextFromFilename(name);
  const rawText = textMode ? bytes.toString('utf8') : '';
  const excerpt = toExcerpt(rawText);
  const detectedMode = excerpt ? 'text-extracted' : 'metadata-only';

  return {
    material: {
      name,
      type,
      size: size || bytes.length,
      excerpt,
      detectedMode,
      parsedAt: new Date().toISOString(),
    },
    analysis: {
      detectedMode,
      extractedChars: excerpt.length,
      warnings: buildWarnings({ type, name, bytes: bytes.length, excerpt }),
    },
  };
}
