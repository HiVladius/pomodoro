import { useState, useEffect } from 'react';
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';

export function useNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  async function checkPermission() {
    try {
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === 'granted';
      }
      setPermissionGranted(granted);
      console.log('[Notifications] Permission granted:', granted);
    } catch (error) {
      console.error('[Notifications] Error checking permission:', error);
    }
  }

  async function notify(title: string, body: string) {
    if (!permissionGranted) {
      console.warn('[Notifications] Notifications not permitted');
      return;
    }
    
    try {
      await sendNotification({ title, body });
      console.log('[Notifications] Notification sent:', title);
    } catch (error) {
      console.error('[Notifications] Error sending notification:', error);
    }
  }

  const notifyPomodoroComplete = () => {
    notify('🎯 ¡Pomodoro Completado!', 'Tiempo de tomar un descanso de 5 minutos');
  };

  const notifyBreakComplete = () => {
    notify('⏰ Fin del Descanso', '¿Listo para otra sesión de concentración?');
  };

  const notifySessionStarted = () => {
    notify('🎯 Sesión Iniciada', '¡Comencemos a concentrarnos!');
  };

  const notifyInactivity = (minutes: number) => {
    notify('💤 Inactividad Detectada', `Has estado inactivo por ${minutes} minuto(s)`);
  };

  return { 
    notify, 
    permissionGranted,
    notifyPomodoroComplete,
    notifyBreakComplete,
    notifySessionStarted,
    notifyInactivity,
  };
}
