import { Platform, StyleSheet } from "react-native";
import { colors, spacing, typography } from "./tokens";

export const fontFamily = Platform.select({
  ios: typography.familyCN.ios,
  android: typography.familyCN.android,
  default: typography.familyCN.default,
});

export const textStyles = {
  h1: {
    ...typography.h1,
    color: colors.textPrimary,
    fontFamily,
  },
  h2: {
    ...typography.h2,
    color: colors.textPrimary,
    fontFamily,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    fontFamily,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    fontFamily,
  },
  caption: {
    ...typography.caption,
    color: colors.textTertiary,
    fontFamily,
  },
  meta: {
    ...typography.meta,
    color: colors.textTertiary,
    fontFamily,
  },
};

export const layoutStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  content: {
    paddingHorizontal: spacing.pageHorizontal,
  },
});
