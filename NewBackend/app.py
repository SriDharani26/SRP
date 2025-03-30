from flask import Flask,request,jsonify
from flask_cors import CORS

import os
from dotenv import load_dotenv
from pymongo import MongoClient


from sklearn.neighbors import NearestNeighbors
import numpy as np

from flask_socketio import SocketIO, emit
import time

load_dotenv()
app = Flask(__name__)
CORS(app)


MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db= client['GoldenPulse']
socketio = SocketIO(app, cors_allowed_origins="*")

# Ensure collections exist
if "Ambulance_Locations" not in db.list_collection_names():
    db.create_collection("Ambulance_Locations")
if "Ambulance_Reports" not in db.list_collection_names():
    db.create_collection("Ambulance_Reports")


@app.route('/')
def home():
    return "Brotatoes for the win!"


live_locations = {}
@socketio.on('connect')
def handle_connect():
    print("Client connected")

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected")

@socketio.on('update_location')
def handle_update_location(data):
    """
    Handles live location updates from the ambulance driver.
    """
    try:
        print("update_location event received:", data)  # Log the received data

        ambulance_id = data.get('ambulance_id')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        hospid = data.get('hospid')

        if not ambulance_id or latitude is None or longitude is None or not hospid:
            emit('error', {'message': 'Invalid data received'})
            return

        # Log the received live location
        print(f"Received live location for Ambulance {ambulance_id}: Latitude={latitude}, Longitude={longitude}, HospID={hospid}")

        # Update in-memory live location
        live_locations[ambulance_id] = {
            'ambulance_id': ambulance_id,
            'latitude': latitude,
            'longitude': longitude,
            'hospid': hospid,
            'timestamp': time.time()
        }

        # Update the database with the live location
        try:
            db.Ambulance_Locations.update_one(
                {'ambulance_id': ambulance_id},
                {'$set': {
                    'latitude': latitude,
                    'longitude': longitude,
                    'hospid': hospid,
                    'timestamp': time.time()
                }},
                upsert=True
            )
            print(f"Database updated for Ambulance {ambulance_id}")
        except Exception as db_error:
            print(f"Error updating database for Ambulance {ambulance_id}: {db_error}")

        # Broadcast the live location to all connected clients
        emit('location_update', live_locations[ambulance_id], broadcast=True)
        print(f"Location update broadcasted: {live_locations[ambulance_id]}")
    except Exception as e:
        print("Error in update_location:", e)
        emit('error', {'message': str(e)})        


@socketio.on('stop_tracking')
def handle_stop_tracking(data):
    """
    Stops tracking the ambulance when it reaches the destination.
    """
    try:
        ambulance_id = data.get('ambulance_id')
        if ambulance_id in live_locations:
            del live_locations[ambulance_id]
            db.Ambulance_Locations.delete_one({'ambulance_id': ambulance_id})
            emit('tracking_stopped', {'ambulance_id': ambulance_id}, broadcast=True)
    except Exception as e:
        print("Error in stop_tracking:", e)
        emit('error', {'message': str(e)})



@app.route('/ambulance_alert')
def getAlert():
    try:
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
    
    
# await db.post(`request_decline`, {
#         ambulance_id: "A020",
#       });
# ambulnce id is shared through the params

@app.route('/request_accept', methods=['POST'])
def accept_alert():
    data = request.json
    ambulance_id = data.get("ambulance_id")

    if not ambulance_id:
        return jsonify({"error": "Ambulance ID is required"}), 400

    # Remove ambulance record from Ambulance_alerts collection
    db.Ambulance_alerts.delete_one({"Ambulance ID": ambulance_id})

    # Update ambulance status to "On Duty" in Ambulance_distribution
    db.Ambulance_distribution.update_one(
        {"Ambulance ID": ambulance_id},
        {"$set": {"Status": "On Duty"}}
    )

    # Fetch the most recent accident from Accident_reports
    recent_accident = db.Accident_reports.find_one(
        {}, sort=[("timestamp", -1)]
    )

    if recent_accident:
        accident_id = recent_accident.get("_id")

        # Append ambulance_id to the accident report (ensure it's stored as an array)
        db.Accident_reports.update_one(
            {"_id": accident_id},
            {"$addToSet": {"Ambulances": ambulance_id}}  # Prevent duplicates
        )

    return jsonify({"message": f"Ambulance {ambulance_id} accepted the alert and updated records"}), 200



@app.route('/request_decline', methods=['POST'])
def decline_alert():
    data = request.json
    ambulance_id = data.get("ambulance_id")
    if not ambulance_id:
        return jsonify({"error": "Ambulance ID is required"}), 400

    # Remove ambulance record from Ambulance_alerts collection
    db.Ambulance_alerts.delete_one({"ambulance_id": ambulance_id})

    # Update ambulance status to "Unavailable" in Ambulance_distribution
    db.Ambulance_distribution.update_one(
        {"ambulance_id": ambulance_id},
        {"$set": {"status": "Unavailable"}}
    )
    return jsonify({"message": f"Ambulance {ambulance_id} declined the alert"}), 200


@app.route('/opting_icu', methods=['POST'])
def opting_icubeds():
    data = request.json
    hospital_id = data.get("hospital_id")
    ambulance_id = data.get("ambulance_id")
    request_type = "ICU Beds"  # Should be either "ICU" or "Non-ICU"

    # Add the ambulance request to Hospital_alerts
    db.Hospital_alerts.update_one(
        {"hospital_id": hospital_id},
        {"$addToSet": {"ambulances": {"ambulance_id": ambulance_id, "request_type": request_type}}},
        upsert=True  # Create document if hospital_id doesn't exist
    )

    bed_field = "ICU Beds"

    # Reduce the hospital's available resource count
    db.Hospital_distribution.update_one(
        {"hospital_id": hospital_id},
        {"$inc": {bed_field: -1}}  # Decrease the count by 1
    )
    return jsonify({"message": "got that"}), 200

@app.route('/opting_general')
def opting_generalbeds():
    data = request.json
    hospital_id = data.get("hospital_id")
    ambulance_id = data.get("ambulance_id")
    request_type = "Non-ICU Beds"  # Should be either "ICU" or "Non-ICU"

    # Add the ambulance request to Hospital_alerts
    db.Hospital_alerts.update_one(
        {"hospital_id": hospital_id},
        {"$addToSet": {"ambulances": {"ambulance_id": ambulance_id, "request_type": request_type}}},
        upsert=True  # Create document if hospital_id doesn't exist
    )

    bed_field = "Non-ICU Beds"

    # Reduce the hospital's available resource count
    db.Hospital_distribution.update_one(
        {"hospital_id": hospital_id},
        {"$inc": {bed_field: -1}}  # Decrease the count by 1
    )
    return jsonify({"message": "got that"}), 200


@socketio.on('submit_report')
def handle_submit_report(data):
    """
    Handles the submission of a patient report.
    """
    try:
        ambulance_id = data.get('ambulance_id')
        hospid = data.get('hospid')
        severity = data.get('severity')
        icu_needed = data.get('icuNeeded')
        comments = data.get('comments')

        if not ambulance_id or not hospid or not severity or icu_needed is None:
            emit('error', {'message': 'Invalid report data'})
            return

        # Prepare the report data
        report = {
            'ambulance_id': ambulance_id,
            'hospid': hospid,
            'severity': severity,
            'icu_needed': icu_needed,
            'comments': comments,
            'timestamp': time.time(),
        }

        # Update the report in the database or insert if it doesn't exist
        result = db.Ambulance_Reports.update_one(
            {'ambulance_id': ambulance_id, 'hospid': hospid},  # Match by ambulance_id and hospid
            {'$set': report},  # Overwrite the existing record with the new data
            upsert=True  # Create a new record if no match is found
        )

        # Log the operation
        if result.matched_count > 0:
            print(f"Report updated for Ambulance {ambulance_id} and Hospital {hospid}")
        else:
            print(f"New report created for Ambulance {ambulance_id} and Hospital {hospid}")

        # Broadcast the report to all connected hospital interfaces
        report['_id'] = str(result.upserted_id) if result.upserted_id else None  # Convert ObjectId to string if a new record was created
        emit('new_report', report, broadcast=True)
    except Exception as e:
        print("Error in handle_submit_report:", e)
        emit('error', {'message': str(e)})

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

@app.route('/nearest_hospital', methods=['GET'])  
def find_nearest_hospitals():
    try:
        latitude = float(request.args.get('latitude'))
        longitude = float(request.args.get('longitude'))
        if latitude is None or longitude is None:
            return jsonify({"error": "Latitude and Longitude are required"}), 400

        ambulance_location = (latitude, longitude)
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
        print(resources.items())
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
    

   socketio.run(app, host='0.0.0.0', port=5000 , debug=True)
    # app.run(debug=True)