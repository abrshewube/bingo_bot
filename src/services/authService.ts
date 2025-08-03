import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL  || "https://bingo-bot-txsn.onrender.com"
const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  async login(telegramData: any) {
    const response = await api.post('/auth/login', telegramData);
    return response.data;
  },

  async registerPhone(phoneNumber: string, telegramData: any) {
    const response = await api.post('/auth/register-phone', {
      ...telegramData,
      phoneNumber
    });
    return response.data;
  }
};