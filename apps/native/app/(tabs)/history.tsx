import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { Colors } from "@/theme";

export default function HistoryScreen() {
  return (
    <Container isScrollable={false}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: Colors.text1, fontFamily: "DMSans_600SemiBold", fontSize: 20 }}>
          History
        </Text>
      </View>
    </Container>
  );
}
