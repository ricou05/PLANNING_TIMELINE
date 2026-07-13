import React from 'react';
import { ShieldX, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// Affiché quand l'utilisateur est connecté mais que son email n'est pas
// dans la liste blanche : il doit demander l'accès à l'administrateur.
const UnauthorizedScreen: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center animate-scaleIn">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 border border-red-100 rounded-2xl mb-4">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Accès non autorisé</h1>
        <p className="text-sm text-gray-500 mt-2">
          Le compte <span className="font-medium text-gray-700">{user?.email}</span> n'est pas
          autorisé à accéder aux plannings.
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Demandez à votre administrateur d'ajouter votre adresse email à la liste des
          utilisateurs, puis reconnectez-vous.
        </p>
        <button
          onClick={signOut}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedScreen;
