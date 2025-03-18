import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, DirectionsRenderer, Marker } from '@react-google-maps/api';

const center = { lat: 13.0110731, lng: 80.2337369 }; // San Francisco (example center point)
const destination = { lat: 13.0075293,lng: 80.2071615 }; // Los Angeles (destination)

const containerStyle = {
  width: '100%',
  height: '500px',
};

const GOOGLE_API_KEY = 'AIzaSyBcI4KQ1vlpFTS8ku7pJ4pWkdySbbSEAhI'; // Replace with your API key

const MapComponent = () => {
  const [directions, setDirections] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false); // To track when the map is loaded

  // Trigger when the map has loaded
  const onLoad = () => {
    setMapLoaded(true);
  };

  useEffect(() => {
    if (mapLoaded) {
      const calculateRoute = async () => {
        if (window.google && window.google.maps) {
          const directionsService = new window.google.maps.DirectionsService();
          const result = await directionsService.route({
            origin: center,
            destination: destination,
            travelMode: window.google.maps.TravelMode.DRIVING,
          });
          setDirections(result);
        } else {
          console.error("Google Maps API not loaded");
        }
      };

      calculateRoute();
    }
  }, [mapLoaded]); // Only calculate route after the map has loaded

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_API_KEY}
      onLoad={onLoad} // Set mapLoaded to true when script is loaded
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={10}
      >
        <Marker position={center} label="Origin" />
        <Marker position={destination} label="Destination" />
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </LoadScript>
  );
};

export default MapComponent;
