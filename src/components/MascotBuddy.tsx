import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Image, ImageSourcePropType, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radius } from "../design/tokens";
import { textStyles } from "../design/theme";

export type MascotState = "happy" | "encourage" | "wow" | "teacher";

interface MascotBuddyProps {
  state: MascotState;
  size?: number;
  speech?: string;
  style?: StyleProp<ViewStyle>;
}

const mascotAssets: Record<MascotState, ImageSourcePropType> = {
  happy: require("../assets/mascot/mascot_happy.png"),
  encourage: require("../assets/mascot/mascot_happy.png"),
  wow: require("../assets/mascot/mascot_wow.png"),
  teacher: require("../assets/mascot/mascot_happy.png"),
};

const auraToneByState: Record<MascotState, [string, string]> = {
  happy: ["rgba(255,181,90,0.28)", "rgba(255,181,90,0.02)"],
  encourage: ["rgba(103,190,148,0.18)", "rgba(255,181,90,0.04)"],
  wow: ["rgba(255,193,103,0.32)", "rgba(255,255,255,0.04)"],
  teacher: ["rgba(69,169,121,0.2)", "rgba(255,181,90,0.05)"],
};

const speechToneByState: Record<MascotState, [string, string]> = {
  happy: ["#FFF8EC", "#FFFFFF"],
  encourage: ["#F3FBF7", "#FFFFFF"],
  wow: ["#FFF8E5", "#FFFDF8"],
  teacher: ["#EFF9F3", "#FFFFFF"],
};

const badgeConfigByState: Record<
  MascotState,
  { icon: keyof typeof Ionicons.glyphMap; tint: string; bg: string }
> = {
  happy: { icon: "checkmark", tint: "#FFFFFF", bg: colors.primary500 },
  encourage: { icon: "heart", tint: "#FFFFFF", bg: colors.accent500 },
  wow: { icon: "sparkles", tint: "#FFFFFF", bg: colors.accent500 },
  teacher: { icon: "school", tint: "#FFFFFF", bg: colors.primary600 },
};

const poseTransformByState: Record<MascotState, NonNullable<ViewStyle["transform"]>> = {
  happy: [{ rotate: "-2deg" }],
  encourage: [{ scaleX: -1 }, { rotate: "2deg" }],
  wow: [{ rotate: "0deg" }],
  teacher: [{ rotate: "0deg" }],
};

export const MascotBuddy = memo(function MascotBuddy({
  state,
  size = 116,
  speech,
  style,
}: MascotBuddyProps) {
  const frameWidth = Math.round(size);
  const frameHeight = Math.round(size * 1.28);
  const speechHeight = speech ? Math.round(size * 0.52) : 0;
  const badgeSize = Math.max(18, Math.round(size * 0.25));
  const badge = badgeConfigByState[state];

  return (
    <View
      style={[
        {
          width: frameWidth,
          height: frameHeight + speechHeight,
        },
        style,
      ]}
    >
      {speech ? (
        <LinearGradient
          colors={speechToneByState[state]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.speechBubble,
            {
              top: 0,
              minHeight: Math.round(size * 0.44),
              borderRadius: Math.max(radius.md, Math.round(size * 0.16)),
              paddingHorizontal: Math.max(10, Math.round(size * 0.14)),
              paddingVertical: Math.max(7, Math.round(size * 0.09)),
            },
          ]}
        >
          <Text
            style={[
              textStyles.meta,
              styles.speechText,
              {
                fontSize: Math.max(10, Math.round(size * 0.1)),
                lineHeight: Math.max(14, Math.round(size * 0.15)),
              },
            ]}
          >
            {speech}
          </Text>
          <View style={styles.speechTail} />
        </LinearGradient>
      ) : null}

      <View
        style={[
          styles.mascotFrame,
          {
            width: frameWidth,
            height: frameHeight,
            bottom: 0,
          },
        ]}
      >
        <LinearGradient
          colors={auraToneByState[state]}
          start={{ x: 0.5, y: 0.04 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            styles.aura,
            {
              top: Math.round(frameHeight * 0.1),
              left: Math.round(frameWidth * 0.08),
              width: Math.round(frameWidth * 0.84),
              height: Math.round(frameHeight * 0.76),
              borderRadius: Math.round(frameWidth * 0.42),
            },
          ]}
        />

        <Image
          source={mascotAssets[state]}
          resizeMode="contain"
          style={[
            styles.mascotImage,
            {
              width: frameWidth,
              height: frameHeight,
              transform: poseTransformByState[state],
            },
          ]}
        />

        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: badge.bg,
              right: Math.round(frameWidth * 0.04),
              bottom: Math.round(frameHeight * 0.1),
            },
          ]}
        >
          <Ionicons name={badge.icon} size={Math.round(badgeSize * 0.58)} color={badge.tint} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  speechBubble: {
    position: "absolute",
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.88)",
    shadowColor: colors.primary700,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
    zIndex: 2,
  },
  speechText: {
    color: colors.textPrimary,
    textAlign: "center",
  },
  speechTail: {
    position: "absolute",
    left: "50%",
    bottom: -7,
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.88)",
    transform: [{ rotate: "45deg" }],
  },
  mascotFrame: {
    position: "absolute",
    left: 0,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  aura: {
    position: "absolute",
  },
  mascotImage: {
    zIndex: 1,
  },
  badge: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: colors.primary700,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    zIndex: 2,
  },
});
