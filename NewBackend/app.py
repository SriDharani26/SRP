from flask import Flask,request,jsonify
from flask_cors import CORS

import os
import logging
from dotenv import load_dotenv
from pymongo import MongoClient
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, CallbackContext
import threading




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

@app.route('/nearest_hospital', methods=['GET'])
def nearest_hospital():
    return jsonify({"hospital_name": "City General Hospital"}), 200


decrease_capacity_resources = {"Oxygen Cylinders", "PPE Kits", "Medicines"}
@app.route('/api/resources/update', methods=['POST'])
def update_resources():
    try:
        db = client['Hospital']
        resources_collection = db['Resources']
        data = request.json
        print("Received data:", data)

        # Validate input
        if not data or "hospital_id" not in data:
            return jsonify({"error": "hospital_id is required"}), 400

        hospital_id = data["hospital_id"]
        resources = data.get("resources", {})

        if not resources:
            return jsonify({"error": "No resources provided"}), 400

        # Iterate through the fields and update the database
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
            if resource in decrease_capacity_resources:
                # Decrease `capacity` for specific resources
                resources_collection.update_one(
                    {"hospital_id": hospital_id, "resource": resource},
                    {"$set": {"capacity": value}},  # Update the capacity
                    upsert=True  # Create the document if it doesn't exist
                )
            else:
                # Decrease `occupied` for other resources and increase `capacity`
                resources_collection.update_one(
                    {"hospital_id": hospital_id, "resource": resource},
                    {
                        "$inc": {
                            "occupied": -value,  # Decrease the occupied count
                            "capacity": value    # Increase the capacity
                        }
                    },
                    upsert=True  # Create the document if it doesn't exist
                )

        return jsonify({"message": f"Resources updated successfully for hospital_id {hospital_id}"}), 200

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/api/resources', methods=['GET'])
def get_resources():
    hospital_collection = db["Resources"]
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