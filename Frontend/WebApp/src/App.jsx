import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import ResourcesUpdation from "./pages/ResourceUpdation"
import Alerts from "./pages/Alerts";
import AmbulanceData from "./pages/AmbulanceData";
import Topbar from "./components/Topbar";
import Map from "./pages/Map";

function App() {
  const [activePage, setActivePage] = useState("resources"); 
  const [showDropdown, setShowDropdown] = useState(false); 
  const dropdownRef = useRef(null);

  const user = {
    name: "Test User",
    avatar: "https://via.placeholder.com/40",
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  let PageContent;
  switch (activePage) {
    case "resources":
      PageContent = <ResourcesUpdation />;
      break;
    case "ambulance":
      PageContent = <AmbulanceData />;
      break;
    case "alerts":
      PageContent = <Alerts />; 
      break;
    case "map":
      PageContent = <Map />;
      break;
    default:
      PageContent = <ResourcesUpdation />;
  }

  return (
    <div className="h-screen flex flex-col">
      <Topbar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
      />
      <div className="flex flex-1 pt-16">
        <Sidebar setActivePage={setActivePage} activePage={activePage} />
        <div className="flex-1 p-6 bg-white text-gray-900 overflow-auto">
          {PageContent}
        </div>
      </div>
    </div>
  );
}

export default App;
