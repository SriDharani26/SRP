from pymongo import MongoClient
from sklearn.neighbors import NearestNeighbors
import numpy as np

def fetch_latest_accident_location():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["GoldenPulse"]
    accident_collection = db["Accident_reports"]
    
    latest_accident = accident_collection.find_one(sort=[("_id", -1)])
    
    if latest_accident and latest_accident.get("cluster") == -1:
        return latest_accident["Latitude"], latest_accident["Longitude"], latest_accident["Number of Ambulances"], latest_accident["Accident Type"], latest_accident["Number of People Injured"]
    
    return None, None, None, None, None

def fetch_ambulance_data():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["GoldenPulse"]
    ambulance_collection = db["Ambulance_distribution"]
    
    ambulances = list(ambulance_collection.find({}, {"_id": 0, "Latitude": 1, "Longitude": 1, "Ambulance ID": 1, "Status": 1, "Driver Name": 1, "Driver Contact Number": 1}))
    return ambulances

def find_nearest_ambulances(accident_location, num_ambulances, ambulances):
    if not accident_location or not ambulances or num_ambulances is None:
        return []
    
    ambulance_locations = np.array([(amb["Latitude"], amb["Longitude"]) for amb in ambulances])
    
    knn = NearestNeighbors(n_neighbors=min(num_ambulances, len(ambulances)), algorithm='ball_tree')
    knn.fit(ambulance_locations)
    
    distances, indices = knn.kneighbors([accident_location])
    
    nearest_ambulances = [ambulances[i] for i in indices[0]]
    return nearest_ambulances

def update_ambulance_alerts(nearest_ambulances, accident_info):
    client = MongoClient("mongodb://localhost:27017/")
    db = client["GoldenPulse"]
    ambulance_alerts_collection = db["Ambulance_alerts"]
    
    for ambulance in nearest_ambulances:
        alert_document = {
            "Ambulance ID": ambulance["Ambulance ID"],
            "Status": ambulance["Status"],
            "Driver Name": ambulance["Driver Name"],
            "Driver Contact Number": ambulance["Driver Contact Number"],
            "Accident Type": accident_info["Accident Type"],
            "Number of People Injured": accident_info["Number of People Injured"],
            "Latitude": accident_info["Latitude"],
            "Longitude": accident_info["Longitude"]
        }
        ambulance_alerts_collection.insert_one(alert_document)

if __name__ == "__main__":
    lat, lon, num_ambulances, accident_type, num_injured = fetch_latest_accident_location()
    
    if lat is not None and lon is not None and num_ambulances is not None:
        ambulances = fetch_ambulance_data()
        nearest_ambulances = find_nearest_ambulances((lat, lon), num_ambulances, ambulances)
        
        print("Nearest ambulances:", nearest_ambulances)
        
        if nearest_ambulances:
            accident_info = {
                "Accident Type": accident_type,
                "Number of People Injured": num_injured,
                "Latitude": lat,
                "Longitude": lon
            }
            update_ambulance_alerts(nearest_ambulances, accident_info)
            print("Ambulance alerts updated.")
    else:
        print("No valid accident report found with cluster -1.")
