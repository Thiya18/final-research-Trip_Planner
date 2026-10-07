// Palette drawn from the Sri Lankan flag (saffron, maroon, green, gold) plus ocean teal.
export const lightColors = {
  bg: "#FFF8F0", // warm sand
  card: "#FFFFFF",
  ink: "#1D2A2B",
  muted: "#6B7778",
  line: "#EFE6DA",
  faint: "#D3C3AC", // empty stars, inactive marks
  mapBg: "#DCE9E4",
  primary: "#0B7A75", // ocean teal
  primaryDark: "#00534E",
  primarySoft: "#DDF1EF",
  accent: "#EB7400", // saffron
  accentSoft: "#FFEBD6",
  gold: "#FFBE29",
  maroon: "#8D153A",
  coral: "#F25F5C",
  good: "#2E9E5B",
  goodSoft: "#E1F5E8",
  warn: "#C9700A",
  bad: "#D23B3B",
  badSoft: "#FBE3E3",
  shadow: "#4A3520",
};

// Same hues, lifted so they stay readable on a deep teal-black background.
export const darkColors = {
  bg: "#111819",
  card: "#1B2627",
  ink: "#ECF1F0",
  muted: "#9AA8A9",
  line: "#2A3738",
  faint: "#46585A",
  mapBg: "#1C2C2A",
  primary: "#138A84",
  primaryDark: "#0A5F5B",
  primarySoft: "#163A39",
  accent: "#EB7400",
  accentSoft: "#3A2A17",
  gold: "#FFBE29",
  maroon: "#D0587A",
  coral: "#F2706D",
  good: "#3DB86E",
  goodSoft: "#173A26",
  warn: "#E08A2A",
  bad: "#E25555",
  badSoft: "#3D1F1F",
  shadow: "#000000",
};

// Each interest gets its own colour so chips, tiles and badges are easy to tell apart.
export const interestColors = {
  beach: "#1E9BD7",
  cultural: "#8D153A",
  nature_wildlife: "#2E9E5B",
  adventure: "#EB7400",
  religious: "#7B5EA7",
  food_dining: "#C9512B",
};
export const darkInterestColors = { ...interestColors, cultural: "#D0587A", religious: "#A58BD0", food_dining: "#E06B44" };

// One colour per itinerary day (route lines + day chips)
export const dayColors = ["#0B7A75", "#EB7400", "#7B5EA7", "#2E9E5B", "#D23B3B", "#1E9BD7", "#8D153A"];
export const darkDayColors = ["#1FA59E", "#EB7400", "#A58BD0", "#3DB86E", "#E25555", "#1E9BD7", "#D0587A"];

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const makeShadow = (c, dark) => ({
  shadowColor: c.shadow,
  shadowOpacity: dark ? 0.35 : 0.1,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
});

export const makeType = (colors) => ({
  hero: { fontSize: 34, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: "700", color: colors.ink },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.8 },
  body: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
});

export const labels = {
  interests: {
    beach: "Beaches",
    cultural: "Culture & history",
    nature_wildlife: "Nature & wildlife",
    adventure: "Adventure",
    religious: "Religious sites",
    food_dining: "Food & tea",
  },
  regions: {
    "Cultural Triangle": "Sigiriya, Dambulla, Polonnaruwa, Anuradhapura",
    "Hill Country": "Kandy, Nuwara Eliya, Ella, Horton Plains",
    "Southern Coast": "Galle, Mirissa, Yala, Bentota",
  },
  regionTaglines: {
    "Cultural Triangle": "Ancient cities & rock fortresses",
    "Hill Country": "Tea hills, waterfalls & train rides",
    "Southern Coast": "Golden beaches, whales & leopards",
  },
  crowd: { peaceful: "Peaceful", moderate: "Moderate", lively: "Lively", no_preference: "Don't mind" },
  transport: { private_car: "Car / van", tuk_tuk: "Tuk-tuk", bus: "Bus" },
  methods: { rl: "RL model", greedy: "Greedy (B1)", nearest: "Nearest (B2)" },
  appearance: { system: "System", light: "Light", dark: "Dark" },
};

// Ionicons names for each option
export const icons = {
  interests: {
    beach: "sunny",
    cultural: "business",
    nature_wildlife: "leaf",
    adventure: "trail-sign",
    religious: "flower",
    food_dining: "cafe",
  },
  crowd: { peaceful: "leaf-outline", moderate: "people-outline", lively: "musical-notes-outline", no_preference: "shuffle-outline" },
  transport: { private_car: "car-sport", tuk_tuk: "bicycle", bus: "bus" },
};

// Per person per day, in LKR: [budget, standard, comfort]
export const budgetPresets = {
  local: [8000, 15000, 30000],
  international: [25000, 45000, 90000],
};
export const budgetLevels = [
  ["Budget", "wallet-outline"],
  ["Standard", "bed-outline"],
  ["Comfort", "diamond-outline"],
];

export const months =["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const lkr = (n) => "LKR " + Math.round(n || 0).toLocaleString("en-US");
