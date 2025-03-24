import React, { useState, useEffect, useCallback } from "react";
import { FaAmbulance, FaMapMarkerAlt, FaUser, FaPhone, FaTimes, FaMapSigns, FaClock, FaExclamationTriangle, FaProcedures } from "react-icons/fa";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import axios from 'axios';


// Proper ambulance SVG icon from FontAwesome
const ambulanceSVG = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
    <path d="M624 352h-16V243.9c0-12.7-5.1-24.9-14.1-33.9L494 110.1c-9-9-21.2-14.1-33.9-14.1H416V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48v320c0 26.5 21.5 48 48 48h16c0 53 43 96 96 96s96-43 96-96h128c0 53 43 96 96 96s96-43 96-96h48c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zM160 464c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm144-248c0 4.4-3.6 8-8 8h-56v56c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8v-56h-56c-4.4 0-8-3.6-8-8v-48c0-4.4 3.6-8 8-8h56v-56c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v56h56c4.4 0 8 3.6 8 8v48zm176 248c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm80-208H416V144h44.1l99.9 99.9V256z"/>
  </svg>
`);

const ambulanceIcon = new L.Icon({
  iconUrl: `data:image/svg+xml,${ambulanceSVG}`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
  shadowSize: [40, 40]
});

const hospitalIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'hospital-icon'
});

const ambulances = [
  { id: 1, number: "AMB-101", location: "City Center", patient: { name: "Ak", age: 45, contact: "9876543210", severity: "High", icuNeeded: true }, coords: [51.505, -0.09] },
  { id: 2, number: "AMB-102", location: "Highway 5", patient: { name: "Jk", age: 30, contact: "8765432109", severity: "Medium", icuNeeded: false }, coords: [51.515, -0.10] },
  { id: 3, number: "AMB-103", location: "Downtown", patient: { name: "Mk", age: 55, contact: "7654321098", severity: "Low", icuNeeded: false }, coords: [51.520, -0.12] },
  { id: 4, number: "AMB-104", location: "North Park", patient: { name: "Ek", age: 40, contact: "6543210987", severity: "High", icuNeeded: true }, coords: [51.525, -0.13] },
  { id: 5, number: "AMB-105", location: "West Avenue", patient: { name: "Dk", age: 35, contact: "5432109876", severity: "Medium", icuNeeded: false }, coords: [51.530, -0.14] },
];

const hospitalCoords = [51.510, -0.08];

const MapComponent = React.memo(({ origin, setRouteInfo }) => {
  useEffect(() => {
    const map = L.map("map").setView(origin, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // Add markers
    L.marker(origin, { icon: ambulanceIcon }).addTo(map).bindPopup("Ambulance Location");
    L.marker(hospitalCoords, { icon: hospitalIcon }).addTo(map).bindPopup("Hospital");

    // Routing Control
    const control = L.Routing.control({
      waypoints: [L.latLng(origin[0], origin[1]), L.latLng(hospitalCoords[0], hospitalCoords[1])],
      createMarker: function() { return null; }, // Prevent default markers
      routeWhileDragging: false, // Prevent dragging
      show: false, // Hide the itinerary panel
      addWaypoints: false, // Disable adding waypoints by clicking on the map
      draggableWaypoints: false, // Disable dragging waypoints
      fitSelectedRoutes: true, // Fit the map to the selected route
      lineOptions: {
        addWaypoints: false, // Disable adding waypoints by clicking on the route
      },
      summaryTemplate: '',
      distanceTemplate: '',
      timeTemplate: '',
      showAlternatives: false, // Hide alternative routes
      
    }).addTo(map);

    control.on('routesfound', function(e) {
      
      const routes = e.routes;
      const summary = routes[0].summary;
      setRouteInfo({
        distance: (summary.totalDistance / 1000).toFixed(2) + ' km',
        time: Math.round(summary.totalTime / 60) + ' min'
      });
    });

    return () => {
      map.remove(); // Cleanup
    };
  }, [origin, setRouteInfo]);

  return <div id="map" style={{ width: "100%", height: "400px" }}></div>;
});

function AmbulanceData() {
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [routeInfo, setRouteInfo] = useState({ distance: '', time: '' });

  const handleClosePopup = useCallback(() => setSelectedAmbulance(null), []);

  const handleClickOutside = useCallback((e) => {
    if (e.target.classList.contains("modal-overlay")) {
      handleClosePopup();
    }
  }, [handleClosePopup]);

  const getCardClass = (severity) => {
    switch (severity) {
      case "High":
        return "bg-red-100 blink-red";
      case "Medium":
        return "bg-yellow-100";
      default:
        return "bg-blue-100";
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
            className={`${getCardClass(ambulance.patient.severity)} p-6 rounded-lg shadow-md cursor-pointer hover:bg-blue-200 transition`}
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

      <div
        className={`modal-overlay fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50 ${selectedAmbulance ? 'block' : 'hidden'}`}
        onClick={handleClickOutside}
      >
        {selectedAmbulance && (
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

            <h2 className="text-3xl font-bold text-blue-700 mb-4 text-center">Ambulance {selectedAmbulance.number}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              <div className="bg-gray-200 h-full flex items-center justify-center rounded-lg">
                <MapComponent origin={selectedAmbulance.coords} setRouteInfo={setRouteInfo} />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg h-full flex-col justify-between border border-gray-300 shadow-md">
                <h3 className="text-lg font-semibold p-5 text-center">Patient Information</h3>
                <div className="p-5 space-y-4 text-center">
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-700 flex items-center justify-center mb-2"><FaUser className="mr-2" /> {selectedAmbulance.patient.name}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-700 flex items-center justify-center mb-2"><FaMapMarkerAlt className="mr-2" /> {selectedAmbulance.location}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-700 flex items-center justify-center mb-2"><FaPhone className="mr-2" /> {selectedAmbulance.patient.contact}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-700 flex items-center justify-center mb-2"><FaMapSigns className="mr-2" /> Distance: {routeInfo.distance}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-700 flex items-center justify-center mb-2"><FaClock className="mr-2" /> Estimated Time: <span className="text-red-600">{routeInfo.time}</span></p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-700 flex items-center justify-center mb-2"><FaExclamationTriangle className="mr-2" /> Severity: {selectedAmbulance.patient.severity}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-700 flex items-center justify-center mb-2"><FaProcedures className="mr-2" /> ICU Needed: {selectedAmbulance.patient.icuNeeded ? "Yes" : "No"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AmbulanceData;