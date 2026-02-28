import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, TAP_MIN } from "@/theme";
import { calcTotalVolume, formatDuration, formatSessionDate } from "@/utils/session";
import { mapServerSession } from "@/utils/session-mappers";
import { trpc } from "@/utils/trpc";

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sessionQuery = useQuery(trpc.session.getById.queryOptions({ id: Number(id) }));
  const session = useMemo(
    () => (sessionQuery.data ? mapServerSession(sessionQuery.data) : undefined),
    [sessionQuery.data],
  );

  if (sessionQuery.isLoading) {
    return (
      <View style={[styles.centered, { paddingBottom: insets.bottom }]}>
        <ActivityIndicator testID="session-loading" size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.centered, { paddingBottom: insets.bottom }]}>
        <Text style={styles.notFoundText}>Session not found</Text>
      </View>
    );
  }

  const volume = calcTotalVolume(session.exercises);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
    >
      <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
        <Text style={styles.backText}>{"\u2190"}</Text>
      </Pressable>
      <Text style={styles.title}>{session.workoutTitle}</Text>
      <Text style={styles.date}>{formatSessionDate(session.startedAt)}</Text>
      <View style={styles.headerPills}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{formatDuration(session.durationSeconds)}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{volume} kg</Text>
        </View>
      </View>

      {session.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.exerciseSection}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.setHeader}>
            <Text style={[styles.setHeaderText, styles.setCol]}>Set</Text>
            <Text style={[styles.setHeaderText, styles.weightCol]}>Weight</Text>
            <Text style={[styles.setHeaderText, styles.repsCol]}>Reps</Text>
            <Text style={[styles.setHeaderText, styles.statusCol]} />
          </View>
          {exercise.sets.map((set, idx) => (
            <View key={set.id} style={styles.setRow}>
              <Text style={[styles.setText, styles.setCol]}>{idx + 1}</Text>
              <Text style={[styles.setText, styles.weightCol]}>
                {set.weight != null ? `${set.weight} kg` : "—"}
              </Text>
              <Text style={[styles.setText, styles.repsCol]}>
                {set.actualReps != null && set.targetReps != null
                  ? `${set.actualReps}/${set.targetReps}`
                  : "—"}
              </Text>
              <Text style={[styles.statusText, styles.statusCol]}>
                {set.done ? "\u2713" : "\u25CB"}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
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
  date: {
    color: Colors.text2,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    marginTop: 4,
  },
  headerPills: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  pill: {
    backgroundColor: Colors.surface2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    color: Colors.text2,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
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
  statusText: {
    fontSize: 14,
  },
  setCol: {
    width: 40,
  },
  weightCol: {
    flex: 1,
  },
  repsCol: {
    width: 60,
    textAlign: "center",
  },
  statusCol: {
    width: 32,
    textAlign: "center",
  },
});
