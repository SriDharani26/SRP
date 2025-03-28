import axios from 'axios';

const apiUrl = process.env.EXPO_PUBLIC_API

const db = axios.create({
  baseURL: 'http://127.0.0.1:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default db ;