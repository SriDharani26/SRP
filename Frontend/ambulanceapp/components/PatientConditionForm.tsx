import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function PatientConditionForm() {
  const [condition, setCondition] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Patient Condition</Text>
      <TextInput
        style={styles.input}
        placeholder="Describe the patient's condition..."
        value={condition}
        onChangeText={setCondition}
        multiline
      />
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
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    padding: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
