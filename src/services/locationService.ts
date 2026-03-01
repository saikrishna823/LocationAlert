// utils/location.ts
import Geolocation, { GeolocationResponse } from '@react-native-community/geolocation';

export const getCurrentLocation = (
  onSuccess: (coords: GeolocationResponse['coords']) => void | Promise<void>,
): void => {
  Geolocation.getCurrentPosition(
    position => {
      const result = onSuccess(position.coords);
      // Handle if onSuccess returns a Promise
      if (result instanceof Promise) {
        result.catch(error => console.log('Callback error:', error));
      }
    },
    error => console.log('Location error:', error),
    { enableHighAccuracy: true },
  );
};
