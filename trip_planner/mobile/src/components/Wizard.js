import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "../ThemeContext";
import { radius, space } from "../theme";
import { Footer, PrimaryButton } from "./ui";

export const WIZARD_STEPS = 4;

// One question per screen: progress bar, a friendly title, the content, and a sticky "Next" button.
export function WizardScreen({ step, title, subtitle, children, nextLabel = "Next", nextIcon = "arrow-forward",
  onNext, nextDisabled, loading, footerExtra }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors, type } = useTheme();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.back}
          accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepText}>Step {step} of {WIZARD_STEPS}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(step / WIZARD_STEPS) * 100}%` }]} />
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={type.title}>{title}</Text>
        {subtitle ? <Text style={[type.body, { color: colors.muted, marginTop: space.xs }]}>{subtitle}</Text> : null}
        <View style={{ marginTop: space.xl }}>{children}</View>
      </ScrollView>
      <Footer>
        {footerExtra}
        <PrimaryButton title={nextLabel} icon={nextIcon} onPress={onNext} disabled={nextDisabled} loading={loading}
          variant={step === WIZARD_STEPS ? "accent" : "primary"} />
      </Footer>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  top: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.line },
  stepText: { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6 },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.line, overflow: "hidden" },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.accent },
  body: { padding: space.lg, paddingTop: space.md, paddingBottom: 140 },
}));
