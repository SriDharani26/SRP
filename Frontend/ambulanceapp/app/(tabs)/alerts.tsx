import React,{useState} from 'react';
import { Text, ScrollView } from 'react-native';
import { Card, Button } from 'react-native-paper';

import db from '@/api/api';


export default function AlertsPage() {
  const [note, setNote] = useState();
  const fetchNote = async () => {
    const response = await db.get(`/ambulance_alert`);
    setNote(response.data);
  
  };
  fetchNote();
  console.log(note);  
  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white', padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Emergency Alerts</Text>
      
      <Card style={{ marginBottom: 10 }}>
        <Card.Content>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Patient: John Doe</Text>
          <Text>Location: 123 Main St</Text>
          <Text>Condition: Severe Injury</Text>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" buttonColor="#1E3A8A" textColor="white">Accept</Button>
          <Button mode="outlined" textColor="#1E3A8A">Decline</Button>
        </Card.Actions>
      </Card>

      <Card>
        <Card.Content>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Patient: Jane Smith</Text>
          <Text>Location: 456 Elm St</Text>
          <Text>Condition: Cardiac Arrest</Text>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" buttonColor="#1E3A8A" textColor="white">Accept</Button>
          <Button mode="outlined" textColor="#1E3A8A">Decline</Button>
        </Card.Actions>
      </Card>
    </ScrollView>
  );
}
