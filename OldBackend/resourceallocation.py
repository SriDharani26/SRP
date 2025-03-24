import pandas as pd
from pymongo import MongoClient
from sklearn.neighbors import NearestNeighbors
import numpy as np
import json
import requests

client = MongoClient(
    "mongodb+srv://bossbabies2025:xbQoRx1mxajAHer8@cluster0.efkt6.mongodb.net/",
    tlsAllowInvalidCertificates=True
)
db = client["Emergency"]
records_collection = db["Records"]
hospitals_collection = db["Hospitals"]
ambulances_collection = db["Ambulances"]
allocated_resources_collection = db["AllocatedResources"]

def fetch_latest_accident_location():
    latest_record = records_collection.find_one({}, sort=[("_id", -1)])  # Get the latest record
    if latest_record and "latitude" in latest_record and "longitude" in latest_record:
        return float(latest_record["latitude"]), float(latest_record["longitude"])
    raise ValueError("⚠️ No valid accident location found in the database.")

def fetch_hospital_data():
    hospitals = list(hospitals_collection.find({}, {"Latitude": 1, "Longitude": 1, "_id": 0}))  # Fetch only required fields
    if not hospitals:
        raise ValueError("No hospital data found in the database.")

    # Convert values to float to avoid type issues
    return np.array([[float(h["Latitude"]), float(h["Longitude"])] for h in hospitals])

def fetch_ambulance_data():
    ambulances = list(ambulances_collection.find({}, {"Latitude": 1, "Longitude": 1, "_id": 0}))  # Fetch only required fields
    if not ambulances:
        raise ValueError("No ambulance data found in the database.")

    return np.array([[float(a["Latitude"]), float(a["Longitude"])] for a in ambulances])

def find_nearest_hospitals(accident_lat, accident_lng, hospital_coords, k=20):
    nbrs = NearestNeighbors(n_neighbors=min(k, len(hospital_coords)), metric="haversine").fit(np.radians(hospital_coords))
    distances, indices = nbrs.kneighbors(np.radians([[float(accident_lat), float(accident_lng)]]))  # Ensure float conversion
    nearest_hospitals = hospital_coords[indices[0]].tolist()
    return {
        "origin_lat": accident_lat,
        "origin_lng": accident_lng,
        "destinations": nearest_hospitals
    }

def find_nearest_ambulances(accident_lat, accident_lng, ambulance_coords, k=20):
    nbrs = NearestNeighbors(n_neighbors=min(k, len(ambulance_coords)), metric="haversine").fit(np.radians(ambulance_coords))
    distances, indices = nbrs.kneighbors(np.radians([[float(accident_lat), float(accident_lng)]]))  # Ensure float conversion
    nearest_ambulances = ambulance_coords[indices[0]].tolist()
    return {
        "origin_lat": accident_lat,
        "origin_lng": accident_lng,
        "destinations": nearest_ambulances
    }

API_KEY = "AIzaSyBcI4KQ1vlpFTS8ku7pJ4pWkdySbbSEAhI"  # Replace with your actual API key

def get_shortest_travel_time(data):
    try:
        print("🔄 Getting shortest travel time...")

        origin_lat = data["origin_lat"]
        origin_lng = data["origin_lng"]
        destinations = data["destinations"]

        travel_times = []

        for destination in destinations:
            destination_lat, destination_lng = destination

            url = f"https://maps.googleapis.com/maps/api/distancematrix/json?mode=driving&units=metric&origins={origin_lat},{origin_lng}&destinations={destination_lat},{destination_lng}&key={API_KEY}"

            response = requests.get(url)
            data = response.json()

            if data.get("rows") and data["rows"][0]["elements"][0].get("duration"):
                travel_time = data["rows"][0]["elements"][0]["duration"]["value"]  # Time in seconds
                travel_times.append((destination, travel_time))
            else:
                print(f"⚠️ No travel time found for destination: {destination}")

        travel_times.sort(key=lambda x: x[1])
        return travel_times

    except Exception as e:
        print(f" Error: {str(e)}")
        return None

def allocate_resources(nearest_hospitals, nearest_ambulances, required_beds, required_ambulances):
    allocated_resources = {
        "accident_lat": nearest_hospitals["origin_lat"],
        "accident_lng": nearest_hospitals["origin_lng"],
        "allocated_hospitals": [],
        "allocated_ambulances": []
    }

    allocated_beds = 0
    allocated_ambulances = 0

    # Allocate hospitals
    for hospital in nearest_hospitals["destinations"]:
        if allocated_beds >= required_beds:
            break
        hospital_lat, hospital_lng = hospital
        hospital_data = hospitals_collection.find_one({"Latitude": hospital_lat, "Longitude": hospital_lng})
        
        if not hospital_data:
            print(f"⚠️ Hospital at ({hospital_lat}, {hospital_lng}) not found in DB.")
            continue
        
        available_beds = hospital_data.get("Accomodation", 0)
        beds_to_allocate = min(available_beds, required_beds - allocated_beds)
        allocated_beds += beds_to_allocate

        allocated_resources["allocated_hospitals"].append([hospital_lat, hospital_lng])

    # Allocate ambulances (2 persons per ambulance)
    persons_allocated = 0  # Track how many people have been assigned
    for ambulance in nearest_ambulances["destinations"]:
        if persons_allocated >= required_beds:  # Stop if all people are assigned
            break
        ambulance_lat, ambulance_lng = ambulance
        ambulance_data = ambulances_collection.find_one({"Latitude": ambulance_lat, "Longitude": ambulance_lng})

        if not ambulance_data:
            print(f"⚠️ Ambulance at ({ambulance_lat}, {ambulance_lng}) not found in DB.")
            continue

        people_this_ambulance = min(2, required_beds - persons_allocated)  # Max 2 persons per ambulance
        persons_allocated += people_this_ambulance
        allocated_ambulances += 1

        allocated_resources["allocated_ambulances"].append([ambulance_lat, ambulance_lng])

    # Insert into the database
    allocated_resources_collection.insert_one(allocated_resources)
    print("✅ Resources allocated and updated in DB!")




def fetch_requirements():
    latest_record = records_collection.find_one(sort=[("_id", -1)])  # Fetch the latest record
    if not latest_record:
        raise ValueError("No records found in the database.")
    
    requirements = {
        "Number of Emergency Beds": latest_record.get("Number of Emergency Beds", 0),
        "Number of Ambulances": latest_record.get("Number of Ambulances", 0)
    }
    return requirements

try:
    accident_lat, accident_lng = fetch_latest_accident_location()
    hospital_coords = fetch_hospital_data()
    ambulance_coords = fetch_ambulance_data()
    nearest_hospitals = find_nearest_hospitals(accident_lat, accident_lng, hospital_coords)
    nearest_ambulances = find_nearest_ambulances(accident_lat, accident_lng, ambulance_coords)
    
    global shortest_travel_time_hospitals
    global shortest_travel_time_ambulances
    shortest_travel_time_hospitals = get_shortest_travel_time(nearest_hospitals)
    shortest_travel_time_ambulances = get_shortest_travel_time(nearest_ambulances)
    
    requirements = fetch_requirements()
    required_beds = requirements["Number of Emergency Beds"]
    required_ambulances = requirements["Number of Ambulances"]
    
    # Allocate resources
    allocate_resources(nearest_hospitals, nearest_ambulances, required_beds, required_ambulances)

    output_hospitals_json_path = "nearest_hospitals.json"
    with open(output_hospitals_json_path, "w") as json_file:
        json.dump(nearest_hospitals, json_file, indent=4)

    output_ambulances_json_path = "nearest_ambulances.json"
    with open(output_ambulances_json_path, "w") as json_file:
        json.dump(nearest_ambulances, json_file, indent=4)

except ValueError as e:
    print(str(e))

