import React, { useState, useEffect } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const hospitalId = "HOSP001";

export default function Resource() {
  const [resources, setResources] = useState({
    "ICU Beds": '',
    "Non-ICU Beds": '',
    "Doctors": '',
    "Nurses": '',
    "Ventilators": '',
    "Ambulances": '',
    "Oxygen Cylinders": '',
    "PPE Kits": '',
    "Medicines": '',
    "Isolation Wards": ''
  });

  const [chartData, setChartData] = useState([]);

  // Fetch resource data from the backend
  useEffect(() => {
    fetch(`http://127.0.0.1:5000/api/resources?hospital_id=${hospitalId}`) // Ensure the correct backend URL
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.resources) {
          // Update resources state
          setResources(data.resources);

          // Format chart data
          const formattedChartData = Object.entries(data.resources).map(([key, value]) => ({
            resource: key,
            capacity: value.capacity,
            occupied: value.occupied,
          }));
          setChartData(formattedChartData);
        }
      })
      .catch(error => console.error("Error fetching resources:", error));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setResources({
      ...resources,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  
    // Prepare the payload in the required format
    const payload = {
      hospital_id: hospitalId,
      resources: Object.fromEntries(
        Object.entries(resources).map(([key, value]) => [key, parseInt(value, 10) || ''])
      ),
    };
  
    // Send updated resource data to the backend
    fetch('http://127.0.0.1:5000/api/resources/update', { // Ensure the correct backend URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log(data.message);
  
        // Clear the form by resetting the `resources` state
        setResources({
          "ICU Beds": '',
          "Non-ICU Beds": '',
          "Doctors": '',
          "Nurses": '',
          "Ventilators": '',
          "Ambulances": '',
          "Oxygen Cylinders": '',
          "PPE Kits": '',
          "Medicines": '',
          "Isolation Wards": ''
        });
        
        alert("Resources updated successfully!");
  
        // Refetch the updated chart data
        fetch(`http://127.0.0.1:5000/api/resources?hospital_id=${hospitalId}`) // Ensure the correct backend URL
          .then(response => response.json())
          .then(data => {
            if (data.resources) {
              const formattedChartData = Object.entries(data.resources).map(([key, value]) => ({
                resource: key,
                capacity: value.capacity,
                occupied: value.occupied,
              }));
              setChartData(formattedChartData);
              console.log(formattedChartData);
            }
          });
      })
      .catch(error => console.error("Error updating resources:", error));
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-screen mx-auto">
      <h1 className="text-2xl font-bold text-blue-700 mb-6 text-center">Hospital Resource Availability</h1>
      <div className="flex flex-wrap gap-6">
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>Hospital Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart width={window.innerWidth / 2 - 50} height={500} data={chartData}>
                <CartesianGrid stroke="none" />
                <XAxis dataKey="resource" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="occupied" stackId="a" fill="#82ca9d" radius={[0, 0, 4, 4]} />
                <Bar dataKey="capacity" stackId="a" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </CardContent>
          </Card>
        </div>
        <div className="flex-1">
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[500px] grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ICU Beds</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="number"
                  name="ICU Beds"
                  value={resources["ICU Beds"]}
                  onChange={handleChange}
                  placeholder="Enter number of ICU beds"
                  className="border rounded p-2 w-full"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Non-ICU Beds</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="number"
                  name="Non-ICU Beds"
                  value={resources["Non-ICU Beds"]}
                  onChange={handleChange}
                  placeholder="Enter number of non-ICU beds"
                  className="border rounded p-2 w-full"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Doctors</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="number"
                  name="Doctors"
                  value={resources.Doctors}
                  onChange={handleChange}
                  placeholder="Enter number of Doctors"
                  className="border rounded p-2 w-full"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Nurses</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="number"
                  name="Nurses"
                  value={resources.Nurses}
                  onChange={handleChange}
                  placeholder="Enter number of Nurses"
                  className="border rounded p-2 w-full"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ventilators</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="number"
                  name="Ventilators"
                  value={resources.Ventilators}
                  onChange={handleChange}
                  placeholder="Enter number of Ventilators"
                  className="border rounded p-2 w-full"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ambulances</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="number"
                  name="Ambulances"
                  value={resources.Ambulances}
                  onChange={handleChange}
                  placeholder="Enter number of Ambulances"
                  className="border rounded p-2 w-full"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Oxygen Cylinders</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="number"
                  name="Oxygen Cylinders"
                  value={resources["Oxygen Cylinders"]}
                  onChange={handleChange}
                  placeholder="Enter number of oxygen cylinders"
                  className="border rounded p-2 w-full"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>PPE Kits</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="number"
                  name="PPE Kits"
                  value={resources["PPE Kits"]}
                  onChange={handleChange}
                  placeholder="Enter number of PPE kits"
                  className="border rounded p-2 w-full"
                />
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Medicines</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="text"
                  name="Medicines"
                  value={resources["Medicines"]}
                  onChange={handleChange}
                  placeholder="Enter Medicines"
                  className="border rounded p-2 w-full"
                />
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Isolation Wards</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="number"
                  name="Isolation Wards"
                  value={resources["Isolation Wards"]}
                  onChange={handleChange}
                  placeholder="Enter number of isolation wards"
                  className="border rounded p-2 w-full"
                />
              </CardContent>
            </Card>
            <div className="md:col-span-2">
              <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded">Update Resources</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}