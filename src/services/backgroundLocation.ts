import BackgroundService from 'react-native-background-actions';
import Geolocation from '@react-native-community/geolocation';
import { getDistanceInMeters, 
  isWithinRadius,
  getAccuracySettings,
getAlertRadius,getCheckInterval } from '../utils/distance';
import { startAlarm } from './alarmService';
import { Coordinates } from '../types/location';

let watchId: number | null = null;
let lastKnownDistance: number | null = null;
let updateCount = 0;

const sleep = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time));



export const startBackgroundTracking = async (
  destination: Coordinates,
): Promise<void> => {
  lastKnownDistance = null;
  updateCount = 0;

  const task = async () => {
    console.log('═══════════════════════════════════════');
    console.log('[BG] 🚀 TRACKING STARTED');
    console.log('[BG] 🎯 Destination:', destination.latitude.toFixed(6), destination.longitude.toFixed(6));
    console.log('═══════════════════════════════════════');

    // 🔧 FIX: Get current location first to determine initial distance
    let initialDistance = 500; // Default assumption
    
    try {
      await new Promise<void>((resolve) => {
        Geolocation.getCurrentPosition(
          (position) => {
            const distance = getDistanceInMeters(
              position.coords.latitude,
              position.coords.longitude,
              destination.latitude,
              destination.longitude,
            );
            initialDistance = distance;
            console.log('[BG] 📏 Initial distance to destination:', Math.round(distance), 'm');
            resolve();
          },
          (error) => {
            console.log('[BG] ⚠️ Could not get initial position:', error);
            resolve(); // Continue anyway with default
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    } catch (error) {
      console.log('[BG] ⚠️ Initial position error:', error);
    }

    // Use actual distance to set initial accuracy
    let currentAccuracySettings = getAccuracySettings(initialDistance);
    console.log('[BG] 📡 Initial accuracy settings:', JSON.stringify(currentAccuracySettings, null, 2));
    let hasTriggeredAlarm = false; // Prevent multiple triggers

    const handlePosition = (position: any) => {
      updateCount++;
      const { latitude, longitude, speed, accuracy } = position.coords;

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`[BG] 📍 UPDATE #${updateCount}`);
      console.log('[BG] Current:', latitude.toFixed(6), longitude.toFixed(6));
      console.log('[BG] GPS Accuracy:', accuracy ? Math.round(accuracy) + 'm' : 'unknown');
      console.log('[BG] Speed:', speed ? speed.toFixed(1) + 'm/s' : 'stationary');

      const distance = getDistanceInMeters(
        latitude,
        longitude,
        destination.latitude,
        destination.longitude,
      );

      console.log('[BG] 📏 Distance to destination:', Math.round(distance), 'm');

      const alertRadius = getAlertRadius(speed);
      console.log('[BG] 🎯 Alert radius:', alertRadius, 'm');

      // Check if within radius
      const withinRadius = isWithinRadius(
        latitude,
        longitude,
        destination.latitude,
        destination.longitude,
        alertRadius
      );

      console.log('[BG] 🔍 Within alert radius?', withinRadius ? '✅ YES' : '❌ NO');

      if (withinRadius && !hasTriggeredAlarm) {
        console.log('');
        console.log('🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉');
        console.log('🎯 DESTINATION REACHED!');
        console.log('🔔 TRIGGERING ALARM NOW!');
        console.log('🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉');
        console.log('');

        hasTriggeredAlarm = true;

        // Trigger alarm
        startAlarm();

        // Stop tracking after 3 seconds (gives time for alarm to start)
        setTimeout(() => {
          if (watchId !== null) {
            Geolocation.clearWatch(watchId);
            watchId = null;
          }
          BackgroundService.stop();
          console.log('[BG] ✅ Tracking stopped');
        }, 3000);

        return;
      }

      // Update accuracy settings if needed
      const newSettings = getAccuracySettings(distance);

      if (
        newSettings.enableHighAccuracy !== currentAccuracySettings.enableHighAccuracy ||
        Math.abs(newSettings.distanceFilter - currentAccuracySettings.distanceFilter) > 20
      ) {
        console.log('[BG] 🔄 Switching accuracy mode:');
        console.log('    → High accuracy:', newSettings.enableHighAccuracy);
        console.log('    → Distance filter:', newSettings.distanceFilter + 'm');

        currentAccuracySettings = newSettings;

        if (watchId !== null) {
          Geolocation.clearWatch(watchId);
        }

        watchId = Geolocation.watchPosition(
          handlePosition,
          handleError,
          currentAccuracySettings,
        );
      }

      if (lastKnownDistance !== null) {
        const trend = distance < lastKnownDistance ? '📉 Getting closer' : '📈 Getting farther';
        console.log('[BG]', trend, `(${Math.round(Math.abs(distance - lastKnownDistance))}m change)`);
      }

      lastKnownDistance = distance;
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    };

    const handleError = (error: any) => {
      console.log('\n[BG] ⚠️⚠️⚠️ LOCATION ERROR ⚠️⚠️⚠️');
      console.log('[BG] Error code:', error.code);
      console.log('[BG] Error message:', error.message);
      console.log('[BG] Error:', JSON.stringify(error));

      if (error.code === 2 && currentAccuracySettings.enableHighAccuracy) {
        console.log('[BG] 🔄 Retrying with lower accuracy');
        currentAccuracySettings.enableHighAccuracy = false;

        if (watchId !== null) {
          Geolocation.clearWatch(watchId);
        }

        watchId = Geolocation.watchPosition(
          handlePosition,
          handleError,
          currentAccuracySettings,
        );
      }
    };

    // Start watching location
    console.log('[BG] 👀 Starting location watch...');
    console.log('[BG] Settings:', JSON.stringify(currentAccuracySettings, null, 2));

    watchId = Geolocation.watchPosition(
      handlePosition,
      handleError,
      currentAccuracySettings,
    );

    // Keep service alive
    while (BackgroundService.isRunning()) {
      const sleepTime = lastKnownDistance
        ? getCheckInterval(lastKnownDistance)
        : 60000;

      console.log(`[BG] 😴 Next check in ${sleepTime / 1000}s (Updates: ${updateCount})`);
      await sleep(sleepTime);
    }
  };

  const options = {
    taskName: 'LocationAlert',
    taskTitle: '🎯 Location Alert - Tracking Active',
    taskDesc: 'Monitoring your destination',
    taskIcon: {
      name: 'ic_launcher',
      type: 'mipmap',
    },
    color: '#6C63FF',
    linkingURI: '',
    parameters: {},
  };

  await BackgroundService.start(task, options);
};

export const stopBackgroundTracking = async (): Promise<void> => {
  console.log('[BG] 🛑 STOP REQUESTED');

  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }

  if (BackgroundService.isRunning()) {
    await BackgroundService.stop();
  }

  lastKnownDistance = null;
  updateCount = 0;

  console.log('[BG] ✅ Tracking stopped and cleaned up');
};