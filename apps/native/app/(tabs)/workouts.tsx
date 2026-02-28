import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { WorkoutCard } from "@/components/workout-card";
import { WorkoutFormSheet } from "@/components/workout-form-sheet";
import type { Workout } from "@/types/workout";
import { Colors, TAP_MIN } from "@/theme";
import { trpc } from "@/utils/trpc";
import { mapServerWorkout } from "@/utils/workout-mappers";

export default function WorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const workoutsQuery = useQuery(trpc.workout.list.queryOptions());
  const workouts = useMemo(
    () => (workoutsQuery.data ?? []).map(mapServerWorkout),
    [workoutsQuery.data],
  );

  const deleteMutation = useMutation({
    ...trpc.workout.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout", "list"] });
    },
  });

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);

  function handleNew() {
    setEditingWorkout(null);
    setSheetVisible(true);
  }

  function handleEdit(workout: Workout) {
    setEditingWorkout(workout);
    setSheetVisible(true);
  }

  function handleStart(id: number) {
    router.push(`/log/${id}`);
  }

  function handleCloseSheet() {
    setSheetVisible(false);
    setEditingWorkout(null);
  }

  if (workoutsQuery.isLoading) {
    return (
      <Container isScrollable={false}>
        <ActivityIndicator
          testID="workouts-loading"
          size="large"
          color={Colors.accent}
          style={styles.loader}
        />
      </Container>
    );
  }

  return (
    <Container isScrollable={false}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 8 }]}
        ListHeaderComponent={
          <View>
            <View style={styles.appHeader}>
              <Text style={styles.appTitle}>IronLog</Text>
              <Text style={styles.bolt}>⚡</Text>
            </View>
            <Text style={styles.subtitle}>Build your workout templates</Text>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MY WORKOUTS</Text>
              <Pressable onPress={handleNew} style={styles.newBtn} hitSlop={4}>
                <Text style={styles.newBtnText}>+ New</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptyText}>Tap "+ New" to create your first workout template</Text>
          </View>
        }
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onEdit={() => handleEdit(item)}
            onDelete={() => deleteMutation.mutate({ id: item.id })}
            onStart={() => handleStart(item.id)}
          />
        )}
      />

      <WorkoutFormSheet
        visible={sheetVisible}
        onClose={handleCloseSheet}
        editWorkout={editingWorkout}
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
  appHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  appTitle: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 26,
    color: Colors.accent,
  },
  bolt: {
    fontSize: 20,
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.text3,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    color: Colors.text3,
    letterSpacing: 1.5,
  },
  newBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  newBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: Colors.bg,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: Colors.text2,
  },
  emptyText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.text3,
    marginTop: 6,
  },
});
