import { Pressable, StyleSheet, Text, View } from "react-native";

import type { NextUndoneSet } from "@/hooks/use-log-session";
import { Colors, RADIUS_CARD, TAP_MIN } from "@/theme";

type Props = {
  nextSet: NextUndoneSet | null;
  elapsed: number;
  formatTime: (seconds: number) => string;
  onLogReps: () => void;
  onFinish: () => void;
};

export function BottomBar({ nextSet, elapsed, formatTime, onLogReps, onFinish }: Props) {
  return (
    <View style={styles.container}>
      {nextSet && (
        <View style={styles.upNextCard}>
          <View style={styles.upNextHeader}>
            <Text style={styles.upNextLabel}>UP NEXT</Text>
          </View>
          <Text style={styles.upNextExercise}>{nextSet.exerciseName}</Text>
          <View style={styles.upNextRow}>
            <Text style={styles.upNextInfo}>
              Set {nextSet.setNumber}
              {nextSet.weight != null ? ` · ${nextSet.weight} lbs` : ""}
            </Text>
            <Pressable style={styles.logRepsBtn} onPress={onLogReps}>
              <Text style={styles.logRepsText}>+ Log Reps</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Pressable style={styles.finishBtn} onPress={onFinish} testID="finish-btn">
        <Text style={styles.finishText}>Finish · {formatTime(elapsed)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 34,
    paddingTop: 8,
  },
  upNextCard: {
    backgroundColor: Colors.surface2,
    borderRadius: RADIUS_CARD,
    padding: 12,
    marginBottom: 8,
  },
  upNextHeader: {
    marginBottom: 4,
  },
  upNextLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 10,
    color: Colors.text3,
    letterSpacing: 1.5,
  },
  upNextExercise: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: Colors.text1,
    marginBottom: 6,
  },
  upNextInfo: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.text2,
    flex: 1,
  },
  upNextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logRepsBtn: {
    backgroundColor: Colors.accentDim,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  logRepsText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: Colors.accent,
  },
  finishBtn: {
    backgroundColor: Colors.orange,
    borderRadius: RADIUS_CARD,
    paddingVertical: 14,
    alignItems: "center",
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  finishText: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 20,
    color: "#fff",
  },
});
