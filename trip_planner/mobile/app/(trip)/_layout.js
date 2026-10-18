import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, useRouter } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlan } from "../../src/PlanContext";
import { shareTrip } from "../../src/share";
import { useTheme } from "../../src/ThemeContext";
import { space } from "../../src/theme";

const TABS = [
  ["itinerary", "Itinerary", "map"],
  ["places", "Places", "images"],
  ["budget", "Budget", "wallet"],
];

export default function TripLayout() {
  const router = useRouter();
  const { plan, prefs } = usePlan();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  if (!plan) return <Redirect href="/" />;

  const goHome = () => (router.canDismiss() ? router.dismissAll() : router.replace("/"));

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.ink, fontWeight: "800", fontSize: 20 },
        headerTitleAlign: "center",
        headerLeft: () => (
          <Pressable onPress={goHome} hitSlop={8} style={{ paddingHorizontal: space.lg }} accessibilityLabel="Home">
            <Ionicons name="home-outline" size={22} color={colors.primary} />
          </Pressable>
        ),
        headerRight: () => (
          <View style={{ flexDirection: "row", gap: space.md, paddingHorizontal: space.lg }}>
            <Pressable onPress={() => shareTrip(plan, prefs)} hitSlop={8} accessibilityLabel="Share this trip">
              <Ionicons name="share-social-outline" size={22} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => router.push("/feedback")} hitSlop={8} accessibilityLabel="Rate this plan">
              <Ionicons name="star-outline" size={22} color={colors.accent} />
            </Pressable>
          </View>
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, height: 64 + insets.bottom, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {TABS.map(([name, title, icon]) => (
        <Tabs.Screen key={name} name={name} options={{
          title: name === "itinerary" ? "Your trip" : title,
          tabBarLabel: title,
          tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? icon : `${icon}-outline`} size={size} color={color} />,
        }} />
      ))}
    </Tabs>
  );
}
