import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppCard } from "../AppCard";
import { colors, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface ParentDetailSectionProps extends PropsWithChildren {
  title: string;
  meta: string;
  expanded: boolean;
  onToggle: () => void;
}

export function ParentDetailSection({
  title,
  meta,
  expanded,
  onToggle,
  children,
}: ParentDetailSectionProps) {
  return (
    <AppCard style={styles.card}>
      <Pressable
        hitSlop={8}
        onPress={onToggle}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
          size={18}
          color={colors.primary500}
        />
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  headerPressed: {
    opacity: 0.92,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  meta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  body: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
});
