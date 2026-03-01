import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  ScrollView,
  StatusBar,
} from 'react-native';
import AdMobScreen from '../screens/AdMobScreen';
import { BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { getCurrentLocation } from '../services/locationService';
import { Coordinates } from '../types/location';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
} from '../services/backgroundLocation';
import { stopAlarm } from '../services/alarmService';
import MapPickerScreen from './MapPickerScreen';
import { getPlaceNameFromCoords } from '../services/geocodingService';
import { styles } from '../styles/HomeScreenStyle';

const HomeScreen: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [currentLocationName, setCurrentLocationName] = useState<string | null>(null);
  
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [destinationName, setDestinationName] = useState<string>('Not selected');
  
  const [showMap, setShowMap] = useState(false);
  const [mapMode, setMapMode] = useState<'current' | 'destination'>('destination');
  const [trackingStarted, setTrackingStarted] = useState(false);

  useEffect(() => {
    getCurrentLocation(async coords => {
      const location = {
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
      console.log(currentLocation);
      setCurrentLocation(location);

      const placeName = await getPlaceNameFromCoords(
        coords.latitude,
        coords.longitude
      );
      setCurrentLocationName(placeName);
    });
  }, []);

  const startTracking = async () => {
    if (!destination) {
      Alert.alert('Select destination', 'Please pick a location on map');
      return;
    }

    if (trackingStarted) {
      Alert.alert('Already running', 'Tracking is already active');
      return;
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }
    }

    await startBackgroundTracking(destination);
    setTrackingStarted(true);

    Alert.alert('Tracking Started', 'We will alert you near destination');
  };

  const handleSwapLocations = async () => {
    if (!currentLocation || !destination) {
      Alert.alert('Cannot Swap', 'Both current location and destination must be set');
      return;
    }

    if (trackingStarted) {
      Alert.alert('Cannot Swap', 'Stop tracking first before swapping locations');
      return;
    }

    // Swap coordinates
    const tempLocation = currentLocation;
    const tempLocationName = currentLocationName;

    setCurrentLocation(destination);
    setCurrentLocationName(destinationName);

    setDestination(tempLocation);
    setDestinationName(tempLocationName || 'Unknown location');

    Alert.alert('Swapped!', 'Current location and destination have been swapped');
  };

  const openMapForCurrentLocation = () => {
    setMapMode('current');
    setShowMap(true);
  };

  const openMapForDestination = () => {
    setMapMode('destination');
    setShowMap(true);
  };

  if (showMap) {
    return (
      <MapPickerScreen
        mode={mapMode}
        initialLat={
          mapMode === 'current' 
            ? currentLocation?.latitude || 17.385
            : destination?.latitude || 17.385
        }
        initialLng={
          mapMode === 'current'
            ? currentLocation?.longitude || 78.4867
            : destination?.longitude || 78.4867
        }
        onConfirm={async (lat: number, lng: number) => {
          const coords = { latitude: lat, longitude: lng };
          const name = await getPlaceNameFromCoords(lat, lng);

          if (mapMode === 'current') {
            setCurrentLocation(coords);
            setCurrentLocationName(name);
          } else {
            setDestination(coords);
            setDestinationName(name);
          }

          setShowMap(false);
        }}
        onCancel={() => setShowMap(false)}
      />
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#6C63FF" />
      <View style={styles.container}>
        {/* Gradient Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerIcon}>🎯</Text>
            <Text style={styles.headerTitle}>Location Alert</Text>
            <Text style={styles.headerSubtitle}>
              Never miss your destination again
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Card */}
          <View style={styles.statusCard}>
            {trackingStarted && (
              <View style={styles.trackingBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.trackingBadgeText}>TRACKING ACTIVE</Text>
              </View>
            )}
            
            {!trackingStarted && destination && (
              <View style={[styles.trackingBadge, styles.readyBadge]}>
                <Text style={styles.readyBadgeText}>READY TO START</Text>
              </View>
            )}
          </View>

          {/* Current Location Card */}
          <View style={styles.locationCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Text style={styles.cardIcon}>📍</Text>
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardLabel}>Current Location</Text>
                <Text style={styles.cardSubLabel}>Your present position</Text>
              </View>
              {/* Edit button */}
              <TouchableOpacity
                style={styles.editButton}
                onPress={openMapForCurrentLocation}
                disabled={trackingStarted}
                activeOpacity={0.7}
              >
                <Text style={styles.editButtonText}>✏️</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.locationValueContainer}>
              {currentLocationName ? (
                <Text style={styles.locationValue}>{currentLocationName}</Text>
              ) : (
                <View style={styles.loadingContainer}>
                  <View style={styles.loadingDot} />
                  <Text style={styles.loadingText}>Fetching location...</Text>
                </View>
              )}
            </View>
            {currentLocation && (
              <View style={styles.coordinatesBox}>
                <Text style={styles.coordinatesText}>
                  📌 {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </Text>
              </View>
            )}
          </View>

          {/* Swap Button */}
          {currentLocation && destination && (
            <TouchableOpacity
              style={styles.swapButton}
              onPress={handleSwapLocations}
              disabled={trackingStarted}
              activeOpacity={0.7}
            >
              <Text style={styles.swapIcon}>🔄</Text>
              <Text style={styles.swapText}>Swap Locations</Text>
            </TouchableOpacity>
          )}

          {/* Destination Card */}
          <View style={styles.destinationCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, styles.destinationIconCircle]}>
                <Text style={styles.cardIcon}>🚩</Text>
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardLabel}>Destination</Text>
                <Text style={styles.cardSubLabel}>Where you want to go</Text>
              </View>
            </View>
            <View style={styles.destinationValueContainer}>
              <Text
                style={[
                  styles.destinationValue,
                  !destination && styles.destinationPlaceholder,
                ]}
              >
                {destinationName}
              </Text>
            </View>
            {destination && (
              <View style={styles.coordinatesBox}>
                <Text style={styles.coordinatesText}>
                  📌 {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Select Destination */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.selectButton,
                destination && styles.selectedButton,
              ]}
              onPress={openMapForDestination}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>
                  {destination ? '✓' : '🗺️'}
                </Text>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonTitle}>
                    {destination ? 'Change Destination' : 'Select Destination'}
                  </Text>
                  <Text style={styles.buttonSubtitle}>
                    {destination ? 'Pick a new location' : 'Choose from map'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Start Tracking */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.startButton,
                (!destination || trackingStarted) && styles.disabledButton,
              ]}
              onPress={startTracking}
              activeOpacity={0.8}
              disabled={!destination || trackingStarted}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>▶️</Text>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonTitle}>Start Tracking</Text>
                  <Text style={styles.buttonSubtitle}>
                    {trackingStarted ? 'Already tracking' : 'Begin monitoring'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Stop Tracking */}
            {trackingStarted && (
              <TouchableOpacity
                style={[styles.actionButton, styles.stopButton]}
                onPress={() => {
                  stopBackgroundTracking();
                  setTrackingStarted(false);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonIcon}>⏹️</Text>
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.buttonTitle}>Stop Tracking</Text>
                    <Text style={styles.buttonSubtitle}>End monitoring</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Stop Alarm */}
            <TouchableOpacity
              style={[styles.actionButton, styles.alarmButton]}
              onPress={stopAlarm}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>🔕</Text>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonTitle}>Stop Alarm</Text>
                  <Text style={styles.buttonSubtitle}>Silence notification</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>
                Tap the edit button to manually set your current location
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>🔄</Text>
              <Text style={styles.infoText}>
                Use the swap button to quickly reverse your route
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>🔋</Text>
              <Text style={styles.infoText}>
                Works in background - safe to lock your phone
              </Text>
            </View>
<View style={{ marginTop: 20 }}>
  <AdMobScreen
    unitId={TestIds.BANNER}
    size={BannerAdSize.FULL_BANNER}
  />
</View>

          </View>
        </ScrollView>
      </View>
    </>
  );
};

export default HomeScreen;

