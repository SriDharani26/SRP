from flask import Flask
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, CallbackContext
import threading

app = Flask(__name__)

BOT_TOKEN = "8097529364:AAGraTrawEk87-c-VJJl0u4C4Ii3vn8Oxk8"
user_reports = {}
user_state = {}

EMERGENCY_TYPES = [
    [InlineKeyboardButton("\U0001F697 Road Accident", callback_data="emergency_Road Accident"),
     InlineKeyboardButton("\U0001F525 Fire", callback_data="emergency_Fire")],
    [InlineKeyboardButton("\U0001F3E5 Medical", callback_data="emergency_Medical Emergency"),
     InlineKeyboardButton("\U0001F6A8 Crime", callback_data="emergency_Crime Report")]
]

INJURY_RANGES = [
    [InlineKeyboardButton("1-5", callback_data="injured_1-5"),
     InlineKeyboardButton("6-10", callback_data="injured_6-10")],
    [InlineKeyboardButton("11-20", callback_data="injured_11-20"),
     InlineKeyboardButton("More than 20", callback_data="injured_More than 20")]
]

persistent_keyboard = ReplyKeyboardMarkup(
    [[KeyboardButton("\U0001F6A8 Report Emergency")]],
    resize_keyboard=True
)

async def start(update: Update, context: CallbackContext):
    await update.message.reply_text(
        "\U0001F44B Welcome! Click the button below to report an emergency anytime.",
        reply_markup=persistent_keyboard
    )

async def report_emergency(update: Update, context: CallbackContext):
    user_id = update.message.chat_id
    user_state[user_id] = "waiting_for_emergency"
    emergency_keyboard = InlineKeyboardMarkup(EMERGENCY_TYPES)
    await update.message.reply_text("\U0001F6A8 Please select the type of emergency:", reply_markup=emergency_keyboard)

async def handle_button_click(update: Update, context: CallbackContext):
    query = update.callback_query
    user_id = query.message.chat_id
    query.answer()
    category, value = query.data.split("_")
    if user_id not in user_reports:
        user_reports[user_id] = {}
    if category == "emergency" and user_state.get(user_id) == "waiting_for_emergency":
        user_reports[user_id]["emergency"] = value
        user_state[user_id] = "waiting_for_injured"
        injury_keyboard = InlineKeyboardMarkup(INJURY_RANGES)
        await query.message.reply_text("\U0001F691 How many people are injured?", reply_markup=injury_keyboard)
    elif category == "injured" and user_state.get(user_id) == "waiting_for_injured":
        user_reports[user_id]["injured"] = value
        user_state[user_id] = "waiting_for_location"
        keyboard = [[KeyboardButton("\U0001F4CD Share Location", request_location=True)]]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)
        await query.message.reply_text(
            f"✅ **Emergency Type:** {user_reports[user_id]['emergency']}\n"
            f"🩺 **Injured Count:** {user_reports[user_id]['injured']}\n\n"
            "📍 Now, please share your location.", 
            reply_markup=reply_markup
        )

async def location(update: Update, context: CallbackContext):
    user_id = update.message.chat_id
    if user_state.get(user_id) == "waiting_for_location":
        user_location = update.message.location
        latitude, longitude = user_location.latitude, user_location.longitude
        user_reports[user_id]["location"] = (latitude, longitude)
        user_state.pop(user_id, None)
        emergency_info = user_reports[user_id]["emergency"]
        injured_count = user_reports[user_id]["injured"]
        response_text = (
            f"\U0001F6A8 **Emergency Reported** \U0001F6A8\n\n"
            f"📢 **Type:** {emergency_info}\n"
            f"📍 **Location:** {latitude}, {longitude}\n"
            f"🩺 **Number of Injured People:** {injured_count}\n\n"
            f"✅ Emergency report submitted successfully! 🚑"
        )
        await update.message.reply_text(response_text, reply_markup=persistent_keyboard)
        print(f"\n🔴 Emergency Report: {emergency_info}, Injured: {injured_count}, Location: {latitude}, {longitude}")

def run_bot():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.Regex("^\U0001F6A8 Report Emergency$"), report_emergency))
    app.add_handler(CallbackQueryHandler(handle_button_click))
    app.add_handler(MessageHandler(filters.LOCATION, location))
    app.run_polling()

@app.route('/')
def home():
    return "Telegram Emergency Bot is Running!"

if __name__ == "__main__":
    threading.Thread(target=run_bot, daemon=True).start()
    app.run(debug=True, use_reloader=False)
