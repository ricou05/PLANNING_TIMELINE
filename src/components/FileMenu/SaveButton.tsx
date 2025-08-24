import React from 'react';
import { Save } from 'lucide-react';

interface SaveButtonProps {
  onClick: () => void;
  loading: boolean;
}

export const SaveButton: React.FC<SaveButtonProps> = ({ onClick, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
  >
    <Save className="w-4 h-4 mr-2" />
    {loading ? 'Sauvegarde en cours...' : 'Sauvegarder'}
  </button>
);