export const colors = {
  primary700: "#256F4F",
  primary600: "#2F8E67",
  primary500: "#45A979",
  primary400: "#67BE94",
  primary300: "#8FD4B2",
  primary200: "#DCEFE4",
  primary100: "#EBF6F0",
  primary50: "#F6FBF8",
  mint500: "#56B89B",
  accent500: "#F2A55D",
  accent300: "#F9DEC2",
  accent100: "#FFF5EA",
  bgBase: "#F3F8F5",
  bgCard: "#FFFFFF",
  bgElevated: "#FCFEFC",
  borderLight: "#DCE9E1",
  borderSoft: "#EAF2ED",
  textPrimary: "#1F2D26",
  textSecondary: "#55675E",
  textTertiary: "#82948A",
  success: "#3EAF7F",
  warning: "#E7A457",
  error: "#D97A7A",
  info: "#5DAE95",
} as const;

export const typography = {
  familyCN: {
    ios: "System",
    android: "Noto Sans SC",
    default: "System",
  },
  h1: { fontSize: 30, lineHeight: 38, fontWeight: "700" as const },
  h2: { fontSize: 24, lineHeight: 32, fontWeight: "700" as const },
  title: { fontSize: 18, lineHeight: 26, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  caption: { fontSize: 13, lineHeight: 20, fontWeight: "400" as const },
  meta: { fontSize: 12, lineHeight: 18, fontWeight: "600" as const },
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  pageHorizontal: 20,
} as const;

export const radius = {
  sm: 16,
  md: 18,
  lg: 18,
  xl: 20,
  pill: 999,
} as const;

export const size = {
  buttonHeight: 52,
  touchTargetMin: 44,
  progressHeight: 6,
  tabBarHeight: 80,
} as const;

export const shadow = {
  card: {
    shadowColor: "#183829",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  modal: {
    shadowColor: "#183829",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
} as const;

export const motion = {
  fast: 200,
  normal: 240,
  cardSwitch: 260,
  feedbackMax: 600,
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  size,
  shadow,
  motion,
} as const;

export type Tokens = typeof tokens;
