import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Workout } from "@/types/workout";
import { isWorkoutActive, useWorkout } from "@/contexts/workout-context";
import { Colors, RADIUS_CARD, TAP_MIN } from "@/theme";

type Props = {
  workout: Workout;
  onEdit: () => void;
  onDelete: () => void;
  onStart: () => void;
};

export function WorkoutCard({ workout, onEdit, onDelete, onStart }: Props) {
  const { state } = useWorkout();
  const active = isWorkoutActive(state, workout.id);
  const totalSets = workout.exercises.reduce((sum, e) => sum + e.sets.length, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{workout.title}</Text>
      <Text style={styles.meta}>
        {workout.exercises.length} exercise{workout.exercises.length !== 1 ? "s" : ""} · {totalSets}{" "}
        set{totalSets !== 1 ? "s" : ""}
      </Text>

      {workout.exercises.length > 0 && (
        <View style={styles.pillRow}>
          {workout.exercises.map((ex) => (
            <View key={ex.id} style={styles.pill}>
              <Text style={styles.pillText}>{ex.name}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actionRow}>
        <Pressable onPress={onEdit} style={styles.actionBtn} hitSlop={4}>
          <Text style={styles.actionText}>✏️ Edit</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={[styles.actionBtn, active && styles.actionDisabled]}
          disabled={active}
          hitSlop={4}
        >
          <Text style={[styles.actionText, active && styles.actionTextDisabled]}>🗑 Delete</Text>
        </Pressable>
        <Pressable onPress={onStart} style={styles.startBtn} hitSlop={4}>
          <Text style={styles.startText}>▶ Start</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface1,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: RADIUS_CARD,
    padding: 16,
    marginBottom: 12,
  },
  title: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 22,
    color: Colors.text1,
  },
  meta: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: Colors.text3,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  pill: {
    backgroundColor: Colors.surface2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: Colors.text2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  actionDisabled: {
    opacity: 0.35,
  },
  actionText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: Colors.text2,
  },
  actionTextDisabled: {
    color: Colors.text4,
  },
  startBtn: {
    marginLeft: "auto",
    backgroundColor: Colors.orange,
    borderRadius: 8,
    paddingHorizontal: 14,
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  startText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: Colors.text1,
  },
});
