import React, { useState } from 'react';
import {
  Stethoscope,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  diagnoseUserAccess,
  FIRESTORE_RULES,
  FIRESTORE_RULES_CONSOLE_URL,
} from '../../utils/firebase';
import type { AccessDiagnostic } from '../../utils/firebase';

/**
 * Affiché quand Firestore refuse la gestion des utilisateurs. « Accès refusé »
 * ne dit pas quoi corriger : ce panneau teste chaque opération séparément,
 * montre l'email réellement présent dans le jeton de connexion (une casse
 * différente suffisait à faire diverger l'application et les règles) et le
 * projet Firebase réellement contacté, puis permet de republier les règles
 * sans aller chercher le fichier dans le dépôt.
 */
const FirestoreAccessHelp: React.FC = () => {
  const [diagnostic, setDiagnostic] = useState<AccessDiagnostic | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const runDiagnostic = async () => {
    setRunning(true);
    try {
      setDiagnostic(await diagnoseUserAccess());
    } finally {
      setRunning(false);
    }
  };

  const copyRules = async () => {
    try {
      await navigator.clipboard.writeText(FIRESTORE_RULES);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé, permission) : on repasse
      // par une zone de texte temporaire, qui fonctionne partout.
      const area = document.createElement('textarea');
      area.value = FIRESTORE_RULES;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
      <p className="text-sm text-amber-900">
        Les règles de sécurité publiées dans la console Firebase refusent cette opération.
        Lancez le diagnostic pour savoir précisément ce qui bloque, puis republiez les règles
        si nécessaire.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runDiagnostic}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-all duration-150"
        >
          {running ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Stethoscope className="w-4 h-4" />
          )}
          Diagnostiquer
        </button>

        <button
          type="button"
          onClick={copyRules}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-all duration-150"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? 'Règles copiées' : 'Copier les règles'}
        </button>

        <a
          href={FIRESTORE_RULES_CONSOLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-all duration-150"
        >
          <ExternalLink className="w-4 h-4" />
          Ouvrir la console
        </a>
      </div>

      {copied && (
        <p className="text-xs text-amber-800">
          Dans la console : onglet <strong>Règles</strong> → tout sélectionner → coller →{' '}
          <strong>Publier</strong>. Comptez une minute avant que la modification prenne effet.
        </p>
      )}

      {diagnostic && (
        <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-2">
          <dl className="text-xs text-gray-600 space-y-0.5">
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700">Compte connecté :</dt>
              <dd className="font-mono">{diagnostic.tokenEmail || '(inconnu)'}</dd>
            </div>
            {diagnostic.tokenEmail !== diagnostic.normalizedEmail && (
              <div className="flex gap-2">
                <dt className="font-medium text-gray-700">Identifiant de fiche :</dt>
                <dd className="font-mono">{diagnostic.normalizedEmail}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700">Projet Firebase :</dt>
              <dd className="font-mono">{diagnostic.projectId}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700">Admin principal :</dt>
              <dd>{diagnostic.isBootstrapAdmin ? 'oui' : 'non'}</dd>
            </div>
          </dl>

          <ul className="space-y-1 pt-1 border-t border-gray-100">
            {diagnostic.probes.map(p => (
              <li key={p.label} className="flex items-start gap-1.5 text-xs">
                {p.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-px" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-px" />
                )}
                <span className="text-gray-700">
                  {p.label} — <span className="font-mono text-gray-500">{p.detail}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-amber-900 pt-1 border-t border-gray-100">
            {diagnostic.unreachable
              ? "Firestore n'a pas répondu : impossible de conclure. Vérifiez la connexion Internet de ce poste, puis relancez le diagnostic."
              : diagnostic.allDenied
                ? "Toutes les opérations sont refusées : les règles publiées ne sont pas celles de l'application. Copiez-les et republiez-les."
                : diagnostic.probes.some(p => !p.ok)
                  ? 'Certaines opérations passent et d’autres non : les règles publiées sont une version antérieure. Copiez-les et republiez-les.'
                  : "Tout est passé. L'erreur datait d'avant la publication des règles : fermez puis rouvrez cette fenêtre."}
          </p>
        </div>
      )}
    </div>
  );
};

export default FirestoreAccessHelp;
