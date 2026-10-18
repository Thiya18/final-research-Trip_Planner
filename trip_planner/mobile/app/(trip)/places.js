import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Badge, Chip, ChipRow, crowdTone, Notice, PhotoCard } from "../../src/components/ui";
import { placeImage } from "../../src/images";
import { usePlan } from "../../src/PlanContext";
import { makeStyles, useTheme } from "../../src/ThemeContext";
import { icons, labels, lkr, months, radius, space } from "../../src/theme";

export default function PlacesTab() {
  const { plan, prefs } = usePlan();
  const styles = useStyles();
  const { colors, type, interestColors } = useTheme();
  const [onlyPlan, setOnlyPlan] = useState(false);
  const [open, setOpen] = useState(null);

  const inPlan = new Set(plan.itinerary.flatMap((d) => d.stops.map((s) => s.dest_id)));
  const data = onlyPlan ? plan.recommendations.filter((r) => inPlan.has(r.dest_id)) : plan.recommendations;

  const header = (
    <View style={{ marginBottom: space.md }}>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>
        Best matches in the <Text style={{ fontWeight: "700", color: colors.ink }}>{prefs.region}</Text> for{" "}
        {prefs.interests.map((i) => labels.interests[i].toLowerCase()).join(", ")}.
      </Text>
      {plan.warnings.map((w) => <Notice key={w} text={w} />)}
      <ChipRow>
        <Chip label={`All ${plan.recommendations.length}`} selected={!onlyPlan} onPress={() => setOnlyPlan(false)} />
        <Chip label={`In your plan ${inPlan.size}`} icon="checkmark-circle" selected={onlyPlan} onPress={() => setOnlyPlan(true)}
          color={colors.accent} />
      </ChipRow>
    </View>
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(r) => r.dest_id}
      contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={{ height: space.lg }} />}
      renderItem={({ item }) => {
        const rank = plan.recommendations.indexOf(item) + 1;
        const pct = Math.round(item.score * 100);
        const catColor = interestColors[item.category] ?? colors.primary;
        const expanded = open === item.dest_id;
        return (
          <Pressable onPress={() => setOpen(expanded ? null : item.dest_id)} style={styles.card} accessibilityRole="button"
            accessibilityHint="Shows the full description">
            <PhotoCard source={placeImage(item.dest_id, item.category)} height={180} topOnly>
              <View style={styles.rank}><Text style={styles.rankText}>#{rank}</Text></View>
              {inPlan.has(item.dest_id) ? (
                <View style={styles.inPlan}>
                  <Ionicons name="checkmark-circle" size={14} color={ON_GOLD} />
                  <Text style={styles.inPlanText}>In your plan</Text>
                </View>
              ) : null}
              <View style={{ padding: space.md }}>
                <View style={[styles.cat, { backgroundColor: catColor }]}>
                  <Ionicons name={icons.interests[item.category] ?? "pin"} size={12} color="#fff" />
                  <Text style={styles.catText}>{labels.interests[item.category] ?? item.category}</Text>
                </View>
                <Text style={styles.name}>{item.name}</Text>
              </View>
            </PhotoCard>

            <View style={styles.body}>
              <View style={styles.facts}>
                <Fact icon="time-outline" text={`${Math.round(item.visit_min / 6) / 10} h`} />
                <Fact icon="ticket-outline" text={item.fee_lkr ? lkr(item.fee_lkr) : "Free"} />
                <Badge text={`${item.crowd_level} crowds`} tone={crowdTone(item.crowd_level)} />
                {!item.in_season ? <Badge text="Off season" tone="warn" icon="rainy" /> : null}
              </View>

              <View style={styles.matchRow}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${pct}%`, backgroundColor: catColor }]} />
                </View>
                <Text style={[styles.matchText, { color: catColor }]}>{pct}% match</Text>
              </View>

              <Text style={[type.small, { marginTop: space.sm }]} numberOfLines={expanded ? undefined : 2}>{item.description}</Text>
              {expanded ? <WhyPanel item={item} prefs={prefs} /> : null}
              <Text style={styles.more}>{expanded ? "Show less" : "Read more · why this place?"}</Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

// Score = 80% preference (60% description match + 40% interest category, lowered off season) + 20% crowd fit.
// Mirrors REC_WEIGHTS / REC_CROWD_SHARE in backend/core/config.py.
const PARTS = [
  ["semantic", "Description match", 0.48, "text-outline"],
  ["category_match", "Interest category", 0.32, "pricetags-outline"],
  ["crowd_fit_true", "Crowd fit", 0.2, "people-outline"],
];

function WhyPanel({ item, prefs }) {
  const styles = useStyles();
  const { colors, type } = useTheme();
  if (item.semantic == null) return null; // trips saved before the backend sent these fields

  const month = months[prefs.travel_month - 1];
  const crowdPref = labels.crowd[prefs.crowd_preference].toLowerCase();
  const reasons = [];
  if (item.category_match === 1) {
    reasons.push(["checkmark-circle", colors.good, `Matches your interest: ${labels.interests[item.category]}`]);
  } else if (item.category_match > 0) {
    reasons.push(["git-merge-outline", colors.primary, `Related to what you like: ${item.matched_tags.join(", ")}`]);
  }
  if (item.category_match === 1 && item.matched_tags.length) {
    reasons.push(["pricetag-outline", colors.primary, `Also tagged ${item.matched_tags.join(", ")}`]);
  }
  if (prefs.crowd_preference !== "no_preference") {
    const fit = item.crowd_fit_true;
    reasons.push(fit >= 0.7
      ? ["happy-outline", colors.good, `${item.crowd_level} crowds in ${month} suit your "${crowdPref}" preference`]
      : ["alert-circle-outline", colors.warn, `${item.crowd_level} crowds in ${month}, less ideal for "${crowdPref}"`]);
  }
  reasons.push(item.in_season
    ? ["sunny-outline", colors.good, `Good season to visit in ${month}`]
    : ["rainy-outline", colors.warn, `Off season in ${month}, so it ranks 15% lower`]);

  return (
    <View style={styles.why}>
      <Text style={[type.label, { marginBottom: space.sm }]}>Why this place?</Text>
      {reasons.map(([icon, c, text]) => (
        <View key={text} style={styles.reason}>
          <Ionicons name={icon} size={16} color={c} />
          <Text style={[type.small, { flex: 1, color: colors.ink }]}>{text}</Text>
        </View>
      ))}
      <Text style={[type.label, { marginTop: space.md, marginBottom: space.sm }]}>Score breakdown</Text>
      {PARTS.map(([key, label, weight, icon]) => {
        const v = item[key] ?? 0;
        return (
          <View key={key} style={styles.part}>
            <Ionicons name={icon} size={14} color={colors.muted} />
            <Text style={styles.partLabel}>{label}</Text>
            <View style={styles.partTrack}>
              <View style={[styles.partFill, { width: `${Math.round(v * 100)}%` }]} />
            </View>
            <Text style={styles.partValue}>{Math.round(v * 100)}%</Text>
          </View>
        );
      })}
      <Text style={[type.small, { fontSize: 11, marginTop: 4 }]}>
        Weights: {PARTS.map(([, l, w]) => `${l.split(" ")[0].toLowerCase()} ${Math.round(w * 100)}%`).join(" · ")}
      </Text>
    </View>
  );
}

function Fact({ icon, text }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={15} color={colors.muted} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

const ON_GOLD = "#1D2A2B"; // dark text on the gold badge in both themes

const useStyles = makeStyles(({ colors, shadow }) => ({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, ...shadow },
  rank: { position: "absolute", top: space.md, left: space.md, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 4 },
  rankText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  inPlan: { position: "absolute", top: space.md, right: space.md, flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  inPlanText: { color: ON_GOLD, fontWeight: "800", fontSize: 12 },
  cat: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  catText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  name: { color: "#fff", fontSize: 21, fontWeight: "800" },
  body: { padding: space.lg, paddingTop: space.md },
  facts: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.md },
  fact: { flexDirection: "row", alignItems: "center", gap: 4 },
  factText: { fontSize: 13, color: colors.ink, fontWeight: "600" },
  matchRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md },
  track: { flex: 1, height: 8, backgroundColor: colors.line, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  matchText: { fontSize: 13, fontWeight: "800" },
  why: { marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.bg },
  reason: { flexDirection: "row", alignItems: "flex-start", gap: space.sm, marginBottom: 6 },
  part: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  partLabel: { width: 112, fontSize: 12, color: colors.ink, fontWeight: "600" },
  partTrack: { flex: 1, height: 6, backgroundColor: colors.line, borderRadius: 3, overflow: "hidden" },
  partFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  partValue: { width: 36, textAlign: "right", fontSize: 12, fontWeight: "700", color: colors.ink },
  more: { color: colors.primary, fontWeight: "700", fontSize: 13, marginTop: 4 },
}));
