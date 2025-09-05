// server/shared/frequency-map.ts
import { TaskFrequency as FrontFreq, normalizeFrequency } from "../../shared/frequency";

export type DbFreq = "DAILY"|"WEEKLY"|"MONTHLY"|"BI_MONTHLY"|"QUARTERLY"|"YEARLY"|"ONCE";

export const DB_TO_FRONT: Record<DbFreq, FrontFreq> = {
  DAILY: "daily",
  WEEKLY: "weekly", 
  MONTHLY: "monthly",
  BI_MONTHLY: "bi-monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
  ONCE: "once",
};

export const FRONT_TO_DB: Record<FrontFreq, DbFreq> = {
  "daily": "DAILY",
  "weekly": "WEEKLY",
  "monthly": "MONTHLY",
  "bi-monthly": "BI_MONTHLY", 
  "quarterly": "QUARTERLY",
  "yearly": "YEARLY",
  "once": "ONCE",
};

// Når det kommer inn fritekst (NB/EN/alias), normaliser først:
export function toDbEnum(input: string): DbFreq {
  return FRONT_TO_DB[normalizeFrequency(input)];
}