import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { Colors } from "@/theme";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Container isScrollable={false}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: Colors.text1, fontFamily: "DMSans_600SemiBold", fontSize: 20 }}>
          Workout Detail
        </Text>
        <Text
          style={{
            color: Colors.text3,
            fontFamily: "DMSans_400Regular",
            fontSize: 14,
            marginTop: 4,
          }}
        >
          ID: {id}
        </Text>
      </View>
    </Container>
  );
}
