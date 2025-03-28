import pymongo
import joblib
import numpy as np
from xgboost import XGBRegressor

# Connect to MongoDB
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["GoldenPulse"]
collection = db["Accident_reports"]

def predict_and_update():
    xgb_model = joblib.load("xgboost_model.pkl")
    label_encoder = joblib.load("label_encoder.pkl")


    latest_accident = collection.find_one({"cluster": -1}, sort=[("_id", -1)])

    if latest_accident:
        print("\n🚨 New Accident Detected:")
        print(latest_accident)

        accident_type = latest_accident["Accident Type"]
        num_injured = latest_accident["Number of People Injured"]
        if accident_type not in label_encoder.classes_:
            print(f"\n⚠️ Warning: '{accident_type}' is a new category. Assigning default encoding.")
            label_encoder.classes_ = np.append(label_encoder.classes_, accident_type)  # Add new class

        accident_type_encoded = label_encoder.transform([accident_type])[0]

        X_new = np.array([[num_injured, accident_type_encoded]])

    
        predicted_ambulances = int(round(xgb_model.predict(X_new)[0]))

        print(f"\n🚑 Predicted Ambulances Needed: {predicted_ambulances}")


        collection.update_one({"_id": latest_accident["_id"]}, {"$set": {"Number of Ambulances": predicted_ambulances}})

        print("\n✅ Database Updated Successfully!")

    else:
        print("\n✅ No new accident records found.")
