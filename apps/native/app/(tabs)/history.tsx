import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getAllSessions, useWorkout } from "@/contexts/workout-context";
import type { Session } from "@/contexts/workout-context";
import { Colors, RADIUS_CARD, TAP_MIN } from "@/theme";
import {
  calcCompletedSets,
  calcTotalVolume,
  formatDuration,
  formatSessionDate,
} from "@/utils/session";

function SessionCard({ session, onPress }: { session: Session; onPress: () => void }) {
  const totalSets = calcCompletedSets(session.exercises);
  const volume = calcTotalVolume(session.exercises);

  return (
    <Pressable
      testID={`session-card-${session.id}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Text style={styles.cardTitle}>{session.workoutTitle}</Text>
      <Text style={styles.cardDate}>{formatSessionDate(session.startedAt)}</Text>
      <Text style={styles.cardDuration}>{formatDuration(session.durationSeconds)}</Text>
      <View style={styles.pillRow}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{totalSets} sets</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{volume} kg</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const { state } = useWorkout();
  const sessions = getAllSessions(state);
  const insets = useSafeAreaInsets();

  if (sessions.length === 0) {
    return (
      <View style={[styles.emptyContainer, { paddingBottom: insets.bottom }]}>
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={styles.emptyTitle}>No Sessions Yet</Text>
        <Text style={styles.emptySubtitle}>Complete a workout to see your history</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Text style={styles.header}>History</Text>
      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <SessionCard session={item} onPress={() => router.push(`/session/${item.id}`)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    color: Colors.text1,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: Colors.surface1,
    borderRadius: RADIUS_CARD,
    padding: 16,
    minHeight: TAP_MIN,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardTitle: {
    color: Colors.text1,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 20,
  },
  cardDate: {
    color: Colors.text2,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  cardDuration: {
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
