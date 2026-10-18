// Web preview fallback: react-native-maps does not run in a browser, so draw a simple
// schematic of the route (positions scaled from latitude/longitude). The phone app shows the real map.
import { StyleSheet, Text, View } from "react-native";
import { makeStyles, useTheme } from "../ThemeContext";

export default function TripMap({ start, days, selectedDay }) {
  const styles = useStyles();
  const { colors, dayColors } = useTheme();
  const shown = selectedDay == null ? days : days.filter((d) => d.day === selectedDay);
  const all = [start, ...shown.flatMap((d) => d.stops)];
  const lats = all.map((p) => p.latitude), lons = all.map((p) => p.longitude);
  const [la0, la1, lo0, lo1] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const pos = (p) => ({
    left: `${8 + ((p.longitude - lo0) / (lo1 - lo0 || 1)) * 84}%`,
    top: `${8 + ((la1 - p.latitude) / (la1 - la0 || 1)) * 84}%`,
  });
  let n = 0;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.mapBg }]}>
      <View style={[styles.dot, { backgroundColor: colors.ink }, pos(start)]} />
      {days.map((d) =>
        d.stops.map((s) => {
          n += 1;
          if (selectedDay != null && selectedDay !== d.day) return null;
          return (
            <View key={`${d.day}-${s.dest_id}`} style={[styles.pin, pos(s), { backgroundColor: dayColors[(d.day - 1) % dayColors.length] }]}>
              <Text style={styles.pinText}>{n}</Text>
            </View>
          );
        })
      )}
      <Text style={styles.note}>Schematic preview · open on your phone for the real map</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  dot: { position: "absolute", width: 12, height: 12, borderRadius: 6, marginLeft: -6, marginTop: -6 },
  pin: { position: "absolute", width: 26, height: 26, borderRadius: 13, marginLeft: -13, marginTop: -13,
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.card },
  pinText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  note: { position: "absolute", top: 6, left: 8, fontSize: 11, color: colors.muted },
}));
