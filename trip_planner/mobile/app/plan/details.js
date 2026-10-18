import { useRouter } from "expo-router";
import { View } from "react-native";
import { Card, Chip, ChipRow, IconOption, Section, StepperRow } from "../../src/components/ui";
import { WizardScreen } from "../../src/components/Wizard";
import { usePlan } from "../../src/PlanContext";
import { useTheme } from "../../src/ThemeContext";
import { budgetPresets, months, space } from "../../src/theme";

export default function DetailsStep() {
  const router = useRouter();
  const { prefs, update } = usePlan();
  const { colors } = useTheme();
  const setTraveller = (t) => update({ traveller_type: t, budget_lkr_per_person_per_day: budgetPresets[t][1] });

  return (
    <WizardScreen step={3} title="Tell us about your trip" subtitle="Ticket prices and costs depend on these."
      onNext={() => router.push("/plan/style")}>
      <Section label="Who's travelling?">
        <View style={{ flexDirection: "row", gap: space.md }}>
          <IconOption icon="home" title="Sri Lankan resident" selected={prefs.traveller_type === "local"}
            onPress={() => setTraveller("local")} color={colors.maroon} />
          <IconOption icon="airplane" title="International visitor" selected={prefs.traveller_type === "international"}
            onPress={() => setTraveller("international")} color={colors.primary} />
        </View>
      </Section>

      <Section label="Trip length">
        <Card style={{ paddingVertical: space.xs }}>
          <StepperRow icon="calendar" label="Days" value={prefs.trip_days} min={1} max={7}
            onChange={(v) => update({ trip_days: v })} />
          <StepperRow icon="people" label="People" value={prefs.group_size} min={1} max={20}
            onChange={(v) => update({ group_size: v })} />
          <StepperRow icon="time" label="Hours out each day" value={prefs.daily_hours} min={4} max={14} last
            onChange={(v) => update({ daily_hours: v })} format={(v) => `${v} h`} />
        </Card>
      </Section>

      <Section label="When are you going?">
        <ChipRow>
          {months.map((m, i) => (
            <Chip key={m} label={m} selected={prefs.travel_month === i + 1} onPress={() => update({ travel_month: i + 1 })}
              color={colors.accent} />
          ))}
        </ChipRow>
      </Section>
    </WizardScreen>
  );
}
