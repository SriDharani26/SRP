from flask import Flask,request,jsonify
from flask_cors import CORS
import nest_asyncio
import asyncio

import os
import logging
from dotenv import load_dotenv
from pymongo import MongoClient
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, CallbackContext
import threading

nest_asyncio.apply()




load_dotenv()
app = Flask(__name__)
CORS(app)


# MongoDB connection
BOT_TOKEN = os.getenv("BOT_TOKEN")
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)


db = client['Emergency'] 
reports_collection = db['Records']


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

        emergency_report = {
            "user_id": user_id,
            "emergency_type": user_reports[user_id]["emergency"],
            "injured_count": user_reports[user_id]["injured"],
            "location": {"latitude": latitude, "longitude": longitude}
        }

        try:
            result = reports_collection.insert_one(emergency_report)
            logger.info(f"✅ Data inserted: {result.inserted_id}")
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



async def main():
    """Start the bot."""
    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.Regex("^🚨 Report Emergency$"), report_emergency))
    app.add_handler(CallbackQueryHandler(handle_button_click))
    app.add_handler(MessageHandler(filters.LOCATION, location))

    await app.run_polling()  # Ensure this runs as an async task



    
    
    

@app.route('/')
def home():
    return "Brotatoes for the win!"


@app.route('/ambulance_alert')
def getAlert():
    return jsonify({"success": "Ambulance Alert Sent!"})



if __name__ == '__main__':
    bot_thread = threading.Thread(target=asyncio.run, args=(main(),), daemon=True)
    bot_thread.start()


    app.config['DEBUG'] = False
    app.run(host='0.0.0.0', port=5000)