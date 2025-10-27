import { Store } from '@tauri-apps/plugin-store';

interface DailyStat {
  concentrated: number; // Minutos totales concentrados
  inactive: number;     // Minutos totales inactivos
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

  async getStats(date: string): Promise<DailyStat> {
    if (!this.store) {
      return { concentrated: 0, inactive: 0 };
    }
    try {
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
      await this.store.set(date, stats);
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
}

export const storeManager = new StoreManager();
