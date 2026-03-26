import { JourneyInputSnapshot, JourneyReviewSnapshot, JourneySessionSnapshot } from "../state/learningJourneyStore";
import { ContentInputRecord, getInputSourceLabel } from "../state/contentInputStore";

type JourneyInputLike = JourneyInputSnapshot | ContentInputRecord;
export type JourneyTone = "primary" | "accent";
export type JourneyActionKind =
  | "resume_session"
  | "open_review_focus"
  | "open_review"
  | "start_content"
  | "capture"
  | "open_parent"
  | "go_home"
  | "toggle_advanced";

type JourneyPhase = "idle" | "ready" | "learning" | "review_due" | "closed_loop";

interface ResolveJourneyArgs {
  resumableInput: JourneyInputLike | null;
  currentSession: JourneySessionSnapshot | null;
  lastCompletedSession: JourneySessionSnapshot | null;
  lastCompletedReview: JourneyReviewSnapshot | null;
  hasInProgress: boolean;
  pendingReviewCount: number;
  sessionStep: number;
  sessionTotalSteps: number;
  defaultLessonTitle?: string | null;
}

interface JourneyActionDescriptor {
  kind: JourneyActionKind;
  label: string;
}

interface HomeSecondaryActionDescriptor {
  kind: JourneyActionKind;
  title: string;
  subtitle: string;
  icon: "play-circle-outline" | "refresh-circle-outline" | "person-circle-outline";
}

interface HomeJourneyPresentation {
  statusLabel: string;
  statusTone: JourneyTone;
  headline: string;
  body: string;
  inputDone: boolean;
  inputMeta: string;
  inputStatusLabel: string;
  learningDone: boolean;
  learningDisplay: string;
  learningStatusLabel: string;
  reviewDone: boolean;
  reviewMeta: string;
  reviewStatusLabel: string;
  primaryAction: JourneyActionDescriptor;
  secondaryAction: HomeSecondaryActionDescriptor;
}

interface ParentJourneyPresentation {
  currentJourneyStatus: string;
  statusTone: JourneyTone;
  mascotState: "teacher" | "encourage" | "wow" | "happy";
  heroSpeech: string;
  heroTitle: string;
  heroBody: string;
  primaryAction: JourneyActionDescriptor;
  secondaryActionKind: JourneyActionKind;
  journeyCardTitle: string;
  inputDone: boolean;
  inputTitle: string;
  inputMeta: string;
  learningDone: boolean;
  learningTitle: string;
  learningMeta: string;
  reviewDone: boolean;
  reviewTitle: string;
  reviewMeta: string;
}

function resolveJourneyState({
  resumableInput,
  currentSession,
  lastCompletedSession,
  lastCompletedReview,
  hasInProgress,
  pendingReviewCount,
  sessionStep,
  sessionTotalSteps,
  defaultLessonTitle,
}: ResolveJourneyArgs) {
  const learningDone = Boolean(currentSession?.completedAt || lastCompletedSession?.completedAt);
  const lessonTitle =
    currentSession?.lessonTitle ?? lastCompletedSession?.lessonTitle ?? defaultLessonTitle ?? "当前内容";
  const remainingSteps = Math.max(1, sessionTotalSteps - sessionStep);
  const inputDone = Boolean(resumableInput);
  const reviewDone = Boolean(pendingReviewCount > 0 || lastCompletedReview);

  const phase: JourneyPhase = hasInProgress
    ? "learning"
    : learningDone && pendingReviewCount > 0
      ? "review_due"
      : learningDone
        ? "closed_loop"
        : inputDone
          ? "ready"
          : "idle";

  return {
    phase,
    lessonTitle,
    learningDone,
    inputDone,
    reviewDone,
    remainingSteps,
    inputSourceLabel: resumableInput ? getInputSourceLabel(resumableInput.source) : null,
    inputTitle: resumableInput?.title ?? "拍照或上传后自动记录",
    generatedTaskCount: resumableInput?.generatedTaskCount ?? 0,
    routeLabel: resumableInput?.routeLabel ?? "当前学习路线",
    lastCompletedReview,
  };
}

export function buildHomeJourneyPresentation(
  args: ResolveJourneyArgs & {
    childDisplayName?: string;
  },
): HomeJourneyPresentation {
  const state = resolveJourneyState(args);
  const {
    phase,
    lessonTitle,
    learningDone,
    inputDone,
    reviewDone,
    remainingSteps,
    inputSourceLabel,
    inputTitle,
    generatedTaskCount,
    lastCompletedReview,
  } = state;

  return {
    statusLabel:
      phase === "learning"
        ? "学习中"
        : phase === "review_due"
          ? "待复习"
          : phase === "closed_loop"
            ? "已收好"
            : inputDone
              ? "已接住"
              : "待开始",
    statusTone: phase === "learning" || phase === "review_due" ? "accent" : "primary",
    headline:
      phase === "learning"
        ? "继续这一步"
        : phase === "review_due"
          ? "先收这 1 题"
          : inputDone
            ? "先从第一步开始"
            : "先拍不会的这一页",
    body:
      phase === "learning"
        ? `${args.childDisplayName ?? "孩子"} 正在学「${lessonTitle}」，继续往下就行。`
        : phase === "review_due"
          ? `刚学完「${lessonTitle}」，先把眼前这一题收住。`
          : inputDone
            ? `「${inputTitle}」这一页已经接住了，直接从第一步开始。`
            : "孩子卡在哪一页，就拍哪一页。",
    inputDone,
    inputMeta: inputDone ? `${inputSourceLabel} · ${inputTitle}` : "还没有拍到新的内容",
    inputStatusLabel: inputDone ? "已输入" : "待输入",
    learningDone: phase === "learning" || learningDone || inputDone,
    learningDisplay:
      phase === "learning"
        ? `第 ${args.sessionStep}/${Math.max(args.sessionTotalSteps, 1)} 步`
        : learningDone
          ? "已学完"
          : inputDone
            ? `${generatedTaskCount} 步任务`
            : "等拍完再开始",
    learningStatusLabel:
      phase === "learning" ? "进行中" : learningDone ? "已学完" : inputDone ? "待开始" : "未开始",
    reviewDone,
    reviewMeta:
      args.pendingReviewCount > 0
        ? `先收 ${args.pendingReviewCount} 题`
        : lastCompletedReview
          ? `已收 ${lastCompletedReview.completedCount} 题`
          : learningDone
            ? "学完后会自动接上"
            : "还没到这一步",
    reviewStatusLabel:
      args.pendingReviewCount > 0
        ? "待复习"
        : lastCompletedReview
          ? "已复习"
          : learningDone
            ? "待出现"
            : "未开始",
    primaryAction:
      phase === "learning"
        ? { kind: "resume_session", label: "继续这节学习" }
        : phase === "review_due"
          ? { kind: "open_review_focus", label: "去做温和复习" }
          : inputDone
            ? { kind: "start_content", label: "开始这一页" }
            : { kind: "capture", label: "去拍这一页" },
    secondaryAction:
      phase === "learning"
        ? {
            kind: "resume_session",
            title: "继续学习",
            subtitle: `还剩 ${remainingSteps} 步`,
            icon: "play-circle-outline",
          }
        : phase === "review_due"
          ? {
              kind: "open_review_focus",
              title: "先收一下",
              subtitle: `${args.pendingReviewCount} 项待巩固`,
              icon: "refresh-circle-outline",
            }
          : inputDone
            ? {
              kind: "start_content",
              title: "开始这一页",
              subtitle: `${generatedTaskCount} 步任务`,
              icon: "play-circle-outline",
            }
            : args.pendingReviewCount > 0
              ? {
                  kind: "open_review",
                  title: "去复习",
                  subtitle: `${args.pendingReviewCount} 项待巩固`,
                  icon: "refresh-circle-outline",
                }
              : {
                  kind: "open_parent",
                  title: "我的",
                  subtitle: "查看学习概况",
                  icon: "person-circle-outline",
                },
  };
}

export function buildParentJourneyPresentation(
  args: ResolveJourneyArgs & {
    childDisplayName: string;
  },
): ParentJourneyPresentation {
  const state = resolveJourneyState(args);
  const {
    phase,
    lessonTitle,
    learningDone,
    inputDone,
    reviewDone,
    inputSourceLabel,
    inputTitle,
    generatedTaskCount,
    routeLabel,
    lastCompletedReview,
  } = state;

  return {
    currentJourneyStatus:
      phase === "learning" ? "学习中" : phase === "review_due" ? "该复习了" : inputDone || learningDone ? "已安排" : "待开始",
    statusTone: phase === "learning" || phase === "review_due" ? "accent" : "primary",
    mascotState:
      phase === "learning" ? "teacher" : phase === "review_due" ? "encourage" : inputDone ? "wow" : "happy",
    heroSpeech:
      phase === "learning"
        ? "这节课先学完"
        : phase === "review_due"
          ? "先稳稳复习一题"
          : inputDone
            ? "这份内容已经排好了"
            : "拍一页，主线就开始",
    heroTitle:
      phase === "learning"
        ? "当前学习正在继续"
        : phase === "review_due"
          ? "今天先把这次复习收好"
          : inputDone
            ? "这份内容已经准备好了"
            : "先拍一页，马上开始学",
    heroBody:
      phase === "learning"
        ? `${args.childDisplayName} 正在学「${lessonTitle}」，还剩 ${state.remainingSteps} 步。`
        : phase === "review_due"
          ? `刚学完「${lessonTitle}」，现在最适合先做 ${args.pendingReviewCount} 项温和复习。`
          : inputDone
            ? `基于「${inputTitle}」已经匹配${routeLabel}，随时都能从这里接上。`
            : "教材页、练习题、板书、图片都能拍；系统会识别内容并安排合适路线。",
    primaryAction:
      phase === "learning"
        ? { kind: "resume_session", label: "继续学习" }
        : phase === "review_due"
          ? { kind: "open_review_focus", label: "去做温和复习" }
          : inputDone
            ? { kind: "start_content", label: "开始这份内容" }
            : { kind: "go_home", label: "回首页拍照" },
    secondaryActionKind:
      phase === "learning"
        ? "go_home"
        : args.pendingReviewCount > 0
          ? "open_review"
          : "toggle_advanced",
    journeyCardTitle:
      phase === "learning"
        ? `正在学「${lessonTitle}」`
        : phase === "review_due"
          ? `「${lessonTitle}」学完了，下一步先复习`
          : inputDone
            ? `已收好「${inputTitle}」`
            : "还没有新的输入内容",
    inputDone,
    inputTitle,
    inputMeta: inputDone ? inputSourceLabel ?? "等待开始" : "等待开始",
    learningDone: phase === "learning" || learningDone || inputDone,
    learningTitle: lessonTitle,
    learningMeta:
      phase === "learning"
        ? `第 ${args.sessionStep}/${Math.max(args.sessionTotalSteps, 1)} 步`
        : learningDone
          ? "已完成"
          : inputDone
            ? `${generatedTaskCount} 步任务`
            : "待开始",
    reviewDone,
    reviewTitle: args.pendingReviewCount > 0 ? "今天先复习眼前这一题" : "学完后自动接上",
    reviewMeta:
      args.pendingReviewCount > 0
        ? `${args.pendingReviewCount} 项待巩固`
        : lastCompletedReview
          ? `已完成 ${lastCompletedReview.completedCount} 题`
          : "暂未开始",
  };
}
