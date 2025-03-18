import speech_recognition as sr
from pydub import AudioSegment
import re
import spacy

audio_file = "uploads/audio.wav"
converted_audio_file = "uploads/converted_audio.wav"

def convert_to_wav(input_file, output_file):
    """Convert the input audio file to WAV format."""
    try:
        audio = AudioSegment.from_file(input_file)
        audio.export(output_file, format="wav")
        print(f"File converted to WAV: {output_file}")
    except Exception as e:
        print(f"Error converting audio file: {e}")

def is_wav_format(file_path):
    """Check if the given file is in WAV format."""
    try:
        with open(file_path, "rb") as f:
            header = f.read(4)
            return header == b'RIFF'
    except Exception as e:
        print(f"Error reading file: {e}")
        return False

if not is_wav_format(audio_file):
    print(f"File is not in WAV format. Converting {audio_file} to WAV...")
    convert_to_wav(audio_file, converted_audio_file)
    audio_file = converted_audio_file  

def transcribe_audio(file_path):
    """Transcribe audio to text using Google Speech Recognition."""
    try:
        r = sr.Recognizer()
        with sr.AudioFile(file_path) as source:
            audio_data = r.record(source) 
            text = r.recognize_google(audio_data)
            return text
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        return None

def extract_emergency_details(text):
        nlp = spacy.load("en_core_web_sm")
        

   
        fire_keywords = {"fire", "burning", "flames", "smoke"}
        road_accident_keywords = {"road accident", "crash", "collision", "vehicle", "hit"}
        building_collapse_keywords = {"building collapse", "collapsed", "trapped", "structure failure"}
        landslide_keywords = {"landslide", "mudslide", "rockslide"}

        emergency_type = "Unknown"
        injured_people = 0

        
        lower_text = text.lower()

        if any(word in lower_text for word in fire_keywords):
            emergency_type = "Fire"
        elif any(word in lower_text for word in road_accident_keywords):
            emergency_type = "Road Accident"
        elif any(word in lower_text for word in building_collapse_keywords):
            emergency_type = "Building Collapse"
        elif any(word in lower_text for word in landslide_keywords):
            emergency_type = "Landslide"
        else:
            emergency_type = "Unknown"  

        numbers = [int(match.group()) for match in re.finditer(r'\d+', text)]
        if numbers:
            injured_people = max(numbers)  

        return emergency_type, injured_people




text = transcribe_audio(audio_file)

if text:
    print("Transcription successful:")
    print(text)


    emergency_type, injured_people = extract_emergency_details(text)

    
    if emergency_type:
        print(f"Emergency Type: {emergency_type.capitalize()}")
    else:
        print("Emergency Type: Not detected")

    if injured_people is not None:
        print(f"Number of Injured People: {injured_people}")
    else:
        print("Number of Injured People: Not mentioned")
else:
    print("Failed to transcribe audio.")
