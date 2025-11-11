import { Stats } from "../types/timer.ts";

interface StatsBoardProps {
  stats: Stats;
}

export function StatsBoard({ stats }: StatsBoardProps) {
  return (
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
  );
}
