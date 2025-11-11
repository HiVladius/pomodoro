import { ChartView } from "../types/timer.ts";

interface ChartViewSelectorProps {
  currentView: ChartView;
  onViewChange: (view: ChartView) => void;
}

export function ChartViewSelector({
  currentView,
  onViewChange,
}: ChartViewSelectorProps) {
  return (
    <section className="chart-view-selector">
      <button
        type="submit"
        className={`view-btn ${currentView === "weekly" ? "active" : ""}`}
        onClick={() => onViewChange("weekly")}
      >
        📊 Últimos 7 días
      </button>
      <button
        type="submit"
        className={`view-btn ${currentView === "monthly" ? "active" : ""}`}
        onClick={() => onViewChange("monthly")}
      >
        📅 Mes Completo
      </button>
    </section>
  );
}
