import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Colors, RADIUS_INPUT } from "@/theme";
import { filterExercises, highlightMatch } from "@/utils/exercises";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (name: string) => void;
};

export function ExerciseAutocomplete({ value, onChangeText, onSelect }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const results = filterExercises(value);

  function handleFocus() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowDropdown(true);
  }

  function handleBlur() {
    timeoutRef.current = setTimeout(() => setShowDropdown(false), 150);
  }

  function handleSelect(name: string) {
    onSelect(name);
    setShowDropdown(false);
  }

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search exercise…"
        placeholderTextColor={Colors.text4}
      />
      {showDropdown && results.length > 0 && (
        <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {results.map((name) => {
            const parts = highlightMatch(name, value);
            return (
              <Pressable key={name} style={styles.item} onPress={() => handleSelect(name)}>
                <Text style={styles.itemText}>
                  {parts.before}
                  <Text style={styles.highlight}>{parts.match}</Text>
                  {parts.after}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 50,
    flex: 1,
  },
  input: {
    backgroundColor: Colors.surface2,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: RADIUS_INPUT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.text1,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: Colors.surface3,
    borderRadius: RADIUS_INPUT,
    borderColor: Colors.border,
    borderWidth: 1,
    marginTop: 4,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.text2,
  },
  highlight: {
    color: Colors.accent,
    fontFamily: "DMSans_700Bold",
  },
});
