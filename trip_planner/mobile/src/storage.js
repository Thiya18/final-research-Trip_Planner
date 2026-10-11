import AsyncStorage from "@react-native-async-storage/async-storage";

// Small JSON wrapper. Storage failures never break the app; it just starts fresh.
export async function load(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
}
