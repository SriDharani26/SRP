from flask import Flask,request,jsonify
from flask_cors import CORS

import os
from dotenv import load_dotenv
from pymongo import MongoClient


from sklearn.neighbors import NearestNeighbors
import numpy as np


load_dotenv()
app = Flask(__name__)
CORS(app)


MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)

@app.route('/')
def home():
    return "Brotatoes for the win!"


@app.route('/ambulance_alert')
def getAlert():
    try:
        db = client['GoldenPulse']
        accident_collection = db['Ambulance_alerts']
        
        # Fetch all accidents related to the given Ambulance ID
        accidents = list(accident_collection.find(
            {"Ambulance ID": "A016"}, 
            {"_id": 0, "Accident Type": 1, "Number of People Injured": 1, "Latitude": 1, "Longitude": 1}
        ))
        
        print("Accidents:", accidents)

        if accidents:
            return jsonify({"Accidents": accidents}), 200
        else:
            return jsonify({"Accidents": "No recent accidents found."}), 200

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/request_accept', methods=['POST'])
def accept_alert():
    data = request.json
    ambulance_id = data.get("ambulance_id")
    return jsonify({"message": f"Ambulance {ambulance_id} accepted the alert"}), 200

@app.route('/request_decline', methods=['POST'])
def decline_alert():
    data = request.json
    ambulance_id = data.get("ambulance_id")
    return jsonify({"message": f"Ambulance {ambulance_id} declined the alert"}), 200




def fetch_hospital_data():
    
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

@app.route('/nearest_hospital', methods=['POST'])  # Use POST since we are sending JSON data
def find_nearest_hospitals():
    try:
        data = request.get_json()  # Correct way to parse incoming JSON
        if not data or "Latitude" not in data or "Longitude" not in data:
            return jsonify({"error": "Missing latitude or longitude"}), 400

        ambulance_location = (data["Latitude"], data["Longitude"])
        print("Received ambulance location:", ambulance_location)

        hospitals = fetch_hospital_data()
        if not hospitals:
            return jsonify({"message": "No hospitals with available beds found"}), 404

        # Extract hospital locations
        hospital_locations = np.array([(h["latitude"], h["longitude"]) for h in hospitals])

        # Use KNN to find the 5 nearest hospitals
        knn = NearestNeighbors(n_neighbors=min(5, len(hospitals)), algorithm='ball_tree')
        knn.fit(hospital_locations)

        distances, indices = knn.kneighbors([ambulance_location])

        nearest_hospitals = [hospitals[i] for i in indices[0]]

        return jsonify({"nearest_hospitals": nearest_hospitals}), 200

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500


DECREASE_CAPACITY_RESOURCES = {"Oxygen Cylinders", "PPE Kits", "Medicines"}
@app.route('/api/resources/update', methods=['POST'])
def update_resources():
    try:
        db = client["GoldenPulse"]
        hospital_collection = db["Hospital_distribution"]
        data = request.json
        print("Received data:", data)

        # Validate input
        if not data or "hospital_id" not in data:
            return jsonify({"error": "hospital_id is required"}), 400

        hospital_id = data["hospital_id"]
        resources = data.get("resources", {})

        if not resources:
            return jsonify({"error": "No resources provided"}), 400

        # Fetch the hospital document
        hospital = hospital_collection.find_one({"hospital_id": hospital_id})
        if not hospital:
            return jsonify({"error": "Hospital not found"}), 404

        # Iterate through the resources and update them
        update_fields = {}
        for resource, value in resources.items():
            if value == '':
                continue

            try:
                value = int(value)
            except ValueError:
                return jsonify({"error": f"Invalid value for {resource}. Must be a positive integer."}), 400

            if value < 0:
                return jsonify({"error": f"Invalid value for {resource}. Must be a positive integer."}), 400

            # Determine whether to decrease `occupied` or `capacity`
            if resource in DECREASE_CAPACITY_RESOURCES:
                # Decrease `capacity` for specified resources
                update_fields[f"resources.{resource}.capacity"] = value
            else:
                # Decrease `occupied` for other resources and increase `capacity`
                update_fields[f"resources.{resource}.occupied"] = max(0, hospital["resources"].get(resource, {}).get("occupied", 0) - value)
                update_fields[f"resources.{resource}.capacity"] = hospital["resources"].get(resource, {}).get("capacity", 0) + value

        # Update the document
        hospital_collection.update_one(
            {"hospital_id": hospital_id},
            {"$set": update_fields}
        )

        return jsonify({"message": f"Resources updated successfully for hospital_id {hospital_id}"}), 200

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500


@app.route('/api/resources', methods=['GET'])
def get_resources():
    db = client['GoldenPulse']
    hospital_collection = db["Hospital_distribution"]
    try:
        hospital_id = request.args.get('hospital_id')
        if not hospital_id:
            return jsonify({"error": "hospital_id is required"}), 400

        hospital = hospital_collection.find_one({"hospital_id": hospital_id}, {"_id": 0})

        if not hospital:
            return jsonify({"error": "Hospital not found"}), 404

        return jsonify(hospital), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    
    app.config['DEBUG'] = True
    app.run(host='0.0.0.0', port=5000)