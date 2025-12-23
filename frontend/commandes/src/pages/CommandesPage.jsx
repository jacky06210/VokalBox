// src/pages/CommandesPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Loader2,
  Clock,
  CheckCircle2,
  Package,
  X
} from 'lucide-react';
import { commandeAPI } from '../api/client';
import useAuthStore from '../store/useAuthStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

function CommandesPage() {
  const queryClient = useQueryClient();
  const restaurantId = useAuthStore((state) => state.getRestaurantId());
  
  const [filterStatut, setFilterStatut] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommande, setSelectedCommande] = useState(null);

  // Récupérer les commandes
  const { data, isLoading } = useQuery({
    queryKey: ['commandes', restaurantId, filterStatut],
    queryFn: () => commandeAPI.getToday(restaurantId),
    refetchInterval: 10000, // Refresh toutes les 10s
  });

  const commandes = data?.data?.data || [];

  // Mutation pour changer le statut
  const updateStatusMutation = useMutation({
    mutationFn: ({ commandeId, statut }) => 
      commandeAPI.updateStatus(commandeId, statut),
    onSuccess: () => {
      queryClient.invalidateQueries(['commandes']);
      queryClient.invalidateQueries(['stats']);
      toast.success('Statut mis à jour');
      setSelectedCommande(null);
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  // Filtrer les commandes
  const filteredCommandes = commandes.filter((cmd) => {
    const matchStatut = filterStatut === 'all' || cmd.statut === filterStatut;
    const matchSearch = 
      cmd.nom_client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.telephone_client?.includes(searchQuery) ||
      cmd.id.toString().includes(searchQuery);
    return matchStatut && matchSearch;
  });

  const handleStatusChange = (commandeId, newStatut) => {
    updateStatusMutation.mutate({ commandeId, statut: newStatut });
  };

  const getStatusBadge = (statut) => {
    const badges = {
      nouvelle: { class: 'badge-new', label: 'Nouvelle' },
      en_preparation: { class: 'badge-preparing', label: 'En préparation' },
      prete: { class: 'badge-ready', label: 'Prête' },
      recuperee: { class: 'badge-delivered', label: 'Récupérée' },
      livree: { class: 'badge-delivered', label: 'Livrée' },
      annulee: { class: 'bg-gray-100 text-gray-700', label: 'Annulée' }
    };
    
    const badge = badges[statut] || badges.nouvelle;
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  const getStatusActions = (statut) => {
    const actions = {
      nouvelle: [
        { label: 'Commencer', statut: 'en_preparation', icon: Clock, color: 'orange' },
        { label: 'Annuler', statut: 'annulee', icon: X, color: 'red' }
      ],
      en_preparation: [
        { label: 'Marquer prête', statut: 'prete', icon: CheckCircle2, color: 'green' }
      ],
      prete: [
        { label: 'Récupérée', statut: 'recuperee', icon: Package, color: 'blue' }
      ]
    };
    return actions[statut] || [];
  };

  const filterButtons = [
    { value: 'all', label: 'Toutes', count: commandes.length },
    { value: 'nouvelle', label: 'Nouvelles', count: commandes.filter(c => c.statut === 'nouvelle').length },
    { value: 'en_preparation', label: 'En préparation', count: commandes.filter(c => c.statut === 'en_preparation').length },
    { value: 'prete', label: 'Prêtes', count: commandes.filter(c => c.statut === 'prete').length },
  ];

  if (isLoading) {
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
          Commandes
        </h1>
        <p className="text-gray-500 mt-1">
          Gérez vos commandes en temps réel
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Recherche */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone ou numéro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Filtres de statut */}
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilterStatut(btn.value)}
              className={`
                px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors
                ${filterStatut === btn.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {btn.label}
              {btn.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  filterStatut === btn.value
                    ? 'bg-primary-700'
                    : 'bg-gray-200'
                }`}>
                  {btn.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des commandes */}
      {filteredCommandes.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucune commande trouvée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCommandes.map((commande) => (
            <div
              key={commande.id}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedCommande(commande)}
            >
              {/* En-tête commande */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">Commande</p>
                  <p className="text-lg font-bold text-gray-900">#{commande.id}</p>
                </div>
                {getStatusBadge(commande.statut)}
              </div>

              {/* Info client */}
              <div className="mb-4">
                <p className="font-medium text-gray-900">{commande.nom_client || 'Client'}</p>
                <p className="text-sm text-gray-600">{commande.telephone_client}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(commande.created_at), 'HH:mm', { locale: fr })}
                  {' - '}
                  {commande.mode_retrait === 'emporter' ? 'À emporter' : 'Sur place'}
                </p>
              </div>

              {/* Articles */}
              <div className="mb-4 space-y-2">
                {commande.items && commande.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.quantite}x {item.nom_plat}
                    </span>
                    <span className="font-medium">{parseFloat(item.total).toFixed(2)}€</span>
                  </div>
                ))}
                {commande.items && commande.items.length > 3 && (
                  <p className="text-xs text-gray-500">
                    +{commande.items.length - 3} autre(s) article(s)
                  </p>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 mb-4">
                <span className="font-medium text-gray-700">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  {parseFloat(commande.montant_ttc).toFixed(2)}€
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {getStatusActions(commande.statut).map((action) => (
                  <button
                    key={action.statut}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(commande.id, action.statut);
                    }}
                    disabled={updateStatusMutation.isLoading}
                    className={`
                      flex-1 btn flex items-center justify-center gap-2
                      ${action.color === 'green' ? 'btn-success' : ''}
                      ${action.color === 'orange' ? 'bg-orange-600 text-white hover:bg-orange-700' : ''}
                      ${action.color === 'blue' ? 'btn-primary' : ''}
                      ${action.color === 'red' ? 'btn-danger' : ''}
                      disabled:opacity-50
                    `}
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal détail commande */}
      {selectedCommande && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedCommande(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Commande #{selectedCommande.id}
                </h2>
                <p className="text-gray-500 mt-1">
                  {format(new Date(selectedCommande.created_at), 'PPp', { locale: fr })}
                </p>
              </div>
              <button
                onClick={() => setSelectedCommande(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Détails complets */}
            <div className="space-y-6">
              {/* Client */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Client</h3>
                <p>{selectedCommande.nom_client || 'Client'}</p>
                <p className="text-sm text-gray-600">{selectedCommande.telephone_client}</p>
              </div>

              {/* Articles */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Articles</h3>
                <div className="space-y-3">
                  {selectedCommande.items?.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <div>
                        <p className="font-medium">{item.quantite}x {item.nom_plat}</p>
                        {item.notes && (
                          <p className="text-sm text-gray-600">Note: {item.notes}</p>
                        )}
                      </div>
                      <p className="font-semibold">{parseFloat(item.total).toFixed(2)}€</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total TTC</span>
                  <span>{parseFloat(selectedCommande.montant_ttc).toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommandesPage;
