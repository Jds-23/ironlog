import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, RADIUS_CARD, TAP_MIN } from "@/theme";
import { formatDuration, formatSessionDate } from "@/utils/session";
import type { MappedListSession } from "@/utils/session-mappers";
import { mapServerListSession } from "@/utils/session-mappers";
import { computeStreak } from "@/utils/streak";
import { trpc } from "@/utils/trpc";
import { mapServerWorkout } from "@/utils/workout-mappers";
import type { Workout } from "@/types/workout";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const workoutsQuery = useQuery(trpc.workout.list.queryOptions());
  const workouts = useMemo(
    () => (workoutsQuery.data ?? []).map(mapServerWorkout),
    [workoutsQuery.data],
  );

  const sessionsQuery = useQuery(trpc.session.list.queryOptions());
  const sessions: MappedListSession[] = useMemo(
    () => (sessionsQuery.data ?? []).map(mapServerListSession),
    [sessionsQuery.data],
  );

  const isLoading = workoutsQuery.isLoading || sessionsQuery.isLoading;

  const streak = useMemo(() => computeStreak(sessions.map((s) => s.startedAt)), [sessions]);

  const lastSession = sessions[0] ?? null;
  const recentWorkouts = workouts.slice(0, 3);

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingBottom: insets.bottom }]}>
        <ActivityIndicator testID="home-loading" size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 },
      ]}
    >
      <Text testID="greeting" style={styles.greeting}>
        {getGreeting()}
      </Text>
      <Text style={styles.subtitle}>Ready to train?</Text>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{workouts.length}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{sessions.length}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      {/* Recent Workouts */}
      <Text style={styles.sectionTitle}>RECENT WORKOUTS</Text>
      {recentWorkouts.length === 0 ? (
        <Text style={styles.emptyText}>Create a workout to get started</Text>
      ) : (
        recentWorkouts.map((w) => (
          <WorkoutCompactCard
            key={w.id}
            workout={w}
            onPress={() => router.push(`/workout/${w.id}`)}
            onStart={() => router.push(`/log/${w.id}`)}
          />
        ))
      )}

      {/* Last Session */}
      <Text style={styles.sectionTitle}>LAST SESSION</Text>
      {lastSession ? (
        <Pressable
          testID={`last-session-${lastSession.id}`}
          onPress={() => router.push(`/session/${lastSession.id}`)}
          style={({ pressed }) => [styles.sessionCard, pressed && styles.cardPressed]}
        >
          <Text style={styles.sessionTitle}>{lastSession.workoutTitle}</Text>
          <Text style={styles.sessionDate}>{formatSessionDate(lastSession.startedAt)}</Text>
          <Text style={styles.sessionDuration}>{formatDuration(lastSession.durationSeconds)}</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{lastSession.totalSetsDone} sets</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{lastSession.totalVolume} kg</Text>
            </View>
          </View>
        </Pressable>
      ) : (
        <Text style={styles.emptyText}>Complete a workout to see your summary</Text>
      )}
    </ScrollView>
  );
}

function WorkoutCompactCard({
  workout,
  onPress,
  onStart,
}: {
  workout: Workout;
  onPress: () => void;
  onStart: () => void;
}) {
  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <Pressable
      testID={`workout-card-${workout.id}`}
      onPress={onPress}
      style={({ pressed }) => [styles.workoutCard, pressed && styles.cardPressed]}
    >
      <View style={styles.workoutCardContent}>
        <View style={styles.workoutCardInfo}>
          <Text style={styles.workoutCardTitle}>{workout.title}</Text>
          <Text style={styles.workoutCardMeta}>
            {workout.exercises.length} exercise{workout.exercises.length !== 1 ? "s" : ""} &middot;{" "}
            {totalSets} set{totalSets !== 1 ? "s" : ""}
          </Text>
        </View>
        <Pressable testID={`start-workout-${workout.id}`} onPress={onStart} style={styles.startBtn}>
          <Text style={styles.startBtnText}>Start</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  greeting: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 28,
    color: Colors.text1,
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.text3,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface1,
    borderRadius: RADIUS_CARD,
    padding: 14,
    alignItems: "center",
  },
  statValue: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 28,
    color: Colors.text1,
  },
  statLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: Colors.text3,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    color: Colors.text3,
    letterSpacing: 1.5,
    marginTop: 28,
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.text3,
  },
  workoutCard: {
    backgroundColor: Colors.surface1,
    borderRadius: RADIUS_CARD,
    padding: 14,
    marginBottom: 10,
  },
  workoutCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  workoutCardInfo: {
    flex: 1,
  },
  workoutCardTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: Colors.text1,
  },
  workoutCardMeta: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: Colors.text3,
    marginTop: 2,
  },
  startBtn: {
    backgroundColor: Colors.orange,
    borderRadius: 8,
    paddingHorizontal: 14,
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  startBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  cardPressed: {
    opacity: 0.7,
  },
  sessionCard: {
    backgroundColor: Colors.surface1,
    borderRadius: RADIUS_CARD,
    padding: 16,
  },
  sessionTitle: {
    color: Colors.text1,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 20,
  },
  sessionDate: {
    color: Colors.text2,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  sessionDuration: {
    color: Colors.text3,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  pill: {
    backgroundColor: Colors.surface3,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    color: Colors.text2,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
});
