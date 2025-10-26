import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js/auto';
import { storeManager } from '../utils/storeManager';

Chart.register(...registerables);

interface WeeklyChartProps {
  isStoreReady: boolean;
  triggerReload?: number; // Opcional: para forzar recarga cuando cambie
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ isStoreReady, triggerReload }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const loadChart = async () => {
    if (!chartRef.current || !isStoreReady) return;

    try {
      console.log('[WeeklyChart] Cargando datos semanales...');
      const weeklyStat = await storeManager.getWeeklyStats();
      console.log('[WeeklyChart] Datos obtenidos:', weeklyStat);

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
          maintainAspectRatio: true,
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
              ticks: {
                stepSize: 1,
              },
            },
            x: {
              grid: {
                display: false,
              },
            },
          },
        },
      });
    } catch (error) {
      console.error('[WeeklyChart] Error loading chart:', error);
    }
  };

  // Cargar gráfico cuando el store esté listo
  useEffect(() => {
    if (isStoreReady) {
      loadChart();
    }

    // Cleanup: destruir gráfico al desmontar
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [isStoreReady]);

  // Recargar gráfico cuando cambie triggerReload
  useEffect(() => {
    if (triggerReload !== undefined && isStoreReady) {
      loadChart();
    }
  }, [triggerReload]);

  return (
    <section className="chart-section">
      <h2>📈 Actividad Semanal (Últimos 7 días)</h2>
      <div className="chart-container">
        <canvas ref={chartRef}></canvas>
      </div>
    </section>
  );
};
