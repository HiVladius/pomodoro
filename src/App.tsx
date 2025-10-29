import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import "./App.css";
import { storeManager } from "./utils/storeManager";
import { WeeklyChart } from "./components/WeeklyChart";
import { MonthlyChart } from "./components/MonthlyChart";
import { useNotifications } from "./hooks/useNotifications";

// Interfaces para los eventos de Rust
interface TimerPayload {
  time: string;
}

interface StatsPayload {
  concentrated: number;
  inactive: number;
  pauses: number;
}

interface StatePayload {
  state: "Idle" | "Focus" | "Paused" | "Break";
}

interface UpdateDailyStatsPayload {
  date: string;
  stats: {
    concentrated: number;
    inactive: number;
  };
}

type ChartView = 'weekly' | 'monthly';

function App() {
  const [timer, setTimer] = useState("25:00");
  const [stats, setStats] = useState({
    concentrated: 0,
    inactive: 0,
    pauses: 0,
  });
  const [currentState, setCurrentState] = useState<
    "Idle" | "Focus" | "Paused" | "Break"
  >("Idle");
  const [isStoreReady, setIsStoreReady] = useState(false);
  const [chartReloadTrigger, setChartReloadTrigger] = useState(0);
  const [chartView, setChartView] = useState<ChartView>('weekly');

  // Hook de notificaciones
  const { 
    notifyPomodoroComplete, 
    notifyBreakComplete, 
    notifySessionStarted,
    permissionGranted 
  } = useNotifications();

  // Inicializar el store
  useEffect(() => {
    const initStore = async () => {
      try {
        await storeManager.initialize();
        setIsStoreReady(true);

        // Cargar estadísticas del día actual
        const today = new Date().toISOString().split("T")[0];
        const todayStats = await storeManager.getStats(today);

        console.log("[App] Estadísticas cargadas del store:", todayStats);

        // Actualizar el estado con las estadísticas guardadas
        setStats({
          concentrated: todayStats.concentrated,
          inactive: todayStats.inactive,
          pauses: 0, // Las pausas no se persisten, son solo del ciclo actual
        });

        // Inicializar el backend de Rust con las estadísticas persistidas
        await invoke("initialize_stats", {
          concentrated: todayStats.concentrated,
          inactive: todayStats.inactive,
        });

        console.log("[App] Backend inicializado con stats persistidas");
      } catch (error) {
        console.error("Error initializing store:", error);
      }
    };
    initStore();
  }, []);

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
      setCurrentState(newState);
      
      // Enviar notificaciones según el cambio de estado
      if (newState === 'Focus') {
        notifySessionStarted();
      } else if (newState === 'Break') {
        notifyPomodoroComplete();
      } else if (newState === 'Idle' && currentState === 'Break') {
        notifyBreakComplete();
      }
    });

    // Escuchar actualizaciones de estadísticas diarias
    const unlistenDailyStats = listen<UpdateDailyStatsPayload>(
      "update-daily-stats",
      async (event) => {
        try {
          console.log("[App] Guardando estadísticas:", event.payload);
          await storeManager.updateStats(
            event.payload.date,
            event.payload.stats,
          );
          console.log("[App] Estadísticas guardadas exitosamente");

          // Disparar recarga del gráfico
          setChartReloadTrigger((prev) => prev + 1);
        } catch (error) {
          console.error("[App] Error updating daily stats:", error);
        }
      },
    );

    return () => {
      unlistenTick.then((f) => f());
      unlistenStats.then((f) => f());
      unlistenState.then((f) => f());
      unlistenDailyStats.then((f) => f());
    };
  }, [isStoreReady]);

  const handleStart = () => {
    invoke("start_pomodoro");
  };

  const handlePause = () => {
    invoke("pause_pomodoro");
  };

  const handleResume = () => {
    invoke("resume_pomodoro");
  };

  const handleStop = () => {
    invoke("stop_pomodoro");
  };

  const getStateLabel = () => {
    switch (currentState) {
      case "Focus":
        return "🎯 En Concentración";
      case "Paused":
        return "⏸ Pausado";
      case "Break":
        return "☕ En Descanso";
      default:
        return "😴 Inactivo";
    }
  };

  const getStateColor = () => {
    switch (currentState) {
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

  if (!isStoreReady) {
    return (
      <div className="app">
        <div style={{ textAlign: "center", padding: "40px", color: "white" }}>
          <p>Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍅 Pomodoro Control</h1>
        <p className="subtitle">Gestiona tu concentración</p>
        {!permissionGranted && (
          <p className="notification-warning" style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '8px' }}>
            ⚠️ Notificaciones desactivadas
          </p>
        )}
      </header>

      <main className="app-main">
        {/* Timer Section */}
        <section className={`timer-section ${getStateColor()}`}>
          <div className="state-badge">{getStateLabel()}</div>
          <div id="timer-display" className="timer-display">
            {timer}
          </div>
          <div className="controls">
            {currentState === "Idle" && (
              <button
                id="btnIniciar"
                className="btn btn-start"
                onClick={handleStart}
              >
                ▶ Iniciar Concentración
              </button>
            )}
            {currentState === "Focus" && (
              <button
                id="btnPausar"
                className="btn btn-pause"
                onClick={handlePause}
              >
                ⏸ Pausar
              </button>
            )}
            {currentState === "Paused" && (
              <>
                <button
                  id="btnReanudar"
                  className="btn btn-start"
                  onClick={handleResume}
                >
                  ▶ Reanudar
                </button>
                <button
                  id="btnFinalizar"
                  className="btn btn-pause"
                  onClick={handleStop}
                >
                  ⏹ Finalizar
                </button>
              </>
            )}
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section">
          <h2>📊 Estadísticas de Hoy</h2>
          <div id="stats-board" className="stats-board">
            <div className="stat-card focus-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-label">Concentración</div>
              <div className="stat-value">{stats.concentrated}</div>
            </div>
            <div className="stat-card break-card">
              <div className="stat-icon">☕</div>
              <div className="stat-label">Descansos</div>
              <div className="stat-value">{stats.pauses}</div>
            </div>
            <div className="stat-card idle-card">
              <div className="stat-icon">💤</div>
              <div className="stat-label">Inactividad</div>
              <div className="stat-value">{stats.inactive}</div>
            </div>
          </div>
        </section>

        {/* Chart Section */}
        <section className="chart-view-selector">
          <button
            className={`view-btn ${chartView === 'weekly' ? 'active' : ''}`}
            onClick={() => setChartView('weekly')}
          >
            📊 Últimos 7 días
          </button>
          <button
            className={`view-btn ${chartView === 'monthly' ? 'active' : ''}`}
            onClick={() => setChartView('monthly')}
          >
            📅 Mes Completo
          </button>
        </section>

        {chartView === 'weekly' && (
          <WeeklyChart
            isStoreReady={isStoreReady}
            triggerReload={chartReloadTrigger}
          />
        )}

        {chartView === 'monthly' && (
          <MonthlyChart
            isStoreReady={isStoreReady}
            triggerReload={chartReloadTrigger}
          />
        )}
      </main>
    </div>
  );
}

export default App;
