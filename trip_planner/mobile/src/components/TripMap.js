// Native (Android / iOS) map. Works in Expo Go with no API key.
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { makeStyles, useTheme } from "../ThemeContext";

export default function TripMap({ start, days, selectedDay }) {
  const ref = useRef(null);
  const styles = useStyles();
  const { colors, dayColors, dark } = useTheme();
  const shown = selectedDay == null ? days : days.filter((d) => d.day === selectedDay);
  const points = [start, ...shown.flatMap((d) => d.stops)].map((p) => ({ latitude: p.latitude, longitude: p.longitude }));

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.fitToCoordinates(points, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true });
    }, 300);
    return () => clearTimeout(t);
  }, [selectedDay, days]);

  // each day's line starts where the previous day ended
  let prev = { latitude: start.latitude, longitude: start.longitude };
  const lines = days.map((d) => {
    const coords = [prev, ...d.stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude }))];
    if (d.stops.length) prev = coords[coords.length - 1];
    return { day: d.day, coords };
  });

  let n = 0;
  return (
    <MapView ref={ref} style={StyleSheet.absoluteFill} userInterfaceStyle={dark ? "dark" : "light"}
      initialRegion={{ latitude: start.latitude, longitude: start.longitude, latitudeDelta: 1.2, longitudeDelta: 1.2 }}>
      <Marker coordinate={{ latitude: start.latitude, longitude: start.longitude }} title={start.name} pinColor={colors.ink} />
      {lines.map((l) =>
        l.coords.length > 1 && (selectedDay == null || selectedDay === l.day) ? (
          <Polyline key={`line-${l.day}`} coordinates={l.coords} strokeWidth={4}
            strokeColor={dayColors[(l.day - 1) % dayColors.length]} />
        ) : null
      )}
      {days.map((d) =>
        d.stops.map((s) => {
          n += 1;
          if (selectedDay != null && selectedDay !== d.day) return null;
          return (
            <Marker key={`${d.day}-${s.dest_id}`} coordinate={{ latitude: s.latitude, longitude: s.longitude }}
              title={`${n}. ${s.name}`} description={`Day ${d.day} · ${s.arrive}-${s.leave}`}>
              <View style={[styles.pin, { backgroundColor: dayColors[(d.day - 1) % dayColors.length] }]}>
                <Text style={styles.pinText}>{n}</Text>
              </View>
            </Marker>
          );
        })
      )}
    </MapView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  pin: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.card },
  pinText: { color: "#fff", fontWeight: "800", fontSize: 13 },
}));
