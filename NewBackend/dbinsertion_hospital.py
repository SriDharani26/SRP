from pymongo import MongoClient

# MongoDB connection
MONGO_URI = "mongodb://localhost:27017"  # Replace with your MongoDB URI
client = MongoClient(MONGO_URI)
db = client['Hospital']
resources_collection = db['Resources']

# Default data for resources
default_resources = {
    "ICU Beds": {"capacity": 100, "occupied": 80},
    "Non-ICU Beds": {"capacity": 200, "occupied": 150},
    "Doctors": {"capacity": 50, "occupied": 40},
    "Nurses": {"capacity": 100, "occupied": 90},
    "Ventilators": {"capacity": 30, "occupied": 25},
    "Ambulances": {"capacity": 20, "occupied": 15},
    "Oxygen Cylinders": {"capacity": 150, "occupied": 0},
    "PPE Kits": {"capacity": 500, "occupied": 0},
    "Medicines": {"capacity": 1000, "occupied": 0},
    "Isolation Wards": {"capacity": 50, "occupied": 45},
}

# List of hospitals with unique hospital IDs
hospitals = [
    {"hospital_id": "HOSP001", "name": "City Hospital", "Latitude": 13.0204181, "Longitude": 80.2058843},
    {"hospital_id": "HOSP002", "name": "Green Valley Hospital", "Latitude": 13.0294519, "Longitude": 80.2135628},
    {"hospital_id": "HOSP003", "name": "Sunrise Medical Center", "Latitude": 13.0294519, "Longitude": 80.2135628},
    {"hospital_id": "HOSP004", "name": "Lakeside Hospital", "Latitude": 13.0162394, "Longitude": 80.2112453},
    {"hospital_id": "HOSP005", "name": "Mountain View Hospital", "Latitude": 13.0058417, "Longitude": 80.2347054},
]

# Clear the collection
resources_collection.delete_many({})  # Deletes all existing documents
print("Existing data cleared.")

# Insert resources for each hospital
for hospital in hospitals:
    hospital_data = {
        "hospital_id": hospital["hospital_id"],
        "hospital_name": hospital["name"],
        "latitude": hospital["Latitude"],
        "longitude": hospital["Longitude"],
        "resources": default_resources  # Store all resources in a single document
    }
    
    resources_collection.insert_one(hospital_data)
    print(f"Resources inserted for {hospital['name']} (ID: {hospital['hospital_id']}).")

print("All hospitals' resources inserted successfully.")