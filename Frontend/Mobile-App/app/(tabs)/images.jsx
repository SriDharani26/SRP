import React, { useState } from 'react';
import { View, Alert, TouchableOpacity } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';
import db from '@/api/api';
import * as Location from 'expo-location';

const accidentImages = {
  road: require('@/assets/images/road.jpg'),
  fire: require('@/assets/images/Fire.jpg'),
  landslide: require('@/assets/images/landslide.jpg'),
  building: require('@/assets/images/building.jpg'),
};

const numberOfPeopleImages = {
  '0-1': require('@/assets/images/z.jpg'),
  '1-5': require('@/assets/images/o_f.jpg'),
  '5-10': require('@/assets/images/f_t.jpg'),
  '10-20': require('@/assets/images/tp.jpg'),
};

export default function ImageEmergency() {
  const [displayCurrentAddress, setDisplayCurrentAddress] = useState('Location Loading...');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [accidentType, setAccidentType] = useState(null);
  const [numberOfPeople, setNumberOfPeople] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); 

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow the app to use the location services');
        return false;
      }

      const { coords } = await Location.getCurrentPositionAsync();
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);

      const response = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (response.length > 0) {
        let item = response[0];
        let address = `${item.name}, ${item.city}, ${item.postalCode}`;
        setDisplayCurrentAddress(address);
      }
      return true;
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
      console.error(error);
      return false;
    }
  };

  const handleSendEmergency = async () => {
    if (!accidentType || !numberOfPeople) {
      Alert.alert('Error', 'Please select both accident type and number of people');
      return;
    }

    const locationFetched = await getCurrentLocation();
    if (!locationFetched) return;

    const data = {
      accident_type: accidentType,
      number_of_people: numberOfPeople,
      latitude,
      longitude,
      location_address: displayCurrentAddress,
    };

    try {
      const response = await db.post('/emergency', data, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 200) {
        Alert.alert('Success', response.data.message || 'Emergency details shared successfully!');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to send details');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
      console.error(error);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setAccidentType(null); 
      setCurrentStep(1); 
    } else if (currentStep === 3) {
      setNumberOfPeople(null);
      setCurrentStep(2); 
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text variant="headlineSmall" style={{ color: 'black', marginBottom: 20 }}>
        Emergency Form
      </Text>

      {!accidentType && currentStep === 1 && (
        <View>
          <Text variant="titleMedium" style={{ color: 'black', textAlign: 'center', marginBottom: 10 }}>
            Select Type of Accident
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.keys(accidentImages).map((type) => (
              <Card key={type} mode="outlined" style={{ margin: 10 }} onPress={() => { setAccidentType(type); setCurrentStep(2); }}>
                <Card.Cover source={accidentImages[type]} style={{ width: 140, height: 140 }} />
              </Card>
            ))}
          </View>

          {currentStep > 1 && (
            <TouchableOpacity onPress={handleBack} style={{ marginTop: 20 }}>
              <Button mode="outlined" style={{ width: '80%' }}>
                Back
              </Button>
            </TouchableOpacity>
          )}
        </View>
      )}

      {accidentType && !numberOfPeople && currentStep === 2 && (
        <View>
          <Text variant="titleMedium" style={{ color: 'black', textAlign: 'center', marginBottom: 10 }}>
            Select Number of People Affected
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.keys(numberOfPeopleImages).map((count) => (
              <Card key={count} mode="outlined" style={{ margin: 10 }} onPress={() => { setNumberOfPeople(count); setCurrentStep(3); }}>
                <Card.Cover source={numberOfPeopleImages[count]} style={{ width: 140, height: 140 }} />
              </Card>
            ))}
          </View>

          {currentStep > 1 && (
            <TouchableOpacity onPress={handleBack} style={{ marginTop: 20 }}>
              <Button mode="outlined" textColor='#1E3A8A'>
                Back
              </Button>
            </TouchableOpacity>
          )}
        </View>
      )}

      {accidentType && numberOfPeople && currentStep === 3 && (
        <View style={{ alignItems: 'center' }}>
          <Button mode="contained" buttonColor="#1E3A8A" onPress={handleSendEmergency} style={{ marginTop: 20, width: '80%', height: 45 }}>
            Send Emergency
          </Button>

          {currentStep > 1 && (
            <TouchableOpacity onPress={handleBack} style={{ marginTop: 20 }}>
              <Button mode="outlined" textColor='#1E3A8A' style={{ width: '80%' }}>
                Back
              </Button>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
