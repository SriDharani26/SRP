import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaAmbulance, FaMapMarkerAlt, FaTimes, FaMapSigns, FaClock, FaExclamationTriangle, FaProcedures } from "react-icons/fa";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import { io } from "socket.io-client";

const ambulanceIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// Hardcoded hospital location
const hospitalCoords = [13.0204181, 80.2058843]; // City Hospital coordinates

const MapComponent = React.memo(({ origin, setRouteInfo }) => {
  const mapRef = useRef(null);
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!origin || !origin[0] || !origin[1]) {
      console.error("Invalid origin data:", origin);
      return;
    }

    // Initialize the map only once
    if (!mapRef.current) {
      mapRef.current = L.map("map", { preferCanvas: true }).setView(origin, 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapRef.current);

      // Add hospital marker
      L.marker(hospitalCoords, { icon: ambulanceIcon }).addTo(mapRef.current).bindPopup("City Hospital");
    }

    // Remove existing routing control if it exists
    if (routingControlRef.current) {
      mapRef.current.removeControl(routingControlRef.current);
    }

    // Add routing control
    routingControlRef.current = L.Routing.control({
      waypoints: [L.latLng(origin[0], origin[1]), L.latLng(hospitalCoords[0], hospitalCoords[1])],
      routeWhileDragging: false,
      show: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: "blue", weight: 4 }],
      },
    })
      .on("routesfound", (e) => {
        const routes = e.routes;
        const summary = routes[0].summary;
        setRouteInfo({
          distance: (summary.totalDistance / 1000).toFixed(2) + " km",
          time: Math.round(summary.totalTime / 60) + " min",
        });
      })
      .on("routingerror", (e) => {
        console.error("Routing error:", e);
      })
      .addTo(mapRef.current);

    return () => {
      // Cleanup routing control
      if (routingControlRef.current) {
        mapRef.current.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
    };
  }, [origin, setRouteInfo]);

  return <div id="map" style={{ width: "100%", height: "400px" }}></div>;
});
  

function AmbulanceData() {
  const [ambulances, setAmbulances] = useState([]); // Dynamic ambulance data
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [routeInfo, setRouteInfo] = useState({ distance: "", time: "" });
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket connection
    socketRef.current = io("http://10.16.49.34:5000");

    socketRef.current.on("connect", () => {
      console.log("WebSocket connection established.");
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });

    socketRef.current.on("disconnect", () => {
      console.log("WebSocket connection disconnected.");
    });

    // Listen for location updates
    socketRef.current.on("location_update", (location) => {
      console.log("Location update received:", location);

      if (location.hospid.toLowerCase() === "hosp001") {
        setAmbulances((prevAmbulances) => {
          const existingIndex = prevAmbulances.findIndex(
            (amb) => amb.ambulance_id === location.ambulance_id
          );

          if (existingIndex !== -1) {
            const updatedAmbulances = [...prevAmbulances];
            updatedAmbulances[existingIndex] = { ...updatedAmbulances[existingIndex], ...location };
            return updatedAmbulances;
          } else {
            return [...prevAmbulances, location];
          }
        });
      }
    });

    // Listen for new reports
    socketRef.current.on("new_report", (report) => {
      console.log("New report received:", report);

      if (report.hospid === "HOSP001") {
        setAmbulances((prevAmbulances) => {
          const existingIndex = prevAmbulances.findIndex(
            (amb) => amb.ambulance_id === report.ambulance_id
          );

          if (existingIndex !== -1) {
            const updatedAmbulances = [...prevAmbulances];
            updatedAmbulances[existingIndex] = { ...updatedAmbulances[existingIndex], ...report };
            return updatedAmbulances;
          } else {
            return [...prevAmbulances, report];
          }
        });
      }
    });

    return () => {
      socketRef.current.disconnect(); // Cleanup WebSocket connection
    };
  }, []);

  const handleClosePopup = useCallback(() => setSelectedAmbulance(null), []);

  const handleClickOutside = useCallback(
    (e) => {
      if (e.target.classList.contains("modal-overlay")) {
        handleClosePopup();
      }
    },
    [handleClosePopup]
  );

  const getCardClass = (severity) => {
    switch (severity) {
      case "high":
        return "bg-red-100 blink-red";
      case "medium":
        return "bg-yellow-100";
      default:
        return "bg-blue-100";
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md overflow-auto h-full">
      <h1 className="text-2xl font-bold text-blue-700">Real-time Ambulance Data for hosp001</h1>
      <p className="text-gray-600 mt-2">Track and manage ambulances in real-time.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
        {ambulances.length > 0 ? (
          ambulances.map((ambulance, index) => (
            <div
              key={index}
              onClick={() => setSelectedAmbulance(ambulance)}
              className={`${getCardClass(ambulance.severity)} p-6 rounded-lg shadow-md cursor-pointer hover:bg-blue-200 transition`}
            >
              <div className="flex items-center gap-4">
                <FaAmbulance className="text-blue-700 text-3xl" />
                <div>
                  <h2 className="text-lg font-semibold">{ambulance.ambulance_id}</h2>
                  <p className="text-gray-600 flex items-center">
                    <FaMapMarkerAlt className="mr-2" /> {ambulance.hospid}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-600">No ambulances available.</p>
        )}
      </div>

      <div
        className={`modal-overlay fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50 ${
          selectedAmbulance ? "block" : "hidden"
        }`}
        onClick={handleClickOutside}
      >
        {selectedAmbulance && selectedAmbulance.latitude && selectedAmbulance.longitude ? (
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

            <h2 className="text-3xl font-bold text-blue-700 mb-4 text-center">
              Ambulance {selectedAmbulance.ambulance_id}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              <div className="bg-gray-200 h-full flex items-center justify-center rounded-lg">
                <MapComponent
                  origin={[selectedAmbulance.latitude, selectedAmbulance.longitude]}
                  setRouteInfo={setRouteInfo}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg h-full flex-col justify-between border border-gray-300 shadow-md">
                <h3 className="text-lg font-semibold p-5 text-center">Patient Information</h3>
                <div className="p-5 space-y-4 text-center">
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-700 flex items-center justify-center mb-2">
                      <FaExclamationTriangle className="mr-2" /> Severity: {selectedAmbulance.severity}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-700 flex items-center justify-center mb-2">
                      <FaProcedures className="mr-2" /> ICU Needed: {selectedAmbulance.icu_needed ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-700 flex items-center justify-center mb-2">
                      <FaMapSigns className="mr-2" /> Distance: {routeInfo.distance}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-700 flex items-center justify-center mb-2">
                      <FaClock className="mr-2" /> Estimated Time: {routeInfo.time}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-700 flex items-center justify-center mb-2">
                      Comments: {selectedAmbulance.comments}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">Location data is not available for this ambulance.</p>
        )}
      </div>
    </div>
  );
}

export default AmbulanceData;