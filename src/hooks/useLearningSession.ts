import { useMutation, useQuery } from "@tanstack/react-query";
import { queryKeys } from "../api/queryKeys";
import {
  answerSessionApi,
  startSessionApi,
  submitSessionRecitationApi,
} from "../api/service";
import { useContentInputStore } from "../state/contentInputStore";

interface UseLearningSessionInput {
  childId: string;
  lessonId: string;
  forceNewToken: number;
  contentInputId?: string;
}

export function useLearningSession({
  childId,
  lessonId,
  forceNewToken,
  contentInputId,
}: UseLearningSessionInput) {
  const forceNew = forceNewToken > 0;
  const contentInput = useContentInputStore((state) =>
    contentInputId ? state.recentInputs.find((item) => item.id === contentInputId) ?? null : null,
  );
  const sessionQuery = useQuery({
    queryKey: [...queryKeys.session(childId), lessonId, forceNewToken, contentInputId ?? "default"],
    queryFn: () =>
      startSessionApi(
        {
          childId,
          lessonId,
          contentInputId,
          generationContext: contentInput
            ? {
                contentInputId: contentInput.id,
                sourceTitle: contentInput.title,
                sourceSummary: contentInput.summary,
                contentType: contentInput.contentType,
                recognizedFocus: contentInput.recognizedFocus,
                recognizedGradeLabel: contentInput.recognizedGradeLabel,
                recognizedTextSnippet: contentInput.recognizedTextSnippet,
                matchedLessonTitle: contentInput.matchedLessonTitle,
                routeKind: contentInput.routeKind,
                routeLabel: contentInput.routeLabel,
                primaryChallenge: contentInput.primaryChallenge,
                recommendedEntryStep: contentInput.recommendedEntryStep,
                tags: contentInput.recognizedTags,
              }
            : undefined,
        },
        { forceNew },
      ),
  });

  const answerMutation = useMutation({
    mutationFn: answerSessionApi,
  });

  const recitationMutation = useMutation({
    mutationFn: submitSessionRecitationApi,
  });

  return {
    sessionQuery,
    answerMutation,
    recitationMutation,
  };
}
