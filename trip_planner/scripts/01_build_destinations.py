"""
Step 1 - Build the destination dataset for the 3 study regions.

Every row is a REAL place. Coordinates, visit durations, fees and crowd levels are
approximate starting values that MUST be checked (Google Maps, SLTDA, official ticket
pages) before you report results. The column `verify_status` tracks this: change it
from "to_verify" to "verified" as you check each row.

Fees: foreign fee in USD, local fee in LKR (0 = free / donation). Prices change often.
Crowd: Low / Medium / High = typical crowding on a normal day; `peak_months` = when it gets busier.

Run:  python scripts/01_build_destinations.py
Out:  data/destinations.csv
"""
import pandas as pd
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "destinations.csv"

# (name, region, district, primary_category, tags, lat, lon, visit_min,
#  fee_foreign_usd, fee_local_lkr, crowd, peak_months, best_months, open, close, description)
CT, HC, SC = "Cultural Triangle", "Hill Country", "Southern Coast"
ROWS = [
 # ---------------- Cultural Triangle ----------------
 ("Sigiriya Rock Fortress", CT, "Matale", "cultural", "heritage;history;hiking;views;unesco", 7.9570, 80.7603, 180, 36, 200, "High", "Jan-Apr;Jul-Aug", "Jan-Apr", "07:00", "17:30",
  "Fifth-century rock fortress with frescoes, mirror wall and water gardens; a steep climb to the summit palace ruins with panoramic views. UNESCO World Heritage Site."),
 ("Pidurangala Rock", CT, "Matale", "adventure", "hiking;views;sunrise;temple", 7.9655, 80.7610, 120, 3, 100, "Medium", "Jan-Apr", "Jan-Apr", "05:00", "18:00",
  "Rock next to Sigiriya with a cave temple and a reclining Buddha; a short scramble to the top gives the best sunrise view of Sigiriya."),
 ("Dambulla Cave Temple", CT, "Matale", "religious", "temple;buddhist;caves;murals;unesco;history", 7.8567, 80.6492, 90, 7, 0, "High", "Jan-Apr;Jul-Aug", "Jan-Apr", "07:00", "19:00",
  "Five cave shrines filled with Buddha statues and painted ceilings dating back over 2,000 years. UNESCO World Heritage Site."),
 ("Polonnaruwa Ancient City", CT, "Polonnaruwa", "cultural", "heritage;history;ruins;cycling;unesco", 7.9403, 81.0188, 240, 30, 100, "High", "Jan-Apr;Jul-Aug", "Jan-Apr", "07:30", "18:00",
  "Medieval royal capital with palaces, the Gal Vihara rock-cut Buddhas and well-preserved stupas, best explored by bicycle. UNESCO World Heritage Site."),
 ("Anuradhapura Sacred City", CT, "Anuradhapura", "cultural", "heritage;history;stupas;ruins;unesco;buddhist", 8.3450, 80.3967, 300, 30, 100, "High", "Jun-Jul;Jan-Apr", "Jan-Apr", "07:00", "18:00",
  "Ancient first capital of Sri Lanka with giant dagobas, monasteries and royal ruins spread over a large area. UNESCO World Heritage Site."),
 ("Sri Maha Bodhi", CT, "Anuradhapura", "religious", "temple;buddhist;pilgrimage;sacred tree", 8.3445, 80.3966, 60, 0, 0, "High", "Jun-Jul;Dec-Jan", "Jan-Apr", "05:00", "22:00",
  "Sacred fig tree grown from a cutting of the Bodhi tree in India, one of the holiest Buddhist sites in the world; busy on Poya days."),
 ("Ruwanwelisaya", CT, "Anuradhapura", "religious", "stupa;buddhist;pilgrimage;history", 8.3500, 80.3964, 60, 0, 0, "High", "Jun-Jul;Dec-Jan", "Jan-Apr", "05:00", "22:00",
  "Huge white stupa built by King Dutugemunu, surrounded by a wall of elephant sculptures; beautiful in the evening."),
 ("Jetavanaramaya", CT, "Anuradhapura", "cultural", "stupa;history;ruins;buddhist", 8.3517, 80.4036, 45, 0, 0, "Medium", "Jun-Jul", "Jan-Apr", "07:00", "18:00",
  "One of the tallest brick structures of the ancient world, a massive red-brick stupa with monastery ruins around it."),
 ("Isurumuniya Temple", CT, "Anuradhapura", "religious", "temple;buddhist;rock carvings;history", 8.3369, 80.3897, 45, 1, 0, "Medium", "Jun-Jul", "Jan-Apr", "07:00", "19:00",
  "Rock temple beside a pond, known for the 'Isurumuniya Lovers' stone carving and elephant reliefs."),
 ("Mihintale", CT, "Anuradhapura", "religious", "temple;buddhist;pilgrimage;hiking;views;history", 8.3509, 80.5150, 120, 3, 0, "Medium", "Jun-Jul", "Jan-Apr", "06:00", "18:00",
  "Mountain where Buddhism was introduced to Sri Lanka; climb 1,840 granite steps to stupas and a rock with wide views. Very busy in June (Poson)."),
 ("Minneriya National Park", CT, "Polonnaruwa", "nature_wildlife", "safari;elephants;wildlife;birds", 8.0333, 80.8833, 210, 30, 60, "High", "Aug-Sep", "Jun-Oct", "06:00", "18:00",
  "Jeep safari park famous for 'The Gathering', when hundreds of wild elephants come to the reservoir in the dry season."),
 ("Kaudulla National Park", CT, "Polonnaruwa", "nature_wildlife", "safari;elephants;wildlife;birds", 8.1500, 80.9000, 210, 30, 60, "Medium", "Sep-Dec", "Aug-Dec", "06:00", "18:00",
  "Less crowded alternative to Minneriya with large elephant herds around Kaudulla tank; good safari value."),
 ("Hurulu Eco Park", CT, "Anuradhapura", "nature_wildlife", "safari;elephants;wildlife;quiet", 8.2100, 80.8800, 180, 30, 60, "Low", "Jan-Apr", "Jan-Apr", "06:00", "18:00",
  "Quiet biosphere reserve near Habarana, often used for elephant safaris when Minneriya and Kaudulla are out of season."),
 ("Wasgamuwa National Park", CT, "Matale", "nature_wildlife", "safari;elephants;wildlife;remote;quiet", 7.7167, 80.9333, 210, 25, 60, "Low", "-", "May-Sep", "06:00", "18:00",
  "Remote, uncrowded national park with elephants, sloth bears and birdlife along the Mahaweli river."),
 ("Ritigala Forest Monastery", CT, "Anuradhapura", "cultural", "ruins;forest;meditation;history;quiet;hiking", 8.1167, 80.6500, 150, 10, 50, "Low", "-", "Jan-Apr", "07:00", "17:00",
  "Ancient forest monastery ruins in a jungle-covered mountain reserve; peaceful paths and stone meditation platforms."),
 ("Aukana Buddha Statue", CT, "Anuradhapura", "religious", "statue;buddhist;history;quiet", 8.0211, 80.5122, 45, 5, 0, "Low", "-", "Jan-Apr", "07:00", "18:00",
  "Twelve-metre standing Buddha carved from a single granite rock face in the 5th century."),
 ("Kalawewa Reservoir", CT, "Anuradhapura", "nature_wildlife", "lake;sunset;birds;quiet", 8.0000, 80.5333, 60, 0, 0, "Low", "-", "Jan-Apr", "06:00", "18:30",
  "Ancient reservoir built by King Dhatusena; calm lakeside views, birdlife and occasional wild elephants."),
 ("Yapahuwa Rock Fortress", CT, "Kurunegala", "cultural", "heritage;history;hiking;views;quiet", 7.8197, 80.3108, 90, 5, 50, "Low", "-", "Jan-Apr", "07:00", "17:30",
  "13th-century rock capital with an ornate stone staircase and a lion carving; a quiet alternative to Sigiriya."),
 ("Nalanda Gedige", CT, "Matale", "cultural", "heritage;architecture;history;quiet", 7.6697, 80.6383, 45, 0, 0, "Low", "-", "Jan-Apr", "07:00", "18:00",
  "Stone temple in a mixed Hindu-Buddhist architectural style, standing alone beside a reservoir."),
 ("Aluvihare Rock Temple", CT, "Matale", "religious", "temple;buddhist;caves;history", 7.4975, 80.6253, 60, 2, 0, "Low", "-", "Jan-Apr", "07:00", "18:00",
  "Cave temple where the Buddhist Pali Canon was first written down on palm leaves; includes a small manuscript museum."),
 ("Sri Muthumariamman Temple", CT, "Matale", "religious", "temple;hindu;architecture;colourful", 7.4697, 80.6237, 45, 2, 0, "Low", "Feb-Mar", "Jan-Apr", "06:00", "19:00",
  "Hindu temple with a tall, brightly painted gopuram tower covered in deity sculptures."),
 ("Matale Spice Gardens", CT, "Matale", "food_dining", "spices;food;cooking;ayurveda;shopping", 7.4800, 80.6200, 60, 0, 0, "Medium", "Jan-Apr", "Jan-Apr", "08:00", "18:00",
  "Guided walks through cinnamon, pepper and cardamom gardens with spice tasting and herbal products; some offer cooking demos."),
 ("Hiriwadunna Village Tour", CT, "Anuradhapura", "food_dining", "village;food;culture;bullock cart;boat;cooking", 8.0300, 80.7600, 150, 25, 3000, "Medium", "Jan-Apr", "Jan-Apr", "08:00", "17:00",
  "Rural experience near Habarana: bullock cart and catamaran ride, then a traditional Sri Lankan lunch cooked in a village home."),
 ("Popham's Arboretum", CT, "Matale", "nature_wildlife", "forest;birds;walking;quiet", 7.8510, 80.6620, 75, 4, 100, "Low", "-", "Jan-Apr", "06:00", "18:00",
  "Dry-zone forest arboretum with walking trails, birds and native trees near Dambulla."),
 ("Ibbankatuwa Megalithic Tombs", CT, "Matale", "cultural", "archaeology;history;quiet", 7.8336, 80.6350, 40, 2, 0, "Low", "-", "Jan-Apr", "08:00", "17:00",
  "Prehistoric burial site around 2,700 years old with stone cist tombs and a small museum."),

 # ---------------- Hill Country ----------------
 ("Temple of the Sacred Tooth Relic", HC, "Kandy", "religious", "temple;buddhist;pilgrimage;unesco;history", 7.2936, 80.6413, 90, 7, 0, "High", "Jul-Aug;Dec-Jan", "Jan-Apr", "05:30", "20:00",
  "Royal temple housing the relic of the Buddha's tooth; evening puja ceremonies with drumming. Very crowded during the Esala Perahera (July/August)."),
 ("Royal Botanical Gardens Peradeniya", HC, "Kandy", "nature_wildlife", "gardens;flowers;walking;picnic", 7.2690, 80.5960, 150, 10, 200, "Medium", "Apr;Dec", "Jan-Apr", "07:30", "17:00",
  "Large botanical garden with an orchid house, giant Javan fig tree, palm avenues and river walks."),
 ("Kandy Lake", HC, "Kandy", "nature_wildlife", "lake;walking;city;sunset", 7.2925, 80.6430, 45, 0, 0, "Medium", "-", "Jan-Apr", "00:00", "23:59",
  "Artificial lake in the centre of Kandy with a shaded walking path beside the Temple of the Tooth."),
 ("Udawattakele Forest Reserve", HC, "Kandy", "nature_wildlife", "forest;birds;walking;monkeys;quiet", 7.2990, 80.6430, 90, 7, 100, "Low", "-", "Jan-Apr", "07:00", "17:00",
  "Forest reserve right behind Kandy town with trails, birds, monkeys and a small pond."),
 ("Bahirawakanda Vihara Buddha Statue", HC, "Kandy", "religious", "statue;buddhist;views", 7.2958, 80.6260, 45, 1, 0, "Low", "-", "Jan-Apr", "06:00", "20:00",
  "Large white Buddha statue on a hill overlooking Kandy with city views."),
 ("Kandyan Cultural Dance Show", HC, "Kandy", "cultural", "dance;music;performance;evening", 7.2930, 80.6450, 60, 7, 1000, "Medium", "Jul-Aug", "Jan-Apr", "17:00", "18:00",
  "Evening show of traditional Kandyan dancing and drumming, ending with a fire-walking act."),
 ("Pinnawala Elephant Orphanage", HC, "Kegalle", "nature_wildlife", "elephants;wildlife;family", 7.3003, 80.3878, 120, 20, 300, "High", "Apr;Dec", "Jan-Apr", "08:30", "18:00",
  "Government-run home for orphaned and injured elephants; visitors watch feeding and river bathing times."),
 ("Ambuluwawa Tower", HC, "Kandy", "adventure", "views;tower;hiking;biodiversity;religious", 7.1622, 80.5464, 120, 2, 100, "Medium", "Apr;Dec", "Jan-Apr", "08:00", "18:00",
  "Spiral tower on a mountain summit with a narrow climb to the top and 360-degree views; symbols of four religions on site."),
 ("Ramboda Falls", HC, "Nuwara Eliya", "nature_wildlife", "waterfall;views;tea;roadside", 7.0570, 80.6950, 45, 0, 0, "Medium", "Apr", "Jan-Apr", "07:00", "18:00",
  "Tall multi-tier waterfall on the Kandy-Nuwara Eliya road with a viewing terrace."),
 ("Gregory Lake", HC, "Nuwara Eliya", "nature_wildlife", "lake;boating;picnic;family;cool climate", 6.9580, 80.7790, 90, 2, 200, "Medium", "Apr", "Feb-Apr", "06:30", "18:30",
  "Lake in Nuwara Eliya with boat rides, pony rides and lakeside parks; very busy during the April season."),
 ("Horton Plains and World's End", HC, "Nuwara Eliya", "nature_wildlife", "hiking;plateau;cliff;waterfall;birds;unesco", 6.8020, 80.8060, 240, 30, 120, "High", "Jan-Apr;Dec", "Jan-Mar", "06:00", "18:00",
  "Highland plateau national park with a 9 km loop trail to the World's End cliff drop and Baker's Falls; start early before the mist."),
 ("Hakgala Botanical Garden", HC, "Nuwara Eliya", "nature_wildlife", "gardens;roses;flowers;cool climate", 6.9260, 80.8210, 90, 10, 200, "Medium", "Apr", "Feb-Apr", "08:00", "17:00",
  "Hill-country botanical garden known for its rose garden and ferns below Hakgala rock."),
 ("Seetha Amman Temple", HC, "Nuwara Eliya", "religious", "temple;hindu;ramayana;mythology", 6.9240, 80.8220, 30, 0, 0, "Medium", "Apr", "Feb-Apr", "07:00", "18:00",
  "Hindu temple linked to the Ramayana legend of Sita, beside a mountain stream."),
 ("Pedro Tea Estate", HC, "Nuwara Eliya", "food_dining", "tea;factory tour;tea tasting;plantation", 6.9690, 80.7850, 60, 2, 300, "Medium", "Apr", "Feb-Apr", "08:00", "17:00",
  "Working tea factory with guided tours of tea processing and tea tasting overlooking the plantations."),
 ("St. Clair's Falls", HC, "Nuwara Eliya", "nature_wildlife", "waterfall;tea;views;roadside", 6.9370, 80.6630, 30, 0, 0, "Low", "-", "Jan-Apr", "06:00", "18:00",
  "Wide twin waterfall surrounded by tea estates near Talawakele, viewed from a roadside point."),
 ("Devon Falls", HC, "Nuwara Eliya", "nature_wildlife", "waterfall;tea;views;roadside", 6.9420, 80.6540, 30, 0, 0, "Low", "-", "Jan-Apr", "06:00", "18:00",
  "Slender high waterfall named after a coffee planter, best seen from the tea centre viewpoint."),
 ("Adam's Peak (Sri Pada)", HC, "Nuwara Eliya", "religious", "pilgrimage;hiking;sunrise;night climb;adventure", 6.8096, 80.4994, 480, 0, 0, "High", "Dec-Apr", "Dec-Apr", "00:00", "23:59",
  "Sacred mountain with a footprint shrine; pilgrims climb about 5,500 steps overnight to see sunrise. Main season December to May."),
 ("Nine Arch Bridge", HC, "Badulla", "cultural", "railway;bridge;photography;views", 6.8768, 81.0608, 60, 0, 0, "High", "Dec-Apr;Jul-Aug", "Jan-Apr", "00:00", "23:59",
  "Colonial-era stone railway viaduct among jungle and tea; crowds gather to photograph trains crossing."),
 ("Little Adam's Peak", HC, "Badulla", "adventure", "hiking;views;easy hike;sunrise", 6.8640, 81.0590, 90, 0, 0, "High", "Dec-Apr;Jul-Aug", "Jan-Apr", "05:00", "18:30",
  "Easy hike through tea fields to a summit with sweeping views of Ella Gap; zipline nearby."),
 ("Ella Rock", HC, "Badulla", "adventure", "hiking;views;challenging hike", 6.8580, 81.0500, 240, 0, 0, "Medium", "Dec-Apr", "Jan-Apr", "05:00", "17:00",
  "Longer, steeper hike from Ella along the railway and through forest to a cliff-top viewpoint."),
 ("Ravana Falls", HC, "Badulla", "nature_wildlife", "waterfall;roadside;mythology", 6.8410, 81.0540, 30, 0, 0, "Medium", "Dec-Apr", "Oct-Jan", "06:00", "18:00",
  "Roadside waterfall below Ella linked to the Ramayana legend; strongest flow after the rains."),
 ("Lipton's Seat", HC, "Badulla", "nature_wildlife", "views;tea;sunrise;quiet", 6.7860, 80.9640, 120, 1, 50, "Low", "-", "Jan-Apr", "05:30", "18:00",
  "Viewpoint at the top of the Dambatenne tea estate where Thomas Lipton surveyed his empire; best at sunrise."),
 ("Dambatenne Tea Factory", HC, "Badulla", "food_dining", "tea;factory tour;history", 6.7750, 80.9800, 60, 3, 200, "Low", "-", "Jan-Apr", "08:00", "16:00",
  "Historic tea factory built by Lipton in 1890 with tours of the production process."),
 ("Diyaluma Falls", HC, "Badulla", "adventure", "waterfall;swimming;natural pools;hiking", 6.7300, 81.0300, 150, 0, 0, "Low", "-", "Jan-Apr", "07:00", "17:00",
  "Second-highest waterfall in Sri Lanka; hike to the upper natural rock pools for swimming."),
 ("Knuckles Mountain Range", HC, "Matale", "adventure", "hiking;trekking;forest;biodiversity;unesco;quiet", 7.4500, 80.8000, 360, 15, 100, "Low", "-", "Jan-Apr", "07:00", "16:00",
  "Rugged forested mountain range with multi-hour treks, villages and high biodiversity. Part of the Central Highlands World Heritage Site."),
 ("Ella Spice Garden Cooking Class", HC, "Badulla", "food_dining", "cooking class;food;spices;curry", 6.8667, 81.0466, 150, 25, 4000, "Medium", "Dec-Apr", "Jan-Apr", "09:00", "18:00",
  "Hands-on Sri Lankan rice and curry cooking classes in Ella using fresh spices and vegetables."),

 # ---------------- Southern Coast ----------------
 ("Galle Fort", SC, "Galle", "cultural", "heritage;colonial;walking;shopping;cafes;unesco;food", 6.0270, 80.2170, 180, 0, 0, "High", "Dec-Mar", "Dec-Apr", "00:00", "23:59",
  "Walled 17th-century Dutch fort town with ramparts, lighthouse, boutiques, cafes and colonial streets. UNESCO World Heritage Site."),
 ("Unawatuna Beach", SC, "Galle", "beach", "beach;swimming;snorkelling;nightlife", 6.0100, 80.2490, 180, 0, 0, "High", "Dec-Mar", "Dec-Apr", "00:00", "23:59",
  "Sheltered crescent bay with calm water for swimming, beach restaurants and snorkelling."),
 ("Jungle Beach", SC, "Galle", "beach", "beach;snorkelling;quiet;nature", 6.0190, 80.2390, 150, 0, 0, "Medium", "Dec-Mar", "Dec-Apr", "07:00", "18:00",
  "Small cove reached through forest on Rumassala hill, with clear water and coral for snorkelling."),
 ("Japanese Peace Pagoda", SC, "Galle", "religious", "temple;buddhist;views;sunset;quiet", 6.0180, 80.2400, 40, 0, 0, "Low", "-", "Dec-Apr", "06:00", "18:30",
  "White peace stupa on Rumassala hill with views over Galle Fort and the ocean."),
 ("Hikkaduwa Beach and Coral Sanctuary", SC, "Galle", "beach", "beach;snorkelling;turtles;coral;nightlife;surfing", 6.1390, 80.1000, 180, 0, 0, "High", "Dec-Mar", "Nov-Apr", "00:00", "23:59",
  "Lively beach town with a coral reef sanctuary, glass-bottom boats, sea turtles near the shore and a surf break."),
 ("Kosgoda Turtle Hatchery", SC, "Galle", "nature_wildlife", "turtles;conservation;family;wildlife", 6.3320, 80.0270, 60, 5, 500, "Medium", "Dec-Mar", "Nov-Apr", "08:00", "18:00",
  "Conservation hatchery where turtle eggs are protected and hatchlings are released to the sea."),
 ("Madu River Boat Safari", SC, "Galle", "nature_wildlife", "boat;mangroves;birds;islands;cinnamon", 6.2900, 80.0450, 120, 15, 2500, "Medium", "Dec-Mar", "Nov-Apr", "07:00", "17:30",
  "Boat ride through mangrove tunnels and small islands, including a cinnamon island and a temple island."),
 ("Bentota Beach", SC, "Galle", "beach", "beach;water sports;resorts;family", 6.4210, 79.9960, 180, 0, 0, "Medium", "Dec-Mar", "Nov-Apr", "00:00", "23:59",
  "Long golden beach with jet skiing, banana boats and river water sports where the Bentota river meets the sea."),
 ("Brief Garden", SC, "Galle", "cultural", "garden;art;sculpture;quiet;architecture", 6.4400, 80.0330, 75, 7, 500, "Low", "-", "Nov-Apr", "08:00", "17:00",
  "Landscaped garden and home of artist Bevis Bawa, filled with sculptures and quiet garden rooms."),
 ("Koggala Lake", SC, "Galle", "nature_wildlife", "lake;boat;birds;islands;quiet", 5.9930, 80.3270, 90, 10, 2000, "Low", "-", "Nov-Apr", "07:00", "18:00",
  "Large lagoon lake with boat trips to small islands, birdlife and a cinnamon island."),
 ("Stilt Fishermen of Koggala", SC, "Galle", "cultural", "fishing;tradition;photography;sunset", 5.9900, 80.3300, 30, 0, 0, "Low", "Dec-Mar", "Nov-Apr", "06:00", "18:30",
  "Traditional stilt fishing seen along the shore between Koggala and Weligama, best around sunset."),
 ("Weligama Beach", SC, "Matara", "adventure", "surfing;surf lessons;beach;beginner friendly", 5.9720, 80.4290, 180, 0, 0, "Medium", "Dec-Mar", "Nov-Apr", "00:00", "23:59",
  "Wide sandy bay with gentle waves, the most popular place in Sri Lanka for beginner surf lessons."),
 ("Mirissa Beach", SC, "Matara", "beach", "beach;swimming;nightlife;cafes;sunset", 5.9460, 80.4580, 180, 0, 0, "High", "Dec-Mar", "Nov-Apr", "00:00", "23:59",
  "Popular palm-lined beach with seafood restaurants, a relaxed vibe and lively evenings."),
 ("Mirissa Whale Watching", SC, "Matara", "nature_wildlife", "whales;dolphins;boat;ocean;wildlife", 5.9450, 80.4600, 300, 50, 6000, "High", "Dec-Mar", "Nov-Apr", "06:30", "12:00",
  "Morning boat tours to see blue whales, sperm whales and dolphins off the southern coast. Season is roughly November to April."),
 ("Coconut Tree Hill", SC, "Matara", "nature_wildlife", "viewpoint;photography;sunset;palms", 5.9390, 80.4650, 45, 0, 0, "High", "Dec-Mar", "Nov-Apr", "06:00", "19:00",
  "Small headland covered in coconut palms overlooking the ocean, one of the most photographed spots on the coast."),
 ("Dondra Head Lighthouse", SC, "Matara", "cultural", "lighthouse;views;history;quiet", 5.9220, 80.5900, 45, 1, 100, "Low", "-", "Nov-Apr", "08:00", "17:00",
  "Tall colonial lighthouse at the southernmost point of Sri Lanka."),
 ("Paravi Duwa Temple", SC, "Matara", "religious", "temple;buddhist;island;bridge", 5.9450, 80.5480, 30, 0, 0, "Low", "-", "Nov-Apr", "06:00", "19:00",
  "Small island temple off Matara beach connected by a suspension bridge."),
 ("Hummanaya Blowhole", SC, "Hambantota", "nature_wildlife", "blowhole;ocean;natural wonder", 5.9950, 80.7360, 45, 1, 100, "Low", "-", "May-Aug", "07:00", "18:00",
  "One of the largest blowholes in the world, shooting sea water high into the air; strongest during the southwest monsoon."),
 ("Mulkirigala Rock Temple", SC, "Hambantota", "religious", "temple;buddhist;caves;hiking;murals;quiet", 6.1220, 80.7380, 120, 3, 0, "Low", "-", "Nov-Apr", "06:00", "18:00",
  "Rock temple with five cave terraces of murals and reclining Buddhas, reached by a climb of over 500 steps."),
 ("Tangalle Beach", SC, "Hambantota", "beach", "beach;quiet;relaxing;sunset", 6.0240, 80.7940, 180, 0, 0, "Low", "Dec-Mar", "Nov-Apr", "00:00", "23:59",
  "Long uncrowded beaches and coves, popular for relaxing away from the busier west-coast resorts."),
 ("Bundala National Park", SC, "Hambantota", "nature_wildlife", "birds;flamingos;safari;lagoon;wetland;quiet", 6.1950, 81.2100, 180, 25, 60, "Low", "-", "Sep-Mar", "06:00", "18:00",
  "Wetland park and Ramsar site known for migratory birds and flamingos, with crocodiles and elephants."),
 ("Tissa Wewa", SC, "Hambantota", "nature_wildlife", "lake;birds;sunset;quiet", 6.2830, 81.2870, 45, 0, 0, "Low", "-", "Nov-Apr", "06:00", "18:30",
  "Ancient reservoir in Tissamaharama with birdlife and sunset views, a common base for Yala."),
 ("Yala National Park", SC, "Hambantota", "nature_wildlife", "safari;leopards;elephants;wildlife", 6.3720, 81.5200, 300, 30, 60, "High", "Dec-Apr;Jul-Aug", "Feb-Jul", "06:00", "18:00",
  "Sri Lanka's most visited national park, famous for one of the highest leopard densities in the world. Block 1 can get very crowded with jeeps."),
 ("Kataragama Temple", SC, "Monaragala", "religious", "temple;hindu;buddhist;pilgrimage;evening puja", 6.4130, 81.3330, 90, 0, 0, "High", "Jul-Aug", "Nov-Apr", "04:30", "21:00",
  "Multi-religious pilgrimage complex sacred to Buddhists, Hindus and Muslims; vibrant evening puja and a large July/August festival."),
 ("Udawalawe National Park", SC, "Ratnapura", "nature_wildlife", "safari;elephants;wildlife;birds", 6.4740, 80.8990, 210, 30, 60, "Medium", "Dec-Apr", "Jan-Dec", "06:00", "18:00",
  "Open grassland park with almost guaranteed sightings of wild elephant herds year-round; elephant transit home nearby."),
]

COLS = ["name", "region", "district", "category", "tags", "latitude", "longitude",
        "visit_duration_min", "fee_foreign_usd", "fee_local_lkr", "crowd_level",
        "peak_months", "best_months", "open_time", "close_time", "description"]

def main():
    df = pd.DataFrame(ROWS, columns=COLS)
    df.insert(0, "dest_id", [f"D{i:03d}" for i in range(1, len(df) + 1)])
    df["crowd_score"] = df["crowd_level"].map({"Low": 1, "Medium": 2, "High": 3})
    df["verify_status"] = "to_verify"
    assert df["name"].is_unique
    OUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT, index=False)
    print(f"Saved {len(df)} destinations -> {OUT}")
    print(df.groupby(["region", "category"]).size().unstack(fill_value=0))

if __name__ == "__main__":
    main()
