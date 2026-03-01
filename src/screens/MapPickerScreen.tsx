import React, { useState, useRef, useCallback } from 'react';
import { 
  View,
  TouchableOpacity, 
  Text, 
  TextInput,
  ScrollView,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { searchLocation, SearchResult } from '../services/locationSearchService';
import { styles } from '../styles/MapScreenStyle';

interface Props {
  onConfirm: (lat: number, lng: number) => void;
  onCancel: () => void;
  initialLat?: number;
  initialLng?: number;
  mode?: 'current' | 'destination';
}

const MapPickerScreen: React.FC<Props> = ({ 
  onConfirm, 
  onCancel, 
  initialLat = 17.385, 
  initialLng = 78.4867,
  mode = 'destination'
}) => {
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: initialLat, lng: initialLng });

  const webViewRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    searchTimeoutRef.current = setTimeout(async () => {
      console.log('[MapPicker] Searching for:', query);
      
      try {
        const results = await searchLocation(query, 8);
        console.log('[MapPicker] Got results:', results.length);
        console.log('[MapPicker] Results:', JSON.stringify(results.slice(0, 2)));
        setSearchResults(results);
        console.log('[MapPicker] State updated with results');
      } catch (error) {
        console.error('[MapPicker] Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  const handleSelectSearchResult = (result: SearchResult) => {
    console.log('[MapPicker] Selected:', result.name);
    
    setMapCenter({ lat: result.latitude, lng: result.longitude });
    setSelectedLocation({ lat: result.latitude, lng: result.longitude });
    
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (marker) map.removeLayer(marker);
        const customIcon = L.divIcon({
          className: 'custom-marker',
          iconSize: [30, 30],
        });
        marker = L.marker([${result.latitude}, ${result.longitude}], { icon: customIcon }).addTo(map);
        map.setView([${result.latitude}, ${result.longitude}], 15);
        true;
      `);
    }

    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
        .custom-marker {
          background: ${mode === 'current' ? '#6C63FF' : '#FF5252'};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${mapCenter.lat}, ${mapCenter.lng}], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        let marker;
        
        map.on('click', function(e) {
          if (marker) map.removeLayer(marker);
          
          const customIcon = L.divIcon({
            className: 'custom-marker',
            iconSize: [30, 30],
          });
          
          marker = L.marker(e.latlng, { icon: customIcon }).addTo(map);
          
          window.ReactNativeWebView.postMessage(
            JSON.stringify(e.latlng)
          );
        });

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            function(position) {
              const userLat = position.coords.latitude;
              const userLng = position.coords.longitude;
              
              L.circleMarker([userLat, userLng], {
                radius: 8,
                fillColor: '#4285F4',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
              }).addTo(map);
            }
          );
        }
      </script>
    </body>
    </html>
  `;

  console.log('[MapPicker] Render - showSearchResults:', showSearchResults);
  console.log('[MapPicker] Render - searchResults.length:', searchResults.length);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {mode === 'current' ? 'Select Current Location' : 'Select Destination'}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a place..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setShowSearchResults(false);
                setSearchResults([]);
              }}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results - Using ScrollView instead of FlatList */}
      {showSearchResults && (
        <View style={styles.searchResultsContainer}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#6C63FF" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <ScrollView 
              style={styles.resultsList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {searchResults.map((item, index) => (
                <TouchableOpacity
                  key={`result-${index}-${item.latitude}`}
                  style={styles.searchResultItem}
                  onPress={() => handleSelectSearchResult(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.resultIconContainer}>
                    <Text style={styles.resultIcon}>📍</Text>
                  </View>
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.resultAddress} numberOfLines={2}>
                      {item.displayName}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No locations found</Text>
              <Text style={styles.noResultsSubtext}>Try a different search term</Text>
            </View>
          )}
        </View>
      )}

      {/* Map */}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        onMessage={(event) => {
          const { lat, lng } = JSON.parse(event.nativeEvent.data);
          console.log('Selected location:', lat, lng);
          setSelectedLocation({ lat, lng });
        }}
        geolocationEnabled={true}
        javaScriptEnabled={true}
      />

      {/* Confirm Button */}
      {selectedLocation && !showSearchResults && (
        <View style={styles.confirmContainer}>
          <View style={styles.locationInfo}>
            <Text style={styles.locationInfoTitle}>
              {mode === 'current' ? '📍 Current Location' : '🚩 Destination'}
            </Text>
            <Text style={styles.locationInfoCoords}>
              {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => onConfirm(selectedLocation.lat, selectedLocation.lng)}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default MapPickerScreen;