// Real photos of Sri Lanka, bundled with the app (see assets/places/CREDITS.md for authors and licences).
import { placeImages } from "./placeImages";

export const heroImage = placeImages.D001; // Sigiriya

export const regionImages = {
  "Cultural Triangle": placeImages.D001, // Sigiriya
  "Hill Country": placeImages.D043, // Nine Arch Bridge, Ella
  "Southern Coast": placeImages.D062, // Stilt fishermen, Koggala
};

export const interestImages = {
  beach: placeImages.D053, // Unawatuna
  cultural: placeImages.D004, // Polonnaruwa
  nature_wildlife: placeImages.D012, // Elephants at Kaudulla
  adventure: placeImages.D044, // Little Adam's Peak
  religious: placeImages.D026, // Temple of the Tooth
  food_dining: placeImages.D039, // Tea pickers, Nuwara Eliya
};

// Photo for a destination; falls back to its category photo when we have none of the place itself.
export const placeImage = (destId, category) => placeImages[destId] ?? interestImages[category] ?? heroImage;
