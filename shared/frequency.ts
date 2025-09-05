// shared/frequency.ts

export const taskFrequencies = [
  "daily",
  "weekly", 
  "monthly",
  "bi-monthly",
  "quarterly",
  "yearly",
  "once",
] as const;

export type TaskFrequency = typeof taskFrequencies[number];

/**
 * Norsk -> Engelsk normalisering (robust mot små skrivefeil)
 */
const NB_TO_EN: Record<string, TaskFrequency> = {
  "daglig": "daily",
  "ukentlig": "weekly",
  "månedlig": "monthly",
  "maanedlig": "monthly",
  "mnd": "monthly",
  "annenhver måned": "bi-monthly",
  "annenhver mnd": "bi-monthly",
  "2 hver mnd": "bi-monthly",
  "2 vær mnd": "bi-monthly", // historisk feilskriving
  "kvartalsvis": "quarterly",
  "årlig": "yearly",
  "aarlig": "yearly",
  "engangs": "once",
  "engang": "once",
  "spesifikk dato": "once",
  "bestemt dato": "once",
  "løpende": "daily", // Zaldo-specific mapping
};

/**
 * Engelsk alias -> Engelsk kanonisk
 */
const EN_ALIAS: Record<string, TaskFrequency> = {
  "daily": "daily",
  "day": "daily",
  "weekly": "weekly",
  "week": "weekly",
  "monthly": "monthly",
  "month": "monthly",
  "bi-monthly": "bi-monthly",
  "bimonthly": "bi-monthly",
  "quarterly": "quarterly",
  "yearly": "yearly",
  "annual": "yearly",
  "once": "once",
  "specific_date": "once", // tidligere navn
};

/**
 * Normaliserer vilkårlig inn-verdi (norsk/engelsk/alias/feilskriving)
 * til vår kanoniske TaskFrequency.
 */
export function normalizeFrequency(input: string): TaskFrequency {
  const key = (input || "").trim().toLowerCase();

  // 1) eksakt match mot NB
  if (NB_TO_EN[key]) return NB_TO_EN[key];

  // 2) engelsk alias/kanonisk
  if (EN_ALIAS[key]) return EN_ALIAS[key];

  // 3) heuristikk for "annenhver måned"
  if (/(2|annenhver).*(mån|mnd)/.test(key)) return "bi-monthly";

  // 4) fallback: monthlig er tryggere enn feil "weekly" for "daglig"
  return "monthly";
}

/**
 * Beregn neste forfallsdato gitt frekvens.
 * - startDate: første gyldige dato for oppgaven
 * - fromDate: referansetid (default: nå)
 * Returnerer neste dato >= fromDate.
 */
export function nextOccurrence(
  frequency: TaskFrequency,
  startDate: Date,
  fromDate: Date = new Date()
): Date {
  if (!(startDate instanceof Date)) startDate = new Date(startDate);
  if (!(fromDate instanceof Date)) fromDate = new Date(fromDate);

  if (isNaN(+startDate)) throw new Error("Invalid startDate");
  if (isNaN(+fromDate)) throw new Error("Invalid fromDate");

  const d = new Date(Math.max(startDate.getTime(), fromDate.getTime()));

  const addDays = (n: number) => { d.setDate(d.getDate() + n); };
  const addMonths = (n: number) => { d.setMonth(d.getMonth() + n); };

  switch (frequency) {
    case "once":
      return startDate >= fromDate ? startDate : startDate; // kallende lag håndterer "utløpt"
    case "daily":
      if (d > fromDate) return d;
      addDays(1);
      return d;
    case "weekly": {
      // rull til neste ukegrense fra startDate sin ukedag
      const candidate = new Date(fromDate);
      const startDow = startDate.getDay();
      while (candidate.getDay() !== startDow || candidate <= fromDate) {
        candidate.setDate(candidate.getDate() + 1);
      }
      return candidate;
    }
    case "monthly": {
      const candidate = new Date(fromDate);
      candidate.setDate(startDate.getDate());
      if (candidate <= fromDate) candidate.setMonth(candidate.getMonth() + 1);
      return candidate;
    }
    case "bi-monthly": {
      const candidate = new Date(fromDate);
      candidate.setDate(startDate.getDate());
      // hopp i 2-måneders steg til vi passerer fromDate
      while (candidate <= fromDate) candidate.setMonth(candidate.getMonth() + 2);
      return candidate;
    }
    case "quarterly": {
      const candidate = new Date(fromDate);
      candidate.setDate(startDate.getDate());
      const addQuarter = () => candidate.setMonth(candidate.getMonth() + 3);
      // juster til samme dag i måneden som start
      if (candidate.getDate() !== startDate.getDate()) {
        candidate.setDate(startDate.getDate());
      }
      while (candidate <= fromDate) addQuarter();
      return candidate;
    }
    case "yearly": {
      const candidate = new Date(fromDate);
      candidate.setMonth(startDate.getMonth(), startDate.getDate());
      if (candidate <= fromDate) candidate.setFullYear(candidate.getFullYear() + 1);
      return candidate;
    }
    default:
      return fromDate;
  }
}