import React, { useState } from 'react';
import { MailCheck, LogOut, RefreshCw, Send } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { sendVerificationEmail, getAuthErrorMessage } from '../../utils/firebase';

// Affiché quand le compte (email + mot de passe) n'a pas encore confirmé son
// adresse : sans cette confirmation, n'importe qui pourrait créer un compte
// avec l'email d'une personne autorisée et accéder aux plannings.
const VerifyEmailScreen: React.FC = () => {
  const { user, signOut, confirmEmailVerified } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const handleConfirm = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const verified = await confirmEmailVerified();
      if (!verified) {
        setMessage({
          kind: 'error',
          text: "L'adresse n'est pas encore confirmée. Cliquez sur le lien reçu par email, puis réessayez.",
        });
      }
    } catch (err) {
      setMessage({ kind: 'error', text: getAuthErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await sendVerificationEmail();
      setMessage({ kind: 'info', text: 'Email envoyé. Pensez à regarder dans les courriers indésirables.' });
    } catch (err) {
      setMessage({ kind: 'error', text: getAuthErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center animate-scaleIn">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-blue-50 border border-blue-100">
          <MailCheck className="w-8 h-8 text-blue-600" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900">Confirmez votre adresse email</h1>
        <p className="text-sm text-gray-500 mt-2">
          Un lien de confirmation a été envoyé à{' '}
          <span className="font-medium text-gray-700">{user?.email}</span>.
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Cliquez sur ce lien, puis revenez ici et cliquez sur « J'ai confirmé ».
        </p>

        {message && (
          <p className={`text-sm mt-4 ${message.kind === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {message.text}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 shadow-sm transition-all duration-150"
          >
            <RefreshCw className="w-4 h-4" />
            J'ai confirmé
          </button>
          <button
            onClick={handleResend}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-all duration-150"
          >
            <Send className="w-4 h-4" />
            Renvoyer l'email
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

export default VerifyEmailScreen;
