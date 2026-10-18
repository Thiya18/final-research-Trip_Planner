import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { PhotoOption } from "../../src/components/ui";
import { WizardScreen } from "../../src/components/Wizard";
import { interestImages } from "../../src/images";
import { usePlan } from "../../src/PlanContext";
import { makeStyles, useTheme } from "../../src/ThemeContext";
import { icons, labels, radius, space } from "../../src/theme";

const MAX = 3;

export default function InterestsStep() {
  const router = useRouter();
  const { prefs, update } = usePlan();
  const styles = useStyles();
  const { colors, type, interestColors, dark } = useTheme();
  const [showText, setShowText] = useState(!!prefs.interest_text);
  const count = prefs.interests.length;

  const toggle = (key) => {
    if (prefs.interests.includes(key)) update({ interests: prefs.interests.filter((i) => i !== key) });
    else if (count < MAX) update({ interests: [...prefs.interests, key] });
  };

  return (
    <WizardScreen step={2} title="What do you love?" subtitle={`Choose up to ${MAX}. We'll find places that match.`}
      onNext={() => router.push("/plan/details")} nextDisabled={count === 0}
      nextLabel={count === 0 ? "Pick at least one" : "Next"}>
      <Text style={[styles.counter, count === MAX && { color: colors.accent }]}>{count} of {MAX} selected</Text>
      <View style={styles.grid}>
        {Object.entries(labels.interests).map(([key, label]) => {
          const on = prefs.interests.includes(key);
          return (
            <PhotoOption key={key} source={interestImages[key]} title={label} icon={icons.interests[key]}
              color={interestColors[key]} height={130} selected={on} onPress={() => toggle(key)}
              style={[styles.tile, !on && count === MAX && { opacity: 0.5 }]} />
          );
        })}
      </View>

      {showText ? (
        <View style={{ marginTop: space.lg }}>
          <Text style={[type.label, { marginBottom: space.sm }]}>Your ideal trip (optional)</Text>
          <TextInput style={styles.input} multiline autoFocus value={prefs.interest_text}
            placeholder="e.g. quiet waterfalls and a tea factory visit" placeholderTextColor={colors.muted} keyboardAppearance={dark ? "dark" : "light"}
            onChangeText={(t) => update({ interest_text: t })} />
        </View>
      ) : (
        <Pressable onPress={() => setShowText(true)} style={styles.addText} accessibilityRole="button">
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={styles.addTextLabel}>Describe your ideal trip in your own words</Text>
        </Pressable>
      )}
    </WizardScreen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  counter: { fontSize: 14, fontWeight: "700", color: colors.primary, marginBottom: space.md, marginTop: -space.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.md },
  tile: { width: "48%" },
  addText: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xl, alignSelf: "center", padding: space.sm },
  addTextLabel: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  input: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: space.md,
    minHeight: 80, fontSize: 15, color: colors.ink, textAlignVertical: "top" },
}));
