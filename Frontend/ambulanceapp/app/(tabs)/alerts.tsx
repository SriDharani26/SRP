import React, { useState, useEffect } from "react";
import { Text, ScrollView, View, Alert } from "react-native";
import { Card, Button } from "react-native-paper";
import axios from "axios";
import { useRouter } from 'expo-router';

import db from "@/api/api";

export default function AlertsPage() {
  const [note, setNote] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [status, setStatus] = useState("pending"); 
  const router = useRouter();

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const response = await db.get(`/ambulance_alert`);
        setNote(response.data);
      } catch (error) {
        
        console.error("Error fetching data:", error);
      }
    };

    fetchNote();
  }, []);

  // Accept Accident
  const handleAccept = async () => {
    try {
      await db.post(`request_accept`, {
        ambulance_id: "A016",
      });
      setStatus("accepted");
    } catch (error) {
      console.error("Error accepting alert:", error);
      Alert.alert("Error", "Could not accept the alert.");
    }
  };

  // Decline Accident
  const handleDecline = async () => {
    try {
      await db.post(`request_decline`, {
        ambulance_id: "A020",
      });
      setStatus("declined");
    } catch (error) {
      console.error("Error declining alert:", error);
      Alert.alert("Error", "Could not decline the alert.");
    }
  };

  // Fetch Nearest Hospital
  const fetchNearestHospital = async () => {
    try {
      const response = await db.get(`nearest_hospital`, {
        params: {latitude: note.Accidents[0].Latitude, longitude: note.Accidents[0].Longitude},
      });
      Alert.alert("Nearest Hospital", response.data.hospital_name);
    } catch (error) {
      console.error("Error fetching hospital:", error);
      Alert.alert("Error", "Could not fetch nearest hospital.");
    }
  };

  // Make Me Available Again
  const makeAvailableAgain = async () => {
    setStatus("pending");
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "white", padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>Emergency Alerts</Text>

      {status === "pending" ? (
        !note || !note.Accidents ? (
          <Card style={{ margin: 10, padding: 10 }}>
            <Card.Content>
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>Accident Details</Text>
              <Text>No accident data available</Text>
            </Card.Content>
          </Card>
        ) : (
          note.Accidents.map((accident, index) => (
            <Card key={index} style={{ marginVertical: 10, padding: 10 }}>
              <Card.Content>
                <Text>Accident Type: {accident["Accident Type"]}</Text>
                <Text>Latitude: {accident.Latitude}</Text>
                <Text>Longitude: {accident.Longitude}</Text>
                <Text>Number of People Injured: {accident["Number of People Injured"]}</Text>
              </Card.Content>
              <Card.Actions>
                
              <Button
                mode="contained"
                buttonColor="green"
                textColor="white"
                onPress={() => {
                  setStatus("accepted");
                  setLatitude(accident.Latitude);
                  setLongitude(accident.Longitude); // Ensure status updates correctly
                  router.push({
                    pathname: "/hoschoose",
                    params: {
                      ambulancelatlong: JSON.stringify({
                        latitude: accident.Latitude,
                        longitude: accident.Longitude,
                      }),
                    },
                  });
                }}
                
              >
               Accept
              </Button>
                <Button mode="outlined" textColor="#1E3A8A" onPress={handleDecline}>
                  Decline
                </Button>
              </Card.Actions>
            </Card>
          ))
        )
      ) : null}

      {status === "accepted" && (
        <Button
        mode="contained"
        buttonColor="green"
        textColor="white"
        onPress={() =>
          router.push({
            pathname: "/hoschoose",
            params: {
              ambulancelatlong: JSON.stringify({
                latitude: latitude,
                longitude:longitude,
              }),
            },
          })
        }
      >
        Fetch Nearest Hospital
      </Button>
      )}

      {status === "declined" && (
        <Button mode="contained" buttonColor="red" textColor="white" onPress={makeAvailableAgain}>
          Make Me Available Again
        </Button>
      )}
    </ScrollView>

  );
}
