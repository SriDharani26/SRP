import React, { useState, useEffect, useRef } from "react";
import { FaBell, FaSignOutAlt, FaUser } from "react-icons/fa";

const Topbar = ({ setActivePage, activePage, user }) => {
  const [showDropdown, setShowDropdown] = useState(false); 
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-blue-900 text-white flex justify-between items-center px-6 py-4 shadow-md fixed top-0 left-0 right-0 z-50">
      <h1 className="text-xl font-semibold">GoldenPulse</h1>

      <div className="flex items-center gap-6 relative">
        <button
          onClick={() => setActivePage("alerts")}
          className={`text-xl cursor-pointer ${activePage === "alerts" ? "bg-blue-600 p-2 rounded-full" : "hover:text-gray-200 p-2"}`}
        >
          <FaBell />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="text-white font-medium">{user.name}</span>
            <img
              src={user.avatar}
              alt="User"
              className="w-10 h-10 rounded-full border-2 border-white"
            />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-40 bg-white shadow-md rounded-lg py-2">
              <button className="flex items-center px-4 py-2 text-gray-800 hover:bg-gray-100 w-full">
                <FaUser className="mr-2" /> Profile
              </button>
              <button className="flex items-center px-4 py-2 text-red-600 hover:bg-gray-100 w-full">
                <FaSignOutAlt className="mr-2" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Topbar;
