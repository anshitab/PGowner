export const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export interface DayMeals {
  breakfast: string;
  lunch: string;
  dinner: string;
}

export type WeeklyMenu = Record<DayKey, DayMeals>;

export const DAY_LABELS: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export function emptyDayMeals(): DayMeals {
  return { breakfast: "", lunch: "", dinner: "" };
}

export function emptyWeeklyMenu(): WeeklyMenu {
  return DAY_KEYS.reduce((acc, day) => {
    acc[day] = emptyDayMeals();
    return acc;
  }, {} as WeeklyMenu);
}

export function normalizeWeeklyMenu(raw: unknown): WeeklyMenu {
  const base = emptyWeeklyMenu();
  if (!raw || typeof raw !== "object") return base;

  for (const day of DAY_KEYS) {
    const row = (raw as Record<string, unknown>)[day];
    if (!row || typeof row !== "object") continue;
    const meals = row as Record<string, unknown>;
    base[day] = {
      breakfast: typeof meals.breakfast === "string" ? meals.breakfast : "",
      lunch: typeof meals.lunch === "string" ? meals.lunch : "",
      dinner: typeof meals.dinner === "string" ? meals.dinner : "",
    };
  }
  return base;
}

export const DEMO_WEEKLY_MENU: WeeklyMenu = {
  monday: {
    breakfast: "Poha, tea",
    lunch: "Dal, rice, roti, seasonal sabzi",
    dinner: "Rajma, rice, salad",
  },
  tuesday: {
    breakfast: "Upma, coffee",
    lunch: "Chole, bhatura, onion salad",
    dinner: "Mix veg, roti, curd",
  },
  wednesday: {
    breakfast: "Paratha, curd",
    lunch: "Kadhi, rice, papad",
    dinner: "Paneer butter masala, roti",
  },
  thursday: {
    breakfast: "Idli, sambar",
    lunch: "Sambar rice, poriyal, pickle",
    dinner: "Egg curry / paneer curry, roti",
  },
  friday: {
    breakfast: "Bread, jam, tea",
    lunch: "Veg biryani, raita",
    dinner: "Dal fry, jeera rice, salad",
  },
  saturday: {
    breakfast: "Aloo paratha, pickle",
    lunch: "Rajma chawal, salad",
    dinner: "Special thali (chef’s choice)",
  },
  sunday: {
    breakfast: "Poori, aloo sabzi",
    lunch: "Chicken / paneer curry, rice, roti",
    dinner: "Khichdi, papad, pickle",
  },
};
