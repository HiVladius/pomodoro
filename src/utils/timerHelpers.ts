import { TimerState } from "../types/timer.ts";

export const getStateLabel = (state: TimerState) => {
  switch (state) {
    case "Focus":
      return "🧠 En Concentración";
      break;
    case "Paused":
      return "⏸ Pausado";
      break;
    case "Break":
      return "☕ En Descanso";
      break;
    default:
      return "😴 Inactivo";
  }
};

export const getStateColor = (state: TimerState) => {
  switch (state) {
    case "Focus":
      return "focus";
    case "Paused":
      return "idle";
    case "Break":
      return "break";
    default:
      return "idle";
  }
};
