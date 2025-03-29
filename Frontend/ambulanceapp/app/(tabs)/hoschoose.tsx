import React, { useEffect, useState } from 'react';
import { Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

export default function HospitalAvailability() {
  const [hospitals, setHospitals] = useState<
    { id: string; name: string; latlong: { lat: number; long: number }; generalBeds: number; icuBeds: number; distance?: number; time?: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; long: number } | null>(null); // Driver's live location
  const router = useRouter();

  useEffect(() => {
    const getDriverLocation = async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
          return;
        }

        // Get the driver's current location
        const location = await Location.getCurrentPositionAsync({});
        setDriverLocation({
          lat: location.coords.latitude,
          long: location.coords.longitude,
        });
      } catch (error) {
        console.error('Error fetching driver location:', error);
      }
    };

    getDriverLocation();
  }, []);

  useEffect(() => {
    if (!driverLocation) return;

    // Mock data to simulate backend response
    const mockData = [
      {
        id: "HOSP001",
        name: "City Hospital",
        latlong: { lat: 13.0204181, long: 80.2058843 },
        generalBeds: 5,
        icuBeds: 2,
      },
      {
        id: "HOSP002",
        name: "Green Valley Hospital",
        latlong: { lat: 13.0294519, long: 80.2135628 },
        generalBeds: 3,
        icuBeds: 1,
      },
      {
        id: "HOSP003",
        name: "Sunrise Medical Center",
        latlong: { lat: 13.0294519, long: 80.2135628 },
        generalBeds: 0,
        icuBeds: 4,
      },
    ];

    const calculateDistances = async () => {
      const hospitalsWithDistance = await Promise.all(
        mockData.map(async (hospital) => {
          const { lat, long } = hospital.latlong;
          const routeData = await fetchRoute(driverLocation, { lat, long });

          return {
            ...hospital,
            distance: routeData.distance, // Distance in meters
            time: routeData.duration, // Time in seconds
          };
        })
      );

      // Sort hospitals by distance (ascending order)
      hospitalsWithDistance.sort((a, b) => a.distance - b.distance);

      setHospitals(hospitalsWithDistance);
      setLoading(false);
    };

    calculateDistances();
  }, [driverLocation]);

  const fetchRoute = async (start: { lat: any; long: any; }, end: { lat: any; long: any; }) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.long},${start.lat};${end.long},${end.lat}?overview=false`
      );

      if (!response.ok) {
        throw new Error(`OSRM API returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          distance: route.distance, // Distance in meters
          duration: route.duration, // Duration in seconds
        };
      } else {
        throw new Error('No routes found');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      return { distance: 0, duration: 0 }; // Fallback values
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.ceil((seconds % 3600) / 60);
    return `${hrs > 0 ? `${hrs} hr${hrs > 1 ? 's' : ''} ` : ''}${mins} min${mins > 1 ? 's' : ''}`;
  };

  if (loading || !driverLocation) {
    return (
      <ActivityIndicator
        size="large"
        color="#1E3A8A"
        style={{ flex: 1, justifyContent: 'center', marginTop: 50 }}
      />
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white', padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
        Nearest Hospital Resources
      </Text>

      {hospitals.map((hospital) => (
        <TouchableOpacity
          key={hospital.id}
          onPress={() =>
            router.push({
              pathname: '/report',
              params: {
                hospitalId: hospital.id,
                hospitalName: hospital.name,
                hospitalLatLong: JSON.stringify(hospital.latlong), // Pass hospital location
              },
            })
          }
        >
          <Card style={{ marginBottom: 10 }}>
            <Card.Content>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                {hospital.name}
              </Text>
              <Text>
                Distance: {((hospital.distance ?? 0) / 1000).toFixed(2)} km
              </Text>
              <Text>
                Estimated Time: {formatTime(hospital.time ?? 0)}
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                buttonColor="#1E3A8A"
                textColor="white"
              >
                ICU Beds: {hospital.icuBeds}
              </Button>
              <Button
                mode="contained"
                buttonColor="#10B981"
                textColor="white"
                style={{ marginLeft: 10 }}
              >
                General Beds: {hospital.generalBeds}
              </Button>
            </Card.Actions>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});