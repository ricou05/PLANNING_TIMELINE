# Guide d'activation de l'authentification

L'application est désormais protégée par un login : personne ne peut consulter ni
modifier les plannings sans être connecté **et** autorisé.

⚠️ **Le code seul ne suffit pas.** Deux actions dans la console Firebase sont
indispensables (5 minutes, à faire une seule fois) — sans elles, soit le login ne
fonctionnera pas, soit la base restera ouverte à tous.

---

## Étape 1 — Activer la connexion par email/mot de passe

1. Ouvrir la [console Firebase](https://console.firebase.google.com/) → projet **schedules-c28a2**
2. Menu de gauche : **Création (Build) → Authentication**
3. Cliquer sur **Commencer** (si première fois)
4. Onglet **Sign-in method** → **Ajouter un fournisseur** → **Adresse e-mail/Mot de passe**
5. Activer le premier interrupteur (**E-mail/Mot de passe**) → **Enregistrer**
   (inutile d'activer le « lien e-mail / connexion sans mot de passe »)

## Étape 2 — Publier les nouvelles règles de sécurité (LE PLUS IMPORTANT)

C'est cette étape qui ferme réellement l'accès public à la base.

1. Console Firebase → **Création (Build) → Firestore Database** → onglet **Règles**
2. Supprimer tout le contenu affiché
3. Copier-coller **l'intégralité** du fichier [`src/utils/firebase/rules.txt`](src/utils/firebase/rules.txt)
4. Cliquer sur **Publier**

> Tant que cette étape n'est pas faite, l'ancienne règle `allow read, write: if true`
> reste active et **n'importe qui sur Internet peut lire/modifier/supprimer les données**.

## Étape 3 — Créer votre compte admin

1. Ouvrir l'application (une fois la nouvelle version déployée)
2. Sur la page de connexion, cliquer sur **« Première connexion ? Créer mon accès »**
3. Saisir `eric.isola@gmail.com` et choisir votre mot de passe (8 caractères minimum)
4. Valider : vous êtes connecté en tant qu'administrateur

Votre email est reconnu comme **admin principal** : il est codé dans les règles de
sécurité et dans l'application, et ne peut pas être révoqué.

---

## Utilisation au quotidien

### Ajouter un utilisateur

1. Connecté en admin, cliquer sur le bouton **Utilisateurs** dans la barre du haut
2. Saisir l'email de la personne, choisir son rôle (**Utilisateur** ou **Admin**), cliquer **Ajouter**
3. Transmettre à la personne la marche à suivre :
   *« Va sur l'application → “Première connexion ? Créer mon accès” → saisis ton
   email et choisis ton mot de passe »*

Seuls les emails ajoutés à cette liste ont accès aux plannings. Une personne non
autorisée qui créerait un compte verrait un écran « Accès non autorisé » et les
règles de sécurité lui refuseraient toute donnée.

### Révoquer un utilisateur

Bouton **Utilisateurs** → icône corbeille en face de son email → **Révoquer**.
Son accès aux données est coupé immédiatement (même si son compte de connexion
existe toujours, il ne peut plus rien lire ni écrire). Optionnel : vous pouvez
aussi supprimer son compte dans la console Firebase (Authentication → Users).

### Mot de passe oublié

Sur la page de connexion : **« Mot de passe oublié ? »** → saisir l'email →
un lien de réinitialisation est envoyé par email (vérifier les spams). Cela vaut
pour tous les utilisateurs, admin compris.

### Rôles

| | Utilisateur | Admin |
|---|---|---|
| Consulter / modifier les plannings | ✅ | ✅ |
| Gérer la liste des utilisateurs | ❌ | ✅ |

---

## Notes techniques

- La liste blanche vit dans la collection Firestore `allowedUsers` (1 document
  par email, avec un champ `role`).
- L'admin principal (`eric.isola@gmail.com`) est défini à deux endroits qui
  doivent rester synchronisés : `src/utils/firebase/auth.ts`
  (`BOOTSTRAP_ADMIN_EMAIL`) et `src/utils/firebase/rules.txt`. Pour changer
  d'admin principal, modifier les deux puis republier les règles (étape 2).
- La clé `apiKey` visible dans `config.ts` n'est **pas** un secret : pour une
  app web Firebase, la sécurité repose entièrement sur les règles Firestore.
