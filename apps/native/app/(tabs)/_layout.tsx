import { Tabs } from "expo-router";

import { CustomTabBar } from "@/components/custom-tab-bar";

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="workouts" options={{ title: "Workouts" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
    </Tabs>
  );
}
