import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WorkoutFormSheet } from "@/components/workout-form-sheet";
import { Colors, RADIUS_CARD, TAP_MIN } from "@/theme";
import { trpc } from "@/utils/trpc";
import { mapServerWorkout } from "@/utils/workout-mappers";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const workoutQuery = useQuery(trpc.workout.getById.queryOptions({ id: Number(id) }));
  const workout = useMemo(
    () => (workoutQuery.data ? mapServerWorkout(workoutQuery.data) : undefined),
    [workoutQuery.data],
  );

  const deleteMutation = useMutation({
    ...trpc.workout.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout", "list"] });
      router.back();
    },
  });

  const [sheetVisible, setSheetVisible] = useState(false);

  function handleEdit() {
    setSheetVisible(true);
  }

  function handleCloseSheet() {
    setSheetVisible(false);
  }

  function handleDelete() {
    Alert.alert("Delete Workout", "Are you sure you want to delete this workout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ id: Number(id) }),
      },
    ]);
  }

  if (workoutQuery.isLoading) {
    return (
      <View style={[styles.centered, { paddingBottom: insets.bottom }]}>
        <ActivityIndicator testID="workout-loading" size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.centered, { paddingBottom: insets.bottom }]}>
        <Text style={styles.notFoundText}>Workout not found</Text>
      </View>
    );
  }

  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      >
        <Pressable
          testID="back-btn"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Text style={styles.backText}>{"\u2190"}</Text>
        </Pressable>

        <Text style={styles.title}>{workout.title}</Text>
        <Text style={styles.meta}>
          {workout.exercises.length} exercise{workout.exercises.length !== 1 ? "s" : ""} &middot;{" "}
          {totalSets} set{totalSets !== 1 ? "s" : ""}
        </Text>

        {workout.exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseSection}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <View style={styles.setHeader}>
              <Text style={[styles.setHeaderText, styles.setCol]}>Set</Text>
              <Text style={[styles.setHeaderText, styles.weightCol]}>Weight</Text>
              <Text style={[styles.setHeaderText, styles.repsCol]}>Target Reps</Text>
            </View>
            {exercise.sets.map((set, idx) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={[styles.setText, styles.setCol]}>{idx + 1}</Text>
                <Text style={[styles.setText, styles.weightCol]}>
                  {set.weight != null ? `${set.weight} kg` : "\u2014"}
                </Text>
                <Text style={[styles.setText, styles.repsCol]}>
                  {set.targetReps != null ? String(set.targetReps) : "\u2014"}
                </Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.actions}>
          <Pressable testID="edit-btn" onPress={handleEdit} style={styles.textBtn} hitSlop={4}>
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
          <Pressable testID="delete-btn" onPress={handleDelete} style={styles.textBtn} hitSlop={4}>
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>

        <Pressable
          testID="start-btn"
          onPress={() => router.push(`/log/${id}`)}
          style={styles.startBtn}
        >
          <Text style={styles.startBtnText}>Start Workout</Text>
        </Pressable>
      </ScrollView>

      <WorkoutFormSheet visible={sheetVisible} onClose={handleCloseSheet} editWorkout={workout} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backBtn: {
    width: TAP_MIN,
    height: TAP_MIN,
    justifyContent: "center",
  },
  backText: {
    color: Colors.text1,
    fontSize: 22,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundText: {
    color: Colors.text3,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
  },
  title: {
    color: Colors.text1,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 28,
  },
  meta: {
    color: Colors.text2,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    marginTop: 4,
  },
  exerciseSection: {
    marginTop: 24,
  },
  exerciseName: {
    color: Colors.text1,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    marginBottom: 8,
  },
  setHeader: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  setHeaderText: {
    color: Colors.text3,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  setRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  setText: {
    color: Colors.text2,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  setCol: {
    width: 40,
  },
  weightCol: {
    flex: 1,
  },
  repsCol: {
    width: 80,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 32,
  },
  textBtn: {
    minHeight: TAP_MIN,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  editText: {
    color: Colors.accent,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
  },
  deleteText: {
    color: Colors.red,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
  },
  startBtn: {
    backgroundColor: Colors.orange,
    borderRadius: RADIUS_CARD,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  startBtnText: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 20,
    color: "#fff",
  },
});
