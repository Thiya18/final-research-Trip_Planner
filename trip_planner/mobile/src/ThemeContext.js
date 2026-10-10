import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import {
  darkColors, darkDayColors, darkInterestColors, dayColors, interestColors, lightColors, makeShadow, makeType,
} from "./theme";
import { load, save } from "./storage";

function buildTheme(dark) {
  const colors = dark ? darkColors : lightColors;
  return {
    dark,
    colors,
    shadow: makeShadow(colors, dark),
    type: makeType(colors),
    interestColors: dark ? darkInterestColors : interestColors,
    dayColors: dark ? darkDayColors : dayColors,
  };
}
const THEMES = { light: buildTheme(false), dark: buildTheme(true) };

const ThemeContext = createContext({ ...THEMES.light, mode: "system", setMode: () => {} });

// mode: "system" follows the phone's setting; "light" / "dark" override it.
export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState("system");
  useEffect(() => { load("themeMode", "system").then(setModeState); }, []);
  const setMode = (m) => { setModeState(m); save("themeMode", m); };
  const scheme = mode === "system" ? (system === "dark" ? "dark" : "light") : mode;
  const value = useMemo(() => ({ ...THEMES[scheme], mode, setMode }), [scheme, mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

// Like StyleSheet.create, but the factory gets the current theme and styles rebuild when it changes.
export function makeStyles(factory) {
  const cache = {};
  return function useStyles() {
    const theme = useTheme();
    const key = theme.dark ? "dark" : "light";
    return (cache[key] ??= StyleSheet.create(factory(theme)));
  };
}
