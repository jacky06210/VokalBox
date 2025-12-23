// src/pages/StatsPage.jsx
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Euro, ShoppingBag, Loader2 } from 'lucide-react';
import { statsAPI } from '../api/client';
import useAuthStore from '../store/useAuthStore';

function StatsPage() {
  const restaurantId = useAuthStore((state) => state.getRestaurantId());

  // Stats globales
  const { data: stats } = useQuery({
    queryKey: ['stats', restaurantId],
    queryFn: () => statsAPI.getGlobal(restaurantId),
  });

  // Historique CA
  const { data: historique, isLoading: historiqueLoading } = useQuery({
    queryKey: ['historique', restaurantId],
    queryFn: () => statsAPI.getHistorique(restaurantId, { jours: 30 }),
  });

  // Plats populaires
  const { data: populaires, isLoading: populairesLoading } = useQuery({
    queryKey: ['plats-populaires', restaurantId],
    queryFn: () => statsAPI.getPlatsPopulaires(restaurantId, { limit: 10, periode: 30 }),
  });

  // Heures de pointe
  const { data: heuresPointe, isLoading: heuresLoading } = useQuery({
    queryKey: ['heures-pointe', restaurantId],
    queryFn: () => statsAPI.getHeuresPointe(restaurantId, { jours: 30 }),
  });

  const statsData = stats?.data?.data;
  const historiqueData = historique?.data?.data || [];
  const populairesData = populaires?.data?.data || [];
  const heuresData = heuresPointe?.data?.data || [];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Statistiques
        </h1>
        <p className="text-gray-500 mt-1">
          Analysez les performances de votre restaurant
        </p>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <Euro className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">CA du mois</p>
              <p className="text-2xl font-bold text-gray-900">
                {(statsData?.mois?.ca || 0).toFixed(2)}€
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Commandes du mois</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsData?.mois?.commandes || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Panier moyen</p>
              <p className="text-2xl font-bold text-gray-900">
                {(statsData?.aujourd_hui?.panier_moyen || 0).toFixed(2)}€
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Évolution du CA */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Chiffre d'affaires (30 derniers jours)
        </h2>
        {historiqueLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historiqueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="ca" stroke="#0ea5e9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Grille stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plats populaires */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Top 10 des plats
          </h2>
          {populairesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {populairesData.map((plat, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-700 font-bold rounded-full text-sm">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">{plat.nom}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {plat.quantite_vendue} vendus
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Heures de pointe */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Heures de pointe
          </h2>
          {heuresLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={heuresData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="heure" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="commandes" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatsPage;
