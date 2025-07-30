import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

export const gameService = {
  async getAvailableGames() {
    const response = await api.get('/games/available');
    return response.data;
  },

  async getGameDetails(roomId: string) {
    const response = await api.get(`/games/${roomId}`);
    return response.data;
  },

  async getLeaderboard(period: string = 'all') {
    const response = await api.get(`/games/leaderboard/${period}`);
    return response.data;
  }
};