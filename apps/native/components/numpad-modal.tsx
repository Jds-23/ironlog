import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, RADIUS_CARD, TAP_MIN } from "@/theme";
import {
  type NumpadKey,
  type NumpadMode,
  formatNumpadDisplay,
  processNumpadInput,
} from "@/utils/numpad";

type Props = {
  visible: boolean;
  mode: NumpadMode;
  initialValue: string;
  label: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

const DIGIT_KEYS: NumpadKey[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

export function NumpadModal({ visible, mode, initialValue, label, onConfirm, onClose }: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  function handleKey(key: NumpadKey) {
    setValue((prev) => processNumpadInput(prev, key, mode));
  }

  function handleConfirm() {
    if (value === "") return;
    onConfirm(value);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.label}>{label}</Text>
          <Pressable onPress={onClose} hitSlop={8} testID="numpad-close">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.display} testID="numpad-display">
          {formatNumpadDisplay(value)}
        </Text>
        <Text style={styles.unit}>{mode === "weight" ? "lbs" : "reps"}</Text>

        <View style={styles.grid}>
          {DIGIT_KEYS.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map((key) => (
                <Pressable
                  key={key}
                  style={styles.key}
                  onPress={() => handleKey(key)}
                  testID={`numpad-key-${key}`}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </Pressable>
              ))}
            </View>
          ))}
          <View style={styles.row}>
            {mode === "weight" ? (
              <Pressable style={styles.key} onPress={() => handleKey(".")} testID="numpad-key-dot">
                <Text style={styles.keyText}>.</Text>
              </Pressable>
            ) : (
              <View style={styles.key} />
            )}
            <Pressable style={styles.key} onPress={() => handleKey("0")} testID="numpad-key-0">
              <Text style={styles.keyText}>0</Text>
            </Pressable>
            <Pressable
              style={styles.key}
              onPress={() => handleKey("backspace")}
              testID="numpad-backspace"
            >
              <Text style={styles.keyText}>⌫</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmText}>Confirm</Text>
        </Pressable>
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
    backgroundColor: Colors.surface1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: Colors.text2,
  },
  closeText: {
    color: Colors.text3,
    fontSize: 18,
    fontFamily: "DMSans_500Medium",
  },
  display: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 56,
    color: Colors.text1,
    textAlign: "center",
    marginVertical: 4,
  },
  unit: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.text3,
    textAlign: "center",
    marginBottom: 16,
  },
  grid: {
    gap: 8,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  key: {
    flex: 1,
    minHeight: TAP_MIN,
    backgroundColor: Colors.surface3,
    borderRadius: RADIUS_CARD,
    justifyContent: "center",
    alignItems: "center",
  },
  keyText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 22,
    color: Colors.text1,
  },
  confirmBtn: {
    backgroundColor: Colors.accent,
    borderRadius: RADIUS_CARD,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmText: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 20,
    color: Colors.bg,
  },
});
