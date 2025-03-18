import React, { useState } from "react";
import { FaBars, FaTimes, FaHospital, FaAmbulance, FaMap } from "react-icons/fa";

function Sidebar({ setActivePage, activePage }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-blue-900 text-white h-screen transition-all duration-300 ${isExpanded ? "w-64" : "w-16"}`}>
      <div className="flex justify-between items-center py-4 px-4">
        {!isExpanded && (
          <button onClick={() => setIsExpanded(true)} className="text-white cursor-pointer text-2xl focus:outline-none">
            <FaBars />
          </button>
        )}
        {isExpanded && (
          <button onClick={() => setIsExpanded(false)} className="text-white cursor-pointer text-2xl focus:outline-none ml-auto">
            <FaTimes />
          </button>
        )}
      </div>

      <ul className="mt-4">
        <li
          onClick={() => setActivePage("resources")}
          className={`flex items-center p-4 cursor-pointer hover:bg-blue-700 ${activePage === "resources" ? "bg-blue-700" : ""}`}
        >
          <FaHospital className="text-xl" />
          {isExpanded && <span className="ml-3">Resources Updation</span>}
        </li>
        <li
          onClick={() => setActivePage("ambulance")}
          className={`flex items-center p-4 cursor-pointer hover:bg-blue-700 ${activePage === "ambulance" ? "bg-blue-700" : ""}`}
        >
          <FaAmbulance className="text-xl" />
          {isExpanded && <span className="ml-3">Ambulance Data</span>}
          
        </li>

        <li
          onClick={() => setActivePage("map")}
          className={`flex items-center p-4 cursor-pointer hover:bg-blue-700 ${activePage === "ambulance" ? "bg-blue-700" : ""}`}
        >
          <FaMap className="text-xl" />
          {isExpanded && <span className="ml-3">Map data</span>}
        </li>

      </ul>
    </div>
  );
}

export default Sidebar;
