import React from 'react';
import { Check, AlertTriangle, WifiOff } from 'lucide-react';

interface StatusMessageProps {
  error: string | null;
  success: string | null;
  warnings: string[];
  isOffline?: boolean;
}

const StatusMessage: React.FC<StatusMessageProps> = ({ error, success, warnings, isOffline }) => {
  if (!error && !success && warnings.length === 0 && !isOffline) return null;

  return (
    <div className="space-y-2">
      {isOffline && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-blue-500" />
          <p className="text-sm text-blue-600">
            Mode hors ligne - Les modifications seront synchronisées automatiquement
          </p>
        </div>
      )}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-2 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <p className="text-sm font-medium text-yellow-700">Avertissements:</p>
          </div>
          {warnings.map((warning, index) => (
            <p key={index} className="text-sm text-yellow-600 ml-6">{warning}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusMessage;
