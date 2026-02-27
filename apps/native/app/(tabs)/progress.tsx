import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getAllSessions, useWorkout } from "@/contexts/workout-context";
import { Colors, RADIUS_CARD, TAP_MIN } from "@/theme";
import { getExerciseStats, getMaxWeightOverTime, getVolumeOverTime } from "@/utils/progress";
import { getSessionExerciseNames } from "@/utils/session";

export default function ProgressScreen() {
  const { state } = useWorkout();
  const sessions = getAllSessions(state);
  const insets = useSafeAreaInsets();
  const exerciseNames = getSessionExerciseNames(sessions);
  const [selected, setSelected] = useState<string | null>(null);

  const selectedExercise = selected ?? exerciseNames[0] ?? null;

  if (sessions.length === 0) {
    return (
      <View style={[styles.emptyContainer, { paddingBottom: insets.bottom }]}>
        <Text style={styles.emptyEmoji}>📈</Text>
        <Text style={styles.emptyTitle}>No Progress Yet</Text>
        <Text style={styles.emptySubtitle}>Complete a workout to track your progress</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
    >
      <Text style={styles.header}>Progress</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {exerciseNames.map((name) => (
          <Pressable
            key={name}
            testID={`exercise-pill-${name}`}
            onPress={() => setSelected(name)}
            style={[styles.exercisePill, name === selectedExercise && styles.exercisePillSelected]}
          >
            <Text
              style={[
                styles.exercisePillText,
                name === selectedExercise && styles.exercisePillTextSelected,
              ]}
            >
              {name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {selectedExercise && <StatsRow sessions={sessions} exerciseName={selectedExercise} />}
      {selectedExercise && <Charts sessions={sessions} exerciseName={selectedExercise} />}
    </ScrollView>
  );
}

function StatsRow({
  sessions,
  exerciseName,
}: {
  sessions: ReturnType<typeof getAllSessions>;
  exerciseName: string;
}) {
  const stats = getExerciseStats(sessions, exerciseName);

  return (
    <View style={styles.statsRow}>
      <View style={styles.statPill}>
        <Text style={styles.statLabel}>Personal Best</Text>
        <Text style={styles.statValue}>{stats.personalBest} kg</Text>
      </View>
      <View style={styles.statPill}>
        <Text style={styles.statLabel}>Last Session</Text>
        <Text style={styles.statValue}>{stats.lastSessionVolume} kg</Text>
      </View>
      <View style={styles.statPill}>
        <Text style={styles.statLabel}>Sessions</Text>
        <Text style={styles.statValue}>{stats.sessionsLogged}</Text>
      </View>
    </View>
  );
}

function Charts({
  sessions,
  exerciseName,
}: {
  sessions: ReturnType<typeof getAllSessions>;
  exerciseName: string;
}) {
  const volumeData = getVolumeOverTime(sessions, exerciseName);
  const weightData = getMaxWeightOverTime(sessions, exerciseName);

  const hasData = volumeData.some((d) => d.volume > 0) || weightData.some((d) => d.weight > 0);

  if (!hasData) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>
          No data yet for this exercise. Complete a workout to see your progress.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.chartsContainer}>
      <View testID="volume-chart" style={styles.chartCard}>
        <Text style={styles.chartTitle}>Volume Over Time</Text>
        <View style={styles.chartBarArea}>
          {volumeData.map((point, i) => (
            <View key={i} style={styles.chartBarCol}>
              <Text style={styles.chartBarValue}>{point.volume}</Text>
              <View
                style={[
                  styles.chartBar,
                  {
                    height: Math.max(
                      20,
                      (point.volume / Math.max(...volumeData.map((d) => d.volume))) * 100,
                    ),
                  },
                ]}
              />
              <Text style={styles.chartBarLabel}>{point.date}</Text>
            </View>
          ))}
        </View>
      </View>

      <View testID="max-weight-chart" style={styles.chartCard}>
        <Text style={styles.chartTitle}>Max Weight Over Time</Text>
        <View style={styles.chartBarArea}>
          {weightData.map((point, i) => (
            <View key={i} style={styles.chartBarCol}>
              <Text style={styles.chartBarValue}>{point.weight}</Text>
              <View
                style={[
                  styles.chartBar,
                  styles.chartBarWeight,
                  {
                    height: Math.max(
                      20,
                      (point.weight / Math.max(...weightData.map((d) => d.weight))) * 100,
                    ),
                  },
                ]}
              />
              <Text style={styles.chartBarLabel}>{point.date}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingTop: 16,
  },
  header: {
    color: Colors.text1,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 28,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  pillRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  exercisePill: {
    backgroundColor: Colors.surface2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  exercisePillSelected: {
    backgroundColor: Colors.accent,
  },
  exercisePillText: {
    color: Colors.text2,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
  exercisePillTextSelected: {
    color: Colors.bg,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  statPill: {
    flex: 1,
    backgroundColor: Colors.surface1,
    borderRadius: RADIUS_CARD,
    padding: 12,
    alignItems: "center",
  },
  statLabel: {
    color: Colors.text3,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    color: Colors.text1,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
  },
  chartsContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 16,
  },
  chartCard: {
    backgroundColor: Colors.surface1,
    borderRadius: RADIUS_CARD,
    padding: 16,
  },
  chartTitle: {
    color: Colors.text2,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    marginBottom: 16,
  },
  chartBarArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 140,
    gap: 8,
  },
  chartBarCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  chartBarValue: {
    color: Colors.text3,
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    marginBottom: 4,
  },
  chartBar: {
    width: "80%",
    backgroundColor: Colors.accent,
    borderRadius: 4,
    minHeight: 4,
  },
  chartBarWeight: {
    backgroundColor: Colors.green,
  },
  chartBarLabel: {
    color: Colors.text3,
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    marginTop: 4,
  },
  chartEmpty: {
    paddingHorizontal: 20,
    marginTop: 24,
    alignItems: "center",
  },
  chartEmptyText: {
    color: Colors.text3,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: Colors.text1,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 24,
  },
  emptySubtitle: {
    color: Colors.text3,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    marginTop: 4,
  },
});
