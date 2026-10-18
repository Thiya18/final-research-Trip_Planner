import { useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { api } from "../src/api";
import { Card, PrimaryButton, Section, Segmented } from "../src/components/ui";
import { usePlan } from "../src/PlanContext";
import { makeStyles, useTheme } from "../src/ThemeContext";
import { labels, radius, space } from "../src/theme";

export default function SettingsScreen() {
  const { prefs, update, apiUrl, setApiUrl } = usePlan();
  const { type, mode, setMode, dark } = useTheme();
  const styles = useStyles();
  const [serverMsg, setServerMsg] = useState("");
  const [checking, setChecking] = useState(false);

  const testServer = async () => {
    setChecking(true);
    setServerMsg("");
    try {
      const h = await api.health(apiUrl);
      setServerMsg(`Connected · ${h.destinations} places · matcher: ${h.embedder} · RL model: ${h.rl_model_loaded ? "ready" : "not trained"}`);
    } catch (e) {
      setServerMsg(e.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
      <Section label="Appearance" hint="System follows your phone's light / dark setting.">
        <Segmented options={Object.entries(labels.appearance)} value={mode} onChange={setMode} />
      </Section>
      <Section label="Planning method" hint="Which algorithm orders the places into a route.">
        <Segmented options={Object.entries(labels.methods)} value={prefs.method} onChange={(v) => update({ method: v })} />
      </Section>
      <Section label="Server address">
        <Card>
          <TextInput style={styles.input} value={apiUrl} onChangeText={setApiUrl}
            autoCapitalize="none" autoCorrect={false} keyboardType="url" keyboardAppearance={dark ? "dark" : "light"} />
          <PrimaryButton title="Test connection" icon="pulse" variant="secondary" onPress={testServer} loading={checking}
            style={{ marginTop: space.md }} />
          {serverMsg ? <Text style={[type.small, { marginTop: space.md }]}>{serverMsg}</Text> : null}
        </Card>
      </Section>
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  input: { backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: space.md, paddingVertical: 12, fontSize: 15, color: colors.ink },
}));
