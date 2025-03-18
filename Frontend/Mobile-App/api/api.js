import axios from 'axios';

const apiUrl = process.env.EXPO_PUBLIC_API

const db = axios.create({
  baseURL: 'http://10.21.13.117:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default db ;