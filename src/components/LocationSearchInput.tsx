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
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { MapPin, Search, X, Navigation } from 'lucide-react-native';
import { C, F } from '../theme';
import { PressableScale } from './ui/PressableScale';
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
  /** 'light' (default) = Figma field style; 'dark' kept only for API compatibility — renders the same light palette. */
  variant?: 'dark' | 'light';
}

export const LocationSearchInput = ({
  value,
  onChangeText,
  onLocationSelected,
  placeholder = 'Search for a place...',
  showCurrentLocation = true,
  variant = 'light',
}: Props) => {
  const light = variant === 'light';
  const sx = (key: keyof typeof styles) => [styles[key], light && (lightStyles as any)[key]];
  const accent = light ? C.primary : C.primary;
  const muted = light ? C.iconMuted : C.iconMuted;
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
    <View style={sx('container')}>
      {/* Search Input */}
      <View style={sx('inputRow')}>
        {light ? (
          <MapPin size={16} color={C.iconMuted} style={sx('searchIcon')} />
        ) : (
          <Search size={16} color={C.iconMuted} style={sx('searchIcon')} />
        )}
        <TextInput
          style={sx('input')}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={muted}
          returnKeyType="search"
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
        />
        {loading && <ActivityIndicator size="small" color={accent} style={sx('loader')} />}
        {value.length > 0 && !loading && (
          <PressableScale onPress={clearInput} style={sx('clearBtn')}>
            <X size={16} color={muted} />
          </PressableScale>
        )}
      </View>

      {/* Current Location Button */}
      {showCurrentLocation && (
        <PressableScale
          style={sx('currentLocBtn')}
          onPress={handleCurrentLocation}
          disabled={detectingLocation}
        >
          {detectingLocation ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <Navigation size={14} color={accent} />
          )}
          <Text style={sx('currentLocText')}>Use My Current Location</Text>
        </PressableScale>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <View style={sx('suggestionsOverlay')}>
          <View style={sx('suggestionsContainer')}>
            {/* Plain map (≤5 Google predictions) — a FlatList here nests inside the
                screen's ScrollView and triggers the VirtualizedList warning. */}
            {suggestions.map((item) => (
              <PressableScale
                key={item.place_id}
                style={sx('suggestionItem')}
                onPress={() => handleSelectSuggestion(item)}
                pressedScale={0.98}
              >
                <MapPin size={14} color={accent} style={sx('suggestionIcon')} />
                <View style={sx('suggestionTextWrap')}>
                  <Text style={sx('suggestionMain')} numberOfLines={1}>
                    {item.structured_formatting.main_text}
                  </Text>
                  {!!item.structured_formatting.secondary_text && (
                    <Text style={sx('suggestionSub')} numberOfLines={1}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  )}
                </View>
              </PressableScale>
            ))}
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
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: C.textStrong,
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
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.primary,
  },
  currentLocText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
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
    borderBottomColor: C.border,
  },
  suggestionIcon: {
    marginRight: 10,
    flexShrink: 0,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionMain: {
    color: C.textStrong,
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionSub: {
    color: C.iconMuted,
    fontSize: 11,
    marginTop: 2,
  },
});

const lightStyles = StyleSheet.create({
  inputRow: {
    backgroundColor: C.surface,
    borderRadius: 15,
    borderColor: C.border,
    paddingHorizontal: 16,
    height: 52,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    fontFamily: F.jakartaSemiBold,
    fontSize: 13,
    color: C.textStrong,
  },
  currentLocBtn: {
    backgroundColor: C.softOrange,
    borderColor: C.softOrange,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  currentLocText: {
    fontFamily: F.jakartaSemiBold,
    fontWeight: 'normal',
    color: C.primary,
  },
  // Inline (not floating) so every row stays inside its parent and receives
  // taps on Android when the field sits inside a ScrollView.
  suggestionsOverlay: {
    position: 'relative',
    top: 0,
    marginTop: 4,
  },
  suggestionsContainer: {
    backgroundColor: C.surface,
    borderRadius: 15,
    borderColor: C.border,
  },
  suggestionItem: {
    borderBottomColor: C.border,
  },
  suggestionMain: {
    fontFamily: F.jakartaSemiBold,
    fontWeight: 'normal',
    color: C.textStrong,
  },
  suggestionSub: {
    fontFamily: F.jakartaRegular,
    color: C.textMuted,
  },
});
