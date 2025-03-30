import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, ScrollView, TouchableOpacity, Text, TextInput } from 'react-native';
import { Button, RadioButton } from 'react-native-paper';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { io } from 'socket.io-client';
import {debounce} from 'lodash';

export default function ReportPage() {
  const { hospitalLatLong: hospitalLatLongRaw } = useLocalSearchParams();
  const hospitalLatLong = hospitalLatLongRaw
    ? JSON.parse(hospitalLatLongRaw as string)
    : { lat: 0, long: 0, hospid: 'HOSP001' };

  const [ambulanceLocation, setAmbulanceLocation] = useState<{ lat: number; long: number } | null>(null);
  const [initialLocation, setInitialLocation] = useState<{ lat: number; long: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [severity, setSeverity] = useState('medium');
  const [icuNeeded, setIcuNeeded] = useState('no');
  const [ambulanceDetails, setAmbulanceDetails] = useState({
    ambulanceId: 'AMB001',
    driverName: 'John Doe',
    contactNumber: '1234567890',
  });
  const [comments, setComments] = useState('');

  const mapRef = useRef<MapView>(null);
  const socket = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    socket.current = io('http://10.16.49.34:5000');
  
    // Log WebSocket connection status
    socket.current.on('connect', () => {
      console.log('WebSocket connected');
    });
  
    socket.current.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  
    socket.current.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    const getLiveLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          const currentLocation = { lat: latitude, long: longitude };

          setAmbulanceLocation(currentLocation);

          // Send live location to the backend via WebSocket
          if (socket.current) {
            console.log('Emitting location update to backend');
            socket.current.emit('update_location', {
              ambulance_id: ambulanceDetails.ambulanceId,
              latitude,
              longitude,
              hospid: hospitalLatLong.hospid,
            });
          }

          if (!initialLocation) {
            setInitialLocation(currentLocation);

            if (mapRef.current) {
              mapRef.current.fitToCoordinates(
                [
                  { latitude, longitude },
                  { latitude: hospitalLatLong.lat, longitude: hospitalLatLong.long },
                ],
                {
                  edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                  animated: true,
                }
              );
            }
          }
        }
      );
    };

    getLiveLocation();

    return () => {
      if (socket.current) {
        socket.current.emit('stop_tracking', { ambulance_id: ambulanceDetails.ambulanceId });
        socket.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (initialLocation) {
            // Debounced fetchRoute function
            const debouncedFetchRoute = debounce(async () => {
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
                  Alert.alert('Error', 'No routes found between the locations.');
                }
              } catch (error) {
                Alert.alert('Network Error', 'Failed to fetch the route.');
              }
            }, 5000); // Debounce with a 2-second delay
      
            debouncedFetchRoute();
      
            // Cleanup the debounce function on unmount
            return () => {
              debouncedFetchRoute.cancel();
            };
    }
  }, [initialLocation, hospitalLatLong]);

  const handleSubmit = () => {
    const reportData = {
      ambulance_id: ambulanceDetails.ambulanceId,
      hospid: hospitalLatLong.hospid,
      severity,
      icuNeeded,
      comments, // Include comments in the report
    };
    console.log("Emitting submit_report with data:", reportData);
    if (socket.current && socket.current.connected) {
      console.log("WebSocket is connected.");
      socket.current.emit('submit_report', reportData);
    } else {
      console.error("WebSocket is not connected.");
    }

    Alert.alert('Success', 'Report submitted successfully!');
  };

  function handleSetCommentsError(text: string): void {
    throw new Error('Function not implemented.');
  }

  return (
    <View style={styles.container}>
      {/* Fullscreen Map */}
      {isFullscreen ? (
        <View style={styles.fullscreenContainer}>
          <MapView
            ref={mapRef}
            style={styles.fullscreenMap}
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

          {/* Comments */}
        <Text style={styles.label}>Comments:</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Enter comments about the patient's condition..."
          multiline
          value={comments}
          onChangeText={(text) => setComments(text)}
        />

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
  textArea: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    marginTop: 10,
    textAlignVertical: 'top', // Ensures text starts at the top for multiline inputs
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#1E3A8A',
  },
});