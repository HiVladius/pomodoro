// toast/src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Chart, registerables } from 'chart.js/auto';
import './App.css';
import { invoke } from '@tauri-apps/api/core';
import { storeManager } from './utils/storeManager';

Chart.register(...registerables);

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
  state: 'Idle' | 'Focus' | 'Paused' | 'Break';
}

interface UpdateDailyStatsPayload {
  date: string;
  stats: {
    concentrated: number;
    inactive: number;
  };
}

function App() {
  const [timer, setTimer] = useState('25:00');
  const [stats, setStats] = useState({ concentrated: 0, inactive: 0, pauses: 0 });
  const [currentState, setCurrentState] = useState<'Idle' | 'Focus' | 'Paused' | 'Break'>('Idle');
  const [isStoreReady, setIsStoreReady] = useState(false);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // Inicializar el store
  useEffect(() => {
    const initStore = async () => {
      try {
        await storeManager.initialize();
        setIsStoreReady(true);
        // Cargar estadísticas semanales al iniciar
        loadChart();
      } catch (error) {
        console.error('Error initializing store:', error);
      }
    };
    initStore();
  }, []);

  // Hook para suscribirse a eventos de Rust
  useEffect(() => {
    if (!isStoreReady) return;

    // Escuchar el "tick" del temporizador
    const unlistenTick = listen<TimerPayload>('timer-tick', (event) => {
      setTimer(event.payload.time);
    });

    // Escuchar actualizaciones de estadísticas
    const unlistenStats = listen<StatsPayload>('stats-update', (event) => {
      setStats(event.payload);
    });

    // Escuchar cambios de estado
    const unlistenState = listen<StatePayload>('state-changed', (event) => {
      setCurrentState(event.payload.state);
    });

    // Escuchar actualizaciones de estadísticas diarias
    const unlistenDailyStats = listen<UpdateDailyStatsPayload>('update-daily-stats', async (event) => {
      try {
        await storeManager.updateStats(event.payload.date, event.payload.stats);
        // Recargar la gráfica
        await loadChart();
      } catch (error) {
        console.error('Error updating daily stats:', error);
      }
    });

    return () => {
      unlistenTick.then(f => f());
      unlistenStats.then(f => f());
      unlistenState.then(f => f());
      unlistenDailyStats.then(f => f());
      chartInstanceRef.current?.destroy();
    };
  }, [isStoreReady]);

  const loadChart = async () => {
    if (chartRef.current && isStoreReady) {
      try {
        const weeklyStat = await storeManager.getWeeklyStats();
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }
        chartInstanceRef.current = new Chart(chartRef.current, {
          type: 'bar',
          data: {
            labels: weeklyStat.labels,
            datasets: [
              {
                label: 'Concentración',
                data: weeklyStat.concentration,
                backgroundColor: 'rgba(79, 172, 254, 0.7)',
                borderColor: 'rgba(79, 172, 254, 1)',
                borderWidth: 2,
                borderRadius: 6,
              },
              {
                label: 'Inactividad',
                data: weeklyStat.inactivity,
                backgroundColor: 'rgba(255, 107, 107, 0.7)',
                borderColor: 'rgba(255, 107, 107, 1)',
                borderWidth: 2,
                borderRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  font: {
                    size: 12,
                    weight: 'bold',
                  },
                  padding: 15,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)',
                },
              },
            },
          },
        });
      } catch (error) {
        console.error('Error loading chart:', error);
      }
    }
  };

  const handleStart = () => {
    invoke('start_pomodoro');
  };

  const handlePause = () => {
    invoke('pause_pomodoro');
  };

  const handleResume = () => {
    invoke('resume_pomodoro');
  };

  const handleStop = () => {
    invoke('stop_pomodoro');
  };

  const getStateLabel = () => {
    switch (currentState) {
      case 'Focus':
        return '🎯 En Concentración';
      case 'Paused':
        return '⏸ Pausado';
      case 'Break':
        return '☕ En Descanso';
      default:
        return '😴 Inactivo';
    }
  };

  const getStateColor = () => {
    switch (currentState) {
      case 'Focus':
        return 'focus';
      case 'Paused':
        return 'idle';
      case 'Break':
        return 'break';
      default:
        return 'idle';
    }
  };

  if (!isStoreReady) {
    return (
      <div className="app">
        <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
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
      </header>

      <main className="app-main">
        {/* Timer Section */}
        <section className={`timer-section ${getStateColor()}`}>
          <div className="state-badge">{getStateLabel()}</div>
          <div id="timer-display" className="timer-display">
            {timer}
          </div>
          <div className="controls">
            {currentState === 'Idle' && (
              <button id="btnIniciar" className="btn btn-start" onClick={handleStart}>
                ▶ Iniciar Concentración
              </button>
            )}
            {currentState === 'Focus' && (
              <button id="btnPausar" className="btn btn-pause" onClick={handlePause}>
                ⏸ Pausar
              </button>
            )}
            {currentState === 'Paused' && (
              <>
                <button id="btnReanudar" className="btn btn-start" onClick={handleResume}>
                  ▶ Reanudar
                </button>
                <button id="btnFinalizar" className="btn btn-pause" onClick={handleStop}>
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
        <section className="chart-section">
          <h2>📈 Actividad Semanal (Últimos 7 días)</h2>
          <div className="chart-container">
            <canvas ref={chartRef}></canvas>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;