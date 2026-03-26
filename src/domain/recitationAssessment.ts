export interface RecitationAssessment {
  transcript: string;
  matchRatio: number;
  isCorrect: boolean;
  message: string;
  evidence: string;
}

function normalizeRecitationText(text: string) {
  return text.replace(/[，。！？；：、“”‘’《》〈〉（）()、,.!?;:\s]/g, "");
}

function lcsLength(source: string, target: string) {
  const rows = source.length + 1;
  const cols = target.length + 1;
  const dp = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (source[i - 1] === target[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[source.length][target.length];
}

export function buildRecitationAssessment(expectedText: string, transcript: string): RecitationAssessment {
  const normalizedExpected = normalizeRecitationText(expectedText);
  const normalizedTranscript = normalizeRecitationText(transcript);
  const matched = normalizedExpected && normalizedTranscript
    ? lcsLength(normalizedExpected, normalizedTranscript) / normalizedExpected.length
    : 0;

  if (matched >= 0.82) {
    return {
      transcript,
      matchRatio: matched,
      isCorrect: true,
      message: "这段读得很稳，重点内容已经跟上了。",
      evidence: `识别到：${transcript}`,
    };
  }

  if (matched >= 0.58) {
    return {
      transcript,
      matchRatio: matched,
      isCorrect: false,
      message: "已经读对大部分内容了，再把停顿和个别词语读完整会更好。",
      evidence: `识别到：${transcript}`,
    };
  }

  return {
    transcript,
    matchRatio: matched,
    isCorrect: false,
    message: "已经勇敢开口了。先听一遍示范，再跟着读一遍会更稳。",
    evidence: `识别到：${transcript}`,
  };
}

export function toSpeechErrorMessage(errorMessage?: string) {
  if (!errorMessage) {
    return "语音识别暂时不可用，请再试一次。";
  }
  if (errorMessage.includes("not-allowed")) {
    return "没有拿到麦克风或语音识别权限，请先在系统设置里开启。";
  }
  return errorMessage;
}
