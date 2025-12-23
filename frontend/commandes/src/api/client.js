// src/api/client.js
// Client API Axios avec configuration et intercepteurs

import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.vokalbox.fr';

// Créer l'instance Axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token JWT
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Déconnexion si token expiré
    if (error.response?.status === 401 || error.response?.status === 403) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// ========================================
// FONCTIONS API
// ========================================

// Authentification
export const authAPI = {
  login: (email, password) => 
    apiClient.post('/api/auth/login', { email, password }),
  
  register: (data) => 
    apiClient.post('/api/auth/register', data),
  
  refresh: (refreshToken) => 
    apiClient.post('/api/auth/refresh', { refreshToken })
};

// Restaurants
export const restaurantAPI = {
  getMe: () => 
    apiClient.get('/api/restaurants/me'),
  
  update: (data) => 
    apiClient.put('/api/restaurants/me', data),
  
  getStatus: (id) => 
    apiClient.get(`/api/restaurants/${id}/status`)
};

// Menus
export const menuAPI = {
  getMenu: (restaurantId) => 
    apiClient.get(`/api/menus/${restaurantId}`),
  
  createCategory: (restaurantId, data) => 
    apiClient.post(`/api/menus/${restaurantId}/categories`, data),
  
  createPlat: (restaurantId, data) => 
    apiClient.post(`/api/menus/${restaurantId}/plats`, data),
  
  updatePlat: (platId, data) => 
    apiClient.put(`/api/menus/plats/${platId}`, data),
  
  deletePlat: (platId) => 
    apiClient.delete(`/api/menus/plats/${platId}`),
  
  getPromotions: (restaurantId) => 
    apiClient.get(`/api/menus/${restaurantId}/promotions`)
};

// Commandes
export const commandeAPI = {
  create: (data) => 
    apiClient.post('/api/commandes', data),
  
  getAll: (restaurantId, params) => 
    apiClient.get(`/api/commandes/${restaurantId}`, { params }),
  
  getToday: (restaurantId) => 
    apiClient.get(`/api/commandes/${restaurantId}/today`),
  
  getDetail: (commandeId) => 
    apiClient.get(`/api/commandes/detail/${commandeId}`),
  
  updateStatus: (commandeId, statut) => 
    apiClient.patch(`/api/commandes/${commandeId}/status`, { statut })
};

// Statistiques
export const statsAPI = {
  getGlobal: (restaurantId) => 
    apiClient.get(`/api/stats/${restaurantId}`),
  
  getPlatsPopulaires: (restaurantId, params) => 
    apiClient.get(`/api/stats/${restaurantId}/plats-populaires`, { params }),
  
  getHistorique: (restaurantId, params) => 
    apiClient.get(`/api/stats/${restaurantId}/historique`, { params }),
  
  getHeuresPointe: (restaurantId, params) => 
    apiClient.get(`/api/stats/${restaurantId}/heures-pointe`, { params })
};
