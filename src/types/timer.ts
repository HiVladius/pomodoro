export interface TimerPayload {
  time: string;
}

export interface StatsPayload {
  concentrated: number;
  inactive: number;
  pauses: number;
}

export interface StatePayload {
  state: "Idle" | "Focus" | "Paused" | "Break";
}

export interface UpdateDailyStatsPayload {
  date: string;
  stats: {
    concentrated: number;
    inactive: number;
  };
}

export type TimerState = "Idle" | "Focus" | "Paused" | "Break";

export type ChartView = "weekly" | "monthly";

export interface Stats {
  concentrated: number;
  inactive: number;
  pauses: number;
}
