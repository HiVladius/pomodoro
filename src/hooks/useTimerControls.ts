import { invoke } from "@tauri-apps/api/core";

export const useTimerControls = () => {
  const handleStart = () => {
    invoke("start_pomodoro");
  };

  const handlePause = () => {
    invoke("pause_pomodoro");
  };

  const handleResume = () => {
    invoke("resume_pomodoro");
  };

  const handleStop = () => {
    invoke("stop_pomodoro");
  };

  return { handleStart, handlePause, handleResume, handleStop };
};
