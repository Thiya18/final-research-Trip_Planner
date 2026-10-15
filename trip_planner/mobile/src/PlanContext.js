import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_API_URL } from "./api";
import { load, save } from "./storage";

const PlanContext = createContext(null);
const MAX_TRIPS = 20;

export const defaultPrefs = {
  traveller_type: "local",
  region: "Cultural Triangle",
  interests: ["cultural"],
  interest_text: "",
  trip_days: 2,
  daily_hours: 9,
  group_size: 2,
  budget_lkr_per_person_per_day: 15000,
  crowd_preference: "moderate",
  transport_mode: "private_car",
  travel_month: new Date().getMonth() + 1,
  method: "rl",
};

export function PlanProvider({ children }) {
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [plan, setPlanState] = useState(null);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  // saved trips, newest first: { id, savedAt, prefs, plan }
  const [trips, setTrips] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, t] = await Promise.all([load("prefs", null), load("trips", [])]);
      if (p) setPrefs({ ...defaultPrefs, ...p });
      setTrips(t);
      if (t[0]) setPlanState(t[0].plan);
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (ready) save("prefs", prefs); }, [prefs, ready]);
  useEffect(() => { if (ready) save("trips", trips); }, [trips, ready]);

  const update = (patch) => setPrefs((p) => ({ ...p, ...patch }));

  // every freshly planned trip is saved automatically
  const setPlan = (newPlan) => {
    setPlanState(newPlan);
    if (newPlan) {
      const trip = { id: newPlan.plan_id ?? String(Date.now()), savedAt: Date.now(), prefs, plan: newPlan };
      setTrips((ts) => [trip, ...ts.filter((x) => x.id !== trip.id)].slice(0, MAX_TRIPS));
    }
  };

  const openTrip = (trip) => {
    setPrefs({ ...defaultPrefs, ...trip.prefs });
    setPlanState(trip.plan);
  };

  const deleteTrip = (id) => {
    setTrips((ts) => ts.filter((x) => x.id !== id));
    if (plan && (plan.plan_id ?? null) === id) setPlanState(null);
  };

  return (
    <PlanContext.Provider value={{ prefs, update, plan, setPlan, apiUrl, setApiUrl, trips, openTrip, deleteTrip, ready }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);
