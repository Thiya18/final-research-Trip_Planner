import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import TripMap from "../../src/components/TripMap";
import { Badge, Card, Chip, crowdTone, PrimaryButton } from "../../src/components/ui";
import { placeImage } from "../../src/images";
import { usePlan } from "../../src/PlanContext";
import { makeStyles, useTheme } from "../../src/ThemeContext";
import { icons, labels, radius, space } from "../../src/theme";

const hrs = (min) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}` : `${min} min`);

export default function ItineraryTab() {
  const router = useRouter();
  const { plan, prefs } = usePlan();
  const styles = useStyles();
  const { colors, type, interestColors, dayColors } = useTheme();
  const dayColor = (d) => dayColors[(d - 1) % dayColors.length];
  const [day, setDay] = useState(plan.itinerary[0]?.day ?? 1);
  const m = plan.metrics;

  // stop numbers run across the whole trip so they match the map pins
  const firstNumber = {};
  plan.itinerary.reduce((n, d) => ((firstNumber[d.day] = n), n + d.stops.length), 1);
  const current = plan.itinerary.find((d) => d.day === day) ?? plan.itinerary[0];
  const color = dayColor(current.day);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }} showsVerticalScrollIndicator={false}>
      <View style={styles.map}>
        <TripMap start={plan.start} days={plan.itinerary} selectedDay={current.day} />
      </View>

      <View style={styles.stats}>
        <Stat icon="location" color={colors.primary} value={m.n_stops} label="places" />
        <Stat icon={icons.transport[prefs.transport_mode]} color={colors.accent} value={hrs(m.total_travel_min)} label="on the road" />
        <Stat icon="people" color={colors.good} value={`${Math.round(m.crowd_suitability * 100)}%`} label="crowd fit" />
      </View>

      <View style={{ paddingHorizontal: space.lg }}>
        {plan.itinerary.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }}
            contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md }}>
            {plan.itinerary.map((d) => (
              <Chip key={d.day} label={`Day ${d.day}`} icon="sunny" selected={d.day === current.day}
                onPress={() => setDay(d.day)} color={dayColor(d.day)} />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.dayHead}>
          <Text style={[type.title, { color }]}>Day {current.day}</Text>
          {current.stops.length ? (
            <Text style={type.small}>{current.stops.length} places · {current.stops[0].arrive} – {current.stops.at(-1).leave}</Text>
          ) : null}
        </View>

        {current.stops.length === 0 ? (
          <Card style={{ alignItems: "center", gap: space.sm }}>
            <Ionicons name="cafe-outline" size={32} color={colors.accent} />
            <Text style={[type.body, { textAlign: "center" }]}>A free day to relax. Nothing else fits your time and budget.</Text>
          </Card>
        ) : current.stops.map((s, i) => (
          <View key={s.dest_id}>
            <View style={styles.leg}>
              <View style={[styles.legLine, { backgroundColor: color + "55" }]} />
              <Ionicons name={s.travel_min > 0 ? icons.transport[prefs.transport_mode] : "flag"} size={14} color={colors.muted} />
              <Text style={styles.legText}>
                {s.travel_min > 0 ? `${hrs(s.travel_min)} · ${s.leg_km} km` : `Start from ${s.from}`}
              </Text>
            </View>
            <View style={styles.stop}>
              <View style={styles.timeCol}>
                <Text style={styles.time}>{s.arrive}</Text>
                <Text style={styles.timeEnd}>{s.leave}</Text>
              </View>
              <View style={[styles.num, { backgroundColor: color }]}>
                <Text style={styles.numText}>{firstNumber[current.day] + i}</Text>
              </View>
              <View style={styles.stopCard}>
                <Image source={placeImage(s.dest_id, s.category)} style={styles.thumb} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[type.body, { fontWeight: "700" }]} numberOfLines={2}>{s.name}</Text>
                  <Text style={[styles.cat, { color: interestColors[s.category] ?? colors.muted }]}>
                    {labels.interests[s.category] ?? s.category} · {hrs(s.visit_min)}
                  </Text>
                  <Badge text={`${s.crowd_level} crowds`} tone={crowdTone(s.crowd_level)} />
                </View>
              </View>
            </View>
          </View>
        ))}

        <PrimaryButton title="See the cost" icon="wallet-outline" variant="secondary" style={{ marginTop: space.xl }}
          onPress={() => router.navigate("/budget")} />
        <Text style={[type.small, styles.meta]}>
          Planned by {labels.methods[plan.method]} in {plan.response_ms} ms · starts at {plan.start.name}
        </Text>
      </View>
    </ScrollView>
  );
}

function Stat({ icon, color, value, label }) {
  const styles = useStyles();
  const { type } = useTheme();
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: color + "1F" }]}><Ionicons name={icon} size={18} color={color} /></View>
      <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={type.small}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  map: { height: 260, backgroundColor: colors.primarySoft },
  stats: { flexDirection: "row", gap: space.sm, marginTop: -space.xxl, paddingHorizontal: space.lg, marginBottom: space.lg },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, alignItems: "center", gap: 2, ...shadow },
  statIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statValue: { fontSize: 17, fontWeight: "800" },
  dayHead: { marginBottom: space.xs, gap: 2 },
  // the connector line sits under the centre of the numbered circle (time column 46 + gap 8 + radius 13)
  leg: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 54, paddingLeft: 34, paddingVertical: 8 },
  legLine: { position: "absolute", left: 11.5, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  legText: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  stop: { flexDirection: "row", alignItems: "center", gap: space.sm },
  timeCol: { width: 46, alignItems: "flex-end" },
  time: { fontWeight: "800", color: colors.ink, fontSize: 14 },
  timeEnd: { color: colors.muted, fontSize: 12 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.card },
  numText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  stopCard: { flex: 1, flexDirection: "row", gap: space.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.sm,
    alignItems: "center", ...shadow },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  cat: { fontSize: 12, fontWeight: "700" },
  meta: { textAlign: "center", marginTop: space.lg, fontSize: 11 },
}));
