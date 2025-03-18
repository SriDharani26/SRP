import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Dropdown, Avatar, Card } from "flowbite-react";
import "leaflet/dist/leaflet.css";

const alerts = [
  { id: 1, title: "Warehouse Fire", description: "Ongoing fire at industrial area.", location: { lat: 40.7128, lng: -74.006 } },
  { id: 2, title: "Apartment Fire", description: "Evacuation in progress.", location: { lat: 40.73061, lng: -73.935242 } },
  { id: 3, title: "School Fire", description: "Students evacuated.", location: { lat: 40.748817, lng: -73.985428 } },
  { id: 4, title: "Factory Fire", description: "Hazardous materials involved.", location: { lat: 40.758896, lng: -73.985130 } },
  { id: 5, title: "Forest Fire", description: "Spreading quickly, evacuation needed.", location: { lat: 40.732013, lng: -73.999157 } },
  { id: 6, title: "Hospital Fire", description: "Fire at the emergency unit.", location: { lat: 40.745018, lng: -73.990347 } },
  { id: 7, title: "Office Building Fire", description: "Firefighters arriving at the scene.", location: { lat: 40.742054, lng: -74.002468 } },
];

const App = () => {
  const [incidentLocation, setIncidentLocation] = useState({ lat: 40.7128, lng: -74.006 });

  // Update the map's center when the location changes
  const MapUpdater = ({ location }) => {
    const map = useMap();
    map.setView(location, 13);
    return null;
  };

  const handleCardClick = (location) => {
    setIncidentLocation(location);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Bar */}
      <nav className="bg-red-600 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">GoldenPulse</h1>
        <Dropdown label={<Avatar rounded img="https://via.placeholder.com/40" />} inline>
          <Dropdown.Header>
            <span className="block text-sm">John Doe</span>
          </Dropdown.Header>
          <Dropdown.Item className="text-red-600 cursor-pointer">Sign Out</Dropdown.Item>
        </Dropdown>
      </nav>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row flex-1 p-4 gap-4 overflow-hidden">
        {/* Map Section */}
        <div className="flex-1 h-[500px] md:h-auto bg-white shadow-md rounded-lg">
          <MapContainer
            center={incidentLocation}
            zoom={13}
            scrollWheelZoom={false}
            className="h-full w-full rounded-lg"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={incidentLocation}>
              <Popup>Incident Location</Popup>
            </Marker>
            <MapUpdater location={incidentLocation} />
          </MapContainer>
        </div>

        {/* Alerts Section */}
        <div className="flex-1 h-[500px] overflow-y-auto bg-white border rounded-lg p-4">
          {/* Alert Cards */}
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className="border border-red-500 shadow-lg p-4 cursor-pointer mb-4"
              onClick={() => handleCardClick(alert.location)}
            >
              <h5 className="text-lg font-bold text-white-800">{alert.title}</h5>
              <p className="text-gray-600">{alert.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
