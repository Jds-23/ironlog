import "@/global.css";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { WorkoutProvider } from "@/contexts/workout-context";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function StackLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="workout/[id]" />
      <Stack.Screen name="log/[workoutId]" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="session/[id]" />
    </Stack>
  );
}

export default function Layout() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AppThemeProvider>
              <WorkoutProvider>
                <HeroUINativeProvider>
                  <StackLayout />
                </HeroUINativeProvider>
              </WorkoutProvider>
            </AppThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
