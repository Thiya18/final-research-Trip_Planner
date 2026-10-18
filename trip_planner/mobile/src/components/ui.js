import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "../ThemeContext";
import { radius, space } from "../theme";

export function Card({ children, style }) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Section({ label, hint, children, style }) {
  const styles = useStyles();
  const { type } = useTheme();
  return (
    <View style={[styles.section, style]}>
      <Text style={type.h2}>{label}</Text>
      {hint ? <Text style={[type.small, { marginTop: 2 }]}>{hint}</Text> : null}
      <View style={{ marginTop: space.md }}>{children}</View>
    </View>
  );
}

export function Chip({ label, icon, selected, onPress, color: tint }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = tint ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && { backgroundColor: color, borderColor: color }]}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? "#fff" : color} /> : null}
      <Text style={[styles.chipText, selected && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children, style }) {
  const styles = useStyles();
  return <View style={[styles.chipRow, style]}>{children}</View>;
}

export function Segmented({ options, value, onChange }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.segment}>
      {options.map(([key, label]) => {
        const on = key === value;
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={[styles.segItem, on && styles.segOn]}
            accessibilityRole="button" accessibilityState={{ selected: on }}>
            <Text style={[styles.segText, on && { color: colors.primary, fontWeight: "700" }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onChange, min, max, step = 1, format = (v) => String(v), label }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const btn = (sign, disabled, next) => (
    <Pressable style={[styles.stepBtn, disabled && { opacity: 0.35 }]} onPress={() => onChange(next)} disabled={disabled}
      accessibilityLabel={`${sign === "add" ? "increase" : "decrease"} ${label ?? ""}`} hitSlop={6}>
      <Ionicons name={sign} size={20} color={colors.primary} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn("remove", value <= min, Math.max(min, value - step))}
      <Text style={styles.stepValue}>{format(value)}</Text>
      {btn("add", value >= max, Math.min(max, value + step))}
    </View>
  );
}

// A label on the left, a stepper on the right — for compact settings lists.
export function StepperRow({ icon, label, last, ...stepper }) {
  const styles = useStyles();
  const { colors, type } = useTheme();
  return (
    <View style={[styles.stepRow, !last && styles.stepRowLine]}>
      <View style={styles.iconCircle}><Ionicons name={icon} size={18} color={colors.primary} /></View>
      <Text style={[type.body, { flex: 1, fontWeight: "600" }]}>{label}</Text>
      <Stepper label={label} {...stepper} />
    </View>
  );
}

export function PrimaryButton({ title, onPress, loading, disabled, icon, variant = "primary", style }) {
  const styles = useStyles();
  const { colors, shadow } = useTheme();
  const solid = variant === "primary" || variant === "accent";
  const bg = variant === "accent" ? colors.accent : variant === "primary" ? colors.primary : colors.card;
  const fg = solid ? "#fff" : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.88 : 1 },
        solid ? shadow : { borderWidth: 1.5, borderColor: colors.primary }, pressed && { transform: [{ scale: 0.98 }] }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
          {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

export function Badge({ text, tone = "neutral", icon }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const map = {
    neutral: [colors.primarySoft, colors.primary],
    good: [colors.goodSoft, colors.good],
    warn: [colors.accentSoft, colors.warn],
    bad: [colors.badSoft, colors.bad],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function crowdTone(level) {
  return level === "Low" ? "good" : level === "Medium" ? "warn" : "bad";
}

// Photo with a dark gradient at the bottom so white text stays readable.
export function PhotoCard({ source, height = 160, style, children, rounded = true, topOnly = false }) {
  const corners = !rounded ? null : topOnly
    ? { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }
    : { borderRadius: radius.lg };
  return (
    <ImageBackground source={source} resizeMode="cover"
      style={[{ width: "100%", height, justifyContent: "flex-end", overflow: "hidden" }, corners, style]}
      imageStyle={[{ width: "100%", height: "100%" }, corners]}>
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.72)"]} locations={[0.35, 1]}
        style={[StyleSheet.absoluteFill, corners]} />
      {children}
    </ImageBackground>
  );
}

// Selectable photo tile (regions, interests).
export function PhotoOption({ source, title, subtitle, icon, selected, onPress, height = 150, color: tint, style }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = tint ?? colors.primary;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}
      style={({ pressed }) => [styles.photoOption, selected && { borderColor: color }, pressed && { transform: [{ scale: 0.98 }] }, style]}>
      <PhotoCard source={source} height={height}>
        <View style={{ padding: space.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingRight: space.lg }}>
            {icon ? <Ionicons name={icon} size={16} color="#fff" /> : null}
            <Text style={styles.photoTitle} numberOfLines={2}>{title}</Text>
          </View>
          {subtitle ? <Text style={styles.photoSub} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
      </PhotoCard>
      <View style={[styles.check, selected ? { backgroundColor: color, borderColor: color } : null]}>
        {selected ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
      </View>
    </Pressable>
  );
}

// Selectable icon tile (transport, crowds, traveller type).
export function IconOption({ icon, title, subtitle, selected, onPress, color: tint, style }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = tint ?? colors.primary;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}
      style={({ pressed }) => [styles.iconOption, selected && { borderColor: color, backgroundColor: color + "14" },
        pressed && { transform: [{ scale: 0.97 }] }, style]}>
      <View style={[styles.iconBubble, { backgroundColor: selected ? color : color + "1F" }]}>
        <Ionicons name={icon} size={22} color={selected ? "#fff" : color} />
      </View>
      <Text style={[styles.iconTitle, selected && { color }]} numberOfLines={2}>{title}</Text>
      {subtitle ? <Text style={styles.iconSub} numberOfLines={2}>{subtitle}</Text> : null}
    </Pressable>
  );
}

export function Footer({ children }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>{children}</View>;
}

export function Notice({ text, tone = "warn", icon = "information-circle" }) {
  const styles = useStyles();
  const { colors, type } = useTheme();
  const [bg, fg] = tone === "bad" ? [colors.badSoft, colors.bad] : [colors.accentSoft, colors.warn];
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={18} color={fg} />
      <Text style={[type.small, { color: fg, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, ...shadow },
  section: { marginBottom: space.xl },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card },
  chipText: { fontSize: 14, color: colors.ink, fontWeight: "600" },
  segment: { flexDirection: "row", backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 4 },
  segItem: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radius.sm },
  segOn: { backgroundColor: colors.card, ...shadow, elevation: 1 },
  segText: { fontSize: 14, color: colors.muted },
  stepper: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  stepValue: { minWidth: 64, textAlign: "center", fontSize: 16, fontWeight: "700", color: colors.ink },
  stepRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  stepRowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  btn: { height: 56, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xl,
    flexDirection: "row", gap: space.sm },
  btnText: { fontSize: 17, fontWeight: "700" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" },
  badgeText: { fontSize: 12, fontWeight: "700" },
  photoOption: { borderRadius: radius.lg + 3, borderWidth: 3, borderColor: "transparent", ...shadow },
  photoTitle: { color: "#fff", fontSize: 18, fontWeight: "800", flexShrink: 1 },
  photoSub: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 2 },
  check: { position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)", backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" },
  iconOption: { flex: 1, alignItems: "center", padding: space.md, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.line,
    backgroundColor: colors.card, gap: 6 },
  iconBubble: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  iconTitle: { fontSize: 14, fontWeight: "700", color: colors.ink, textAlign: "center" },
  iconSub: { fontSize: 12, color: colors.muted, textAlign: "center" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md,
    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line },
  notice: { flexDirection: "row", gap: space.sm, alignItems: "flex-start", padding: space.md, borderRadius: radius.md, marginBottom: space.sm },
}));
