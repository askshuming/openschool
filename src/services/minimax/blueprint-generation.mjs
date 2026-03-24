import {
  DEFAULT_MINIMAX_MODEL,
  MINIMAX_ENDPOINT_CANDIDATES,
} from '../../config/constants.mjs';

function stripCodeFences(text) {
  const source = String(text || '').trim();
  if (!source.startsWith('```')) return source;
  return source.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
}

function parseJsonSafely(text) {
  try {
    return JSON.parse(stripCodeFences(text));
  } catch {
    return null;
  }
}

function sanitizeString(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function sanitizeArray(values, fallback, max = 6) {
  if (!Array.isArray(values)) return fallback;
  const clean = values
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
  return clean.length > 0 ? clean : fallback;
}

function mergeBlueprint(base, candidate) {
  if (!candidate || typeof candidate !== 'object') return base;

  const merged = structuredClone(base);

  merged.courseTitle = sanitizeString(candidate.courseTitle, merged.courseTitle);
  merged.courseStrategy = sanitizeArray(candidate.courseStrategy, merged.courseStrategy, 4);
  merged.diagnostics = sanitizeArray(candidate.diagnostics, merged.diagnostics, 4);
  merged.parentDeliverables = sanitizeArray(
    candidate.parentDeliverables,
    merged.parentDeliverables,
    4,
  );
  merged.nextBuildSteps = sanitizeArray(candidate.nextBuildSteps, merged.nextBuildSteps, 4);

  if (candidate.summary && typeof candidate.summary === 'object') {
    merged.summary.parentGoal = sanitizeString(
      candidate.summary.parentGoal,
      merged.summary.parentGoal,
    );
  }

  if (Array.isArray(candidate.lessons) && candidate.lessons.length === merged.lessons.length) {
    merged.lessons = merged.lessons.map((lesson, index) => {
      const incoming = candidate.lessons[index];
      if (!incoming || typeof incoming !== 'object') return lesson;
      return {
        ...lesson,
        title: sanitizeString(incoming.title, lesson.title),
        learningObjective: sanitizeArray(incoming.learningObjective, lesson.learningObjective, 4),
        flow: sanitizeArray(incoming.flow, lesson.flow, 6),
        practicePack: sanitizeArray(incoming.practicePack, lesson.practicePack, 4),
        parentCoaching: sanitizeArray(incoming.parentCoaching, lesson.parentCoaching, 4),
        completionSignal: sanitizeString(incoming.completionSignal, lesson.completionSignal),
      };
    });
  }

  return merged;
}

export async function generateBlueprintWithMiniMax(payload, baseBlueprint) {
  const apiKey = (process.env.MINIMAX_API_KEY || process.env.MINIMAX_KEY || '').trim();
  if (!apiKey) {
    return {
      blueprint: baseBlueprint,
      generation: {
        mode: 'heuristic',
        provider: 'rules',
        reason: 'MINIMAX_API_KEY not configured',
      },
    };
  }

  const explicitEndpoint =
    process.env.MINIMAX_API_URL?.trim() || process.env.MINIMAX_PAI_URL?.trim();
  const endpointCandidates = explicitEndpoint ? [explicitEndpoint] : MINIMAX_ENDPOINT_CANDIDATES;
  const model = process.env.MINIMAX_MODEL?.trim() || DEFAULT_MINIMAX_MODEL;
  const groupId = process.env.MINIMAX_GROUP_ID?.trim();

  const systemPrompt =
    'You are a K12 instructional designer for parents. Return only valid JSON, no markdown.';
  const userPrompt = `请基于以下输入优化课程蓝图。要求：
- 保持 lessons 数量不变，lesson 的 id 不变
- 输出语言保持中文
- 文案简洁、可执行、面向家长
- 仅返回 JSON 对象

用户输入:
${JSON.stringify(payload, null, 2)}

当前蓝图（可作为基础）:
${JSON.stringify(baseBlueprint, null, 2)}

输出 JSON 结构（字段名必须一致）:
{
  "courseTitle": "string",
  "summary": { "parentGoal": "string" },
  "courseStrategy": ["string", "string", "string"],
  "diagnostics": ["string", "string", "string"],
  "parentDeliverables": ["string", "string", "string"],
  "nextBuildSteps": ["string", "string", "string"],
  "lessons": [
    {
      "title": "string",
      "learningObjective": ["string", "string", "string"],
      "flow": ["string", "string", "string", "string", "string"],
      "practicePack": ["string", "string", "string"],
      "parentCoaching": ["string", "string", "string"],
      "completionSignal": "string"
    }
  ]
}`;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    ...(groupId ? { 'MM-Group-Id': groupId } : {}),
  };

  let lastError = null;

  for (const endpoint of endpointCandidates) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          temperature: 0.3,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      const raw = await response.text();
      if (!response.ok) {
        throw new Error(`status ${response.status}: ${raw.slice(0, 180)}`);
      }

      const data = parseJsonSafely(raw);
      if (!data || typeof data !== 'object') {
        throw new Error('non-JSON response');
      }

      const content =
        data.choices?.[0]?.message?.content ??
        data.reply ??
        data.output_text ??
        data.text ??
        null;

      if (!content) {
        throw new Error('missing content');
      }

      const parsedCandidate =
        typeof content === 'string'
          ? parseJsonSafely(content)
          : Array.isArray(content)
            ? parseJsonSafely(content.map((item) => item?.text || '').join('\n'))
            : content;

      if (!parsedCandidate || typeof parsedCandidate !== 'object') {
        throw new Error('content is not valid JSON object');
      }

      return {
        blueprint: mergeBlueprint(baseBlueprint, parsedCandidate),
        generation: {
          mode: 'llm',
          provider: 'minimax',
          model,
          endpoint,
        },
      };
    } catch (error) {
      lastError = `endpoint ${endpoint} failed: ${error instanceof Error ? error.message : 'unknown error'}`;
    }
  }

  return {
    blueprint: baseBlueprint,
    generation: {
      mode: 'heuristic',
      provider: 'rules',
      reason: lastError || 'MiniMax call failed',
    },
  };
}
