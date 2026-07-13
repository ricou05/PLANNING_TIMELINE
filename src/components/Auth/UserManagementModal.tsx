import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  UserPlus,
  Trash2,
  ShieldCheck,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
} from 'lucide-react';
import {
  listAllowedUsers,
  addAllowedUser,
  removeAllowedUser,
  BOOTSTRAP_ADMIN_EMAIL,
  normalizeEmail,
} from '../../utils/firebase';
import type { AllowedUser, UserRole } from '../../utils/firebase';
import { useAuth } from '../../hooks/useAuth';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [userToDelete, setUserToDelete] = useState<AllowedUser | null>(null);

  const currentEmail = user?.email ? normalizeEmail(user.email) : '';

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setUsers(await listAllowedUsers());
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      setError('Impossible de charger la liste des utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSuccess(null);
      setError(null);
      setNewEmail('');
      setNewRole('user');
      loadUsers();
    }
  }, [isOpen, loadUsers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const email = normalizeEmail(newEmail);
    if (!EMAIL_REGEX.test(email)) {
      setError('Adresse email invalide.');
      return;
    }
    if (users.some(u => u.email === email)) {
      setError('Cet utilisateur est déjà dans la liste.');
      return;
    }

    try {
      setSaving(true);
      await addAllowedUser(email, newRole, currentEmail);
      setSuccess(
        `${email} peut maintenant créer son accès via « Première connexion » sur la page de login.`
      );
      setNewEmail('');
      setNewRole('user');
      await loadUsers();
    } catch (err) {
      console.error("Erreur lors de l'ajout de l'utilisateur:", err);
      setError("Impossible d'ajouter cet utilisateur. Vérifiez votre connexion et vos droits.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (target: AllowedUser) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await removeAllowedUser(target.email);
      setSuccess(`L'accès de ${target.email} a été révoqué.`);
      await loadUsers();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError('Impossible de révoquer cet utilisateur.');
    } finally {
      setSaving(false);
      setUserToDelete(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl w-[560px] max-h-[85vh] flex flex-col animate-scaleIn">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Gestion des utilisateurs</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 animate-slideIn">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2 animate-slideIn">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Ajout d'un utilisateur */}
          <form onSubmit={handleAdd}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Autoriser un nouvel utilisateur
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="prenom.nom@exemple.fr"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150 bg-white"
              >
                <option value="user">Utilisateur</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={saving || !newEmail.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150 whitespace-nowrap"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Ajouter
              </button>
            </div>
            <p className="flex items-start gap-1.5 text-xs text-gray-500 mt-2">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
              La personne créera ensuite son mot de passe via « Première connexion » sur la page
              de login, avec cette adresse email.
            </p>
          </form>

          {/* Liste des utilisateurs autorisés */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Utilisateurs autorisés
            </label>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                Aucun utilisateur dans la liste pour le moment.
              </p>
            ) : (
              <div className="space-y-2">
                {users.map((allowedUser) => {
                  const isBootstrap = allowedUser.email === BOOTSTRAP_ADMIN_EMAIL;
                  const isSelf = allowedUser.email === currentEmail;
                  return (
                    <div
                      key={allowedUser.email}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                    >
                      <div
                        className={`flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 ${
                          allowedUser.role === 'admin'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {allowedUser.role === 'admin' ? (
                          <ShieldCheck className="w-5 h-5" />
                        ) : (
                          <UserIcon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {allowedUser.email}
                          {isSelf && <span className="ml-1.5 text-xs text-gray-400">(vous)</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${
                              allowedUser.role === 'admin'
                                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                : 'bg-gray-50 text-gray-500 border border-gray-200'
                            }`}
                          >
                            {allowedUser.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                          </span>
                          {isBootstrap && (
                            <span className="text-xs text-gray-400">Admin principal</span>
                          )}
                        </div>
                      </div>
                      {!isBootstrap && !isSelf && (
                        <button
                          onClick={() => setUserToDelete(allowedUser)}
                          disabled={saving}
                          title="Révoquer l'accès de cet utilisateur"
                          className="flex items-center justify-center w-9 h-9 border border-gray-200 rounded-lg hover:border-red-400 hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-all duration-150"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Confirmation de révocation */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl w-[400px] animate-scaleIn">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Révoquer l'accès</h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600">
                Voulez-vous vraiment révoquer l'accès de{' '}
                <span className="font-semibold text-gray-900">{userToDelete.email}</span> ?
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Cette personne ne pourra plus consulter ni modifier les plannings. Vous pourrez
                la réautoriser plus tard en rajoutant son email.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(userToDelete)}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
              >
                Révoquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementModal;
