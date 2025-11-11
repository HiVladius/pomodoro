import Database from "@tauri-apps/plugin-sql";
import { DailyStatRecord } from "./types";

let db: any = null;

export async function initDatabase() {
  try {
    // Conexión a Neon Local (postgres://neon:npg@localhost:5432/toast)
    db = await Database.load(
      "postgres://neon:npg@localhost:5432/toast?sslmode=require",
    );
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

export async function saveDailyStats(
  date: string,
  concentrated: number,
  inactive: number,
  pause: number,
): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  const query = `
    INSERT INTO daily_stats (date, concentrated, inactive, pauses)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT(date)
    DO UPDATE SET
      concentrated = excluded.concentrated,
      inactive = excluded.inactive,
      pauses = excluded.pauses,
      updated_at = CURRENT_TIMESTAMP
  `;

  try {
    await db.execute(query, [date, concentrated, inactive, pause]);
  } catch (error) {
    console.error("Failed to save stats:", error);
    throw error;
  }
}

export async function fetchDailyStats(
  date: string,
): Promise<DailyStatRecord | null> {
  if (!db) throw new Error("Database not initialized");

  const query = `
    SELECT id, date::text, concentrated, inactive, pauses 
    FROM daily_stats 
    WHERE date = $1
  `;

  try {
    const result: DailyStatRecord[] = await db.select(query, [date]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    throw error;
  }
}

export async function getStatsRange(
  startDate: string,
  endDate: string,
): Promise<DailyStatRecord[]> {
  if (!db) throw new Error("Database not initialized");

  const query = `
    SELECT id, date::text, concentrated, inactive, pauses
    FROM daily_stats
    WHERE date BETWEEN $1 AND $2
    ORDER BY date ASC
  `;

  try {
    return await db.select(query, [startDate, endDate]);
  } catch (error) {
    console.error("Failed to fetch stats range:", error);
    throw error;
  }
}

export async function getLastNDaysStats(
  days: number,
): Promise<DailyStatRecord[]> {
  if (!db) throw new Error("Database not initialized");

  const query = `
    SELECT id, date::text, concentrated, inactive, pauses
    FROM daily_stats
    ORDER BY date DESC
    LIMIT $1
  `;

  try {
    const result = await db.select(query, [days]);
    return result.reverse(); // Retornar en orden ascendente
  } catch (error) {
    console.error("Failed to get last n days:", error);
    throw error;
  }
}
