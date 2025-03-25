# import os
# from dotenv import load_dotenv
# from pymongo import MongoClient

# load_dotenv()


# MONGO= os.getenv('MONGO_URI')
# if not MONGO:
#     raise ValueError("No MongoDB connection string found in environment variables")

# try:
#     client = MongoClient(MONGO)
#     print(client)
#     db = client["Emergency"]
#     reports_collection = db["Reports"]

#     test_data = {"test": "MongoDB connection working!"}
#     reports_collection.insert_one(test_data)
#     for doc in reports_collection.find():
#         print(doc)
 
#     print("✅ Connection successful! Test data inserted.")
# except Exception as e:
#     print(f"❌ Connection failed: {e}")


from pymongo import MongoClient

uri="mongodb+srv://bossbabies2025:znf82w0IsGE796ZK@cluster0.abark.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(uri, serverSelectionTimeoutMS=50000)

try:
    print(client.server_info())  # Test connection
    print("✅ Connection Successful!")
except Exception as e:
    print("❌ Connection Failed:", e)
