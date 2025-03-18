import React from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function MapPage() {
  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 37.7749, 
          longitude: -122.4194,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker coordinate={{ latitude: 37.7749, longitude: -122.4194 }} title="Ambulance" />
        <Marker coordinate={{ latitude: 37.7849, longitude: -122.4294 }} title="Patient Location" />
      </MapView>
    </View>
  );
}
