// src/pages/SettingsPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { Save, Loader2 } from 'lucide-react';
import { restaurantAPI } from '../api/client';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  const restaurantId = user?.restaurantId;

  const [formData, setFormData] = useState({
    nom_restaurant: user?.nom_restaurant || '',
    telephone: '',
    adresse: '',
    code_postal: '',
    ville: '',
    horaires: ''
  });

  // Récupérer les infos du restaurant
  const { data, isLoading } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => restaurantAPI.getMe(),
    onSuccess: (data) => {
      const resto = data.data.data;
      setFormData({
        nom_restaurant: resto.nom_restaurant || '',
        telephone: resto.telephone || '',
        adresse: resto.adresse || '',
        code_postal: resto.code_postal || '',
        ville: resto.ville || '',
        horaires: resto.horaires || ''
      });
    }
  });

  // Mutation pour mettre à jour
  const updateMutation = useMutation({
    mutationFn: (data) => restaurantAPI.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant']);
      updateUser({ nom_restaurant: formData.nom_restaurant });
      toast.success('Informations mises à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Paramètres
        </h1>
        <p className="text-gray-500 mt-1">
          Gérez les informations de votre restaurant
        </p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Informations générales
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du restaurant
              </label>
              <input
                type="text"
                name="nom_restaurant"
                value={formData.nom_restaurant}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse
              </label>
              <input
                type="text"
                name="adresse"
                value={formData.adresse}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code postal
                </label>
                <input
                  type="text"
                  name="code_postal"
                  value={formData.code_postal}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ville
                </label>
                <input
                  type="text"
                  name="ville"
                  value={formData.ville}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horaires d'ouverture
              </label>
              <textarea
                name="horaires"
                value={formData.horaires}
                onChange={handleChange}
                className="input"
                rows="3"
                placeholder="Ex: Lundi-Vendredi 11h-14h et 18h-22h"
              />
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={updateMutation.isLoading}
            className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {updateMutation.isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </form>

      {/* Informations abonnement */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Abonnement
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Statut</span>
            <span className="badge badge-ready">
              {user?.statut || 'Actif'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Formule</span>
            <span className="font-medium">VokalBox Pro - 49€/mois</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Numéro Telnyx</span>
            <span className="font-medium">À configurer</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
