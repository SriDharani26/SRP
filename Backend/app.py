from flask import Flask, request, jsonify
from flask_cors import CORS 
import os
from word2number import w2n 
import speech_recognition as sr
from flask import Flask, request, jsonify
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import ObjectId
from datetime import datetime
import threading
import time
import numpy as np
from datetime import datetime
import speech_recognition as sr
import spacy
from pydub import AudioSegment
import threading
load_dotenv()
import joblib

API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')
app = Flask(__name__)
CORS(app)  

UPLOAD_FOLDER = './uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

mongo_connection_string = os.getenv('MONGO_CONNECTION_STRING')
if not mongo_connection_string:
    raise ValueError("No MongoDB connection string found in environment variables")

client = MongoClient(mongo_connection_string)

require_model = joblib.load("requirement/random_forest_model.pkl")
require_label_encoder = joblib.load("requirement/label_encoder.pkl")

db = client['Emergency'] 
emergency_collection = db['Records']

@app.route('/upload', methods=['POST'])

def upload_audio():
    try:
        if 'audio' not in request.files:
            return jsonify({'message': 'No audio file part'}), 400

        audio_file = request.files['audio']
        latitude = request.form.get('latitude')
        longitude = request.form.get('longitude')

        if audio_file.filename == '':
            return jsonify({'message': 'No selected file'}), 400

        if not audio_file.filename.endswith('.wav'):
            return jsonify({'message': 'Only .wav files are allowed'}), 400

        filepath = os.path.join(app.config['UPLOAD_FOLDER'], audio_file.filename)
        audio_file.save(filepath)

        emergency_type, injured_people = analyse_audio(filepath)
        print(emergency_type, injured_people)
        

        
        reporting_time = datetime.utcnow()
        emergency_data = {
            'accident_type': emergency_type,
            'number_of_people': injured_people,
            'latitude': latitude,
            'longitude': longitude,
            'reporting_time': reporting_time
        }

        
        result = emergency_collection.insert_one(emergency_data)
        doc_id = result.inserted_id
     
        print("came here2")
        
        
        response = jsonify({'message': 'Audio file uploaded and data saved successfully!'})
        if(emergency_type == "Fire Accident" or emergency_type == "Fire"):
            emergency_type = "fire"
        elif(emergency_type == "Road Accident" or emergency_type == "Road"):   
            emergency_type = "road"
        elif(emergency_type == "Building Collapse" or emergency_type == "Building"):
            emergency_type = "building"
        elif(emergency_type == "Landslide" or emergency_type == "Landslide"):
            emergency_type = "landslide"
        
        print("came here2")
        thread1 = threading.Thread(target=predict, args=(injured_people,emergency_type,doc_id))
        thread2 = threading.Thread(target=predict_severity, args=( injured_people,emergency_type,doc_id))
        thread1.start()
        thread2.start()

        return response, 200

    except Exception as e:
        return jsonify({'message': str(e)}), 500



 # Converts English words to numbers

def analyse_audio(audio_file):
    converted_audio_file = "uploads/converted_audio.wav"

    def convert_to_wav(input_file, output_file):
        """Convert the input audio file to WAV format."""
        try:
            audio = AudioSegment.from_file(input_file)
            audio.export(output_file, format="wav")
        except Exception as e:
            print(f"Error converting audio file: {e}")

    def is_wav_format(file_path):
        """Check if the given file is in WAV format."""
        try:
            with open(file_path, "rb") as f:
                header = f.read(4)
                return header == b'RIFF'
        except Exception as e:
            return False

    if not is_wav_format(audio_file):
        convert_to_wav(audio_file, converted_audio_file)
        audio_file = converted_audio_file  

    def transcribe_audio(file_path):
        """Transcribe audio to text using Google Speech Recognition."""
        try:
            r = sr.Recognizer()
            with sr.AudioFile(file_path) as source:
                audio_data = r.record(source) 
                text = r.recognize_google(audio_data, language="ta")  # Tamil & English
                return text
        except Exception as e:
            return None

    def tamil_english_number_to_digit(text):
        """Convert Tamil words/numerals, English words, & digits to numbers."""
        tamil_numbers = {
            "ஒன்று": 1, "இரண்டு": 2, "மூன்று": 3, "நான்கு": 4, "ஐந்து": 5,
            "ஆறு": 6, "ஏழு": 7, "எட்டு": 8, "ஒன்பது": 9, "பத்து": 10,
            "பதினொன்று": 11, "பன்னிரண்டு": 12, "பதிமூன்று": 13, "பதிநான்கு": 14,
            "பதினைந்து": 15, "பதினாறு": 16, "பதினேழு": 17, "பதினெட்டு": 18,
            "பத்தொன்பது": 19, "இருபது": 20, "முப்பது": 30, "நாற்பது": 40, "ஐம்பது": 50
        }
        
        tamil_digits = {
            "௦": 0, "௧": 1, "௨": 2, "௩": 3, "௪": 4, "௫": 5,
            "௬": 6, "௭": 7, "௮": 8, "௯": 9, "௰": 10
        }

        words = text.split()
        numbers_found = []

        for word in words:
            if word in tamil_numbers:
                numbers_found.append(tamil_numbers[word])
            elif any(char in tamil_digits for char in word):
                converted_num = "".join(str(tamil_digits[char]) if char in tamil_digits else char for char in word)
                if converted_num.isdigit():
                    numbers_found.append(int(converted_num))
            elif word.isdigit():  # Detect normal English numbers
                numbers_found.append(int(word))
            else:
                try:
                    number = w2n.word_to_num(word)  # Convert English words like "ten" to 10
                    numbers_found.append(number)
                except ValueError:
                    continue

        return numbers_found

    def extract_emergency_details(text):
        """Extract emergency type and number of injured people from text."""
        fire_keywords = {"fire", "burning", "flames", "smoke", "நெருப்பு", "எரிகிறது", "புகை", "தீ", "கொளுந்து"}
        road_accident_keywords = {"road accident", "crash", "collision", "vehicle", "hit",
                                  "விபத்து", "சாலை விபத்து", "வேகமான கார்", "மோதியது", "வாகனம்", "தாக்கியது"}
        building_collapse_keywords = {"building collapse", "collapsed", "trapped", "structure failure",
                                      "கட்டிடம்", "சரிவு", "மூடப்பட்டுவிட்டேன்", "அமைப்பு தோல்வி", "விழுந்து"}
        landslide_keywords = {"landslide", "mudslide", "rockslide", "மண்ணிசைவு", "பாறை வீழ்ச்சி", "மண் சரிவு"}

        injury_keywords = {"injured", "hurt", "wounded", "died", "affected", "bleeding", 
                           "severe", "casualties", "trapped", "people", "members",
                           "காயம்", "பாதிக்கப்பட்ட", "நபர்கள்", "பேர்", "உடல் பாதிப்பு"}

        emergency_type = "Unknown"
        injured_people = 0

        lower_text = text.lower()

        # Detecting emergency type
        if any(word in lower_text for word in fire_keywords):
            emergency_type = "Fire"
        elif any(word in lower_text for word in road_accident_keywords):
            emergency_type = "Road Accident"
        elif any(word in lower_text for word in building_collapse_keywords):
            emergency_type = "Building Collapse"
        elif any(word in lower_text for word in landslide_keywords):
            emergency_type = "Landslide"

        # Extracting number of injured people
        numbers = tamil_english_number_to_digit(text)

        # Associate detected numbers with injury-related words
        words = text.split()
        for i, word in enumerate(words):
            if word in injury_keywords:
                for j in range(max(0, i-3), min(len(words), i+3)):  # Check nearby words
                    if words[j].isdigit() or words[j] in tamil_english_number_to_digit(words[j]):
                        injured_people = tamil_english_number_to_digit(words[j])[0]  # Take first found number
                        break

        return emergency_type, injured_people

    # Transcribe the audio
    text = transcribe_audio(audio_file)

    if text:
        print("Transcription successful:", text)
        emergency_type, injured_people = extract_emergency_details(text)
        print(f"Emergency Type: {emergency_type}")
        print(f"Number of Injured People: {injured_people}")
        return emergency_type, injured_people
    else:
        print("Transcription failed.")
        return None, None




@app.route('/emergency', methods=['POST'])
def emergency():
    data = request.get_json()

    accident_type = data.get('accident_type')
    number_of_people = data.get('number_of_people')
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    reporting_time = datetime.utcnow()

    print(f"Received emergency data: Accident Type: {accident_type}, Number of People Affected: {number_of_people},latitude: {latitude}, longitude: {longitude}, Reporting Time: {reporting_time}")

    try:
        emergency_data = {
            'accident_type': accident_type,
            'number_of_people': number_of_people,
            'latitude': latitude,
            'longitude': longitude,
            'Reporting_Time': reporting_time  
        }
        result=emergency_collection.insert_one(emergency_data) 
        doc_id = result.inserted_id
        print(f"Emergency data saved with ID: {doc_id}")
        print("Emergency data saved to database.")
        response = jsonify({'message': 'Audio file uploaded and data saved successfully!'})
        if(accident_type == "Fire Accident" or accident_type == "Fire"):
            accident_type = "fire"
        elif(accident_type == "Road Accident" or accident_type == "Road"):
            accident_type = "road" 
        elif(accident_type == "Building Collapse" or accident_type == "Building"):
            accident_type = "building"
        elif(accident_type == "Landslide" or accident_type == "Landslide"):
            accident_type = "landslide"
            
        if(number_of_people=='0-1'):
            number_of_people=1
        elif(number_of_people=='1-5'):
            number_of_people=5
        elif(number_of_people=='5-10'):
            number_of_people=10
        elif(number_of_people=='10+'):
            number_of_people=15
 
        thread1 = threading.Thread(target=predict, args=( number_of_people,accident_type,doc_id))
        thread2 = threading.Thread(target=predict_severity, args=( number_of_people,accident_type,doc_id))
        thread1.start()
        thread2.start()

        return response, 200
    
    except Exception as e:
        print(f"Error saving data to MongoDB: {e}")
        return jsonify({"message": "Error saving emergency data"}), 500

model_path = os.path.join(os.getcwd(), "severity", "severity_model.pkl")
encoder_path = os.path.join(os.getcwd(), "severity", "label_encoder.pkl")

model = joblib.load(model_path)
label_encoder = joblib.load(encoder_path)

@app.route('/predict_severity', methods=['POST'])
def predict_severity(num_injured, accident_type,doc_id):
    # data = request.get_json()
    # accident_type = data.get("accident_type")
    # num_injured = data.get("num_injured")
    with app.app_context():
        print("Predicting severity...")
        if not accident_type or num_injured is None:
            return jsonify({"error": "Invalid input"}), 400
        
        accident_type_encoded = label_encoder.transform([accident_type])[0]
        input_features = [[accident_type_encoded, num_injured]]
        severity_index = model.predict(input_features)[0]
        response = {
                "Severity index": severity_index[0],
                
            }
        severity_value = float(severity_index[0]) 

        response = {
            "Severity index": severity_value
        }

        print(severity_value)

        emergency_collection.update_one(
            {"_id": ObjectId(doc_id)}, 
            {"$set": response}
        )
        print("Updated emergency record with severity index.")    
        return jsonify({"predicted_severity_index": severity_index})


@app.route('/get_shortest_travel_time', methods=['POST'])
def get_shortest_travel_time():
    print("Getting shortest travel time...")
    data = request.get_json()
    origin_lat = data['origin_lat']  
    origin_lng = data['origin_lng'] 
    destinations = data['destinations']  

    travel_times = []

    for destination in destinations:
        destination_lat = destination['lat']
        destination_lng = destination['lng']
        url = f'https://maps.googleapis.com/maps/api/distancematrix/json?mode=driving&units=imperial&origins={origin_lat},{origin_lng}&destinations={destination_lat},{destination_lng}&key=AIzaSyBcI4KQ1vlpFTS8ku7pJ4pWkdySbbSEAhI'

        response = requests.get(url)
        data = response.json()
        print(data)

        travel_time = data['rows'][0]['elements'][0]['duration']['value'] 
        travel_times.append((destination, travel_time))

    travel_times.sort(key=lambda x: x[1])

    result = {
        'sorted_destinations': travel_times
    }

    return jsonify(result)

model = joblib.load("requirement/random_forest_model.pkl")
label_encoder = joblib.load("requirement/label_encoder.pkl")

@app.route('/predict', methods=['POST'])
def predict(num_injured, accident_type,doc_id):
    # data = request.json
    # num_injured = data['num_injured']
    # accident_type = data['accident_type']
     with app.app_context():
        print("Predicting...")
        accident_type_encoded = label_encoder.transform([accident_type])[0]
        input_data = np.array([[num_injured, accident_type_encoded]])
        prediction = model.predict(input_data)

        time.sleep(2)
        
        response = {
            "Number of Ambulances": int(prediction[0][0]),
            "Number of Emergency Beds": int(prediction[0][1]),
            "Number of fire service": int(prediction[0][2])
        }
        print(doc_id)
        print(response)
        
        emergency_collection.update_one(
                {"_id": ObjectId(doc_id)}, 
                {"$set": response}
            )
        print("Updated emergency record with predictions.")
        return jsonify(response)
    
    

if __name__ == '__main__':
    app.config['DEBUG'] = False
    app.run(host='0.0.0.0', port=5000)