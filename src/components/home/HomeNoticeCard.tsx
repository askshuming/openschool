import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "../AppCard";
import { MascotBuddy } from "../MascotBuddy";
import { StatusChip } from "../StatusChip";
import { colors, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface HomeNoticeCardProps {
  title: string;
  body: string;
  tone: "success" | "primary";
  nextStep?: string;
}

export function HomeNoticeCard({ title, body, tone, nextStep }: HomeNoticeCardProps) {
  return (
    <AppCard style={[styles.card, tone === "success" && styles.cardSuccess]}>
      <View style={styles.inner}>
        <MascotBuddy
          state={tone === "success" ? "wow" : "teacher"}
          size={84}
          speech={tone === "success" ? "太棒了，又学会一点" : "这条消息我已经帮你同步"}
        />
        <View style={styles.copy}>
          <View style={styles.rowTop}>
            <Text style={textStyles.title}>{title}</Text>
            <StatusChip label={tone === "success" ? "完成" : "已同步"} tone={tone === "success" ? "accent" : "primary"} />
          </View>
          <Text style={styles.body}>{body}</Text>
          {nextStep ? <Text style={styles.nextStep}>下一步：{nextStep}</Text> : null}
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
  },
  cardSuccess: {
    borderColor: colors.accent300,
    backgroundColor: colors.accent100,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  body: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  nextStep: {
    ...textStyles.meta,
    color: colors.primary600,
  },
});
