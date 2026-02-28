import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { Workout } from "@/types/workout";
import { Colors, RADIUS_CARD, RADIUS_INPUT, TAP_MIN } from "@/theme";
import { trpc } from "@/utils/trpc";

import { ExerciseAutocomplete } from "./exercise-autocomplete";

type FormSet = { localId: string; weight: string; targetReps: string };
type FormExercise = { localId: string; name: string; sets: FormSet[] };

type Props = {
  visible: boolean;
  onClose: () => void;
  editWorkout: Workout | null;
};

function makeSet(): FormSet {
  return { localId: String(Date.now()) + String(Math.random()), weight: "", targetReps: "" };
}

function makeExercise(name: string): FormExercise {
  return { localId: String(Date.now()) + String(Math.random()), name, sets: [makeSet()] };
}

export function WorkoutFormSheet({ visible, onClose, editWorkout }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [exercises, setExercises] = useState<FormExercise[]>([]);
  const [searchText, setSearchText] = useState("");

  const createMutation = useMutation({
    mutationFn: trpc.workout.create.mutationOptions().mutationFn!,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout", "list"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: trpc.workout.update.mutationOptions().mutationFn!,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout", "list"] });
    },
  });

  useEffect(() => {
    if (!visible) return;
    if (editWorkout) {
      setTitle(editWorkout.title);
      setExercises(
        editWorkout.exercises.map((ex) => ({
          localId: String(ex.id),
          name: ex.name,
          sets: ex.sets.map((s) => ({
            localId: String(s.id),
            weight: s.weight != null ? String(s.weight) : "",
            targetReps: s.targetReps != null ? String(s.targetReps) : "",
          })),
        })),
      );
    } else {
      setTitle("");
      setExercises([]);
    }
    setSearchText("");
  }, [visible, editWorkout]);

  function handleAddExercise(name: string) {
    setExercises((prev) => [...prev, makeExercise(name)]);
    setSearchText("");
  }

  function handleRemoveExercise(localId: string) {
    setExercises((prev) => prev.filter((e) => e.localId !== localId));
  }

  function handleAddSet(exerciseLocalId: string) {
    setExercises((prev) =>
      prev.map((e) => (e.localId === exerciseLocalId ? { ...e, sets: [...e.sets, makeSet()] } : e)),
    );
  }

  function handleRemoveSet(exerciseLocalId: string, setLocalId: string) {
    setExercises((prev) =>
      prev.map((e) =>
        e.localId === exerciseLocalId
          ? { ...e, sets: e.sets.filter((s) => s.localId !== setLocalId) }
          : e,
      ),
    );
  }

  function handleSetField(
    exerciseLocalId: string,
    setLocalId: string,
    field: "weight" | "targetReps",
    value: string,
  ) {
    setExercises((prev) =>
      prev.map((e) =>
        e.localId === exerciseLocalId
          ? {
              ...e,
              sets: e.sets.map((s) => (s.localId === setLocalId ? { ...s, [field]: value } : s)),
            }
          : e,
      ),
    );
  }

  function handleSave() {
    if (!title.trim()) return;

    const exerciseInputs = exercises.map((fe) => ({
      name: fe.name,
      sets: fe.sets.map((fs) => ({
        weight: fs.weight ? Number(fs.weight) : null,
        targetReps: fs.targetReps ? Number(fs.targetReps) : null,
      })),
    }));

    const input = { title: title.trim(), exercises: exerciseInputs };

    if (editWorkout) {
      updateMutation.mutate({ ...input, id: editWorkout.id });
    } else {
      createMutation.mutate(input);
    }
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.dragHandle} />
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sheetTitle}>{editWorkout ? "Edit Workout" : "New Workout"}</Text>

          {/* Workout name */}
          <Text style={styles.label}>Workout Name</Text>
          <TextInput
            style={styles.nameInput}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Push Day"
            placeholderTextColor={Colors.text4}
          />

          {/* Add exercise */}
          <Text style={[styles.label, { marginTop: 20 }]}>Add Exercise</Text>
          <View style={styles.addExRow}>
            <ExerciseAutocomplete
              value={searchText}
              onChangeText={setSearchText}
              onSelect={handleAddExercise}
            />
            <Pressable
              style={styles.addExBtn}
              onPress={() => {
                if (searchText.trim()) handleAddExercise(searchText.trim());
              }}
            >
              <Text style={styles.addExBtnText}>+ Add</Text>
            </Pressable>
          </View>

          {/* Exercise blocks */}
          {exercises.map((ex) => (
            <View key={ex.localId} style={styles.exBlock}>
              <View style={styles.exHeader}>
                <Text style={styles.exName}>{ex.name}</Text>
                <Pressable onPress={() => handleRemoveExercise(ex.localId)} hitSlop={8}>
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              </View>

              {/* Set header */}
              <View style={styles.setRow}>
                <Text style={[styles.setLabel, { flex: 0.5 }]}>Set</Text>
                <Text style={[styles.setLabel, { flex: 1 }]}>Weight</Text>
                <Text style={[styles.setLabel, { flex: 1 }]}>Reps</Text>
                <View style={{ width: 28 }} />
              </View>

              {ex.sets.map((set, si) => (
                <View key={set.localId} style={styles.setRow}>
                  <Text style={[styles.setNum, { flex: 0.5 }]}>{si + 1}</Text>
                  <TextInput
                    style={[styles.setInput, { flex: 1 }]}
                    value={set.weight}
                    onChangeText={(v) => handleSetField(ex.localId, set.localId, "weight", v)}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.text4}
                  />
                  <TextInput
                    style={[styles.setInput, { flex: 1 }]}
                    value={set.targetReps}
                    onChangeText={(v) => handleSetField(ex.localId, set.localId, "targetReps", v)}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.text4}
                  />
                  <Pressable
                    onPress={() => handleRemoveSet(ex.localId, set.localId)}
                    hitSlop={8}
                    style={{ width: 28, alignItems: "center" }}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </Pressable>
                </View>
              ))}

              <Pressable style={styles.addSetBtn} onPress={() => handleAddSet(ex.localId)}>
                <Text style={styles.addSetText}>+ Add Set</Text>
              </Pressable>
            </View>
          ))}

          {/* Save button */}
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>
              {editWorkout ? "Update Workout" : "Save Workout"}
            </Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "92%",
    backgroundColor: Colors.surface1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border2,
    alignSelf: "center",
    marginBottom: 8,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  sheetTitle: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 24,
    color: Colors.text1,
    marginBottom: 16,
  },
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: Colors.text3,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  nameInput: {
    backgroundColor: Colors.surface2,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: RADIUS_INPUT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: Colors.text1,
  },
  addExRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    zIndex: 50,
  },
  addExBtn: {
    backgroundColor: Colors.accent,
    borderRadius: RADIUS_INPUT,
    paddingHorizontal: 14,
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  addExBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: Colors.bg,
  },
  exBlock: {
    backgroundColor: Colors.surface2,
    borderRadius: RADIUS_CARD,
    padding: 12,
    marginTop: 14,
  },
  exHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  exName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: Colors.text1,
  },
  removeText: {
    color: Colors.red,
    fontSize: 16,
    fontFamily: "DMSans_500Medium",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  setLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: Colors.text3,
    textTransform: "uppercase",
  },
  setNum: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: Colors.text2,
    textAlign: "center",
  },
  setInput: {
    backgroundColor: Colors.surface3,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.text1,
    textAlign: "center",
  },
  addSetBtn: {
    borderWidth: 1,
    borderStyle: Platform.OS === "android" ? "solid" : "dashed",
    borderColor: Colors.border2,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 4,
  },
  addSetText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: Colors.text3,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: RADIUS_CARD,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 20,
    color: Colors.bg,
  },
});
