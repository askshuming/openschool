import {
  COURSE_CONTEXT_KEY,
  LAST_PAYLOAD_KEY,
  loadJsonStorage,
  mountThemeToggle,
  saveJsonStorage,
} from './common.js';

const form = document.querySelector('#planner-form');
const generateButton = document.querySelector('#generate-button');
const themeIndicator = document.querySelector('#generation-indicator');

const fileInput = document.querySelector('#material-file');
const fileTrigger = document.querySelector('#file-trigger');
const fileState = document.querySelector('#file-state');

const statusEl = document.querySelector('#status');

let selectedFile = null;
let uploadedMaterial = null;
let isSubmitting = false;

function setFeedback(message, tone = 'neutral') {
  statusEl.textContent = message;
  statusEl.className = `feedback feedback-${tone}`;
}

function setGenerationIndicator(generation) {
  if (!generation || generation.mode !== 'llm') {
    themeIndicator.textContent = 'Generation: rules';
    return;
  }
  themeIndicator.textContent = `Generation: ${generation.provider}:${generation.model || 'default'}`;
}

function setSubmitting(nextValue) {
  isSubmitting = nextValue;
  generateButton.disabled = nextValue;
  fileTrigger.disabled = nextValue;
  generateButton.textContent = nextValue ? '生成中...' : '生成课程并进入课程页';
}

function updateFileStateText(message) {
  fileState.textContent = message;
}

function clearValidationErrors() {
  const fields = form.querySelectorAll('input, textarea');
  for (const field of fields) {
    field.setAttribute('aria-invalid', 'false');
  }
}

function setFieldInvalid(name) {
  const field = form.querySelector(`[name="${name}"]`);
  if (!field) return;
  field.setAttribute('aria-invalid', 'true');
}

function validatePayload(payload) {
  clearValidationErrors();

  if (!String(payload.grade || '').trim()) {
    setFieldInvalid('grade');
    return '请填写年级。';
  }
  if (!String(payload.subject || '').trim()) {
    setFieldInvalid('subject');
    return '请填写学科。';
  }
  if (!String(payload.chapter || '').trim()) {
    setFieldInvalid('chapter');
    return '请填写章节。';
  }
  if (payload.lessonCount < 1 || payload.lessonCount > 8) {
    setFieldInvalid('lessonCount');
    return '课时必须在 1 到 8 之间。';
  }
  if (payload.lessonDurationMinutes < 10 || payload.lessonDurationMinutes > 60) {
    setFieldInvalid('lessonDurationMinutes');
    return '单节时长需在 10 到 60 分钟之间。';
  }
  return null;
}

function buildPayload(materialOverride = null) {
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  payload.lessonCount = Number(payload.lessonCount || 4);
  payload.lessonDurationMinutes = Number(payload.lessonDurationMinutes || 25);
  payload.materialNotes = String(payload.materialNotes || '').trim();
  payload.material = materialOverride || null;
  return payload;
}

function isPdfFile(file) {
  if (!file) return false;
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const marker = result.indexOf(',');
      resolve(marker >= 0 ? result.slice(marker + 1) : result);
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

async function uploadMaterialFile(file) {
  if (isPdfFile(file)) {
    const response = await fetch('/api/upload-material', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: file.name,
        type: file.type || 'application/pdf',
        size: file.size,
        mode: 'metadata-only',
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '教材文件上传失败');
    }
    return data;
  }

  const base64 = await fileToBase64(file);
  const response = await fetch('/api/upload-material', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      base64,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || '教材文件上传失败');
  }
  return data;
}

async function requestBlueprint(payload) {
  const response = await fetch('/api/generate-course', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || '生成失败');
  }
  return data;
}

function prefillFormFromLastPayload() {
  const lastPayload = loadJsonStorage(localStorage, LAST_PAYLOAD_KEY);
  if (!lastPayload || typeof lastPayload !== 'object') return;

  for (const [key, value] of Object.entries(lastPayload)) {
    if (key === 'material') continue;
    const field = form.querySelector(`[name="${key}"]`);
    if (!field) continue;
    if (value == null) continue;
    field.value = String(value);
  }
}

async function submitPayload(payload) {
  if (isSubmitting) return;

  const error = validatePayload(payload);
  if (error) {
    setFeedback(error, 'error');
    return;
  }

  setSubmitting(true);
  setFeedback('正在生成课程，请稍候...', 'neutral');

  try {
    if (selectedFile && !payload.material) {
      setFeedback('正在上传并解析教材文件...', 'neutral');
      const uploadResult = await uploadMaterialFile(selectedFile);
      uploadedMaterial = uploadResult.material;
      payload.material = uploadedMaterial;

      const warnings = uploadResult.analysis?.warnings || [];
      if (warnings.length) {
        updateFileStateText(`已选择 ${selectedFile.name}（${warnings[0]}）`);
      } else if (uploadResult.analysis?.detectedMode === 'text-extracted') {
        updateFileStateText(`已选择 ${selectedFile.name}（服务端已提取文本）`);
      } else {
        updateFileStateText(`已选择 ${selectedFile.name}（元信息模式）`);
      }
    }

    const { blueprint, generation } = await requestBlueprint(payload);
    const context = {
      payload,
      blueprint,
      generation,
      generatedAt: new Date().toISOString(),
    };

    saveJsonStorage(sessionStorage, COURSE_CONTEXT_KEY, context);
    saveJsonStorage(localStorage, LAST_PAYLOAD_KEY, { ...payload, material: null });
    setGenerationIndicator(generation);
    setFeedback('生成成功，正在跳转到课程页...', 'success');
    window.setTimeout(() => {
      window.location.href = '/course.html';
    }, 180);
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成失败，请稍后再试。';
    setFeedback(message, 'error');
  } finally {
    setSubmitting(false);
  }
}

fileTrigger.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (event) => {
  selectedFile = event.target.files?.[0] || null;
  uploadedMaterial = null;

  if (!selectedFile) {
    updateFileStateText('未选择文件');
    return;
  }

  if (isPdfFile(selectedFile)) {
    updateFileStateText(`已选择 ${selectedFile.name}（PDF 将按元信息模式处理）`);
    return;
  }

  updateFileStateText(`已选择 ${selectedFile.name}（提交时上传解析）`);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await submitPayload(buildPayload(uploadedMaterial));
});

mountThemeToggle();
prefillFormFromLastPayload();
setGenerationIndicator(loadJsonStorage(sessionStorage, COURSE_CONTEXT_KEY)?.generation || null);
setFeedback('先填写必填项，再点击生成课程。', 'neutral');
