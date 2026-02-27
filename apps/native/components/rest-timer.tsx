import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, RADIUS_CARD, TAP_MIN } from "@/theme";

type Props = {
  isActive: boolean;
  remaining: number;
  totalSeconds?: number;
  onDismiss: () => void;
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RestTimerBanner({ isActive, remaining, totalSeconds = 90, onDismiss }: Props) {
  if (!isActive) return null;

  const progress = 1 - remaining / totalSeconds;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>REST</Text>
        <Text style={styles.countdown} testID="rest-timer-countdown">
          {formatCountdown(remaining)}
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onDismiss} hitSlop={8} testID="rest-timer-dismiss">
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.progressTrack} testID="rest-timer-progress">
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface2,
    borderRadius: RADIUS_CARD,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  label: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 1.5,
  },
  countdown: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 22,
    color: Colors.accent,
  },
  dismissText: {
    color: Colors.text3,
    fontSize: 16,
    fontFamily: "DMSans_500Medium",
    minWidth: TAP_MIN,
    minHeight: TAP_MIN,
    textAlign: "center",
    lineHeight: TAP_MIN,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.surface4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
});
