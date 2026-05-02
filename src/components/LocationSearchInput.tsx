/**
 * LocationSearchInput — powered by Google Places Autocomplete + Place Details APIs.
 *
 * Replaces the previous Nominatim/OSM implementation with Google APIs for
 * accurate, real-time address suggestions globally (biased toward India).
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { MapPin, Search, X, Navigation } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../theme';
import * as Location from 'expo-location';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
}

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onLocationSelected: (data: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
  placeholder?: string;
  showCurrentLocation?: boolean;
}

export const LocationSearchInput = ({
  value,
  onChangeText,
  onLocationSelected,
  placeholder = 'Search for a place...',
  showCurrentLocation = true,
}: Props) => {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionToken = useRef<string>(Math.random().toString(36).slice(2));

  // ─── Google Places Autocomplete ───────────────────────────────────────────
  const searchPlaces = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
        `?input=${encodeURIComponent(query)}` +
        `&key=${GOOGLE_MAPS_KEY}` +
        `&sessiontoken=${sessionToken.current}` +
        `&components=country:in` + // bias to India — remove if you want global
        `&language=en`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        setSuggestions(data.predictions || []);
        setShowSuggestions((data.predictions || []).length > 0);
      } else {
        console.warn('Places Autocomplete error:', data.status, data.error_message);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error('Places Autocomplete fetch error:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTextChange = (text: string) => {
    onChangeText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(text), 350);
  };

  // ─── Resolve a place_id → lat/lng via Place Details ──────────────────────
  const fetchPlaceDetails = async (placeId: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${placeId}` +
        `&fields=geometry` +
        `&key=${GOOGLE_MAPS_KEY}` +
        `&sessiontoken=${sessionToken.current}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK') {
        const loc = data.result.geometry.location;
        // Rotate session token after a Place Details call (billing requirement)
        sessionToken.current = Math.random().toString(36).slice(2);
        return { lat: loc.lat, lng: loc.lng };
      }
      console.warn('Place Details error:', data.status, data.error_message);
      return null;
    } catch (err) {
      console.error('Place Details fetch error:', err);
      return null;
    }
  };

  const handleSelectSuggestion = async (item: PlaceSuggestion) => {
    const shortName = item.description;
    onChangeText(shortName);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();

    const coords = await fetchPlaceDetails(item.place_id);
    if (coords) {
      onLocationSelected({ address: shortName, latitude: coords.lat, longitude: coords.lng });
    }
  };

  // ─── Current Location (expo-location + Google Geocoding reverse) ──────────
  const handleCurrentLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      // Try Google Geocoding for a clean address
      let address = 'Current Location';
      try {
        const geoUrl =
          `https://maps.googleapis.com/maps/api/geocode/json` +
          `?latlng=${latitude},${longitude}` +
          `&key=${GOOGLE_MAPS_KEY}` +
          `&result_type=street_address|locality&language=en`;

        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();
        if (geoData.status === 'OK' && geoData.results.length > 0) {
          address = geoData.results[0].formatted_address;
        } else {
          // Fallback to expo's reverse geocode
          const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (reverse.length > 0) {
            const a = reverse[0];
            address = `${a.name || ''} ${a.street || ''}, ${a.city || ''}, ${a.region || ''}`
              .replace(/^ , /, '').replace(/ ,/g, ',').trim();
          }
        }
      } catch {
        // Fallback silently
        const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverse.length > 0) {
          const a = reverse[0];
          address = `${a.name || ''} ${a.street || ''}, ${a.city || ''}, ${a.region || ''}`
            .replace(/^ , /, '').replace(/ ,/g, ',').trim();
        }
      }

      onChangeText(address);
      onLocationSelected({ address, latitude, longitude });
      setShowSuggestions(false);
    } catch (err) {
      console.error('Current location error:', err);
    } finally {
      setDetectingLocation(false);
    }
  };

  const clearInput = () => {
    onChangeText('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.inputRow}>
        <Search size={16} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          returnKeyType="search"
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
        />
        {loading && <ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />}
        {value.length > 0 && !loading && (
          <TouchableOpacity onPress={clearInput} style={styles.clearBtn}>
            <X size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Current Location Button */}
      {showCurrentLocation && (
        <TouchableOpacity
          style={styles.currentLocBtn}
          onPress={handleCurrentLocation}
          disabled={detectingLocation}
        >
          {detectingLocation ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Navigation size={14} color={Colors.primary} />
          )}
          <Text style={styles.currentLocText}>Use My Current Location</Text>
        </TouchableOpacity>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <View style={styles.suggestionsOverlay}>
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.place_id}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={true}
              nestedScrollEnabled={true}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(item)}
                  activeOpacity={0.7}
                >
                  <MapPin size={14} color={Colors.primary} style={styles.suggestionIcon} />
                  <View style={styles.suggestionTextWrap}>
                    <Text style={styles.suggestionMain} numberOfLines={1}>
                      {item.structured_formatting.main_text}
                    </Text>
                    {!!item.structured_formatting.secondary_text && (
                      <Text style={styles.suggestionSub} numberOfLines={1}>
                        {item.structured_formatting.secondary_text}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
    marginBottom: 12,
  },
  suggestionsOverlay: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    zIndex: 1001,
    elevation: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    fontSize: 14,
  },
  loader: {
    marginLeft: 8,
  },
  clearBtn: {
    marginLeft: 8,
    padding: 4,
  },
  currentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  currentLocText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 250,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionIcon: {
    marginRight: 10,
    flexShrink: 0,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionMain: {
    ...Typography.body,
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
