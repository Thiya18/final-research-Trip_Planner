import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { IconOption, Notice, PhotoCard, Section } from "../../src/components/ui";
import { WizardScreen } from "../../src/components/Wizard";
import { regionImages } from "../../src/images";
import { usePlan } from "../../src/PlanContext";
import { makeStyles, useTheme } from "../../src/ThemeContext";
import { budgetLevels, budgetPresets, icons, labels, radius, space } from "../../src/theme";

// keys into the theme palette
const BUDGET_COLORS = ["good", "primary", "maroon"];
const CROWD_COLORS = { peaceful: "good", moderate: "primary", lively: "coral", no_preference: "muted" };
const TRANSPORT_COLORS = { private_car: "primary", tuk_tuk: "accent", bus: "maroon" };

export default function StyleStep() {
  const router = useRouter();
  const { prefs, update, setPlan, apiUrl } = usePlan();
  const [loading, setLoading] = useState(false);
  const styles = useStyles();
  const { colors, type, dark } = useTheme();
  const [error, setError] = useState("");
  const presets = budgetPresets[prefs.traveller_type];
  const [custom, setCustom] = useState(!presets.includes(prefs.budget_lkr_per_person_per_day));

  const submit = async () => {
    setError("");
    if (!prefs.interests.length) return setError("Go back and pick at least one interest.");
    if (prefs.budget_lkr_per_person_per_day <= 0) return setError("Enter a daily budget.");
    setLoading(true);
    try {
      setPlan(await api.plan(apiUrl, prefs));
      router.push("/itinerary");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardScreen step={4} title="Your travel style" subtitle="Almost done! How do you like to travel?"
      nextLabel="Create my trip" nextIcon="sparkles" onNext={submit} loading={loading}
      footerExtra={error ? (
        <View>
          <Notice text={error} tone="bad" icon="alert-circle" />
          <Pressable onPress={() => router.push("/settings")} style={{ alignSelf: "center", padding: space.sm }}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Check server settings</Text>
          </Pressable>
        </View>
      ) : null}>
      <Section label="Daily budget" hint="Per person: food, rooms, tickets and transport">
        <View style={styles.row}>
          {presets.map((b, i) => (
            <IconOption key={b} icon={budgetLevels[i][1]} title={budgetLevels[i][0]} subtitle={`LKR ${b / 1000}k`}
              color={colors[BUDGET_COLORS[i]]} selected={!custom && prefs.budget_lkr_per_person_per_day === b}
              onPress={() => { setCustom(false); update({ budget_lkr_per_person_per_day: b }); }} />
          ))}
        </View>
        {custom ? (
          <View style={styles.customBox}>
            <Text style={styles.currency}>LKR</Text>
            <TextInput style={styles.customInput} keyboardType="numeric" autoFocus keyboardAppearance={dark ? "dark" : "light"}
              value={prefs.budget_lkr_per_person_per_day ? String(prefs.budget_lkr_per_person_per_day) : ""}
              onChangeText={(t) => update({ budget_lkr_per_person_per_day: Number(t.replace(/[^0-9]/g, "")) || 0 })}
              accessibilityLabel="Budget in rupees per person per day" />
            <Text style={type.small}>/ day</Text>
          </View>
        ) : (
          <Pressable onPress={() => setCustom(true)} style={styles.link} accessibilityRole="button">
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={styles.linkText}>Enter my own amount</Text>
          </Pressable>
        )}
      </Section>

      <Section label="Getting around">
        <View style={styles.row}>
          {Object.entries(labels.transport).map(([k, label]) => (
            <IconOption key={k} icon={icons.transport[k]} title={label} color={colors[TRANSPORT_COLORS[k]]}
              selected={prefs.transport_mode === k} onPress={() => update({ transport_mode: k })} />
          ))}
        </View>
      </Section>

      <Section label="Crowds">
        <View style={styles.grid}>
          {Object.entries(labels.crowd).map(([k, label]) => (
            <IconOption key={k} icon={icons.crowd[k]} title={label} color={colors[CROWD_COLORS[k]]} style={styles.half}
              selected={prefs.crowd_preference === k} onPress={() => update({ crowd_preference: k })} />
          ))}
        </View>
      </Section>

      <Modal visible={loading} animationType="fade" statusBarTranslucent>
        <PhotoCard source={regionImages[prefs.region]} height="100%" rounded={false}>
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={styles.loadingTitle}>Building your trip…</Text>
            <Text style={styles.loadingSub}>Finding the best places in the {prefs.region} and the smartest route between them.</Text>
          </View>
        </PhotoCard>
      </Modal>
    </WizardScreen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: { flexDirection: "row", gap: space.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  half: { flexBasis: "45%", flexGrow: 1 },
  link: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", marginTop: space.md, padding: space.xs },
  linkText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  customBox: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md, backgroundColor: colors.card,
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, paddingHorizontal: space.md },
  currency: { fontWeight: "700", color: colors.muted },
  customInput: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.ink, paddingVertical: 12 },
  loading: { padding: space.xl, paddingBottom: 80, alignItems: "center", gap: space.md },
  loadingTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  loadingSub: { color: "rgba(255,255,255,0.9)", fontSize: 15, textAlign: "center", lineHeight: 21 },
}));
