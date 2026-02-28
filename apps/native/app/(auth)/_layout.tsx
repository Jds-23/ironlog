import { Stack } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/theme";

export default function AuthLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.bg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        justifyContent: "center",
        paddingHorizontal: 24,
      }}
    >
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
