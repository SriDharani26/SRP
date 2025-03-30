import React, { useEffect, useState } from 'react';
import { Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import db from "@/api/api";

export default function HospitalAvailability() {
  const [hospitals, setHospitals] = useState<{
    hospital_id: any; 
    latitude: number; 
    longitude: number; 
    hospital_name: string; 
    resources: { [key: string]: { capacity: number } }; 
    distance?: number; 
    time?: number; 
  }[]>([]);
  const [Latitude, setLatitude] = useState<number | null>(null);
  const [Longitude, setLongitude] = useState<number | null>(null);
  const [nearesthospital, setNearest] = useState<{
    hospital_id: any; latitude: number; longitude: number; hospital_name: string; resources: { [key: string]: { capacity: number } } 
}[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; long: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getDriverLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setDriverLocation({
          lat: location.coords.latitude,
          long: location.coords.longitude,
        });
        setLatitude(location.coords.latitude);
        setLongitude(location.coords.longitude);
      } catch (error) {
        console.error('Error fetching location:', error);
      }
    };

    getDriverLocation();
  }, []);

  useEffect(() => {
    if (Latitude !== null && Longitude !== null) {
      fetchNearestHospital();
    }
  }, [Latitude, Longitude]);

  const fetchNearestHospital = async () => {
    try {
      console.log("Current Location:", Latitude, Longitude);
      const response = await db.get(`nearest_hospital`, {
        params: { latitude: Latitude, longitude: Longitude },
      });
      setNearest(response.data.nearest_hospitals);
      
      // Log the latitude and longitude of the nearest hospitals
      response.data.nearest_hospitals.forEach((hospital: { hospital_id: any; latitude: any; longitude: any; }, index: number) => {
        console.log(`Hospital ${index + 1}:`, {
          hospid: hospital.hospital_id,
          latitude: hospital.latitude,
          longitude: hospital.longitude,
        });
      });
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      Alert.alert("Error", "Could not fetch nearest hospital.");
    }
  };

  const requestICU = async (hospitalId: any) => {
    try {
      const ambulanceId = "A0237"; 
  
      const response = await db.post(`/opting_icu`, {
        ambulance_id: ambulanceId,
        hospital_id: hospitalId,
      });
  
      if (response.status === 200) {
        Alert.alert("Request Sent", `Ambulance requested for ICU at hospital ${hospitalId}`);
        fetchNearestHospital();
      } else {
        Alert.alert("Error", "Failed to send the ICU request.");
      }
    } catch (error) {
      console.error("Error requesting ICU:", error);
      Alert.alert("Error", "Could not send the ICU request.");
    }
  };
  
  const requestGeneral = async (hospitalId: any) => {
    try {
      const ambulanceId = "A0237"; 
  
      const response = await db.post(`/opting_general`, {
        ambulance_id: ambulanceId,
        hospital_id: hospitalId,
      });
  
      if (response.status === 200) {
        Alert.alert("Request Sent", `Ambulance requested for General Beds at hospital ${hospitalId}`);
        fetchNearestHospital();
      } else {
        Alert.alert("Error", "Failed to send the General Bed request.");
      }
    } catch (error) {
      console.error("Error requesting General Beds:", error);
      Alert.alert("Error", "Could not send the General Bed request.");
    }
  };

  useEffect(() => {
    if (!driverLocation || nearesthospital.length === 0) return;

    const calculateDistances = async () => {
      const hospitalsWithDistance = await Promise.all(
        nearesthospital.map(async (hospital) => {
          const lat = hospital.latitude;
          const long = hospital.longitude;
          const routeData = await fetchRoute(driverLocation, { lat, long });

          return {
            ...hospital,
            hospital_id: hospital.hospital_id, // Ensure hospital_id is included
            distance: routeData.distance,
            time: routeData.duration,
          };
        })
      );

      hospitalsWithDistance.sort((a, b) => a.distance - b.distance);
      setHospitals(hospitalsWithDistance);
      setLoading(false);
    };

    calculateDistances();
  }, [driverLocation, nearesthospital]);

  const fetchRoute = async (start: { lat: any; long: any; }, end: { lat: any; long: any; }) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.long},${start.lat};${end.long},${end.lat}?overview=false`
      );

      if (!response.ok) throw new Error(`OSRM API returned ${response.status}`);

      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        return {
          distance: data.routes[0].distance,
          duration: data.routes[0].duration,
        };
      } else {
        throw new Error('No routes found');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      return { distance: 0, duration: 0 };
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#1E3A8A" style={{ marginTop: 50 }} />;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white', padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Nearest Hospital Resources</Text>
      {hospitals.map((hospital, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => {
            console.log("Navigating to ReportPage with:", {
              lat: hospital.latitude,
              long: hospital.longitude,
              hospid: hospital.hospital_id,
            });
            router.push({
              pathname: '/report',
              params: {
                hospitalLatLong: JSON.stringify({
                  lat: hospital.latitude,
                  long: hospital.longitude,
                  hospid: hospital.hospital_id,
                }),
              },
            });
          }}
        >
          <Card style={{ marginBottom: 10 }}>
            <Card.Content>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{hospital.hospital_name}</Text>
              <Text>Distance: {((hospital.distance ?? 0) / 1000).toFixed(2)} km</Text>
              <Text>Estimated Time: {hospital.time ? `${Math.ceil(hospital.time / 60)} min` : 'N/A'}</Text>
            </Card.Content>
          
            <Card.Actions>
              <Button
                mode="contained"
                buttonColor="#1E3A8A"
                textColor="white"
                onPress={async () => {
                  await requestICU(hospital.hospital_id); // Wait for API request to complete
                  router.push({
                    pathname: '/report',
                    params: {
                      hospitalLatLong: JSON.stringify({
                        lat: hospital.latitude,
                        long: hospital.longitude,
                        hospid: hospital.hospital_id,
                      }),
                    },
                  });
                }}
              >
                ICU Beds: {hospital.resources["ICU Beds"]?.capacity ?? "N/A"}
              </Button>
              <Button
                mode="contained"
                buttonColor="#10B981"
                textColor="white"
                style={{ marginLeft: 10 }}
                
                onPress={async () => {
                  await requestGeneral(hospital.hospital_id); // Wait for API request to complete
                  router.push({
                    pathname: '/report',
                    params: {
                      hospitalLatLong: JSON.stringify({
                        lat: hospital.latitude,
                        long: hospital.longitude,
                        hospid: hospital.hospital_id,
                      }),
                    },
                  });
                }}
              >
                General Beds: {hospital.resources["Non-ICU Beds"]?.capacity ?? "N/A"}
              </Button>
            </Card.Actions>
           
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}