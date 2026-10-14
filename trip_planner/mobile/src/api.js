import Constants from "expo-constants";
import { Platform } from "react-native";

// Phone: same computer that Expo Go loaded the app from (hostUri, e.g. "10.0.0.5:8081"), port 8000,
// so a changed Wi-Fi IP needs no edit. Falls back to app.json -> expo.extra.apiUrl (e.g. with --tunnel).
// Web preview: the computer that served the page (localhost on the laptop, its IP from a phone browser).
// Both can be changed inside the app (gear icon on the home screen -> Server address).
const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
const devHostIsIp = /^\d+\.\d+\.\d+\.\d+$/.test(devHost ?? "");

export const DEFAULT_API_URL =
  Platform.OS === "web"
    ? `http://${globalThis.location?.hostname || "localhost"}:8000`
    : devHostIsIp
      ? `http://${devHost}:8000`
      : Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:8000";

async function request(baseUrl, path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...options,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
      throw new Error(`Server error ${res.status}: ${detail}`);
    }
    return body;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("The server took too long to answer.");
    if (e.message?.startsWith("Server error")) throw e;
    throw new Error(`Cannot reach the server at ${baseUrl}. Is the backend running and on the same Wi-Fi?`);
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  health: (url) => request(url, "/health"),
  plan: (url, body) => request(url, "/plan", { method: "POST", body: JSON.stringify(body) }),
  feedback: (url, body) => request(url, "/feedback", { method: "POST", body: JSON.stringify(body) }),
};
