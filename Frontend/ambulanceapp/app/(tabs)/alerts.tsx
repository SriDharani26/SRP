import React, { useState, useEffect } from 'react';
import { Text, ScrollView } from 'react-native';
import { Card, Button } from 'react-native-paper';

import db from '@/api/api';

export default function AlertsPage() {
  const [note, setNote] = useState(null);  // Start with null

  // Fetch the accident data once when the component mounts
  useEffect(() => {
    const fetchNote = async () => {
      try {
        const response = await db.get(`/ambulance_alert`);
        setNote(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchNote();
  }, []); // Empty dependency array ensures it runs only once

  console.log(note);  // Logs data after state updates

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white', padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Emergency Alerts</Text>

      {/* Show loading state until data is available */}
      {!note || !note.Accidents ? (
        <Card style={{ margin: 10, padding: 10 }}>
          <Card.Content>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Accident Details</Text>
            <Text>No accident data available</Text>
          </Card.Content>
        </Card>
      ) : (
        note.Accidents.length > 0 ? (
          note.Accidents.map((accident, index) => (
            <Card key={index} style={{ marginVertical: 10, padding: 10 }}>
              <Card.Content>
                <Text>Accident Type: {accident["Accident Type"]}</Text>
                <Text>Latitude: {accident.Latitude}</Text>
                <Text>Longitude: {accident.Longitude}</Text>
                <Text>Number of People Injured: {accident["Number of People Injured"]}</Text>
              </Card.Content>
              <Card.Actions>
                <Button mode="contained" buttonColor="#1E3A8A" textColor="white">Accept</Button>
                <Button mode="outlined" textColor="#1E3A8A">Decline</Button>
              </Card.Actions>
            </Card>
          ))
        ) : (
          <Text>No accidents found</Text>
        )
      )}
    </ScrollView>
  );
}
