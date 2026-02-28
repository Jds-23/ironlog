import { Link } from "expo-router";
import { Text, View } from "react-native";

import { SignIn } from "@/components/sign-in";
import { Colors } from "@/theme";

export default function SignInScreen() {
  return (
    <View style={{ gap: 16 }}>
      <SignIn />
      <Link href="/(auth)/sign-up" style={{ alignSelf: "center" }}>
        <Text style={{ color: Colors.text2, fontSize: 14 }}>
          Don't have an account? <Text style={{ color: Colors.accent }}>Create account</Text>
        </Text>
      </Link>
    </View>
  );
}
