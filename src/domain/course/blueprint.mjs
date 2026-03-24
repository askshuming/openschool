import { GRADE_PROFILES } from '../../config/constants.mjs';
import { buildMaterialContext } from '../material/parser.mjs';

function normalizeGrade(rawGrade) {
  const grade = String(rawGrade || '').trim().toLowerCase();
  if (grade.includes('幼儿') || grade.includes('启蒙') || grade.includes('kindergarten')) {
    return 'kindergarten';
  }
  if (
    grade.includes('一年级') ||
    grade.includes('二年级') ||
    grade.includes('grade 1') ||
    grade.includes('grade 2')
  ) {
    return 'primaryLower';
  }
  if (
    grade.includes('三年级') ||
    grade.includes('四年级') ||
    grade.includes('五年级') ||
    grade.includes('六年级') ||
    grade.includes('grade 3') ||
    grade.includes('grade 4') ||
    grade.includes('grade 5') ||
    grade.includes('grade 6')
  ) {
    return 'primaryUpper';
  }
  if (grade.includes('初') || grade.includes('middle') || grade.includes('junior')) {
    return 'middleSchool';
  }
  return 'highSchool';
}

function pickProfile(grade) {
  return GRADE_PROFILES[normalizeGrade(grade)] || GRADE_PROFILES.primaryUpper;
}

function buildTopicSequence(materialContext, payload, lessonCount) {
  return Array.from({ length: lessonCount }, (_, index) => {
    return materialContext.topicCandidates[index] || `${payload.subject || '课程'}重点 ${index + 1}`;
  });
}

function buildObjectives(subject, keywords, lessonIndex) {
  const core = keywords.slice(lessonIndex - 1, lessonIndex + 2);
  const first = core[0] || subject || '核心概念';
  const second = core[1] || '基础方法';
  const third = core[2] || '题型应用';
  return [
    `理解 ${first} 的核心概念和适用场景`,
    `学会用 ${second} 解释或求解典型问题`,
    `能够把 ${third} 迁移到新的练习题中`,
  ];
}

function buildLesson(payload, materialContext, topics, index, totalLessons) {
  const duration = Number(payload.lessonDurationMinutes) || 25;
  const profile = pickProfile(payload.grade);
  const objectives = buildObjectives(payload.subject, materialContext.keywords, index);
  const topic =
    topics[index - 1] ||
    materialContext.keywords[index - 1] ||
    payload.chapter ||
    payload.subject;
  const checkpoint =
    materialContext.focusSignals[index - 1] ||
    materialContext.keywords[index] ||
    '易错点辨析';
  const practice = materialContext.keywords[index + 1] || '变式练习';

  return {
    id: `lesson-${index}`,
    title: `第 ${index} 讲: ${topic}`,
    durationMinutes: duration,
    learningObjective: objectives,
    flow: [
      `导入: 用孩子熟悉的场景解释 ${topic}`,
      `讲解: 拆开 ${topic} 的概念、步骤和例题`,
      `互动: 让孩子口头复述或在纸上演示 ${checkpoint}`,
      `练习: 完成 2-3 道 ${practice} 类型题`,
      '收尾: 家长用一句话复盘本节课的关键方法',
    ],
    practicePack: [
      '基础题 2 道，确认孩子能独立完成标准步骤',
      '变式题 1 道，观察是否真正理解而不是机械记忆',
      '口头问答 3 个，适合家长在饭后或路上快速抽查',
    ],
    parentCoaching: [
      '如果孩子卡住，不直接报答案，先提示“这一步想解决什么问题？”',
      `用 ${profile.tone} 的表达方式，避免一次讲太长`,
      `单次陪学节奏建议: ${profile.pace}`,
    ],
    completionSignal:
      index === totalLessons
        ? '孩子能独立完成综合练习，并主动解释解题理由'
        : '孩子能完成本节例题，并复述至少 2 个关键步骤',
  };
}

function buildDiagnosticQuestions(payload, materialContext) {
  const subject = payload.subject || '当前学科';
  const anchor = materialContext.keywords[0] || payload.chapter || '本章节内容';
  const focus = materialContext.focusSignals[0] || '关键步骤';
  return [
    `孩子能不能用自己的话解释 ${anchor} 是什么？`,
    `遇到 ${subject} 题目时，孩子最容易在哪一步停住？`,
    `孩子做错之后，主要卡在“${focus}”还是概念理解本身？`,
  ];
}

export function buildCourseBlueprint(payload) {
  const lessonCount = Math.max(1, Math.min(8, Number(payload.lessonCount) || 4));
  const profile = pickProfile(payload.grade);
  const titleParts = [payload.subject, payload.chapter].filter(Boolean);
  const title = titleParts.length > 0 ? titleParts.join(' · ') : '定制家庭课程';

  const materialContext = buildMaterialContext(payload);
  const topics = buildTopicSequence(materialContext, payload, lessonCount);

  const lessons = Array.from({ length: lessonCount }, (_, index) =>
    buildLesson(payload, materialContext, topics, index + 1, lessonCount),
  );

  return {
    productName: 'LessonForge Family',
    generatedAt: new Date().toISOString(),
    courseTitle: `${title} 家庭定制课`,
    summary: {
      studentName: payload.childName || '孩子',
      audience: `${payload.grade || '未指定年级'} · 预计年龄 ${profile.age}`,
      style: profile.tone,
      lessons: lessonCount,
      lessonDurationMinutes: Number(payload.lessonDurationMinutes) || 25,
      parentGoal:
        payload.parentGoal || '帮助孩子把教材内容转成可理解、可练习、可复盘的课程',
    },
    materialAnalysis: materialContext.analysis,
    courseStrategy: [
      '先讲概念，再讲例题，再做孩子能独立完成的短练习',
      '每节只盯一个核心知识点，避免一次塞太多内容',
      '每节课都保留家长提示语，降低陪学门槛',
    ],
    diagnostics: buildDiagnosticQuestions(payload, materialContext),
    lessons,
    parentDeliverables: [
      '一份可直接开讲的课程脚本',
      '每节课的互动提问和课后练习',
      '面向家长的辅导提示和完成信号',
    ],
    nextBuildSteps: [
      '接入真实 PDF/OCR 解析器，把目录、页码、例题和插图抽出来',
      '接入 LLM，把启发式蓝图升级成动态课程讲义、练习和讲课话术',
      '增加用户体系、课程历史和支付/交付链路',
    ],
    materialInsights: {
      keywords: materialContext.keywords,
      focusSignals: materialContext.focusSignals,
      topicCandidates: topics,
    },
  };
}
