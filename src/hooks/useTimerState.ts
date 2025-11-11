import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  StatePayload,
  Stats,
  StatsPayload,
  TimerPayload,
  TimerState,
  UpdateDailyStatsPayload,
} from "../types/timer";
import { storeManager } from "../utils/storeManager";

interface UseTimerStateProps {
  isStoreReady: boolean;
  onDailyStatsUpdate?: () => void;
  onStateChange?: (newState: TimerState, oldState: TimerState) => void;
}

export function useTimerState({
  isStoreReady,
  onDailyStatsUpdate,
  onStateChange,
}: UseTimerStateProps) {
  const [timer, setTimer] = useState("25:00");
  const [stats, setStats] = useState<Stats>({
    concentrated: 0,
    inactive: 0,
    pauses: 0,
  });
  const [currentState, setCurrentState] = useState<TimerState>("Idle");

  // Hook para suscribirse a eventos de Rust
  useEffect(() => {
    if (!isStoreReady) return;

    // Escuchar el "tick" del temporizador
    const unlistenTick = listen<TimerPayload>("timer-tick", (event) => {
      setTimer(event.payload.time);
    });

    // Escuchar actualizaciones de estadísticas
    const unlistenStats = listen<StatsPayload>("stats-update", (event) => {
      setStats(event.payload);
    });

    // Escuchar cambios de estado
    const unlistenState = listen<StatePayload>("state-changed", (event) => {
      const newState = event.payload.state;
      setCurrentState((prevState) => {
        // Llamar callback con el estado anterior y nuevo
        if (onStateChange) {
          onStateChange(newState, prevState);
        }
        return newState;
      });
    });

    // Escuchar actualizaciones de estadísticas diarias
    const unlistenDailyStats = listen<UpdateDailyStatsPayload>(
      "update-daily-stats",
      async (event) => {
        try {
          console.log("[useTimerState] Guardando estadísticas:", event.payload);
          await storeManager.updateStats(
            event.payload.date,
            event.payload.stats,
          );
          console.log("[useTimerState] Estadísticas guardadas exitosamente");

          // Notificar que se actualizaron las estadísticas
          if (onDailyStatsUpdate) {
            onDailyStatsUpdate();
          }
        } catch (error) {
          console.error("[useTimerState] Error updating daily stats:", error);
        }
      },
    );

    return () => {
      unlistenTick.then((f) => f());
      unlistenStats.then((f) => f());
      unlistenState.then((f) => f());
      unlistenDailyStats.then((f) => f());
    };
  }, [isStoreReady, onDailyStatsUpdate, onStateChange]);

  return {
    timer,
    stats,
    currentState,
    setStats,
  };
}
