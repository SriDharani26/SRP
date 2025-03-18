import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import { Card, Text } from 'react-native-paper';
import * as Speech from 'expo-speech';  // Importing Speech module
import db from "@/api/api";

export default function App() {
  const [displayCurrentAddress, setDisplayCurrentAddress] = useState('Location Loading...');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    async function getPermission() {
      try {
        const permission = await Audio.requestPermissionsAsync();
        setAudioPermission(permission.granted);
      } catch (error) {
        console.error('Error requesting audio permission:', error);
      }
    }

    // Request audio permission and get current location
    getPermission();
    getCurrentLocation();


    return () => {
      if (recording) stopRecording();
    };
  }, []);

  async function startRecording() {
    try {
      if (!audioPermission) {
        Alert.alert('Permission Required', 'Audio recording permission not granted');
        return;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
      setRecordingStatus('recording');
      setIsRecording(true); 
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }

  async function stopRecording() {
    try {
      if (recordingStatus !== 'recording' || !recording) return;

      await recording.stopAndUnloadAsync();
      const recordingUri = recording.getURI();

      const fileName = `recording-${Date.now()}.wav`;
      const targetDirectory = FileSystem.documentDirectory + 'recordings/';
      await FileSystem.makeDirectoryAsync(targetDirectory, { intermediates: true });

      const targetFilePath = targetDirectory + fileName;
      await FileSystem.moveAsync({ from: recordingUri!, to: targetFilePath });

      setRecording(null);
      setRecordingStatus('stopped');
      setIsRecording(false); 

      sendAudioToBackend(targetFilePath);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }

  async function handleRecordButtonPress() {
    if (recording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }

  async function sendAudioToBackend(audioUri: string) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'Audio file not found.');
        return;
      }

      const formData = new FormData();
      formData.append('audio', { uri: audioUri, type: 'audio/wav', name: 'audio.wav' });
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);

      const response = await db.post('upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (response.status === 200) {
        Alert.alert('Success', 'Audio uploaded successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'No emergency detected.');
      console.error('Error sending audio:', error);
    }
  }

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow the app to use location services');
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync();
      if (coords) {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);

        const response = await Location.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude });
        if (response.length > 0) {
          let item = response[0];
          setDisplayCurrentAddress(`${item.name}, ${item.city}, ${item.postalCode}`);
        }
      }
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  };

  return (
    <View style={[styles.container, isRecording && styles.recordingContainer]}>
      <Text>English / தமிழ்</Text>
      <TouchableOpacity
        style={[styles.button, isRecording && styles.recordingButton]}
        onPress={handleRecordButtonPress}
        activeOpacity={0.7}>
        <Text style={[styles.buttonText, isRecording && styles.recordingButtonText]}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>

      {!isRecording && (
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.label}>Recording Status:</Text>
            <Text>{recordingStatus}</Text>
            <Text style={styles.label}>Latitude:</Text>
            <Text>{latitude ?? 'Fetching...'}</Text>
            <Text style={styles.label}>Longitude:</Text>
            <Text>{longitude ?? 'Fetching...'}</Text>
            <Text style={styles.label}>Address:</Text>
            <Text>{displayCurrentAddress}</Text>
          </Card.Content>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  recordingContainer: {
    backgroundColor: 'red', 
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'red',
  },
  recordingButton: {
    backgroundColor: 'white',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  recordingButtonText: {
    color: 'red',
  },
  infoCard: {
    width: '90%',
    marginTop: 20,
    padding: 10,
    backgroundColor: 'white',
  },
  label: {
    fontWeight: 'bold',
    marginTop: 5,
  },
});
