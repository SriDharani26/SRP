import os
from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

try:
    client = MongoClient(MONGO_URI)
    db = client["Emergency"]
    reports_collection = db["Reports"]

    test_data = {"test": "MongoDB connection working!"}
    reports_collection.insert_one(test_data)

    print("✅ Connection successful! Test data inserted.")
except Exception as e:
    print(f"❌ Connection failed: {e}")
