import os
import logging
from dotenv import load_dotenv
from pymongo import MongoClient
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, CallbackContext

from sklearn.neighbors import NearestNeighbors
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import DBSCAN
from sklearn.metrics import silhouette_score, calinski_harabasz_score, davies_bouldin_score
import matplotlib.pyplot as plt
import seaborn as sns
from bson.objectid import ObjectId

import joblib
from xgboost import XGBRegressor

# Load environment variables from .env file
load_dotenv()

# Get Telegram Bot Token and MongoDB URI
BOT_TOKEN = os.getenv("BOT_TOKEN")
MONGO_URI = os.getenv("MONGO_URI")

# Set up MongoDB connection
client = MongoClient(MONGO_URI)

db = client['GoldenPulse'] 
reports_collection = db['Accident_reports']


# Enable logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Dictionary to store user reports and state
user_reports = {}
user_state = {}

# Emergency Type Options with Buttons
EMERGENCY_TYPES = [
    [InlineKeyboardButton("🚗 Road Accident", callback_data="emergency_Road Accident"),
     InlineKeyboardButton("🔥 Fire", callback_data="emergency_Fire")],
    [InlineKeyboardButton("🏥 Medical", callback_data="emergency_Medical Emergency"),
     InlineKeyboardButton("🚨 Crime", callback_data="emergency_Crime Report")]
]

# Injury Count Options with Buttons
INJURY_RANGES = [
    [InlineKeyboardButton("1-5", callback_data="injured_1-5"),
     InlineKeyboardButton("6-10", callback_data="injured_6-10")],
    [InlineKeyboardButton("11-20", callback_data="injured_11-20"),
     InlineKeyboardButton("More than 20", callback_data="injured_More than 20")]
]
# Convert "1-5" to an estimated integer (midpoint value)
injured_map = {
    "1-5": 3,
    "6-10": 8,
    "11-20": 15,
    "More than 20": 25  # Assume 25 for this category
}



# Persistent Keyboard Button
persistent_keyboard = ReplyKeyboardMarkup(
    [[KeyboardButton("🚨 Report Emergency")]],
    resize_keyboard=True
)

async def start(update: Update, context: CallbackContext):
    """Send the persistent button for reporting an emergency."""
    await update.message.reply_text(
        "👋 Welcome! Click the button below to report an emergency anytime.",
        reply_markup=persistent_keyboard
    )

async def report_emergency(update: Update, context: CallbackContext):
    """Initiate the emergency reporting process by asking for the type first."""
    user_id = update.message.chat_id
    user_state[user_id] = "waiting_for_emergency"

    emergency_keyboard = InlineKeyboardMarkup(EMERGENCY_TYPES)
    await update.message.reply_text("🚨 Please select the type of emergency:", reply_markup=emergency_keyboard)

async def handle_button_click(update: Update, context: CallbackContext):
    """Handle inline button clicks for emergency type and injury count."""
    query = update.callback_query
    user_id = query.message.chat_id
    query.answer()  # Acknowledge button click

    data = query.data.split("_")
    category, value = data[0], data[1]

    if user_id not in user_reports:
        user_reports[user_id] = {}

    # Handle emergency type selection first
    if category == "emergency" and user_state.get(user_id) == "waiting_for_emergency":
        user_reports[user_id]["emergency"] = value
        user_state[user_id] = "waiting_for_injured"

        injury_keyboard = InlineKeyboardMarkup(INJURY_RANGES)
        await query.message.reply_text("🚑 How many people are injured?", reply_markup=injury_keyboard)

    # Handle injured count selection only after emergency type has been selected
    elif category == "injured" and user_state.get(user_id) == "waiting_for_injured":
        user_reports[user_id]["injured"] = value
        user_state[user_id] = "waiting_for_location"

        keyboard = [[KeyboardButton("📍 Share Location", request_location=True)]]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)

        await query.message.reply_text(
            f"✅ **Emergency Type:** {user_reports[user_id]['emergency']}\n"
            f"🩺 **Injured Count:** {user_reports[user_id]['injured']}\n\n"
            "📍 Now, please share your location.", 
            reply_markup=reply_markup
        )
async def location(update: Update, context: CallbackContext):
    """Fetch and store user's location, then insert into MongoDB."""
    user_id = update.message.chat_id

    if user_state.get(user_id) == "waiting_for_location":
        user_location = update.message.location
        latitude, longitude = user_location.latitude, user_location.longitude

            
        injured_count_value = injured_map.get(user_reports[user_id]["injured"], 0)  

        
        
        emergency_report = {
            "user_id": user_id,
            "Accident Type": user_reports[user_id]["emergency"],
            "Number of People Injured": injured_count_value,
            "Latitude": latitude,
            "Longitude": longitude
        }

        try:
            result = reports_collection.insert_one(emergency_report)
            logger.info(f"✅ Data inserted: {result.inserted_id}")
            
            await doclustering()
            
            await update.message.reply_text(
                "✅ Emergency report submitted successfully!\n"
                "You can report another emergency by clicking the button below.",
                reply_markup=persistent_keyboard  
            )

            user_state.pop(user_id, None)
            user_reports.pop(user_id, None)

        except Exception as e:
            logger.error(f"❌ Error inserting data: {e}")
            await update.message.reply_text("❌ Failed to submit report. Try again.")
            



async def fetch_last_30_min_records():
    """Fetch accident records from MongoDB from the last 30 minutes using ObjectId timestamps."""
    print("1 check point")
 
    collection = reports_collection

    # Calculate the timestamp for 30 minutes ago
    time_threshold = datetime.utcnow() - timedelta(minutes=30)
    min_object_id = ObjectId.from_datetime(time_threshold)

    # Fetch documents from the last 30 minutes
    query = {"_id": {"$gte": min_object_id}}
    records = list(collection.find(query, {"_id": 1, "Accident Type": 1, "Number of People Injured": 1, "Latitude": 1, "Longitude": 1}))
    print("records fetched")
    if not records:
        print("No accident records found in the last 30 minutes.")
        return None


    df = pd.DataFrame(records)
    return df


async def cluster_accidents(df, eps, min_samples):
    """Apply DBSCAN clustering on the accident dataset."""
    print("2 check point")
    if df is None or df.empty:
        print("No data available for clustering.")
        return None

    features = ["Accident Type", "Number of People Injured", "Latitude", "Longitude"]
    # Check if expected columns are present
    print(f"Columns in DataFrame: {df.columns}")

    if not all(col in df.columns for col in features):
        print("❌ Missing required columns in the DataFrame!")
        return None
    
    df_clustering = df[features].copy()

    # Encoding categorical feature "Accident Type"
    
    label_encoder = LabelEncoder()
    df_clustering["Accident Type"] = label_encoder.fit_transform(df_clustering["Accident Type"])
    print(f"After cleaning, DataFrame size: {df_clustering.shape}")
    print("2.1")
    # Scaling data
    try:
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(df_clustering)
        print("2.2 Scaling successful!")
    except Exception as e:
        print(f"❌ Error in scaling: {e}")
        return None
    
    print("2.3")
    # Apply DBSCAN clustering
    dbscan = DBSCAN(eps=eps, min_samples=min_samples)
    clusters = dbscan.fit_predict(X_scaled)

    # Assign cluster labels
    df["cluster"] = clusters
    
    print("2.4")
    # Evaluate clustering performance
    valid_clusters = clusters != -1
    if len(np.unique(clusters[valid_clusters])) > 1:
        silhouette_avg = silhouette_score(X_scaled[valid_clusters], clusters[valid_clusters])
        calinski_avg = calinski_harabasz_score(X_scaled[valid_clusters], clusters[valid_clusters])
        davies_avg = davies_bouldin_score(X_scaled[valid_clusters], clusters[valid_clusters])

        print(f"Silhouette Score: {silhouette_avg:.3f}")
        print(f"Calinski-Harabasz Score: {calinski_avg:.3f}")
        print(f"Davies-Bouldin Score: {davies_avg:.3f}")

    print("2.5")
    n_clusters = len(set(clusters)) - (1 if -1 in clusters else 0)
    n_noise = list(clusters).count(-1)
    print(f"Number of clusters: {n_clusters}")
    print(f"Number of noise points: {n_noise}")

    return df


async def update_most_recent_cluster(df_clustered):
    print("3 check point")
    """Update the cluster value for the most recent document in MongoDB."""
    if df_clustered is None or df_clustered.empty:
        print("No clustered data to update in MongoDB.")
        return
    
    collection = reports_collection

    # Get the most recent document based on _id (sorted in descending order)
    most_recent_doc = df_clustered.sort_values("_id", ascending=False).iloc[0]

    most_recent_id = most_recent_doc["_id"]
    most_recent_cluster = int(most_recent_doc["cluster"])

    # Update the document in MongoDB
    collection.update_one({"_id": most_recent_id}, {"$set": {"cluster": most_recent_cluster}})
    print(most_recent_id)



async def visualize_clusters(df_clustered):
    print("4 check point")
    """Visualize DBSCAN clustering results."""
    if df_clustered is None or df_clustered.empty:
        print("No clustered data available for visualization.")
        return

    plt.figure(figsize=(10, 6))

    sns.scatterplot(x=df_clustered["Longitude"], y=df_clustered["Latitude"], hue=df_clustered["cluster"],
                    palette="viridis", s=60, marker="o", edgecolor="black")

    sns.scatterplot(x=df_clustered[df_clustered["cluster"] == -1]["Longitude"], 
                    y=df_clustered[df_clustered["cluster"] == -1]["Latitude"],
                    color='red', label="Noise", s=100, marker="X", edgecolor="black")

    plt.title("Clustering of Accident Reports", fontsize=14)
    plt.xlabel("Longitude", fontsize=12)
    plt.ylabel("Latitude", fontsize=12)
    plt.legend(title="Clusters")

    plt.grid(True)
    plt.show()


async def doclustering():
    df_accidents = await fetch_last_30_min_records()

    
    if df_accidents is not None and not df_accidents.empty:
        df_clustered = await cluster_accidents(df_accidents, eps=0.5, min_samples=2)

        if df_clustered is not None:
            print(f"Total documents fetched: {len(df_accidents)}")
            await update_most_recent_cluster(df_clustered)
            await visualize_clusters(df_clustered)
            await predict_and_update()
            await nearest_ambulance()
    else:
        print("No accident records found in the last 30 minutes.")


async def predict_and_update():
    
    collection=reports_collection
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



async def fetch_latest_accident_location():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["GoldenPulse"]
    accident_collection = db["Accident_reports"]
    
    latest_accident = accident_collection.find_one(sort=[("_id", -1)])
    
    if latest_accident and latest_accident.get("cluster") == -1:
        return latest_accident["Latitude"], latest_accident["Longitude"], latest_accident["Number of Ambulances"], latest_accident["Accident Type"], latest_accident["Number of People Injured"]
    
    return None, None, None, None, None

async def fetch_ambulance_data():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["GoldenPulse"]
    ambulance_collection = db["Ambulance_distribution"]
    
    ambulances = list(ambulance_collection.find( {"Status": "Available"}, {"_id": 0, "Latitude": 1, "Longitude": 1, "Ambulance ID": 1, "Status": 1, "Driver Name": 1, "Driver Contact Number": 1}))
    return ambulances

async def find_nearest_ambulances(accident_location, num_ambulances, ambulances):
    if not accident_location or not ambulances or num_ambulances is None:
        return []
    
    ambulance_locations = np.array([(amb["Latitude"], amb["Longitude"]) for amb in ambulances])
    
    knn = NearestNeighbors(n_neighbors=min(num_ambulances, len(ambulances)), algorithm='ball_tree')
    knn.fit(ambulance_locations)
    
    distances, indices = knn.kneighbors([accident_location])
    
    nearest_ambulances = [ambulances[i] for i in indices[0]]
    return nearest_ambulances

async def update_ambulance_alerts(nearest_ambulances, accident_info):
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


async def nearest_ambulance():
    lat, lon, num_ambulances, accident_type, num_injured = await fetch_latest_accident_location()
    
    if lat is not None and lon is not None and num_ambulances is not None:
        ambulances = await fetch_ambulance_data()
        nearest_ambulances = await find_nearest_ambulances((lat, lon), num_ambulances, ambulances)
        
        print("Nearest ambulances:", nearest_ambulances)
        
        if nearest_ambulances:
            accident_info = {
                "Accident Type": accident_type,
                "Number of People Injured": num_injured,
                "Latitude": lat,
                "Longitude": lon
            }
            await update_ambulance_alerts(nearest_ambulances, accident_info)
            print("Ambulance alerts updated.")
    else:
        print("No valid accident report found with cluster -1.")


def main():
    """Start the bot."""
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.Regex("^🚨 Report Emergency$"), report_emergency))
    app.add_handler(CallbackQueryHandler(handle_button_click))
    app.add_handler(MessageHandler(filters.LOCATION, location))

    app.run_polling()

if __name__ == "__main__":
    main()
