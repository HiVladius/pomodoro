import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js/auto';
import { storeManager } from '../utils/storeManager';

Chart.register(...registerables);

interface MonthlyChartProps {
  isStoreReady: boolean;
  triggerReload?: number;
  year?: number;
  month?: number;
}

export const MonthlyChart: React.FC<MonthlyChartProps> = ({ 
  isStoreReady, 
  triggerReload,
  year,
  month 
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const [monthLabel, setMonthLabel] = useState('');

  const loadChart = async () => {
    if (!chartRef.current || !isStoreReady) return;

    try {
      console.log('[MonthlyChart] Cargando datos mensuales...');
      const monthlyData = await storeManager.getMonthlyStats(year, month);
      console.log('[MonthlyChart] Datos obtenidos:', monthlyData);

      setMonthLabel(monthlyData.monthLabel);

      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      chartInstanceRef.current = new Chart(chartRef.current, {
        type: 'bar',
        data: {
          labels: monthlyData.labels,
          datasets: [
            {
              label: 'Concentración (min)',
              data: monthlyData.concentration,
              backgroundColor: 'rgba(79, 172, 254, 0.7)',
              borderColor: 'rgba(79, 172, 254, 1)',
              borderWidth: 2,
              borderRadius: 6,
            },
            {
              label: 'Inactividad (min)',
              data: monthlyData.inactivity,
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
      console.error('[MonthlyChart] Error loading chart:', error);
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
  }, [isStoreReady, year, month]);

  // Recargar gráfico cuando cambie triggerReload
  useEffect(() => {
    if (triggerReload !== undefined && isStoreReady) {
      loadChart();
    }
  }, [triggerReload]);

  return (
    <section className="chart-section">
      <h2>📅 Actividad Mensual - {monthLabel}</h2>
      <div className="chart-container">
        <canvas ref={chartRef}></canvas>
      </div>
    </section>
  );
};
