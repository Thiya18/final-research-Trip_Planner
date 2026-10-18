import { Platform, Share } from "react-native";
import { labels, lkr } from "./theme";

// Plain-text itinerary that reads well in WhatsApp, SMS or email.
export function tripText(plan, prefs) {
  const days = plan.itinerary.length;
  const lines = [`🇱🇰 My ${days}-day trip · ${prefs.region}`, ""];
  let n = 0;
  for (const d of plan.itinerary) {
    lines.push(`📅 Day ${d.day}`);
    if (!d.stops.length) lines.push("   Free day to relax");
    for (const s of d.stops) {
      n += 1;
      const cat = labels.interests[s.category] ?? s.category;
      lines.push(`   ${s.arrive}–${s.leave}  ${n}. ${s.name} (${cat})`);
    }
    lines.push("");
  }
  const b = plan.budget;
  lines.push(`💰 Estimated total: ${lkr(b.total)} (${lkr(b.per_person)} per person)`);
  lines.push(`🚗 ${b.total_km} km · starting from ${plan.start.name}`);
  lines.push("", "Planned with Lanka Trip Planner");
  return lines.join("\n");
}

export async function shareTrip(plan, prefs) {
  const message = tripText(plan, prefs);
  // browsers without the Web Share API: copy instead
  if (Platform.OS === "web" && !globalThis.navigator?.share) {
    await globalThis.navigator?.clipboard?.writeText(message);
    globalThis.alert?.("Trip copied to the clipboard.");
    return;
  }
  try {
    await Share.share({ message, title: `My trip to the ${prefs.region}` });
  } catch {
    // user closed the share sheet
  }
}
