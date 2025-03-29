from pymongo import MongoClient
from sklearn.neighbors import NearestNeighbors
import numpy as np


def fetch_hospital_data():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["GoldenPulse"]
    hospital_collection = db["Hospital_distribution"]
    
    hospitals = list(hospital_collection.find(
        {
            "$or": [
                {"resources.ICU Beds.capacity": {"$gt": 0}},
                {"resources.Non-ICU Beds.capacity": {"$gt": 0}}
            ]
        },
        {
            "_id": 0,
            "hospital_id": 1,
            "hospital_name": 1,
            "latitude": 1,
            "longitude": 1,
            "resources.ICU Beds": 1,
            "resources.Non-ICU Beds": 1
        }
    ))
    
    return hospitals


def find_nearest_hospitals(ambulance_location):
    hospitals = fetch_hospital_data()
    
    if not ambulance_location or not hospitals:
        return []

    hospital_locations = np.array([(hospital["latitude"], hospital["longitude"]) for hospital in hospitals])

    knn = NearestNeighbors(n_neighbors=min(5, len(hospitals)), algorithm='ball_tree')
    knn.fit(hospital_locations)

    distances, indices = knn.kneighbors([ambulance_location])

    nearest_hospitals = [hospitals[i] for i in indices[0]]
    return nearest_hospitals

        
