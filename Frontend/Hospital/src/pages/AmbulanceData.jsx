import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaAmbulance, FaMapMarkerAlt, FaTimes, FaMapSigns, FaClock, FaExclamationTriangle, FaProcedures } from "react-icons/fa";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import { io } from "socket.io-client";
import axios from "axios"; // For API calls
import { debounce } from "lodash";

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

  // SVG for ambulance icon
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
  });

  const hospitalIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const hospitalCoords = [13.0204181, 80.2058843]; // City Hospital coordinates

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

      // Add ambulance marker
      L.marker(origin, { icon: ambulanceIcon }).addTo(mapRef.current).bindPopup("Ambulance Location");

      // Add hospital marker
      L.marker(hospitalCoords, { icon: hospitalIcon }).addTo(mapRef.current).bindPopup("City Hospital");
    }

    // Remove existing routing control if it exists
    if (routingControlRef.current) {
      try {
        mapRef.current.removeControl(routingControlRef.current);
      } catch (error) {
        console.warn("Error removing routing control:", error);
      }
      routingControlRef.current = null;
    }

    // Add routing control
    routingControlRef.current = L.Routing.control({
      serviceUrl: "https://router.project-osrm.org/route/v1", // Use your own OSRM server for production
      waypoints: [L.latLng(origin[0], origin[1]), L.latLng(hospitalCoords[0], hospitalCoords[1])],
      routeWhileDragging: false,
      show: false, // Hide the itinerary panel
      addWaypoints: false, // Disable adding waypoints by clicking on the map
      draggableWaypoints: false, // Disable dragging waypoints
      fitSelectedRoutes: true, // Fit the map to the selected route
      createMarker: () => null, // Prevent default markers
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
        alert("Unable to calculate route. Please try again later.");
      })
      .addTo(mapRef.current);

    return () => {
      // Cleanup routing control
      if (routingControlRef.current) {
        try {
         
        } catch (error) {
          console.warn("Error during cleanup of routing control:", error);
        }
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

  // Fetch initial ambulance data from the database
  useEffect(() => {
    let isMounted = true; // Track if the component is still mounted
  
    const fetchAmbulances = async () => {
      try {
        const response = await axios.get("/api/incoming_ambulances?hospid=HOSP001");
        if (isMounted) {
          console.log("Response received:", response.data);
          setAmbulances(response.data.ambulances || []);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching ambulances:", error);
        }
      }
    };
  
    fetchAmbulances();
  
    return () => {
      isMounted = false; // Cleanup on component unmount
    };
  }, []);

  // Handle WebSocket connection for live updates
  useEffect(() => {
    if (selectedAmbulance) {
      socketRef.current = io("http://10.16.49.34:5000");
  
      // Handle location updates
      const handleLocationUpdate = debounce((updatedLocation) => {
        if (updatedLocation.ambulance_id === selectedAmbulance.ambulance_id) {
          setSelectedAmbulance((prev) => ({
            ...prev,
            ...updatedLocation,
          }));
        }
      }, 5000);
  
      // Listen for location updates
      socketRef.current.on("location_update", handleLocationUpdate);
  
      // Listen for report updates (e.g., severity, ICU needed, comments)
      socketRef.current.on("new_report", (updatedReport) => {
        if (updatedReport.ambulance_id === selectedAmbulance.ambulance_id) {
          setSelectedAmbulance((prev) => ({
            ...prev,
            report: {
              ...prev?.report,
              ...updatedReport, // Merge the updated report fields
            },
          }));
        }
      });
  
      return () => {
        socketRef.current.disconnect(); // Cleanup WebSocket connection
      };
    }
  }, [selectedAmbulance]);

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
              className={`${getCardClass(ambulance.report?.severity)} p-6 rounded-lg shadow-md cursor-pointer hover:bg-blue-200 transition`}
            >
              <div className="flex items-center gap-4">
                <FaAmbulance className="text-blue-700 text-3xl" />
                <div>
                  <h2 className="text-lg font-semibold">{ambulance.ambulance_id}</h2>
                  <p className="text-gray-600 flex items-center">
                    <FaMapMarkerAlt className="mr-2" /> {ambulance.latitude}, {ambulance.longitude}
                  </p>
                  <p className="text-gray-600 flex items-center">
                    <FaExclamationTriangle className="mr-2" /> Severity: {ambulance.report?.severity || "N/A"}
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
                      <FaExclamationTriangle className="mr-2" /> Severity: {selectedAmbulance.report?.severity || "N/A"}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <p className="text-gray-700 flex items-center justify-center mb-2">
                      <FaProcedures className="mr-2" /> ICU Needed: {selectedAmbulance.report?.icu_needed || "N/A"}
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
                      Comments: {selectedAmbulance.report?.comments || "N/A"}
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