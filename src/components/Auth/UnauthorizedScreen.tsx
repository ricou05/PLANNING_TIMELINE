import React from 'react';
import { ShieldX, LogOut, RefreshCw, WifiOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// Affiché quand l'utilisateur est connecté mais que son email n'est pas
// dans la liste blanche : il doit demander l'accès à l'administrateur.
// Quand la vérification elle-même a échoué (réseau, règles Firestore), on le
// dit explicitement : ce n'est pas la même chose qu'un accès refusé.
const UnauthorizedScreen: React.FC = () => {
  const { user, signOut, recheck, authError } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center animate-scaleIn">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
            authError ? 'bg-amber-50 border border-amber-100' : 'bg-red-50 border border-red-100'
          }`}
        >
          {authError ? (
            <WifiOff className="w-8 h-8 text-amber-500" />
          ) : (
            <ShieldX className="w-8 h-8 text-red-500" />
          )}
        </div>

        <h1 className="text-xl font-semibold text-gray-900">
          {authError ? 'Vérification impossible' : 'Accès non autorisé'}
        </h1>

        {authError ? (
          <>
            <p className="text-sm text-gray-500 mt-2">
              Impossible de vérifier les droits du compte{' '}
              <span className="font-medium text-gray-700">{user?.email}</span>.
            </p>
            <p className="text-sm text-gray-500 mt-1">{authError}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mt-2">
              Le compte <span className="font-medium text-gray-700">{user?.email}</span> n'est pas
              autorisé à accéder aux plannings.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Demandez à votre administrateur d'ajouter votre adresse email à la liste des
              utilisateurs, puis cliquez sur « Réessayer ».
            </p>
          </>
        )}

        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={recheck}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 shadow-sm transition-all duration-150"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedScreen;
