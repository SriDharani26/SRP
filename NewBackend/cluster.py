import pandas as pd
import numpy as np
from pymongo import MongoClient
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import DBSCAN
from sklearn.metrics import silhouette_score, calinski_harabasz_score, davies_bouldin_score
import matplotlib.pyplot as plt
import seaborn as sns
from bson.objectid import ObjectId

# MongoDB Connection
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "GoldenPulse"
COLLECTION_NAME = "Accident_reports"


def fetch_last_30_min_records():
    """Fetch accident records from MongoDB from the last 30 minutes using ObjectId timestamps."""
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    # Calculate the timestamp for 30 minutes ago
    time_threshold = datetime.utcnow() - timedelta(minutes=30)
    min_object_id = ObjectId.from_datetime(time_threshold)

    # Fetch documents from the last 30 minutes
    query = {"_id": {"$gte": min_object_id}}
    records = list(collection.find(query, {"_id": 1, "Accident Type": 1, "Number of People Injured": 1, "Latitude": 1, "Longitude": 1}))

    if not records:
        print("No accident records found in the last 30 minutes.")
        return None

    df = pd.DataFrame(records)
    return df


def cluster_accidents(df, eps, min_samples):
    """Apply DBSCAN clustering on the accident dataset."""
    if df is None or df.empty:
        print("No data available for clustering.")
        return None

    features = ["Accident Type", "Number of People Injured", "Latitude", "Longitude"]
    df_clustering = df[features].copy()

    # Encoding categorical feature "Accident Type"
    label_encoder = LabelEncoder()
    df_clustering["Accident Type"] = label_encoder.fit_transform(df_clustering["Accident Type"])

    # Scaling data
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_clustering)

    # Apply DBSCAN clustering
    dbscan = DBSCAN(eps=eps, min_samples=min_samples)
    clusters = dbscan.fit_predict(X_scaled)

    # Assign cluster labels
    df["cluster"] = clusters

    # Evaluate clustering performance
    valid_clusters = clusters != -1
    if len(np.unique(clusters[valid_clusters])) > 1:
        silhouette_avg = silhouette_score(X_scaled[valid_clusters], clusters[valid_clusters])
        calinski_avg = calinski_harabasz_score(X_scaled[valid_clusters], clusters[valid_clusters])
        davies_avg = davies_bouldin_score(X_scaled[valid_clusters], clusters[valid_clusters])

        print(f"Silhouette Score: {silhouette_avg:.3f}")
        print(f"Calinski-Harabasz Score: {calinski_avg:.3f}")
        print(f"Davies-Bouldin Score: {davies_avg:.3f}")

    n_clusters = len(set(clusters)) - (1 if -1 in clusters else 0)
    n_noise = list(clusters).count(-1)
    print(f"Number of clusters: {n_clusters}")
    print(f"Number of noise points: {n_noise}")

    return df


def update_most_recent_cluster(df_clustered):
    """Update the cluster value for the most recent document in MongoDB."""
    if df_clustered is None or df_clustered.empty:
        print("No clustered data to update in MongoDB.")
        return

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    # Get the most recent document based on _id (sorted in descending order)
    most_recent_doc = df_clustered.sort_values("_id", ascending=False).iloc[0]

    most_recent_id = most_recent_doc["_id"]
    most_recent_cluster = int(most_recent_doc["cluster"])

    # Update the document in MongoDB
    collection.update_one({"_id": most_recent_id}, {"$set": {"cluster": most_recent_cluster}})
    print(most_recent_id)



def visualize_clusters(df_clustered):
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


if __name__ == "__main__":
    df_accidents = fetch_last_30_min_records()
    df_clustered = cluster_accidents(df_accidents, eps=0.5, min_samples=2)

    if df_clustered is not None:
        print(f"Total documents fetched: {len(df_accidents)}")
        update_most_recent_cluster(df_clustered)
        visualize_clusters(df_clustered)
