// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../api/client';
import useAuthStore from '../store/useAuthStore';

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData.email, formData.password);
      
      if (response.data.success) {
        const { token, restaurantId, nom_restaurant, email, statut } = response.data.data;
        
        // Sauvegarder dans le store
        login(
          {
            restaurantId,
            nom_restaurant,
            email,
            statut
          },
          token
        );

        toast.success(`Bienvenue ${nom_restaurant} !`);
        navigate('/');
      }
    } catch (err) {
      console.error('Erreur login:', err);
      setError(
        err.response?.data?.message || 
        'Erreur de connexion. Vérifiez vos identifiants.'
      );
      toast.error('Connexion échouée');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-4">
            <Mic className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">VokalBox</h1>
          <p className="text-primary-100">Dashboard Restaurant</p>
        </div>

        {/* Formulaire de connexion */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Connexion
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="votre@email.fr"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="#" className="text-sm text-primary-600 hover:text-primary-700">
              Mot de passe oublié ?
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-primary-100 text-sm">
          <p>© 2024 VokalBox - E Formateck</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
