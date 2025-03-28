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
    return jsonify({"success": "Ambulance Alert Sent!"})


decrease_capacity_resources = {"Oxygen Cylinders", "PPE Kits", "Medicines"}
@app.route('/api/resources/update', methods=['POST'])
def update_resources():
    try:
        db = client['Hospital']
        resources_collection = db['Resources']
        data = request.json
        print("Received data:", data)  

        if not data:
            return jsonify({"error": "No data provided"}), 400

       
        for resource, value in data.items():
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
                    {"resource": resource},
                    {"$set": {"capacity": value}},  # Decrease the capacity
                    upsert=True  # Create the document if it doesn't exist
                )
            else:
                # Decrease `occupied` for other resources and increase `capacity`
                resources_collection.update_one(
                    {"resource": resource},
                    {
                        "$inc": {
                            "occupied": -value,  # Decrease the occupied count
                            "capacity": value    # Increase the capacity
                        }
                    },
                    upsert=True  # Create the document if it doesn't exist
                )

        return jsonify({"message": "Resources updated successfully"}), 200

    except Exception as e:
        print("Error:", e)  
        return jsonify({"error": str(e)}), 500

@app.route('/api/resources', methods=['GET'])
def get_resources():
    try:
        db = client['Hospital']
        resources_collection = db['Resources']
        resources = list(resources_collection.find({}, {"_id": 0}))  # Exclude the `_id` field
        print("Fetched resources:", resources)  
        return jsonify(resources), 200
    except Exception as e:
        print("Error:", e)  
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    
    app.config['DEBUG'] = True
    app.run(host='0.0.0.0', port=5000)