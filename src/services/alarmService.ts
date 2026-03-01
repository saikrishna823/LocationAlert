// src/services/alarmService.ts
import { Vibration, Alert } from 'react-native';

let isAlarmActive = false;

export const startAlarm = (): void => {
  if (isAlarmActive) return;

  isAlarmActive = true;

  // Vibrate continuously: vibrate 1s, pause 0.5s
  Vibration.vibrate([0, 1000, 500, 1000], true);

  Alert.alert(
    '📍 Destination Reached',
    'You have reached your destination!',
  );
};

export const stopAlarm = (): void => {
  isAlarmActive = false;
  Vibration.cancel();
};
