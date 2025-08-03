import axios from 'axios';

const API_URL =import.meta.env.VITE_API_URL || "https://bingo-bot-txsn.onrender.com" ;

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

  async createGame(moneyLevel: number) {
    const response = await api.post('/games/create', { moneyLevel });
    return response.data;
  },

  async getGameDetails(roomId: string) {
    const response = await api.get(`/games/${roomId}`);
    return response.data;
  },

  async selectCartela(roomId: string, cartelaNumber: number) {
    const response = await api.post(`/games/${roomId}/cartela`, { cartelaNumber });
    return response.data;
  },

  async joinGame(roomId: string) {
    const response = await api.post(`/games/${roomId}/join`);
    return response.data;
  },

  async leaveGame(roomId: string) {
    const response = await api.post(`/games/${roomId}/leave`);
    return response.data;
  },

  async markNumber(roomId: string, number: number) {
    const response = await api.post(`/games/${roomId}/mark`, { number });
    return response.data;
  },

  async claimWin(roomId: string, winPattern: string) {
    const response = await api.post(`/games/${roomId}/claim-win`, { winPattern });
    return response.data;
  },

  async getUserGameHistory() {
    const response = await api.get('/games/history/user');
    return response.data;
  },

  async getLeaderboard(period: string = 'all') {
    const response = await api.get(`/games/leaderboard/${period}`);
    return response.data;
  }
};