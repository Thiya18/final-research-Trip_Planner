import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { Card, PrimaryButton } from "../../src/components/ui";
import { usePlan } from "../../src/PlanContext";
import { shareTrip } from "../../src/share";
import { makeStyles, useTheme } from "../../src/ThemeContext";
import { lkr, radius, space } from "../../src/theme";

export default function BudgetTab() {
  const router = useRouter();
  const { plan, prefs } = usePlan();
  const styles = useStyles();
  const { colors, type, interestColors } = useTheme();
  const b = plan.budget;
  const parts = [
    ["Entrance fees", b.entrance_fees, colors.primary, "ticket"],
    ["Transport", b.transport, colors.accent, "car-sport"],
    ["Meals", b.meals, interestColors.religious, "restaurant"],
    ["Accommodation", b.accommodation, colors.good, "bed"],
  ];
  const usedShare = Math.min(1, b.total / Math.max(b.your_budget, 1));
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const goHome = () => (router.canDismiss() ? router.dismissAll() : router.replace("/"));

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroLabel}>Estimated total</Text>
        <Text style={styles.total} adjustsFontSizeToFit numberOfLines={1}>{lkr(b.total)}</Text>
        <Text style={styles.heroSub}>
          {lkr(b.per_person)} per person · {prefs.group_size} {prefs.group_size === 1 ? "person" : "people"} · {plural(prefs.trip_days, "day")}
        </Text>

        <View style={[styles.status, { backgroundColor: b.within_budget ? colors.good : colors.bad }]}>
          <Ionicons name={b.within_budget ? "checkmark-circle" : "alert-circle"} size={16} color="#fff" />
          <Text style={styles.statusText}>{b.within_budget ? "Within your budget" : "Over your budget"}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${usedShare * 100}%`, backgroundColor: b.within_budget ? colors.gold : colors.coral }]} />
        </View>
        <Text style={styles.heroSub}>Your budget: {lkr(b.your_budget)}</Text>
      </LinearGradient>

      <Card style={{ marginTop: space.lg }}>
        <Text style={[type.h2, { marginBottom: space.md }]}>Where the money goes</Text>
        <View style={styles.stack}>
          {parts.map(([k, v, c]) => (v > 0 ? <View key={k} style={{ flex: v, backgroundColor: c }} /> : null))}
        </View>
        {parts.map(([k, v, c, icon], i) => (
          <View key={k} style={[styles.line, i === parts.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[styles.lineIcon, { backgroundColor: c + "1F" }]}><Ionicons name={icon} size={18} color={c} /></View>
            <Text style={[type.body, { flex: 1 }]}>{k}</Text>
            <Text style={[type.body, { fontWeight: "800" }]}>{lkr(v)}</Text>
          </View>
        ))}
      </Card>

      <View style={styles.facts}>
        <Fact icon="speedometer-outline" text={`${b.total_km} km`} />
        <Fact icon="moon-outline" text={plural(b.nights, "night")} />
        <Fact icon="key-outline" text={plural(b.rooms, "room")} />
        <Fact icon="pricetag-outline" text={`${b.budget_level} prices`} />
      </View>
      {b.note ? <Text style={[type.small, { marginTop: space.md, textAlign: "center" }]}>{b.note}</Text> : null}

      <View style={{ gap: space.md, marginTop: space.xl }}>
        <PrimaryButton title="Rate this plan" icon="star" variant="accent" onPress={() => router.push("/feedback")} />
        <PrimaryButton title="Share this trip" icon="share-social" variant="secondary" onPress={() => shareTrip(plan, prefs)} />
        <PrimaryButton title="Plan another trip" icon="refresh" variant="secondary" onPress={goHome} />
      </View>
    </ScrollView>
  );
}

function Fact({ icon, text }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={15} color={colors.primary} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow, dark }) => ({
  hero: { borderRadius: radius.lg, padding: space.xl, ...shadow },
  heroLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  total: { color: "#fff", fontSize: 38, fontWeight: "800", marginVertical: 4 },
  heroSub: { color: "rgba(255,255,255,0.88)", fontSize: 14 },
  status: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 6, marginTop: space.lg },
  statusText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  track: { height: 10, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 5, overflow: "hidden", marginVertical: space.md },
  fill: { height: 10, borderRadius: 5 },
  stack: { flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden", marginBottom: space.sm },
  line: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  lineIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.lg, justifyContent: "center" },
  fact: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primarySoft, borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 7 },
  factText: { fontSize: 13, fontWeight: "700", color: dark ? colors.ink : colors.primaryDark },
}));
