import { useRouter } from "expo-router";
import { View } from "react-native";
import { PhotoOption } from "../../src/components/ui";
import { WizardScreen } from "../../src/components/Wizard";
import { regionImages } from "../../src/images";
import { usePlan } from "../../src/PlanContext";
import { useTheme } from "../../src/ThemeContext";
import { labels, space } from "../../src/theme";

export default function WhereStep() {
  const router = useRouter();
  const { prefs, update } = usePlan();
  const { colors } = useTheme();
  return (
    <WizardScreen step={1} title="Where do you want to go?" subtitle="Pick one region to explore."
      onNext={() => router.push("/plan/interests")}>
      <View style={{ gap: space.md }}>
        {Object.entries(labels.regions).map(([region, towns]) => (
          <PhotoOption key={region} source={regionImages[region]} title={region}
            subtitle={`${labels.regionTaglines[region]}\n${towns}`} height={160} color={colors.accent}
            selected={prefs.region === region} onPress={() => update({ region })} />
        ))}
      </View>
    </WizardScreen>
  );
}
