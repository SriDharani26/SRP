import React from 'react';
import {  ScrollView, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import PatientConditionForm from '../../components/PatientConditionForm';
import UploadPhoto from '../../components/UploadPhoto';
import UploadVoiceNote from '../../components/UploadVoiceNote';

export default function ReportPage() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Patient Report</Text>
      
      <PatientConditionForm />

      <UploadPhoto />

      <UploadVoiceNote />

      <Button mode="contained" style={styles.submitButton}>
        Submit Report
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A', 
    marginBottom: 15,
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#1E3A8A',
  },
});
