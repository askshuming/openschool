const STOP_WORDS = new Set([
  '孩子',
  '课程',
  '教材',
  '内容',
  '掌握',
  '重点',
  '难点',
  '生成',
  '对应',
  '学习',
  '训练',
  '家长',
  '目标',
  'the',
  'and',
  'for',
  'with',
  'that',
]);

function normalizeText(value) {
  return String(value || '').trim();
}

export function tokenize(text) {
  const source = normalizeText(text).replace(/[，。、“”‘’：；！？,.!?()[\]{}<>/\\|_\-]+/g, ' ');
  if (!source) return [];

  const chunks = source.split(/\s+/).filter(Boolean);
  const tokens = [];

  for (const chunk of chunks) {
    if (/[\u4e00-\u9fff]/.test(chunk)) {
      const groups = chunk.match(/[\u4e00-\u9fff]{2,12}|[A-Za-z0-9]{2,}/g);
      if (groups) tokens.push(...groups);
    } else {
      tokens.push(chunk);
    }
  }

  return tokens
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !STOP_WORDS.has(item.toLowerCase()));
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function rankByWeight(weightMap, orderMap, limit) {
  return [...weightMap.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (orderMap.get(a[0]) || 0) - (orderMap.get(b[0]) || 0);
    })
    .slice(0, limit)
    .map(([token]) => token);
}

function createSourceType(material) {
  return material.name
    ? `${material.name} (${material.type || 'unknown'})`
    : '未上传教材文件，仅使用表单信息';
}

function buildRiskFlags(payload, material, keywords, contextLength) {
  const flags = [];

  if (material.name && material.type === 'application/pdf') {
    flags.push('当前 clean-room MVP 只记录 PDF 元信息，未做真正 OCR/版面解析');
  } else {
    flags.push('当前内容主要依赖家长输入和文件摘要');
  }

  if (payload.focusAreas) {
    flags.push(`孩子当前薄弱点已纳入课程设计: ${payload.focusAreas}`);
  } else {
    flags.push('尚未填写明确薄弱点，系统按通用难点组织课程');
  }

  if (contextLength < 60) {
    flags.push('教材上下文较短，建议补充目录/例题/知识点摘要以提升个性化质量');
  }

  if (keywords.length < 3) {
    flags.push('可提取关键词较少，课程主题可能偏泛化');
  }

  return flags.slice(0, 4);
}

function buildExtractedSignals(payload, keywords, contextLength) {
  return [
    `学科: ${payload.subject || '未填写'}`,
    `年级: ${payload.grade || '未填写'}`,
    `教材版本: ${payload.textbookVersion || '未填写'}`,
    `章节焦点: ${payload.chapter || '未填写'}`,
    `上下文长度: ${contextLength} 字符`,
    `识别到的关键词: ${keywords.join(' / ') || '暂无'}`,
  ];
}

export function buildMaterialContext(payload) {
  const material = payload?.material || {};
  const weightMap = new Map();
  const orderMap = new Map();
  let sequence = 0;

  const weightedSources = [
    { text: payload.chapter, weight: 4 },
    { text: payload.materialNotes, weight: 4 },
    { text: material.excerpt, weight: 3 },
    { text: payload.focusAreas, weight: 3 },
    { text: payload.parentGoal, weight: 2 },
    { text: payload.subject, weight: 2 },
    { text: payload.textbookVersion, weight: 1 },
    { text: material.name, weight: 1 },
  ];

  for (const source of weightedSources) {
    const tokens = tokenize(source.text);
    for (const token of tokens) {
      weightMap.set(token, (weightMap.get(token) || 0) + source.weight);
      if (!orderMap.has(token)) {
        orderMap.set(token, sequence);
        sequence += 1;
      }
    }
  }

  const keywords = rankByWeight(weightMap, orderMap, 8);

  const focusWeightMap = new Map();
  const focusOrderMap = new Map();
  let focusSeq = 0;
  for (const text of [payload.focusAreas, payload.parentGoal]) {
    for (const token of tokenize(text)) {
      focusWeightMap.set(token, (focusWeightMap.get(token) || 0) + 1);
      if (!focusOrderMap.has(token)) {
        focusOrderMap.set(token, focusSeq);
        focusSeq += 1;
      }
    }
  }
  const focusSignals = rankByWeight(focusWeightMap, focusOrderMap, 4);

  const topicCandidates = unique([
    ...tokenize(payload.chapter),
    ...tokenize(payload.materialNotes),
    ...focusSignals,
    ...keywords,
    payload.subject,
  ]);

  const contextLength = normalizeText(
    [payload.chapter, payload.materialNotes, material.excerpt].filter(Boolean).join(' '),
  ).length;

  return {
    keywords,
    focusSignals: focusSignals.length > 0 ? focusSignals : keywords.slice(0, 3),
    topicCandidates,
    analysis: {
      sourceType: createSourceType(material),
      extractedSignals: buildExtractedSignals(payload, keywords, contextLength),
      riskFlags: buildRiskFlags(payload, material, keywords, contextLength),
    },
  };
}
