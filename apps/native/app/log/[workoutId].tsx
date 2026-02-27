import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { Colors } from "@/theme";

export default function LogSessionScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();

  return (
    <Container isScrollable={false}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: Colors.text1, fontFamily: "DMSans_600SemiBold", fontSize: 20 }}>
          Log Session
        </Text>
        <Text
          style={{
            color: Colors.text3,
            fontFamily: "DMSans_400Regular",
            fontSize: 14,
            marginTop: 4,
          }}
        >
          Workout: {workoutId}
        </Text>
      </View>
    </Container>
  );
}
