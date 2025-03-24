from flask import Blueprint, request, jsonify
import pickle

severity_bp = Blueprint('severity', __name__)

# Load trained model and label encoder
model_path = "severity_model.pkl"
encoder_path = "label_encoder.pkl"

with open(model_path, 'rb') as f:
    model = pickle.load(f)

with open(encoder_path, 'rb') as f:
    label_encoder = pickle.load(f)

@severity_bp.route('/predict_severity', methods=['POST'])
def predict_severity():
    data = request.get_json()
    accident_type = data.get("accident_type")
    num_injured = data.get("num_injured")
    
    if not accident_type or num_injured is None:
        return jsonify({"error": "Invalid input"}), 400
    
    accident_type_encoded = label_encoder.transform([accident_type])[0]
    input_features = [[accident_type_encoded, num_injured]]
    severity_index = model.predict(input_features)[0]
    
    return jsonify({"predicted_severity_index": severity_index})
