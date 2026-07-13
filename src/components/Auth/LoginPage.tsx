import React, { useState } from 'react';
import {
  CalendarClock,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
  UserPlus,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  signInUser,
  registerUser,
  resetPassword,
  getAuthErrorMessage,
} from '../../utils/firebase';
import { APP_VERSION } from '../../version';

type Mode = 'signin' | 'reset' | 'register';

const MODE_TITLES: Record<Mode, { title: string; subtitle: string }> = {
  signin: {
    title: 'Bienvenue',
    subtitle: 'Connectez-vous pour accéder aux plannings',
  },
  reset: {
    title: 'Mot de passe oublié',
    subtitle: 'Recevez un lien de réinitialisation par email',
  },
  register: {
    title: 'Première connexion',
    subtitle: 'Créez votre mot de passe avec l\'email autorisé par votre administrateur',
  },
};

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInUser(email, password);
        // La suite est gérée par AuthGate via onAuthStateChanged
      } else if (mode === 'reset') {
        await resetPassword(email);
        setSuccess(
          `Si un compte existe pour ${email.trim()}, un email de réinitialisation vient d'être envoyé. Pensez à vérifier vos spams.`
        );
      } else {
        if (password.length < 8) {
          setError('Choisissez un mot de passe d\'au moins 8 caractères.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Les deux mots de passe ne correspondent pas.');
          return;
        }
        await registerUser(email, password);
        // Connecté automatiquement après création ; AuthGate vérifie
        // ensuite que l'email fait bien partie de la liste blanche.
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const { title, subtitle } = MODE_TITLES[mode];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Décor d'arrière-plan */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] bg-indigo-400/20 rounded-full blur-3xl" aria-hidden="true" />

      <div className="w-full max-w-md relative">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur border border-white/20 rounded-2xl shadow-lg mb-4">
            <CalendarClock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Planning Magasin</h1>
          <p className="text-blue-200 text-sm mt-1">Plannings hebdomadaires des salariés</p>
        </div>

        {/* Carte */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-scaleIn">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 animate-slideIn">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2 animate-slideIn">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@exemple.fr"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                  autoFocus
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {mode === 'register' ? 'Choisissez un mot de passe' : 'Mot de passe'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? '8 caractères minimum' : '••••••••'}
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label htmlFor="login-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirmez le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="login-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === 'signin' ? (
                <>
                  <LogIn className="w-5 h-5" />
                  Se connecter
                </>
              ) : mode === 'reset' ? (
                <>
                  <KeyRound className="w-5 h-5" />
                  Envoyer le lien de réinitialisation
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Créer mon accès
                </>
              )}
            </button>
          </form>

          {/* Liens de navigation entre les modes */}
          <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
            {mode === 'signin' ? (
              <>
                <button
                  onClick={() => switchMode('reset')}
                  className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Mot de passe oublié ?
                </button>
                <button
                  onClick={() => switchMode('register')}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Première connexion ? <span className="font-medium text-blue-600">Créer mon accès</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => switchMode('signin')}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-blue-200/70 text-xs mt-6">
          Accès réservé aux utilisateurs autorisés — v{APP_VERSION}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
