// src/store/useAuthStore.js
// Store pour la gestion de l'authentification

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // État
      user: null,
      token: null,
      isAuthenticated: false,

      // Actions
      login: (userData, token) => {
        set({
          user: userData,
          token: token,
          isAuthenticated: true
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
        localStorage.removeItem('vokalbox-auth');
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData }
        }));
      },

      getToken: () => {
        return get().token;
      },

      getRestaurantId: () => {
        return get().user?.restaurantId || null;
      }
    }),
    {
      name: 'vokalbox-auth', // Clé dans localStorage
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;
