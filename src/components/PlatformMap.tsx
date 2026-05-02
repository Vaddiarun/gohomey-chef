/**
 * Web platform map component — uses Google Maps JavaScript API via <iframe>.
 * Falls back gracefully if the API key is missing.
 */
import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type MarkerProps = {
  coordinate: { latitude: number; longitude: number };
  draggable?: boolean;
  onDragEnd?: (e: any) => void;
  title?: string;
  description?: string;
};

export const Marker = (_props: MarkerProps) => null;

type MapViewProps = {
  style?: any;
  region?: Region;
  initialRegion?: Region;
  onPress?: (e: any) => void;
  onRegionChangeComplete?: (region: Region) => void;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  children?: React.ReactNode;
  provider?: string;
};

const IFrame = 'iframe' as unknown as React.ComponentType<any>;

const MapView = React.forwardRef<View, MapViewProps>(
  (
    {
      style,
      region,
      initialRegion,
      onPress,
      onRegionChangeComplete,
      scrollEnabled = true,
      zoomEnabled = true,
      children,
    },
    ref
  ) => {
    const iframeRef = useRef<any>(null);
    const activeRegion = region || initialRegion;

    // Extract markers from children
    const markers: MarkerProps[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && (child.props as any).coordinate) {
        markers.push(child.props as MarkerProps);
      }
    });

    const lat = activeRegion?.latitude ?? 20.5937;
    const lng = activeRegion?.longitude ?? 78.9629;
    const zoom = activeRegion
      ? Math.min(18, Math.max(2, Math.round(Math.log2(360 / Math.max(activeRegion.latitudeDelta || 0.05, 0.001)))) + 1)
      : 13;

    const markersJSON = JSON.stringify(
      markers.map((m, i) => ({
        id: i,
        lat: m.coordinate.latitude,
        lng: m.coordinate.longitude,
        draggable: m.draggable || false,
        title: m.title || '',
      }))
    );

    const html = useMemo(
      () => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    #map { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map, markers = [], initialized = false;

    function initMap() {
      initialized = true;
      map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: ${lat}, lng: ${lng} },
        zoom: ${zoom},
        gestureHandling: '${scrollEnabled ? 'greedy' : 'none'}',
        zoomControl: ${zoomEnabled},
        scrollwheel: ${zoomEnabled},
        disableDefaultUI: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      var markersData = ${markersJSON};
      markersData.forEach(function(m) {
        var mk = new google.maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map: map,
          draggable: m.draggable,
          title: m.title || undefined,
          animation: google.maps.Animation.DROP,
        });
        if (m.draggable) {
          mk.addListener('dragend', function(e) {
            window.parent.postMessage({
              type: 'dragend', id: m.id,
              latitude: e.latLng.lat(), longitude: e.latLng.lng()
            }, '*');
          });
        }
        markers.push(mk);
      });

      map.addListener('click', function(e) {
        window.parent.postMessage({
          type: 'press',
          latitude: e.latLng.lat(),
          longitude: e.latLng.lng()
        }, '*');
      });

      map.addListener('idle', function() {
        var c = map.getCenter();
        var b = map.getBounds();
        if (!b) return;
        var ne = b.getNorthEast(), sw = b.getSouthWest();
        window.parent.postMessage({
          type: 'regionchange',
          latitude: c.lat(), longitude: c.lng(),
          latitudeDelta: ne.lat() - sw.lat(),
          longitudeDelta: ne.lng() - sw.lng(),
        }, '*');
      });
    }

    window.addEventListener('message', function(e) {
      if (!e.data || !e.data.type || !initialized) return;
      if (e.data.type === 'setView') {
        map.setCenter({ lat: e.data.lat, lng: e.data.lng });
        if (e.data.zoom) map.setZoom(e.data.zoom);
      }
      if (e.data.type === 'setMarker' && markers.length > 0) {
        markers[0].setPosition({ lat: e.data.lat, lng: e.data.lng });
      }
    });
  </script>
  <script
    src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=initMap&loading=async"
    async defer
  ></script>
</body>
</html>`,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [lat, lng, zoom, markersJSON, scrollEnabled, zoomEnabled]
    );

    // Listen for messages from iframe
    useEffect(() => {
      const handler = (event: MessageEvent) => {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'press' && onPress) {
          onPress({ nativeEvent: { coordinate: { latitude: data.latitude, longitude: data.longitude } } });
        }
        if (data.type === 'dragend') {
          const marker = markers[data.id];
          if (marker?.onDragEnd) {
            marker.onDragEnd({ nativeEvent: { coordinate: { latitude: data.latitude, longitude: data.longitude } } });
          }
        }
        if (data.type === 'regionchange' && onRegionChangeComplete) {
          onRegionChangeComplete({
            latitude: data.latitude,
            longitude: data.longitude,
            latitudeDelta: data.latitudeDelta,
            longitudeDelta: data.longitudeDelta,
          });
        }
      };

      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onPress, onRegionChangeComplete]);

    // Send view updates to iframe when region changes externally
    useEffect(() => {
      if (region && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'setView', lat: region.latitude, lng: region.longitude },
          '*'
        );
      }
    }, [region?.latitude, region?.longitude]);

    return (
      <View style={[styles.container, style]} ref={ref}>
        <IFrame
          ref={iframeRef}
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 'inherit' }}
        />
      </View>
    );
  }
);

MapView.displayName = 'MapView';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default MapView;
export { MapView };
