import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import * as Haptics from "expo-haptics";

import { BottomBar } from "@/components/bottom-bar";
import { NumpadModal } from "@/components/numpad-modal";
import { RestTimerBanner } from "@/components/rest-timer";
import type { NumpadMode } from "@/utils/numpad";
import type { Workout } from "@/types/workout";
import { useWorkout } from "@/contexts/workout-context";
import { useElapsedTimer } from "@/hooks/use-elapsed-timer";
import { useLogSession } from "@/hooks/use-log-session";
import { useRestTimer } from "@/hooks/use-rest-timer";
import { Colors, RADIUS_CARD, TAP_MIN } from "@/theme";
import { trpc } from "@/utils/trpc";
import { mapServerWorkout } from "@/utils/workout-mappers";

type NumpadState = {
  visible: boolean;
  mode: NumpadMode;
  exIdx: number;
  setIdx: number;
  initialValue: string;
  label: string;
};

const numpadClosed: NumpadState = {
  visible: false,
  mode: "weight",
  exIdx: 0,
  setIdx: 0,
  initialValue: "",
  label: "",
};

export default function LogSessionScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const insets = useSafeAreaInsets();
  const { dispatch } = useWorkout();

  const workoutQuery = useQuery(trpc.workout.getById.queryOptions({ id: Number(workoutId) }));
  const workout = useMemo(
    () => (workoutQuery.data ? mapServerWorkout(workoutQuery.data) : undefined),
    [workoutQuery.data],
  );

  useEffect(() => {
    dispatch({ type: "SET_ACTIVE_WORKOUT", payload: { id: Number(workoutId) } });
    return () => {
      dispatch({ type: "CLEAR_ACTIVE_WORKOUT" });
    };
  }, [dispatch, workoutId]);

  if (workoutQuery.isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator
          testID="log-loading"
          size="large"
          color={Colors.accent}
          style={{ marginTop: 40 }}
        />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>Workout not found</Text>
      </View>
    );
  }

  return <LogSessionInner workout={workout} />;
}

function LogSessionInner({ workout }: { workout: Workout }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dispatch } = useWorkout();
  const queryClient = useQueryClient();
  const startedAtRef = useRef(Date.now());
  const { elapsed, formatTime } = useElapsedTimer();
  const log = useLogSession(workout);

  const sessionCreateMutation = useMutation({
    ...trpc.session.create.mutationOptions(),
    retry: 3,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });

  const restTimer = useRestTimer(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  });

  const [numpad, setNumpad] = useState<NumpadState>(numpadClosed);

  // Pulsing dot animation
  const dotOpacity = useSharedValue(1);
  useEffect(() => {
    dotOpacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
    );
  }, [dotOpacity]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));

  function openNumpad(mode: NumpadMode, exIdx: number, setIdx: number) {
    const ex = log.logExercises[exIdx];
    const set = ex.sets[setIdx];
    const val = mode === "weight" ? set.weight : set.actualReps;
    setNumpad({
      visible: true,
      mode,
      exIdx,
      setIdx,
      initialValue: val != null ? String(val) : "",
      label: `${ex.name} — Set ${setIdx + 1}`,
    });
  }

  function handleNumpadConfirm(value: string) {
    const num = Number(value);
    if (numpad.mode === "weight") {
      log.updateWeight(numpad.exIdx, numpad.setIdx, num);
    } else {
      log.updateReps(numpad.exIdx, numpad.setIdx, num);
    }
    setNumpad(numpadClosed);
  }

  function handleCheck(exIdx: number, setIdx: number) {
    const nowDone = log.toggleDone(exIdx, setIdx);
    if (nowDone) {
      restTimer.start();
    } else {
      restTimer.cancel();
    }
  }

  function handleLogReps() {
    if (!log.nextUndoneSet) return;
    const { exIdx, setIdx } = log.nextUndoneSet;
    openNumpad("reps", exIdx, setIdx);
  }

  function handleFinish() {
    const input = log.buildSessionInput(startedAtRef.current);
    sessionCreateMutation.mutate(input);
    dispatch({ type: "CLEAR_ACTIVE_WORKOUT" });
    router.replace("/(tabs)/workouts");
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.workoutName}>{workout.title}</Text>
          <View style={styles.timerRow}>
            <Animated.View style={[styles.pulseDot, dotStyle]} />
            <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
          </View>
        </View>
        <View style={styles.progressBadge} testID="progress-badge">
          <Text style={styles.progressText}>
            {log.progress.done}/{log.progress.total}
          </Text>
        </View>
      </View>

      {/* Set list */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {log.logExercises.map((ex, exIdx) => (
          <View key={exIdx} style={styles.exBlock}>
            <Text style={styles.exName}>{ex.name}</Text>

            {/* Column headers */}
            <View style={styles.setHeaderRow}>
              <Text style={[styles.setHeaderText, { width: 32 }]}>Set</Text>
              <Text style={[styles.setHeaderText, { flex: 1 }]}>Weight</Text>
              <Text style={[styles.setHeaderText, { flex: 1 }]}>Reps</Text>
              <View style={{ width: TAP_MIN }} />
            </View>

            {ex.sets.map((set, setIdx) => (
              <View key={setIdx} style={[styles.setRow, set.done && styles.setRowDone]}>
                <View style={styles.setBadge}>
                  <Text style={styles.setBadgeText}>{setIdx + 1}</Text>
                </View>
                <Pressable
                  style={[styles.cell, { flex: 1 }]}
                  onPress={() => openNumpad("weight", exIdx, setIdx)}
                  testID={`weight-cell-${exIdx}-${setIdx}`}
                >
                  <Text style={styles.cellText}>
                    {set.weight != null ? String(set.weight) : "—"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.cell, { flex: 1 }]}
                  onPress={() => openNumpad("reps", exIdx, setIdx)}
                  testID={`reps-cell-${exIdx}-${setIdx}`}
                >
                  <Text style={styles.cellText}>
                    {set.actualReps != null ? String(set.actualReps) : "—"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.checkBtn, set.done && styles.checkBtnDone]}
                  onPress={() => handleCheck(exIdx, setIdx)}
                  testID={`check-btn-${exIdx}-${setIdx}`}
                >
                  <Text style={[styles.checkText, set.done && styles.checkTextDone]}>✓</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>

      <RestTimerBanner
        isActive={restTimer.isActive}
        remaining={restTimer.remaining}
        onDismiss={restTimer.dismiss}
      />

      <BottomBar
        nextSet={log.nextUndoneSet}
        elapsed={elapsed}
        formatTime={formatTime}
        onLogReps={handleLogReps}
        onFinish={handleFinish}
      />

      <NumpadModal
        visible={numpad.visible}
        mode={numpad.mode}
        initialValue={numpad.initialValue}
        label={numpad.label}
        onConfirm={handleNumpadConfirm}
        onClose={() => setNumpad(numpadClosed)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  notFound: {
    color: Colors.text2,
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    gap: 4,
  },
  workoutName: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 24,
    color: Colors.text1,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green,
  },
  timerText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: Colors.text2,
  },
  progressBadge: {
    backgroundColor: Colors.accentDim,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: Colors.accent,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  exBlock: {
    marginBottom: 20,
  },
  exName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: Colors.text1,
    marginBottom: 8,
  },
  setHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  setHeaderText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: Colors.text3,
    textTransform: "uppercase",
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  setRowDone: {
    opacity: 0.4,
  },
  setBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  setBadgeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: Colors.text2,
  },
  cell: {
    backgroundColor: Colors.surface2,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  cellText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: Colors.text1,
  },
  checkBtn: {
    width: TAP_MIN,
    height: TAP_MIN,
    borderRadius: RADIUS_CARD,
    backgroundColor: Colors.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkBtnDone: {
    backgroundColor: Colors.greenDim,
  },
  checkText: {
    fontSize: 18,
    color: Colors.text3,
  },
  checkTextDone: {
    color: Colors.green,
  },
});
