import { Store } from '@tauri-apps/plugin-store';

interface DailyStat {
  concentrated: number; // Minutos totales concentrados
  inactive: number;     // Minutos totales inactivos
}

interface MonthlyStat {
  year: number;
  month: number;
  days: Record<string, DailyStat>; // "01" -> {concentrated, inactive}
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

class StoreManager {
  private store: Store | null = null;

  async initialize(): Promise<void> {
    try {
      this.store = await Store.load('stats.dat');
    } catch (error) {
      console.error('Error initializing store:', error);
    }
  }

  private getMonthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private getDayKey(day: number): string {
    return String(day).padStart(2, '0');
  }

  async getStats(date: string): Promise<DailyStat> {
    if (!this.store) {
      return { concentrated: 0, inactive: 0 };
    }
    try {
      // Primero intenta obtener del formato mensual
      const dateObj = new Date(date);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();
      
      const monthKey = this.getMonthKey(year, month);
      const monthData = await this.store.get<MonthlyStat>(monthKey);
      
      if (monthData) {
        const dayKey = this.getDayKey(day);
        return monthData.days[dayKey] || { concentrated: 0, inactive: 0 };
      }
      
      // Fallback a formato antiguo (por compatibilidad)
      const stats = await this.store.get<DailyStat>(date);
      return stats || { concentrated: 0, inactive: 0 };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { concentrated: 0, inactive: 0 };
    }
  }

  async updateStats(date: string, stats: DailyStat): Promise<void> {
    if (!this.store) return;
    try {
      const dateObj = new Date(date);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();
      
      const monthKey = this.getMonthKey(year, month);
      const dayKey = this.getDayKey(day);
      
      // Obtener o crear datos del mes
      let monthData = await this.store.get<MonthlyStat>(monthKey);
      
      if (!monthData) {
        monthData = {
          year,
          month,
          days: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      }
      
      monthData.days[dayKey] = stats;
      monthData.metadata.updatedAt = new Date().toISOString();
      
      await this.store.set(monthKey, monthData);
      await this.store.save();
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  async getWeeklyStats(): Promise<{
    labels: string[];
    concentration: number[];
    inactivity: number[];
  }> {
    if (!this.store) {
      console.warn('[StoreManager] Store no inicializado');
      return {
        labels: [],
        concentration: [],
        inactivity: [],
      };
    }

    const labels: string[] = [];
    const concentration: number[] = [];
    const inactivity: number[] = [];

    try {
      console.log('[StoreManager] Obteniendo estadísticas de los últimos 7 días...');
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dateLabel = date.toLocaleDateString('es-ES', {
          month: '2-digit',
          day: '2-digit',
        });

        labels.push(dateLabel);

        const stats = await this.getStats(dateStr);
        console.log(`[StoreManager] ${dateLabel} (${dateStr}):`, stats);
        concentration.push(stats.concentrated);
        inactivity.push(stats.inactive);
      }
      console.log('[StoreManager] Estadísticas semanales completas:', {
        labels,
        concentration,
        inactivity
      });
    } catch (error) {
      console.error('Error getting weekly stats:', error);
    }

    return { labels, concentration, inactivity };
  }

  async incrementStat(date: string, field: 'concentrated' | 'inactive'): Promise<void> {
    const stats = await this.getStats(date);
    stats[field] += 1;
    await this.updateStats(date, stats);
  }

  async getMonthlyStats(year?: number, month?: number): Promise<{
    labels: string[];
    concentration: number[];
    inactivity: number[];
    monthLabel: string;
  }> {
    if (!this.store) {
      console.warn('[StoreManager] Store no inicializado');
      return {
        labels: [],
        concentration: [],
        inactivity: [],
        monthLabel: '',
      };
    }

    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month !== undefined ? month : now.getMonth() + 1;

    const labels: string[] = [];
    const concentration: number[] = [];
    const inactivity: number[] = [];

    try {
      console.log(`[StoreManager] Obteniendo estadísticas del mes ${targetYear}-${String(targetMonth).padStart(2, '0')}...`);
      
      const monthKey = this.getMonthKey(targetYear, targetMonth);
      const monthData = await this.store.get<MonthlyStat>(monthKey);

      // Determinar cantidad de días en el mes
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const dayKey = this.getDayKey(day);
        const dateLabel = new Date(targetYear, targetMonth - 1, day).toLocaleDateString('es-ES', {
          weekday: 'short',
          day: '2-digit',
        });

        labels.push(dateLabel);

        if (monthData && monthData.days[dayKey]) {
          const stat = monthData.days[dayKey];
          concentration.push(stat.concentrated);
          inactivity.push(stat.inactive);
        } else {
          concentration.push(0);
          inactivity.push(0);
        }
      }

      const monthLabel = new Date(targetYear, targetMonth - 1).toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
      });

      console.log('[StoreManager] Estadísticas mensuales completas:', {
        labels,
        concentration,
        inactivity,
        monthLabel,
      });

      return { labels, concentration, inactivity, monthLabel };
    } catch (error) {
      console.error('Error getting monthly stats:', error);
      return {
        labels: [],
        concentration: [],
        inactivity: [],
        monthLabel: '',
      };
    }
  }

  async getDailyInMonth(year: number, month: number, day: number): Promise<DailyStat> {
    if (!this.store) {
      return { concentrated: 0, inactive: 0 };
    }

    try {
      const monthKey = this.getMonthKey(year, month);
      const dayKey = this.getDayKey(day);
      const monthData = await this.store.get<MonthlyStat>(monthKey);

      if (monthData && monthData.days[dayKey]) {
        return monthData.days[dayKey];
      }

      return { concentrated: 0, inactive: 0 };
    } catch (error) {
      console.error('Error getting daily stats in month:', error);
      return { concentrated: 0, inactive: 0 };
    }
  }
}

export const storeManager = new StoreManager();
