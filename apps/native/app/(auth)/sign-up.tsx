import { Link } from "expo-router";
import { Text, View } from "react-native";

import { SignUp } from "@/components/sign-up";
import { Colors } from "@/theme";

export default function SignUpScreen() {
  return (
    <View style={{ gap: 16 }}>
      <SignUp />
      <Link href="/(auth)/sign-in" style={{ alignSelf: "center" }}>
        <Text style={{ color: Colors.text2, fontSize: 14 }}>
          Already have an account? <Text style={{ color: Colors.accent }}>Sign in</Text>
        </Text>
      </Link>
    </View>
  );
}
