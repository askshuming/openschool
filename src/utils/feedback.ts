import { Platform, Vibration } from "react-native";

type FeedbackTone = "success" | "error";

export function triggerFeedback(tone: FeedbackTone) {
  if (Platform.OS === "ios") {
    Vibration.vibrate();
    return;
  }

  if (tone === "success") {
    Vibration.vibrate(12);
    return;
  }

  Vibration.vibrate([0, 22, 40, 18]);
}
