/**
 * Native (iOS/Android) map platform — uses react-native-maps with PROVIDER_GOOGLE.
 * The Google Maps API key is injected via app.json android.config.googleMaps.apiKey.
 */
import RNMaps, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { Region } from 'react-native-maps';
import React from 'react';

// Wrap MapView to lock the provider to Google
const MapView = React.forwardRef<any, React.ComponentProps<typeof RNMaps>>(
  (props, ref) => (
    <RNMaps
      ref={ref}
      provider={PROVIDER_GOOGLE}
      {...props}
    />
  )
);

MapView.displayName = 'MapView';

export default MapView;
export { MapView, Marker };
export type { Region };
