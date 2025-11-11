import { TimerState } from "../types/timer.ts";
import { getStateColor, getStateLabel } from "../utils/timerHelpers.ts";

interface TimerSectionProps {
  timer: string;
  currentState: TimerState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function TimerSection(
  { timer, currentState, onStart, onPause, onResume, onStop }:
    TimerSectionProps,
) {
  return (
    <section className={`timer-section ${getStateColor(currentState)}`}>
      <div className="state-bage">{getStateLabel(currentState)}</div>
      <div id="timer-display" className="timer-display">
        {timer}
      </div>

      <div className="controls">
        {currentState === "Idle" && (
          <button
            type="submit"
            id="btnIniciar"
            className="btn btn-start"
            onClick={onStart}
          >
            ▶ Iniciar Concentración
          </button>
        )}
        {currentState === "Focus" && (
          <button
            type="submit"
            id="btnPausar"
            className="btn btn-pause"
            onClick={onPause}
          >
            | ⏸ Pausar
          </button>
        )}
        {currentState === "Paused" && (
          <>
            <button
              type="submit"
              id="btnReanudar"
              className="btn btn-start"
              onClick={onResume}
            >
              ▶ Reanudar
            </button>
            <button
              type="submit"
              id="btnFinalizar"
              className="btn btn-pause"
              onClick={onStop}
            >
              ⏹ Finalizar
            </button>
          </>
        )}
      </div>
    </section>
  );
}
