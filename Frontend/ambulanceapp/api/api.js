import axios from 'axios';

const apiUrl = process.env.EXPO_PUBLIC_API

const db = axios.create({
  baseURL: 'http://10.11.159.120:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default db ;