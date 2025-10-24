// toast/src/App.tsx
import { useState, useEffect, useRef } from 'react';

import { listen } from '@tauri-apps/api/event';
import { Chart, registerables } from 'chart.js/auto';
import './App.css'; // Tus estilos
import { invoke } from '@tauri-apps/api/core';

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
interface DailyStats {
    labels: string[];
    concentration: number[];
    inactivity: number[];
}

function App() {
  const [timer, setTimer] = useState('25:00');
  const [stats, setStats] = useState({ concentrated: 0, inactive: 0, pauses: 0 });
  const [isPaused, setIsPaused] = useState(true);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // Hook para suscribirse a eventos de Rust
  useEffect(() => {
    // Escuchar el "tick" del temporizador
    const unlistenTick = listen<TimerPayload>('timer-tick', (event) => {
      setTimer(event.payload.time);
    });

    // Escuchar actualizaciones de estadísticas
    const unlistenStats = listen<StatsPayload>('stats-update', (event) => {
      setStats(event.payload);
    });

    // Cargar la gráfica al inicio
    if (chartRef.current) {
        invoke<DailyStats>('get_daily_stats').then(data => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy(); // Destruye gráfica anterior si existe
            }
            chartInstanceRef.current = new Chart(chartRef.current!, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [
                        { label: 'Concentración', data: data.concentration, backgroundColor: 'rgba(75, 192, 192, 0.5)' },
                        { label: 'Inactividad', data: data.inactivity, backgroundColor: 'rgba(255, 99, 132, 0.5)' }
                    ]
                }
            });
        });
    }

    return () => { // Función de limpieza
      unlistenTick.then(f => f());
      unlistenStats.then(f => f());
      chartInstanceRef.current?.destroy();
    };
  }, []); // Se ejecuta solo una vez al montar

  // Funciones para llamar a Rust
  const handleStart = () => {
    invoke('start_pomodoro');
    setIsPaused(false);
  };

  const handlePause = () => {
    invoke('pause_pomodoro');
    setIsPaused(true);
  };

  // Tu UI basada en los contadores de index.js
  return (
    <div className="container" style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Centro de Control Pomodoro</h1>

      <div id="timer-display" style={{ fontSize: '6rem', fontWeight: 'bold' }}>
        {timer}
      </div>

      {isPaused ? (
        <button id="btnIniciar" onClick={handleStart}>Iniciar Concentración</button>
      ) : (
        <button id="btnPausar" onClick={handlePause}>Pausar</button>
      )}

      <h2>Estadísticas de Hoy</h2>
      <div id="stats-board" style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '20px' }}>
        <div id="contador-concentracion">Concentración: {stats.concentrated}</div>
        <div id="contador-inactividad">Inactividad: {stats.inactive}</div>
        <div id="contador-pausas">Pausas: {stats.pauses}</div>
      </div>

      <h2>Actividad Diaria (Últimos 7 días)</h2>
      <div style={{ maxWidth: '600px', margin: 'auto' }}>
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
}

export default App;