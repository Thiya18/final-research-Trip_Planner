import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PlanProvider } from "../src/PlanContext";
import { ThemeProvider, useTheme } from "../src/ThemeContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PlanProvider>
          <AppStack />
        </PlanProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppStack() {
  const { colors, dark } = useTheme();
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.ink, fontWeight: "700" },
          contentStyle: { backgroundColor: colors.bg },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="plan/where" />
        <Stack.Screen name="plan/interests" />
        <Stack.Screen name="plan/details" />
        <Stack.Screen name="plan/style" />
        <Stack.Screen name="(trip)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="feedback" options={{ headerShown: true, title: "Rate this plan", presentation: "modal" }} />
        <Stack.Screen name="settings" options={{ headerShown: true, title: "Settings", presentation: "modal" }} />
      </Stack>
    </>
  );
}
