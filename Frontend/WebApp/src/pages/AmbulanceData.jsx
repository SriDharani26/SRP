import React, { useState, useEffect } from "react";
import { FaAmbulance, FaMapMarkerAlt, FaUser, FaPhone, FaTimes } from "react-icons/fa";
import axios from "axios";
import { GoogleMap, LoadScript, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";

const ambulances = [
  { id: 1, number: "AMB-101", location: "City Center", patient: { name: "Ak", age: 45, contact: "9876543210" }, coords: [51.505, -0.09], hospitalCoords: [51.510, -0.08] },
  { id: 2, number: "AMB-102", location: "Highway 5", patient: { name: "Jk", age: 30, contact: "8765432109" }, coords: [51.515, -0.10], hospitalCoords: [51.510, -0.08] },
  { id: 3, number: "AMB-103", location: "Downtown", patient: { name: "Mk", age: 55, contact: "7654321098" }, coords: [51.520, -0.12], hospitalCoords: [51.510, -0.08] },
  { id: 4, number: "AMB-104", location: "North Park", patient: { name: "Ek", age: 40, contact: "6543210987" }, coords: [51.525, -0.13], hospitalCoords: [51.510, -0.08] },
  { id: 5, number: "AMB-105", location: "West Avenue", patient: { name: "Dk", age: 35, contact: "5432109876" }, coords: [51.530, -0.14], hospitalCoords: [51.510, -0.08] },
];

const MapComponent = ({ origin, destination }) => {
  const [response, setResponse] = useState(null);

  useEffect(() => {
    const fetchRoute = async () => {
      const result = await axios.post("http://127.0.0.1:5000/get_shortest_travel_time", {
          origin_lat: 37.7749,
          origin_lng: -122.4194,
          destinations: [
            {
              lat: 34.0522,
              lng: -118.2437
            }
          ]
      });
      setResponse(result.data);
    };

    fetchRoute();
  }, [origin, destination]);

  return (
    <LoadScript googleMapsApiKey="AIzaSyBcI4KQ1vlpFTS8ku7pJ4pWkdySbbSEAhI">
      <GoogleMap
        mapContainerStyle={{ height: "400px", width: "800px" }}
        zoom={12}
        center={{ lat: origin[0], lng: origin[1] }}
      >
        {response && <DirectionsRenderer directions={response} />}
      </GoogleMap>
    </LoadScript>
  );
};

function AmbulanceData() {
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);

  const handleClosePopup = () => setSelectedAmbulance(null);

  const handleClickOutside = (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      handleClosePopup();
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md overflow-auto h-full">
      <h1 className="text-2xl font-bold text-blue-700">Real-time Ambulance Data</h1>
      <p className="text-gray-600 mt-2">Track and manage ambulances in real-time.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
        {ambulances.map((ambulance) => (
          <div
            key={ambulance.id}
            onClick={() => setSelectedAmbulance(ambulance)}
            className="bg-blue-100 p-6 rounded-lg shadow-md cursor-pointer hover:bg-blue-200 transition"
          >
            <div className="flex items-center gap-4">
              <FaAmbulance className="text-blue-700 text-3xl" />
              <div>
                <h2 className="text-lg font-semibold">{ambulance.number}</h2>
                <p className="text-gray-600 flex items-center">
                  <FaMapMarkerAlt className="mr-2" /> {ambulance.location}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedAmbulance && (
        <div
          className="modal-overlay fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50"
          onClick={handleClickOutside}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg w-full h-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClosePopup}
              className="absolute top-4 right-0 p-3 text-gray-600 hover:text-red-600 text-xl cursor-pointer"
            >
              <FaTimes />
            </button>

            <h2 className="text-3xl font-bold text-blue-700 mb-4">Ambulance {selectedAmbulance.number}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              <div className="bg-gray-200 h-full flex items-center justify-center rounded-lg">
                <MapComponent origin={selectedAmbulance.coords} destination={selectedAmbulance.hospitalCoords} />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg h-full flex-col justify-between">
                <h3 className="text-lg font-semibold p-5">Patient Information</h3>
                <p className="text-gray-700 flex items-center mt-2 p-5"><FaUser className="mr-2" /> {selectedAmbulance.patient.name}</p>
                <p className="text-gray-700 p-5">Age: {selectedAmbulance.patient.age}</p>
                <p className="text-gray-700 flex items-center p-5"><FaPhone className="mr-2" /> {selectedAmbulance.patient.contact}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AmbulanceData;
