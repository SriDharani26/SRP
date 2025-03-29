import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Button, TextInput, RadioButton } from 'react-native-paper';
import MapView, { MapStyleElement, Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';

export default function ReportPage() {
  const { hospitalLatLong: hospitalLatLongRaw } = useLocalSearchParams(); // Retrieve hospitalLatLong from params
  const hospitalLatLong = hospitalLatLongRaw
    ? JSON.parse(hospitalLatLongRaw as string)
    : { lat: 0, long: 0 }; // Parse the hospitalLatLong parameter


  const [ambulanceLocation, setAmbulanceLocation] = useState<{ lat: number; long: number } | null>(null); // Live location of the ambulance
  const [initialLocation, setInitialLocation] = useState<{ lat: number; long: number } | null>(null); // Fixed initial location for routing
  const [routeCoordinates, setRouteCoordinates] = useState([]); // Route coordinates
  const [isFullscreen, setIsFullscreen] = useState(false); // Toggle fullscreen map
  const mapRef = useRef<MapView>(null); // Reference to the MapView

  

  const lightMapStyle: MapStyleElement[] | undefined = []; // Use an empty array for the default light map style

  useEffect(() => {
    const getLiveLocation = async () => {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }

      // Watch the live location of the ambulance
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Update every second
          distanceInterval: 1, // Update when the device moves 1 meter
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          const currentLocation = { lat: latitude, long: longitude };

          setAmbulanceLocation(currentLocation);

          // Set the initial location only once
          if (!initialLocation) {
            setInitialLocation(currentLocation);

            // Fit the map to show both the ambulance and hospital locations
            if (mapRef.current) {
              mapRef.current.fitToCoordinates(
                [
                  { latitude, longitude }, // Ambulance location
                  { latitude: hospitalLatLong.lat, longitude: hospitalLatLong.long }, // Hospital location
                ],
                {
                  edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, // Padding around the edges
                  animated: true,
                }
              );
            }
          }
        }
      );
    };

    getLiveLocation();
  }, []);

  useEffect(() => {
    if (initialLocation) {
      const fetchRoute = async () => {
        try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${initialLocation.long},${initialLocation.lat};${hospitalLatLong.long},${hospitalLatLong.lat}?overview=full&geometries=geojson`
          );

          if (!response.ok) {
            throw new Error(`OSRM API returned status ${response.status}`);
          }

          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0].geometry.coordinates.map((coord: any[]) => ({
              latitude: coord[1],
              longitude: coord[0],
            }));
            setRouteCoordinates(route);
          } else {
            console.error('No routes found');
            Alert.alert('Error', 'No routes found between the locations.');
          }
        } catch (error) {
          console.error('Error fetching route:', error);
          Alert.alert(
            'Network Error',
            'Failed to fetch the route. Please check your internet connection or try again later.'
          );
        }
      };

      fetchRoute();
    }
  }, [initialLocation, hospitalLatLong]);

  const handleSubmit = () => {
    const reportData = {
      severity,
      icuNeeded,
      ambulanceDetails,
    };

    console.log('Report Submitted:', reportData);
    alert('Report submitted successfully!');
  };

  const [severity, setSeverity] = useState('medium');
  const [icuNeeded, setIcuNeeded] = useState('no');
  const [ambulanceDetails, setAmbulanceDetails] = useState({
    ambulanceId: 'AMB001',
    driverName: 'John Doe',
    contactNumber: '1234567890',
  });

  return (
    <View style={styles.container}>
      {/* Fullscreen Map */}
      {isFullscreen ? (
        <View style={styles.fullscreenContainer}>
          <MapView
            ref={mapRef}
            style={styles.fullscreenMap}
            customMapStyle={lightMapStyle} // Apply light map style
            initialRegion={{
              latitude: ambulanceLocation?.lat || 0,
              longitude: ambulanceLocation?.long || 0,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {/* Ambulance Marker */}
            {ambulanceLocation && (
              <Marker
                coordinate={{
                  latitude: ambulanceLocation.lat,
                  longitude: ambulanceLocation.long,
                }}
                title="Ambulance Location"
                description="Current location of the ambulance"
                pinColor="blue"
              />
            )}

            {/* Hospital Marker */}
            <Marker
              coordinate={{
                latitude: hospitalLatLong.lat,
                longitude: hospitalLatLong.long,
              }}
              title="Hospital Location"
              description="Destination hospital"
            />

            {/* Route Polyline */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="blue" // Route color
                strokeWidth={4} // Route width
              />
            )}
          </MapView>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setIsFullscreen(false)} // Exit fullscreen mode
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Form with Map
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={styles.heading}>Patient Report</Text>

          {/* Map with Route */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              customMapStyle={lightMapStyle} // Apply light map style
              initialRegion={{
                latitude: ambulanceLocation?.lat || 0,
                longitude: ambulanceLocation?.long || 0,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onPress={() => setIsFullscreen(true)} // Enter fullscreen mode on map press
            >
              {/* Ambulance Marker */}
              {ambulanceLocation && (
                <Marker
                  coordinate={{
                    latitude: ambulanceLocation.lat,
                    longitude: ambulanceLocation.long,
                  }}
                  title="Ambulance Location"
                  description="Current location of the ambulance"
                  pinColor="blue"
                />
              )}

              {/* Hospital Marker */}
              <Marker
                coordinate={{
                  latitude: hospitalLatLong.lat,
                  longitude: hospitalLatLong.long,
                }}
                title="Hospital Location"
                description="Destination hospital"
              />

              {/* Route Polyline */}
              {routeCoordinates.length > 0 && (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="blue" // Route color
                  strokeWidth={4} // Route width
                />
              )}
            </MapView>
          </View>

          {/* Patient Severity */}
          <Text style={styles.label}>Patient Severity (RPM):</Text>
          <RadioButton.Group
            onValueChange={(value) => setSeverity(value)}
            value={severity}
          >
            <RadioButton.Item label="High" value="high" />
            <RadioButton.Item label="Medium" value="medium" />
            <RadioButton.Item label="Low" value="low" />
          </RadioButton.Group>

          {/* ICU Needed */}
          <Text style={styles.label}>ICU Needed:</Text>
          <RadioButton.Group
            onValueChange={(value) => setIcuNeeded(value)}
            value={icuNeeded}
          >
            <RadioButton.Item label="Yes" value="yes" />
            <RadioButton.Item label="No" value="no" />
          </RadioButton.Group>

     
          {/* Submit Button */}
          <Button mode="contained" style={styles.submitButton} onPress={handleSubmit}>
            Submit Report
          </Button>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  fullscreenContainer: {
    flex: 1,
  },
  fullscreenMap: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: '#1E3A8A',
    padding: 10,
    borderRadius: 5,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 20,
  },
  mapContainer: {
    height: 300,
    marginBottom: 20,
  },
  map: {
    flex: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  input: {
    marginBottom: 10,
    backgroundColor: 'white',
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#1E3A8A',
  },
});