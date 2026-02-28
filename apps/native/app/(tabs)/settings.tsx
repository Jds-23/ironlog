import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";
import { Colors } from "@/theme";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    queryClient.clear();
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.bg,
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
      }}
    >
      <Text
        style={{
          color: Colors.text1,
          fontSize: 28,
          fontFamily: "DMSans_600SemiBold",
          marginBottom: 32,
        }}
      >
        Settings
      </Text>

      <View style={{ backgroundColor: Colors.surface1, borderRadius: 12, padding: 16, gap: 12 }}>
        <Text style={{ color: Colors.text2, fontSize: 13, textTransform: "uppercase" }}>
          Account
        </Text>
        <Text style={{ color: Colors.text1, fontSize: 16 }}>{session?.user?.email}</Text>
      </View>

      <Pressable
        onPress={handleSignOut}
        style={{
          marginTop: 24,
          backgroundColor: Colors.surface1,
          borderRadius: 12,
          padding: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: Colors.red, fontSize: 16, fontFamily: "DMSans_600SemiBold" }}>
          Sign Out
        </Text>
      </Pressable>
    </View>
  );
}
