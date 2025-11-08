export interface DailyStatRecord {
  id: number;
  date: string;
  concentrated: number;
  inactive: number;
  pauses: number;
}

export interface StateUpdate {
  date: string;
  concentrated: number;
  inactive: number;
  pauses: number;
}
