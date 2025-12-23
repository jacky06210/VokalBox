// src/pages/MenuPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Loader2, Tag } from 'lucide-react';
import { menuAPI } from '../api/client';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

function MenuPage() {
  const queryClient = useQueryClient();
  const restaurantId = useAuthStore((state) => state.getRestaurantId());
  
  const [editingPlat, setEditingPlat] = useState(null);

  // Récupérer le menu
  const { data, isLoading } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => menuAPI.getMenu(restaurantId),
  });

  const menu = data?.data?.data?.categories || [];

  // Mutation pour modifier un plat
  const updatePlatMutation = useMutation({
    mutationFn: ({ platId, data }) => menuAPI.updatePlat(platId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['menu']);
      toast.success('Plat mis à jour');
      setEditingPlat(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour')
  });

  const handleToggleDisponible = (plat) => {
    updatePlatMutation.mutate({
      platId: plat.id,
      data: { disponible: !plat.disponible }
    });
  };

  const handleTogglePromo = (plat) => {
    updatePlatMutation.mutate({
      platId: plat.id,
      data: { 
        en_promotion: !plat.en_promotion,
        prix_promo: !plat.en_promotion ? plat.prix * 0.8 : null
      }
    });
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Menu</h1>
          <p className="text-gray-500 mt-1">Gérez vos plats et promotions</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Ajouter un plat
        </button>
      </div>

      {/* Menu par catégories */}
      {menu.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">Aucun plat dans votre menu</p>
        </div>
      ) : (
        <div className="space-y-6">
          {menu.map((category) => (
            <div key={category.id} className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-4 border-b border-gray-200">
                {category.nom}
              </h2>
              
              <div className="space-y-4">
                {category.plats && category.plats.map((plat) => (
                  <div
                    key={plat.id}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${plat.disponible 
                        ? 'border-gray-200 bg-white' 
                        : 'border-red-200 bg-red-50'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {plat.nom}
                          </h3>
                          {plat.en_promotion && (
                            <span className="badge bg-orange-100 text-orange-700 flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              Promo
                            </span>
                          )}
                          {!plat.disponible && (
                            <span className="badge bg-red-100 text-red-700">
                              Indisponible
                            </span>
                          )}
                        </div>
                        
                        {plat.description && (
                          <p className="text-sm text-gray-600 mb-3">
                            {plat.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4">
                          <div>
                            {plat.en_promotion ? (
                              <>
                                <span className="text-lg font-bold text-green-600">
                                  {plat.prix.toFixed(2)}€
                                </span>
                                <span className="text-sm text-gray-500 line-through ml-2">
                                  {plat.prix_original.toFixed(2)}€
                                </span>
                              </>
                            ) : (
                              <span className="text-lg font-bold text-gray-900">
                                {plat.prix.toFixed(2)}€
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleTogglePromo(plat)}
                          className={`
                            p-2 rounded-lg transition-colors
                            ${plat.en_promotion
                              ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }
                          `}
                          title={plat.en_promotion ? 'Retirer la promo' : 'Mettre en promo'}
                        >
                          <Tag className="w-5 h-5" />
                        </button>
                        
                        <button
                          onClick={() => handleToggleDisponible(plat)}
                          className={`
                            px-3 py-2 rounded-lg font-medium transition-colors
                            ${plat.disponible
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }
                          `}
                        >
                          {plat.disponible ? 'Disponible' : 'Indisponible'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MenuPage;
