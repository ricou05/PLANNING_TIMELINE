---
name: publier
description: Publie l'application en production (branche main → GitHub Pages) : incrémente la version dans src/version.ts, vérifie types/lint/build, commit et pousse. À utiliser quand l'utilisateur tape /publier ou demande de « publier », « mettre en ligne », « déployer » ou « pousser sur main ».
---

# Publier une nouvelle version

L'invocation de ce skill par l'utilisateur vaut autorisation explicite de pousser sur `main`.
Arguments possibles : `patch` (correctif), `mineure` (nouvelle fonctionnalité), ou un numéro exact (`1.16.0`).

## 1. Choisir le numéro de version

- Lire `APP_VERSION` dans `src/version.ts` et comparer avec `git show origin/main:src/version.ts` :
  si la version a **déjà** été montée depuis la dernière publication sur `main`, ne pas la remonter.
- Sinon : argument fourni → l'appliquer. Sans argument → déduire du contenu de `git log origin/main..HEAD` et du diff :
  correctif seul → patch (1.14.0 → 1.14.1) ; au moins une nouvelle fonctionnalité → mineure (1.14.0 → 1.15.0, patch remis à 0).
  En cas de doute, demander à l'utilisateur.
- Mettre à jour `APP_VERSION` **et** `APP_RELEASE_DATE` (date du jour, format `JJ/MM/AAAA`). Ne pas toucher au `version` de `package.json` (inutilisé).

## 2. Vérifier avant de publier

```bash
npm ci   # seulement si node_modules est absent
npx tsc -p tsconfig.app.json --noEmit
npm run lint
npm run build
```

- Une erreur de types ou de build **bloque** la publication : corriger ou s'arrêter et expliquer.
- Lint : comparer avec `main`. Seules les **nouvelles** erreurs introduites par les changements bloquent.
- Vérifier qu'aucun fichier temporaire de test (page HTML à la racine, captures) ne traîne dans `git status`.
- Si `src/utils/firebase/rules.txt` fait partie des changements, le signaler : les règles doivent être recopiées à la main dans la console Firebase.

## 3. Commit et push

- Commit en français, message court décrivant le changement visible et la version (ex. « Corrige l'export PNG du dimanche, version 1.14.1 »).
- Pousser la branche de travail courante, puis amener `main` au même commit **en avance rapide uniquement** :

```bash
git fetch origin main
git push origin HEAD:main
```

- Si le push est refusé (main a avancé) : `git merge --no-edit origin/main`, relancer l'étape 2, puis repousser. Jamais de `--force` sur `main`.

## 4. Après publication

- Indiquer la version publiée et le lien du déploiement : https://github.com/ricou05/PLANNING_TIMELINE/actions
- Rappeler que l'app se met à jour seule chez les utilisateurs (service worker), au plus tard à la prochaine réouverture.
