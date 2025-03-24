import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Button, Text } from 'react-native-paper';

export default function UploadVoiceNote() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.granted) {
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
      }
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  };

  const stopRecording = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Upload Voice Note</Text>
      {recording ? (
        <Button mode="outlined" textColor='#1E3A8A' onPress={stopRecording}>
          Stop Recording
        </Button>
      ) : (
        <Button mode="outlined" textColor='#1E3A8A' onPress={startRecording}>
          Start Recording
        </Button>
      )}
      {audioUri && <Text style={styles.audioText}>Voice note saved!</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 5,
  },
  audioText: {
    marginTop: 10,
    color: 'green',
    textAlign: 'center',
    fontSize: 14,
  },
});
