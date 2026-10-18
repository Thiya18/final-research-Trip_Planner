import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../src/api";
import { Card, Notice, PrimaryButton } from "../src/components/ui";
import { usePlan } from "../src/PlanContext";
import { makeStyles, useTheme } from "../src/ThemeContext";
import { radius, space } from "../src/theme";

const QUESTIONS = [
  ["overall", "Overall, how happy are you with this plan?"],
  ["relevance", "The places match my interests"],
  ["route", "The route and timing are practical"],
  ["budget", "The budget estimate is useful"],
  ["crowd", "The crowd information is useful"],
];

export default function FeedbackScreen() {
  const router = useRouter();
  const { plan, apiUrl } = usePlan();
  const [scores, setScores] = useState({});
  const styles = useStyles();
  const { colors, type, dark } = useTheme();
  const [comment, setComment] = useState("");
  const [state, setState] = useState({ loading: false, done: false, error: "" });
  if (!plan) return <Redirect href="/" />;

  const send = async () => {
    if (!scores.overall) return setState({ ...state, error: "Please answer the first question." });
    setState({ loading: true, done: false, error: "" });
    try {
      await api.feedback(apiUrl, { plan_id: plan.plan_id, ...scores, comment });
      setState({ loading: false, done: true, error: "" });
    } catch (e) {
      setState({ loading: false, done: false, error: e.message });
    }
  };

  if (state.done) {
    return (
      <View style={styles.thanks}>
        <View style={styles.thanksIcon}><Ionicons name="heart" size={44} color={colors.coral} /></View>
        <Text style={type.title}>Thank you!</Text>
        <Text style={[type.body, { textAlign: "center", color: colors.muted, marginVertical: space.lg }]}>
          Your rating helps evaluate this research prototype.
        </Text>
        <View style={{ alignSelf: "stretch", gap: space.md }}>
          <PrimaryButton title="Back to my trip" variant="secondary" onPress={() => router.back()} />
          <PrimaryButton title="Plan another trip" icon="refresh" variant="accent" onPress={() => router.dismissAll()} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
      <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
        Tap the stars: 1 = strongly disagree, 5 = strongly agree.
      </Text>
      {QUESTIONS.map(([key, q]) => (
        <Card key={key} style={{ marginBottom: space.md }}>
          <Text style={[type.body, { fontWeight: "700", marginBottom: space.md }]}>{q}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((v) => {
              const on = (scores[key] ?? 0) >= v;
              return (
                <Pressable key={v} onPress={() => setScores({ ...scores, [key]: v })} hitSlop={4}
                  accessibilityRole="button" accessibilityLabel={`${q}: ${v} of 5`}
                  accessibilityState={{ selected: scores[key] === v }}>
                  <Ionicons name={on ? "star" : "star-outline"} size={38} color={on ? colors.gold : colors.faint} />
                </Pressable>
              );
            })}
          </View>
        </Card>
      ))}
      <TextInput style={styles.input} multiline placeholder="Anything we should improve? (optional)"
        placeholderTextColor={colors.muted} keyboardAppearance={dark ? "dark" : "light"} value={comment} onChangeText={setComment} />
      {state.error ? <Notice text={state.error} tone="bad" icon="alert-circle" /> : null}
      <PrimaryButton title="Send feedback" icon="send" variant="accent" onPress={send} loading={state.loading} />
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  stars: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.sm },
  input: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: space.md,
    minHeight: 90, fontSize: 15, color: colors.ink, textAlignVertical: "top", marginBottom: space.lg },
  thanks: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl },
  thanksIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.badSoft, alignItems: "center",
    justifyContent: "center", marginBottom: space.lg },
}));
