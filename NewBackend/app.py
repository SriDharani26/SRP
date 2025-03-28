from flask import Flask,request,jsonify
from flask_cors import CORS
import logging
from dotenv import load_dotenv
from pymongo import MongoClient
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, CallbackContext
import threading


load_dotenv()
app = Flask(__name__)
CORS(app)


@app.route('/')
def home():
    return "Brotatoes for the win!"


@app.route('/ambulance_alert')
def getAlert():
    return jsonify({"success": "Ambulance Alert Sent!"})



if __name__ == '__main__':
    app.config['DEBUG'] = False
    app.run(host='0.0.0.0', port=5000)