import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Card, Button } from 'react-native-paper';

export default function HospitalAvailability() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulating a backend fetch (Replace with actual API call)
    setTimeout(() => {
      setHospitals([
        { id: 1, name: "City Hospital", location: "123 Main St", generalBeds: 5, icuBeds: 0 },
        { id: 2, name: "Metro Care", location: "456 Elm St", generalBeds: 0, icuBeds: 2 },
      ]);
      setLoading(false);
    }, 2000);
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#1E3A8A" style={{ flex: 1, justifyContent: 'center', marginTop: 50 }} />;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white', padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Nearest Hospital Resources</Text>
      
      {hospitals.map((hospital) => (
        <Card key={hospital.id} style={{ marginBottom: 10 }}>
          <Card.Content>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{hospital.name}</Text>
            <Text>Location: {hospital.location}</Text>
          </Card.Content>
          <Card.Actions>
            {hospital.generalBeds > 0 && (
              <Button mode="contained" buttonColor="#1E3A8A" textColor="white">
                General Beds ({hospital.generalBeds})
              </Button>
            )}
            {hospital.icuBeds > 0 && (
              <Button mode="contained" buttonColor="#B91C1C" textColor="white">
                ICU Beds ({hospital.icuBeds})
              </Button>
            )}
          </Card.Actions>
        </Card>
      ))}
    </ScrollView>
  );
}
