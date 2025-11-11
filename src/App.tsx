import { useEffect, useState } from "react";
import "./App.css";
import { WeeklyChart } from "./components/WeeklyChart.tsx";
import { MonthlyChart } from "./components/MonthlyChart.tsx";
import { TimerSection } from "./components/TimerSection.tsx";
import { StatsBoard } from "./components/StatsBoard.tsx";
import { ChartViewSelector } from "./components/ChartViewSelector.tsx";
import { useNotifications } from "./hooks/useNotifications.ts";
import { useStoreInitialization } from "./hooks/useStoreInitialization.ts";
import { useTimerState } from "./hooks/useTimerState.ts";
import { useTimerControls } from "./hooks/useTimerControls.ts";
import { ChartView, TimerState } from "./types/timer.ts";

function App() {
  const [chartReloadTrigger, setChartReloadTrigger] = useState(0);
  const [chartView, setChartView] = useState<ChartView>("weekly");

  // Inicializar el store
  const { isStoreReady, initialStats } = useStoreInitialization();

  // Hook de notificaciones
  const {
    notifyPomodoroComplete,
    notifyBreakComplete,
    notifySessionStarted,
    permissionGranted,
  } = useNotifications();

  // Manejar cambios de estado para notificaciones
  const handleStateChange = (newState: TimerState, oldState: TimerState) => {
    if (newState === "Focus") {
      notifySessionStarted();
    } else if (newState === "Break") {
      notifyPomodoroComplete();
    } else if (newState === "Idle" && oldState === "Break") {
      notifyBreakComplete();
    }
  };

  // Hook para estado del timer y eventos de Rust
  const { timer, stats, currentState, setStats } = useTimerState({
    isStoreReady,
    onDailyStatsUpdate: () => setChartReloadTrigger((prev) => prev + 1),
    onStateChange: handleStateChange,
  });

  // Hook para controles del timer
  const { handleStart, handlePause, handleResume, handleStop } =
    useTimerControls();

  // Actualizar stats cuando se cargan las estadísticas iniciales
  useEffect(() => {
    if (isStoreReady && initialStats) {
      setStats(initialStats);
    }
  }, [isStoreReady, initialStats]);

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
          <p
            className="notification-warning"
            style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: "8px" }}
          >
            ⚠️ Notificaciones desactivadas
          </p>
        )}
      </header>

      <main className="app-main">
        <TimerSection
          timer={timer}
          currentState={currentState}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
        />

        <StatsBoard stats={stats} />

        <ChartViewSelector
          currentView={chartView}
          onViewChange={setChartView}
        />

        {chartView === "weekly" && (
          <WeeklyChart
            isStoreReady={isStoreReady}
            triggerReload={chartReloadTrigger}
          />
        )}

        {chartView === "monthly" && (
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
