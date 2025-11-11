import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { storeManager } from "../utils/storeManager";
import { getLocalDateString } from "../helpers/today";
import { Stats } from "../types/timer";

export function useStoreInitialization() {
  const [isStoreReady, setIsStoreReady] = useState(false);
  const [initialStats, setInitialStats] = useState<Stats>({
    concentrated: 0,
    inactive: 0,
    pauses: 0,
  });

  useEffect(() => {
    const initStore = async () => {
      try {
        await storeManager.initialize();
        setIsStoreReady(true);

        // Cargar estadísticas del día actual
        const today = getLocalDateString();
        const todayStats = await storeManager.getStats(today);

        console.log(
          "[useStoreInitialization] Estadísticas cargadas del store:",
          todayStats,
        );

        // Actualizar el estado con las estadísticas guardadas
        const loadedStats = {
          concentrated: todayStats.concentrated,
          inactive: todayStats.inactive,
          pauses: 0, // Las pausas no se persisten, son solo del ciclo actual
        };
        setInitialStats(loadedStats);

        // Inicializar el backend de Rust con las estadísticas persistidas
        await invoke("initialize_stats", {
          concentrated: todayStats.concentrated,
          inactive: todayStats.inactive,
        });

        console.log("[useStoreInitialization] Backend inicializado con stats persistidas");
      } catch (error) {
        console.error("Error initializing store:", error);
      }
    };
    initStore();
  }, []);

  return { isStoreReady, initialStats };
}
