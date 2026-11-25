# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

Application web (PWA) de planning hebdomadaire des salariés d'un magasin. React 18 + TypeScript + Vite + Tailwind, données dans Firebase (Firestore + Authentication, projet `schedules-c28a2`). Interface, commentaires de code et messages de commit sont **en français** — garder cette langue.

## Commandes

```bash
npm ci              # installer les dépendances (node_modules n'est pas présent au démarrage d'une session cloud)
npm run dev         # serveur de dev Vite
npm run build       # build de production dans dist/
npm run lint        # ESLint sur tout le projet
npx tsc -p tsconfig.app.json --noEmit   # vérification des types (le build Vite ne type-check pas)
```

Il n'y a **pas de suite de tests**. Pour valider un changement visuel (vues, exports PDF/PNG), lancer `npm run dev` et piloter la page avec Playwright (préinstallé dans l'environnement cloud) : une page HTML temporaire à la racine peut importer directement un module, ex. `import { exportGridToPDF } from '/src/utils/pdfExport.ts'`, puis capturer le téléchargement. Supprimer ce fichier avant de commiter.

## Déploiement

Chaque push sur `main` déclenche `.github/workflows/deploy.yml` (Node 22, `npm install`, `npm run build`) et publie sur GitHub Pages (`ricou05.github.io/PLANNING_TIMELINE`). `vite.config.ts` met `base` à `/PLANNING_TIMELINE/` uniquement quand `GITHUB_ACTIONS` est défini. Le service worker PWA (`registerType: 'autoUpdate'`) met l'app à jour côté utilisateurs.

**À chaque publication sur `main`, incrémenter la version** dans `src/version.ts` (`APP_VERSION` + `APP_RELEASE_DATE` au format `JJ/MM/AAAA`) — demande explicite de l'utilisateur. Correctif → patch (1.14.0 → 1.14.1), nouvelle fonctionnalité → mineure (1.14.0 → 1.15.0). Cette version est affichée dans l'app (menu Fichier, page de login) ; le champ `version` de `package.json` n'est pas utilisé. Le skill projet **`/publier`** (`.claude/skills/publier/`) enchaîne version, vérifications, commit et push sur `main`.

## Architecture

**Point d'entrée** : `main.tsx` → `AuthProvider` → `AuthGate` → `App`. `AuthGate` n'affiche l'app que si l'utilisateur est connecté **et** présent dans la liste blanche Firestore (`allowedUsers`). L'admin principal est codé en dur à la fois dans `src/utils/firebase/rules.txt` et dans le code (`utils/firebase/auth.ts`, `hooks/useAuth.tsx`, `utils/firebase/users.ts`) : les modifier ensemble.

**Menu Fichier** : `components/FileMenu/FileMenu.tsx` garde l'état et la logique de sauvegarde ; ses boîtes de dialogue sont des composants d'affichage dans `components/FileMenu/dialogs/`.

**État central dans `App.tsx`** (gros composant, ~800 lignes) : employés, semaine/année, onglet actif, réglages d'affichage. Les plannings sont un `Record<string, Schedule>` indexé par **`` `${employee.id}-${jour}` ``** où `jour` est le nom français (`'Lundi'`…`'Dimanche'`). Ce format de clé est utilisé partout (vues, calculs, exports, Firestore). Les plannings de plusieurs semaines sont gardés en mémoire dans `weeksRef`, indexés `AAAA-Sxx` ; `useUndoRedo` gère l'historique de la semaine affichée.

Un `Schedule` = créneaux matin/après-midi (`'HH:MM'`), couleur par demi-journée (id d'une `ManagedColor`), et états spéciaux : `isRestDay`, `absence` (journée), `morningAbsence`/`afternoonAbsence`. Toute nouvelle vue/export/calcul doit traiter ces cinq cas.

**Onglets / vues** (même données, rendus différents) :
- `grid` → `WeeklyGridView` (« Vue 1 », grille type Excel, la vue principale)
- `visual` → `WeeklyVisualView` (« Vue 2 », blocs colorés)
- `weekly` → `WeeklySchedule` (vue classique MAT/APM)
- un onglet par jour → `TimelineView` (frise horaire avec glisser/redimensionner, `utils/planningDrag.ts`, `utils/timelineCalculations.ts`)
- `excel` → `ExcelView`

**Calendrier** : les trois vues hebdomadaires affichent au-dessus des jours un bandeau des vacances scolaires A/B/C (`components/SchoolHolidayBand.tsx`, zone B = Nice mise en avant) et le nom des jours fériés sous la date. Dates des vacances dans `src/data/vacancesScolaires.ts` (à compléter chaque année), jours fériés calculés dans `utils/calendarInfo.ts`. Volontairement absents des exports PDF/PNG.

**Historique N-1** : le fichier Excel « Heures employés » est importé par un admin (menu Ouvrir → *Importer l'historique Excel*, `components/History/HistoryImportDialog.tsx`, lecture dans le navigateur par `utils/history/excelImport.ts`, période `HISTORY_FIRST_WEEK`→`HISTORY_LAST_WEEK`) dans la collection Firestore `historique` (un document par semaine `AAAA-Sxx`, `utils/firebase/history.ts`). **Ne jamais mettre ces données (noms, horaires) dans le code** : il est publié en clair. Le hook `useReferenceWeek` (appelé dans App) choisit la semaine de l'an passé la plus ressemblante (`utils/history/reference.ts` : vacances jour par jour, zone B pondérée double, jours fériés, ±2 semaines autour des mêmes dates) ; l'en-tête `ReferencePanel` s'affiche au-dessus des trois vues hebdo et les lignes `ReferenceRows` (heures, écart, effectifs N-1 ; le bandeau des vacances N-1 reste en haut dans l'en-tête) sont passées à chaque vue par la prop `footerRows`, sous la ligne des totaux ; choix manuel et état replié en `localStorage`.

**Correspondances N / N-1** (postes des saisonniers) : collection Firestore `correspondances`, un document par saison de référence (`REFERENCE_SEASON`, ex. `2025-2026`) avec `aliases` (prénom N-1 mal écrit → prénom N-1) et `successors` (prénom N-1 → nom du salarié N qui reprend le poste, `''` = non repris, absent = même prénom automatiquement). Logique dans `utils/history/correspondences.ts`, saisie dans `CorrespondencesDialog` (bouton de l'en-tête N-1), hook `useCorrespondences`. Sert au rappel « N-1 : xxh (prénom) » sous le total de chaque salarié (prop `referenceTotals` des vues) et à « Reprendre les horaires N-1 » (`utils/history/prefill.ts` : cases vides seulement, horaires et repos mais pas les absences, heures ramenées dans `TIME_CONSTRAINTS`, une seule étape d'annulation). Salariés N identifiés par leur nom (les `id` sont réattribués) ; un successeur peut être un salarié pas encore dans le planning (« + nouveau salarié »), que « Reprendre les horaires N-1 » propose d'ajouter (`missingSuccessors`, `handleAddNamedEmployees` dans App). Le tableau ne liste que les saisonniers N-1 présents un mois avant/après la semaine de référence (bouton pour voir toute la saison).

**Liste de salariés** : bouton « Coller une liste » à côté du nombre de salariés (`EmployeeListDialog`, `utils/employeeList.ts`) ; renomme les salariés reconnus (même prénom ou prénom abrégé), réutilise les « Employe N », ajoute les autres, ordre de la liste en option.

**Phases à venir** : voir `FEUILLE_DE_ROUTE.md` (référence N-1 tirée des plannings de l'application, planning réalisé vs prévu).

**Connexion** : l'adresse email doit être confirmée (`emailVerified`, statut `unverified` → `VerifyEmailScreen`), et les règles Firestore l'exigent aussi (`email_verified`).

Les réglages d'affichage (`DisplaySettingsMenu` : police, largeur de colonnes, épaisseur des traits) passent par des variables CSS (`--font-scale`, `--col-scale`, `--table-border-width`) sur le conteneur `.display-scope`, et sont aussi transmis aux exports.

**Exports PDF/PNG** (`utils/pdfExport.ts` = point d'entrée ; code par vue dans `utils/pdf/` : `classicTable.ts`, `gridTable.ts`, `visualTable.ts`, éléments communs et rendu dans `shared.ts` ; frise du jour dans `utils/pdfTimelineExport.ts`) : chaque vue est **reconstruite en DOM à part** (styles inline, largeur A4 paysage 1122 px), rendue par `html2canvas` puis insérée dans `jsPDF` ou téléchargée en PNG. Une modification visuelle d'une vue web ne se répercute donc pas sur l'export : il faut modifier les deux. `html2canvas` a des limites (centrage flex décalé → on centre par `line-height`, hauteurs entières pour éviter des liserés). `jspdf` et `html2canvas` sont importés dynamiquement. La hauteur des lignes est plafonnée à celle de l'écran (`MAX_ROW_H_*`), sauf option « Remplir toute la page » (`PDFExportOptions.fillPage`).

**Persistance — trois niveaux** (détails utilisateur dans `GUIDE_MULTI_PC.md`) :
1. Brouillon automatique : `useScheduleAutoSave` écrit dans `localStorage` (`schedule_autosave`, debounce 1,5 s) et dans Firestore `drafts/{uid}` (debounce 8 s) ; au démarrage, un brouillon cloud plus récent est proposé à l'utilisateur.
2. Sauvegardes nommées : collection Firestore `schedules` (`utils/firebase/schedules.ts`), avec détection de modification concurrente (« Modifié ailleurs entre-temps »).
3. Repli hors ligne : si Firestore refuse/échoue, la sauvegarde part dans `localStorage` (`utils/storage/localSchedules.ts`, flag `isLocal` + `remoteId` réservé pour éviter les doublons) et `utils/firebase/sync.ts` la remonte plus tard.

Couleurs gérées, modèles d'horaires et ordre des employés restent uniquement en `localStorage` (hooks `useManagedColors`, `useShiftTemplates`, `utils/employeeUtils.ts`).

**Règles Firestore** : la source de vérité est `src/utils/firebase/rules.txt`, à copier-coller **manuellement** dans la console Firebase (aucun déploiement automatique). Toute nouvelle collection ou tout nouveau champ contrôlé nécessite de mettre à jour ce fichier et de prévenir l'utilisateur qu'il doit republier les règles (voir `GUIDE_AUTHENTIFICATION.md`).

**Calculs d'heures** : `utils/scheduleCalculations.ts` (jour/semaine) et `utils/totalsCalculations.ts` ; formatage `8h45` via `formatHoursHM` (`utils/timeUtils.ts`). Bornes horaires de la journée : `TIME_CONSTRAINTS` dans `timeUtils.ts` (6h30 → 20h00 ; les dépassements occasionnels sont notés à la main sur le planning papier ; les champs horaires et la frise du jour s'en servent, ne pas recoder ces bornes en dur). Alertes de conformité au droit du travail (max 10 h/jour, 48 h/semaine, 6 h continues) : `utils/compliance.ts`.
