import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PhotoCard, PrimaryButton } from "../src/components/ui";
import { heroImage, regionImages } from "../src/images";
import { usePlan } from "../src/PlanContext";
import { makeStyles, useTheme } from "../src/ThemeContext";
import { labels, lkr, months, radius, space } from "../src/theme";

const tripDate = (trip) => {
  const d = new Date(trip.savedAt);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const STEPS = [
  ["sparkles", "Smart picks", "accent"],
  ["navigate", "Best route", "primary"],
  ["wallet", "Cost estimate", "maroon"],
];

export default function HomeScreen() {
  const router = useRouter();
  const { update, trips, openTrip, deleteTrip } = usePlan();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const styles = useStyles();
  const { colors, type, dark } = useTheme();

  // white status bar text over the hero photo
  useFocusEffect(useCallback(() => {
    StatusBar.setStyle("light");
    return () => StatusBar.setStyle(dark ? "light" : "dark");
  }, [dark]));

  const resume = (trip) => {
    openTrip(trip);
    router.push("/itinerary");
  };
  const remove = (trip) => {
    if (Platform.OS === "web") return deleteTrip(trip.id);
    Alert.alert("Delete this trip?", `${trip.prefs.region} · ${tripDate(trip)}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteTrip(trip.id) },
    ]);
  };

  const pickRegion = (region) => {
    update({ region });
    router.push("/plan/interests");
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} bounces={false} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}>
      <PhotoCard source={heroImage} height={Math.max(360, height * 0.55)} rounded={false}>
        <LinearGradient colors={["rgba(0,0,0,0.45)", "transparent"]} style={styles.topShade} />
        <Pressable onPress={() => router.push("/settings")} style={[styles.gear, { top: insets.top + space.sm }]}
          accessibilityRole="button" accessibilityLabel="Settings" hitSlop={8}>
          <Ionicons name="settings-outline" size={20} color="#fff" />
        </Pressable>
        <View style={styles.heroText}>
          <Text style={styles.hello}>Ayubowan! 🙏</Text>
          <Text style={type.hero}>Discover{"\n"}Sri Lanka</Text>
          <Text style={styles.heroSub}>Your personal trip plan in 4 quick steps.</Text>
        </View>
      </PhotoCard>

      <View style={styles.sheet}>
        <PrimaryButton title="Start planning" icon="arrow-forward" variant="accent" onPress={() => router.push("/plan/where")} />

        {trips.length ? (
          <View style={{ marginTop: space.xl }}>
            <Text style={[type.h2, { marginBottom: space.md }]}>My trips</Text>
            {trips.map((trip) => (
              <Pressable key={trip.id} onPress={() => resume(trip)} onLongPress={() => remove(trip)} style={styles.resume}
                accessibilityRole="button" accessibilityHint="Opens this trip. Long press to delete.">
                <Image source={regionImages[trip.prefs.region]} style={styles.tripThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontWeight: "700" }]} numberOfLines={1}>{trip.prefs.region}</Text>
                  <Text style={type.small} numberOfLines={1}>
                    {trip.plan.itinerary.length} {trip.plan.itinerary.length === 1 ? "day" : "days"} · {trip.plan.metrics.n_stops} places · {lkr(trip.plan.budget.total)}
                  </Text>
                  <Text style={[type.small, { fontSize: 11 }]}>Saved {tripDate(trip)}</Text>
                </View>
                <Pressable onPress={() => remove(trip)} hitSlop={8} accessibilityLabel="Delete trip" style={styles.trash}>
                  <Ionicons name="trash-outline" size={18} color={colors.muted} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.steps}>
          {STEPS.map(([icon, label, key]) => { const c = colors[key]; return (
            <View key={label} style={styles.step}>
              <View style={[styles.stepIcon, { backgroundColor: c + "1F" }]}><Ionicons name={icon} size={20} color={c} /></View>
              <Text style={styles.stepLabel}>{label}</Text>
            </View>
          ); })}
        </View>

        <Text style={[type.h2, { marginBottom: space.md }]}>Explore by region</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
        {Object.keys(labels.regions).map((region) => (
          <Pressable key={region} onPress={() => pickRegion(region)} accessibilityRole="button"
            style={({ pressed }) => [styles.regionCard, pressed && { transform: [{ scale: 0.97 }] }]}>
            <PhotoCard source={regionImages[region]} height={230}>
              <View style={{ padding: space.md }}>
                <Text style={styles.regionName}>{region}</Text>
                <Text style={styles.regionTag}>{labels.regionTaglines[region]}</Text>
              </View>
            </PhotoCard>
          </Pressable>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  topShade: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  gear: { position: "absolute", right: space.lg, width: 40, height: 40, borderRadius: 20, alignItems: "center",
    justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" },
  heroText: { padding: space.xl, paddingBottom: space.xxl + space.lg },
  hello: { color: colors.gold, fontSize: 16, fontWeight: "700", marginBottom: space.xs },
  heroSub: { color: "rgba(255,255,255,0.92)", fontSize: 16, marginTop: space.sm },
  sheet: { marginTop: -space.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.bg,
    paddingHorizontal: space.lg, paddingTop: space.xl },
  resume: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.sm, padding: space.sm,
    backgroundColor: colors.card, borderRadius: radius.lg, ...shadow },
  tripThumb: { width: 56, height: 56, borderRadius: radius.md },
  trash: { padding: space.xs },
  steps: { flexDirection: "row", justifyContent: "space-between", marginVertical: space.xl },
  step: { flex: 1, alignItems: "center", gap: 6 },
  stepIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  stepLabel: { fontSize: 13, fontWeight: "600", color: colors.ink },
  carousel: { paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.md },
  regionCard: { width: 210, borderRadius: radius.lg, ...shadow },
  regionName: { color: "#fff", fontSize: 18, fontWeight: "800" },
  regionTag: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 2 },
}));
