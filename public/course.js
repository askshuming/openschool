import {
  COURSE_CONTEXT_KEY,
  LAST_PAYLOAD_KEY,
  escapeHtml,
  loadJsonStorage,
  mountThemeToggle,
  saveJsonStorage,
  truncateText,
} from './common.js';

const generationIndicator = document.querySelector('#generation-indicator');
const backToPlanner = document.querySelector('#back-to-planner');

const courseTitleEl = document.querySelector('#course-title');
const courseSubtitleEl = document.querySelector('#course-subtitle');
const courseTagsEl = document.querySelector('#course-tags');

const lessonSearchInput = document.querySelector('#lesson-search');
const durationFilterSelect = document.querySelector('#duration-filter');
const sortFilterSelect = document.querySelector('#sort-filter');
const clearFiltersButton = document.querySelector('#clear-filters');

const dataEmpty = document.querySelector('#data-empty');
const dataLoading = document.querySelector('#data-loading');
const dataError = document.querySelector('#data-error');
const dataErrorMessage = document.querySelector('#data-error-message');
const dataTable = document.querySelector('#data-table');
const tableFilterEmpty = document.querySelector('#table-filter-empty');
const lessonTableBody = document.querySelector('#lesson-table-body');

const sideEmpty = document.querySelector('#side-empty');
const sideLoading = document.querySelector('#side-loading');
const sideContent = document.querySelector('#side-content');
const summaryContent = document.querySelector('#summary-content');
const strategyContent = document.querySelector('#strategy-content');
const detailContent = document.querySelector('#detail-content');
const copyLessonScriptButton = document.querySelector('#copy-lesson-script');

let currentBlueprint = null;
let selectedLessonId = null;
let selectedLessonForCopy = null;
let latestGeneration = null;
let lastPayload = null;

function setGenerationIndicator(generation) {
  if (!generation || generation.mode !== 'llm') {
    generationIndicator.textContent = 'Generation: rules';
    return;
  }
  generationIndicator.textContent = `Generation: ${generation.provider}:${generation.model || 'default'}`;
}

function flashIndicatorMessage(message) {
  if (!message) return;
  generationIndicator.textContent = message;
  window.setTimeout(() => setGenerationIndicator(latestGeneration), 1800);
}

function showDataState(state) {
  dataEmpty.classList.toggle('hidden', state !== 'empty');
  dataLoading.classList.toggle('hidden', state !== 'loading');
  dataError.classList.toggle('hidden', state !== 'error');
  dataTable.classList.toggle('hidden', state !== 'ready');
}

function showSideState(state) {
  sideEmpty.classList.toggle('hidden', state !== 'empty');
  sideLoading.classList.toggle('hidden', state !== 'loading');
  sideContent.classList.toggle('hidden', state !== 'ready');
}

function getDurationBucket(minutes) {
  if (minutes <= 20) return 'short';
  if (minutes <= 30) return 'medium';
  return 'long';
}

function getFilteredLessons() {
  if (!currentBlueprint) return [];

  const search = lessonSearchInput.value.trim().toLowerCase();
  const duration = durationFilterSelect.value;

  const filtered = currentBlueprint.lessons.filter((lesson) => {
    const text = `${lesson.title} ${lesson.completionSignal}`.toLowerCase();
    const matchesSearch = !search || text.includes(search);
    const matchesDuration = duration === 'all' || getDurationBucket(lesson.durationMinutes) === duration;
    return matchesSearch && matchesDuration;
  });

  const sorted = [...filtered];
  const sortMode = sortFilterSelect.value;

  if (sortMode === 'duration-asc') {
    sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
  } else if (sortMode === 'duration-desc') {
    sorted.sort((a, b) => b.durationMinutes - a.durationMinutes);
  } else if (sortMode === 'title-asc') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
  }

  return sorted;
}

function ensureSelectedLesson(lessons) {
  if (!lessons.length) {
    selectedLessonId = null;
    return;
  }
  const exists = lessons.some((lesson) => lesson.id === selectedLessonId);
  if (!exists) {
    selectedLessonId = lessons[0].id;
  }
}

function renderTableRows(lessons) {
  if (!lessons.length) {
    lessonTableBody.innerHTML = '';
    tableFilterEmpty.classList.remove('hidden');
    return;
  }

  tableFilterEmpty.classList.add('hidden');
  lessonTableBody.innerHTML = lessons
    .map((lesson, index) => {
      const isActive = lesson.id === selectedLessonId;
      return `
        <tr data-lesson-id="${escapeHtml(lesson.id)}" class="${isActive ? 'is-active' : ''}" tabindex="0">
          <td>${index + 1}</td>
          <td class="lesson-title">${escapeHtml(lesson.title)}</td>
          <td>${escapeHtml(String(lesson.durationMinutes))} min</td>
          <td>${escapeHtml(String(lesson.learningObjective?.length || 0))}</td>
          <td>${escapeHtml(String(lesson.practicePack?.length || 0))}</td>
          <td>${escapeHtml(truncateText(lesson.completionSignal, 28))}</td>
        </tr>
      `;
    })
    .join('');
}

function renderCourseHeader(blueprint) {
  const summary = blueprint.summary;
  courseTitleEl.textContent = blueprint.courseTitle;
  courseSubtitleEl.textContent = `${summary.studentName} · ${summary.audience} · ${summary.parentGoal}`;
  courseTagsEl.innerHTML = `
    <span>${escapeHtml(`${summary.lessons} 节课`)}</span>
    <span>${escapeHtml(`${summary.lessonDurationMinutes} min/节`)}</span>
    <span>${escapeHtml(summary.style)}</span>
  `;
}

function renderSummary(blueprint) {
  const summary = blueprint.summary;
  const material = blueprint.materialAnalysis;
  const extractedSignals = Array.isArray(material?.extractedSignals) ? material.extractedSignals : [];
  const riskFlags = Array.isArray(material?.riskFlags) ? material.riskFlags : [];
  const materialKeywords = Array.isArray(blueprint?.materialInsights?.keywords)
    ? blueprint.materialInsights.keywords
    : [];

  summaryContent.innerHTML = `
    <div class="meta-grid">
      <div class="meta-item"><span>学生</span><span>${escapeHtml(summary.studentName)}</span></div>
      <div class="meta-item"><span>画像</span><span>${escapeHtml(summary.audience)}</span></div>
      <div class="meta-item"><span>课时</span><span>${escapeHtml(String(summary.lessons))}</span></div>
      <div class="meta-item"><span>节奏</span><span>${escapeHtml(summary.style)}</span></div>
      <div class="meta-item"><span>材料</span><span>${escapeHtml(material.sourceType)}</span></div>
    </div>
    ${
      materialKeywords.length
        ? `
      <strong>提取关键词</strong>
      <ul class="info-list">
        ${materialKeywords.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    `
        : ''
    }
    ${
      extractedSignals.length
        ? `
      <strong>教材信号</strong>
      <ul class="info-list">
        ${extractedSignals.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    `
        : ''
    }
    ${
      riskFlags.length
        ? `
      <strong>风险提示</strong>
      <ul class="info-list">
        ${riskFlags.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    `
        : ''
    }
  `;
}

function renderStrategy(blueprint) {
  strategyContent.innerHTML = `
    <strong>课程策略</strong>
    <ul class="info-list">
      ${blueprint.courseStrategy.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
    <strong>诊断问题</strong>
    <ul class="info-list">
      ${blueprint.diagnostics.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
}

function renderLessonDetail(lesson) {
  if (!lesson) {
    detailContent.innerHTML = '<p class="side-state">请在左侧表格选择课节。</p>';
    selectedLessonForCopy = null;
    copyLessonScriptButton.disabled = true;
    return;
  }

  selectedLessonForCopy = lesson;
  copyLessonScriptButton.disabled = false;

  detailContent.innerHTML = `
    <div class="meta-grid">
      <div class="meta-item"><span>标题</span><span>${escapeHtml(lesson.title)}</span></div>
      <div class="meta-item"><span>时长</span><span>${escapeHtml(String(lesson.durationMinutes))} min</span></div>
    </div>
    <strong>学习目标</strong>
    <ul class="info-list">
      ${lesson.learningObjective.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
    <strong>上课流程</strong>
    <ul class="info-list">
      ${lesson.flow.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
    <strong>练习包</strong>
    <ul class="info-list">
      ${lesson.practicePack.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
    <strong>完成信号</strong>
    <p>${escapeHtml(lesson.completionSignal)}</p>
  `;
}

function renderWorkspace() {
  if (!currentBlueprint) {
    showDataState('empty');
    showSideState('empty');
    lessonTableBody.innerHTML = '';
    return;
  }

  const lessons = getFilteredLessons();
  ensureSelectedLesson(lessons);
  renderTableRows(lessons);
  renderCourseHeader(currentBlueprint);
  renderSummary(currentBlueprint);
  renderStrategy(currentBlueprint);

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId);
  renderLessonDetail(selectedLesson);

  showDataState('ready');
  showSideState('ready');
}

function buildLessonScript(blueprint, lesson) {
  return [
    `课程: ${blueprint.courseTitle}`,
    `课节: ${lesson.title}`,
    `时长: ${lesson.durationMinutes} 分钟`,
    '',
    '学习目标:',
    ...lesson.learningObjective.map((item, idx) => `${idx + 1}. ${item}`),
    '',
    '上课流程:',
    ...lesson.flow.map((item, idx) => `${idx + 1}. ${item}`),
    '',
    '练习包:',
    ...lesson.practicePack.map((item, idx) => `${idx + 1}. ${item}`),
    '',
    '家长提示:',
    ...lesson.parentCoaching.map((item, idx) => `${idx + 1}. ${item}`),
    '',
    `完成信号: ${lesson.completionSignal}`,
  ].join('\n');
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!copied) {
    throw new Error('复制失败，请手动复制');
  }
}

function initializeFromContext() {
  const context = loadJsonStorage(sessionStorage, COURSE_CONTEXT_KEY);
  if (!context || !context.blueprint) {
    setGenerationIndicator(null);
    showDataState('empty');
    showSideState('empty');
    return;
  }

  currentBlueprint = context.blueprint;
  latestGeneration = context.generation || null;
  lastPayload = context.payload || null;
  selectedLessonId = currentBlueprint.lessons?.[0]?.id || null;
  setGenerationIndicator(latestGeneration);

  showDataState('loading');
  showSideState('loading');
  window.setTimeout(() => renderWorkspace(), 120);
}

lessonTableBody.addEventListener('click', (event) => {
  const row = event.target.closest('tr[data-lesson-id]');
  if (!row) return;
  selectedLessonId = row.dataset.lessonId;
  renderWorkspace();
});

lessonTableBody.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const row = event.target.closest('tr[data-lesson-id]');
  if (!row) return;
  event.preventDefault();
  selectedLessonId = row.dataset.lessonId;
  renderWorkspace();
});

lessonSearchInput.addEventListener('input', () => {
  if (!currentBlueprint) return;
  renderWorkspace();
});

durationFilterSelect.addEventListener('change', () => {
  if (!currentBlueprint) return;
  renderWorkspace();
});

sortFilterSelect.addEventListener('change', () => {
  if (!currentBlueprint) return;
  renderWorkspace();
});

clearFiltersButton.addEventListener('click', () => {
  lessonSearchInput.value = '';
  durationFilterSelect.value = 'all';
  sortFilterSelect.value = 'order-asc';
  if (currentBlueprint) renderWorkspace();
});

copyLessonScriptButton.addEventListener('click', async () => {
  if (!currentBlueprint || !selectedLessonForCopy) return;

  try {
    const script = buildLessonScript(currentBlueprint, selectedLessonForCopy);
    await copyTextToClipboard(script);
    flashIndicatorMessage(`Copied: ${selectedLessonForCopy.title}`);
  } catch (error) {
    flashIndicatorMessage(error instanceof Error ? error.message : '复制失败');
  }
});

backToPlanner.addEventListener('click', () => {
  if (lastPayload) {
    saveJsonStorage(localStorage, LAST_PAYLOAD_KEY, { ...lastPayload, material: null });
  }
});

mountThemeToggle();
initializeFromContext();
