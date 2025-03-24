import React, { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const initialChartData = [
  { resource: "ICU Beds", capacity: 100, occupied: 80 },
  { resource: "Non-ICU Beds", capacity: 200, occupied: 150 },
  { resource: "Doctors", capacity: 50, occupied: 40 },
  { resource: "Nurses", capacity: 100, occupied: 90 },
  { resource: "Ventilators", capacity: 30, occupied: 25 },
  { resource: "Ambulances", capacity: 20, occupied: 15 },
  { resource: "Oxygen Cylinders", capacity: 150, occupied: 120 },
  { resource: "PPE Kits", capacity: 500, occupied: 450 },
  { resource: "Medicines", capacity: 1000, occupied: 800 },
  { resource: "Isolation Wards", capacity: 50, occupied: 45 },
];

export default function Resource() {
  const [resources, setResources] = useState({
    icuBeds: '',
    nonIcuBeds: '',
    doctors: '',
    nurses: '',
    ventilators: '',
    ambulances: '',
    oxygenCylinders: '',
    ppeKits: '',
    medicines: '',
    isolationWards: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setResources({
      ...resources,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission, e.g., send data to the server
    console.log('Resource availability:', resources);
  };

  const chartData = initialChartData.map(data => ({
    ...data,
    occupied: resources[data.resource.toLowerCase().replace(/ /g, '')] || data.occupied,
    available: data.capacity - (resources[data.resource.toLowerCase().replace(/ /g, '')] || data.occupied)
  }));

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-screen mx-auto">
      <h1 className="text-2xl font-bold text-blue-700 mb-6 text-center">Hospital Resource Availability</h1>
      <div className="flex flex-wrap gap-6">
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>Hospital Availability</CardTitle>
              <CardDescription>As of 2025</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart width={window.innerWidth / 2 - 50} height={500} data={chartData}>
                <CartesianGrid stroke="none" />
                <XAxis
                  dataKey="resource"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="occupied"
                  stackId="a"
                  fill="#82ca9d"
                  radius={[0, 0, 4, 4]}
                />
                <Bar
                  dataKey="available"
                  stackId="a"
                  fill="#8884d8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </CardContent>
          </Card>
        </div>
        <div className="flex-1 ">
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[500px] grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ICU Beds</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="number"
                  name="icuBeds"
                  value={resources.icuBeds}
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
                  name="nonIcuBeds"
                  value={resources.nonIcuBeds}
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
                  name="doctors"
                  value={resources.doctors}
                  onChange={handleChange}
                  placeholder="Enter number of doctors"
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
                  name="nurses"
                  value={resources.nurses}
                  onChange={handleChange}
                  placeholder="Enter number of nurses"
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
                  name="ventilators"
                  value={resources.ventilators}
                  onChange={handleChange}
                  placeholder="Enter number of ventilators"
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
                  name="ambulances"
                  value={resources.ambulances}
                  onChange={handleChange}
                  placeholder="Enter number of ambulances"
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
                  name="oxygenCylinders"
                  value={resources.oxygenCylinders}
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
                  name="ppeKits"
                  value={resources.ppeKits}
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
                  name="medicines"
                  value={resources.medicines}
                  onChange={handleChange}
                  placeholder="Enter medicines"
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
                  name="isolationWards"
                  value={resources.isolationWards}
                  onChange={handleChange}
                  placeholder="Enter number of isolation wards"
                  className="border rounded p-2 w-full"
                />
              </CardContent>
            </Card>
            
          </form>
          <div className="md:col-span-2">
              <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded">Update Resources</button>
            </div>
        </div>
      </div>
    </div>
  );
}