// src/pages/DashboardPage.jsx
import { useQuery } from '@tanstack/react-query';
import { 
  ShoppingBag, 
  Euro, 
  TrendingUp, 
  Clock,
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react';
import { statsAPI, commandeAPI } from '../api/client';
import useAuthStore from '../store/useAuthStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function DashboardPage() {
  const restaurantId = useAuthStore((state) => state.getRestaurantId());

  // Récupérer les stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', restaurantId],
    queryFn: () => statsAPI.getGlobal(restaurantId),
    refetchInterval: 30000, // Refresh toutes les 30s
  });

  // Récupérer les commandes du jour
  const { data: commandes, isLoading: commandesLoading } = useQuery({
    queryKey: ['commandes-today', restaurantId],
    queryFn: () => commandeAPI.getToday(restaurantId),
    refetchInterval: 10000, // Refresh toutes les 10s
  });

  const statsData = stats?.data?.data;
  const commandesData = commandes?.data?.data || [];

  // Cards de statistiques
  const statCards = [
    {
      title: 'CA Aujourd\'hui',
      value: statsData?.aujourd_hui?.ca || 0,
      format: 'currency',
      icon: Euro,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+12%',
      changePositive: true
    },
    {
      title: 'Commandes du jour',
      value: statsData?.aujourd_hui?.commandes || 0,
      format: 'number',
      icon: ShoppingBag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+8%',
      changePositive: true
    },
    {
      title: 'Panier moyen',
      value: statsData?.aujourd_hui?.panier_moyen || 0,
      format: 'currency',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '-3%',
      changePositive: false
    },
    {
      title: 'En attente',
      value: statsData?.commandes_en_attente || 0,
      format: 'number',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      urgent: (statsData?.commandes_en_attente || 0) > 5
    }
  ];

  const formatValue = (value, format) => {
    if (format === 'currency') {
      return `${value.toFixed(2)}€`;
    }
    return value;
  };

  const getStatusBadge = (statut) => {
    const badges = {
      nouvelle: 'badge-new',
      en_preparation: 'badge-preparing',
      prete: 'badge-ready',
      recuperee: 'badge-delivered',
      livree: 'badge-delivered'
    };
    
    const labels = {
      nouvelle: 'Nouvelle',
      en_preparation: 'En préparation',
      prete: 'Prête',
      recuperee: 'Récupérée',
      livree: 'Livrée'
    };

    return (
      <span className={`badge ${badges[statut] || 'badge-new'}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  if (statsLoading || commandesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Tableau de bord
        </h1>
        <p className="text-gray-500 mt-1">
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                  {formatValue(stat.value, stat.format)}
                </p>
                {stat.change && (
                  <div className={`flex items-center gap-1 mt-2 text-sm ${
                    stat.changePositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.changePositive ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : (
                      <ArrowDown className="w-4 h-4" />
                    )}
                    <span>{stat.change}</span>
                  </div>
                )}
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg ${stat.urgent ? 'animate-pulse' : ''}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CA de la semaine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Cette semaine
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Commandes</span>
              <span className="font-semibold">{statsData?.semaine?.commandes || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Chiffre d'affaires</span>
              <span className="font-semibold text-green-600">
                {(statsData?.semaine?.ca || 0).toFixed(2)}€
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ce mois
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Commandes</span>
              <span className="font-semibold">{statsData?.mois?.commandes || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Chiffre d'affaires</span>
              <span className="font-semibold text-green-600">
                {(statsData?.mois?.ca || 0).toFixed(2)}€
              </span>
            </div>
          </div>
        </div>

        <div className="card bg-primary-50 border-primary-200">
          <h3 className="text-lg font-semibold text-primary-900 mb-2">
            🎯 Objectif mensuel
          </h3>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-primary-700">Progression</span>
              <span className="font-semibold text-primary-900">
                {Math.round((statsData?.mois?.ca || 0) / 3000 * 100)}%
              </span>
            </div>
            <div className="w-full bg-primary-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((statsData?.mois?.ca || 0) / 3000 * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-primary-700 mt-2">
              Objectif : 3000€
            </p>
          </div>
        </div>
      </div>

      {/* Commandes récentes */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Commandes du jour
          </h3>
          <a
            href="/commandes"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Voir toutes →
          </a>
        </div>

        {commandesData.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune commande aujourd'hui</p>
          </div>
        ) : (
          <div className="space-y-4">
            {commandesData.slice(0, 5).map((commande) => (
              <div
                key={commande.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-gray-900">
                      #{commande.id}
                    </span>
                    {getStatusBadge(commande.statut)}
                  </div>
                  <p className="text-sm text-gray-600">
                    {commande.nom_client || 'Client'} - {commande.telephone_client}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(commande.created_at), 'HH:mm')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {parseFloat(commande.montant_ttc).toFixed(2)}€
                  </p>
                  <p className="text-xs text-gray-500">
                    {commande.items?.length || 0} article(s)
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
