# Travailler depuis plusieurs PC

Le planning peut être utilisé depuis plusieurs ordinateurs avec le même compte.
Voici ce qui suit d'un poste à l'autre, et ce qui reste local.

## Ce qui suit vos ordinateurs

| Élément | Suit les PC ? | Où c'est stocké |
|---|---|---|
| Sauvegardes manuelles (*Sauvegarder*, *Enregistrer sous*) | Oui | Firestore, collection `schedules` |
| Brouillon en cours (auto-sauvegarde) | Oui | Firestore, collection `drafts` (un document par utilisateur) |
| Sauvegarde de secours après une panne réseau | Pas tout de suite | `localStorage` du navigateur, puis envoyée automatiquement |
| Couleurs, modèles d'horaires, ordre des employés | Non | `localStorage` du navigateur |

## Les repères dans l'application

- **« Brouillon en ligne »** (nuage bleu, en haut) : votre travail en cours est
  disponible depuis vos autres PC. L'envoi a lieu quelques secondes après la
  dernière modification, et à chaque fois que vous quittez l'onglet.
- **« Brouillon local »** (nuage barré) : l'envoi n'a pas abouti (hors ligne,
  ou règles Firestore non republiées). Le travail est conservé sur ce PC.
- **« Local — non synchronisé »** (badge orange sur une sauvegarde) : cette
  sauvegarde n'existe que sur ce PC. Elle partira en ligne toute seule.
- **« N à synchroniser »** (bouton orange) : nombre de sauvegardes encore
  locales. Cliquer force une nouvelle tentative d'envoi.

## Les trois situations à connaître

**Vous reprenez le travail sur un autre PC.** À l'ouverture, si un brouillon plus
récent existe sur un autre poste, l'application le propose : *« Brouillon plus
récent disponible — laissé sur Chrome sur Windows le 04/08/2026 à 18h42 »*.
Vous choisissez de le récupérer ou de l'ignorer. Tant que vous n'avez pas
répondu, l'application n'écrase pas ce brouillon.

**Vous sauvegardez alors que le planning a changé ailleurs.** L'application
refuse d'écraser en silence et affiche *« Modifié ailleurs entre-temps »*.
Vous pouvez écraser quand même, ou annuler et rouvrir la version en ligne.

**Vous travaillez sans connexion.** La sauvegarde est acceptée et mise en file
d'attente ; elle part au retour du réseau. Si l'accès en ligne est refusé
franchement, la sauvegarde bascule en local avec le badge orange, et
l'application la remonte en ligne au démarrage suivant ou dès le retour de la
connexion — sans créer de doublon.

## Conseils

- Utilisez le **même compte** sur tous vos PC : le brouillon partagé est lié à
  votre compte, pas au poste.
- Évitez de laisser l'application ouverte sur un PC pendant que vous travaillez
  sur l'autre : les deux brouillons se chassent l'un l'autre (c'est le plus
  récent qui gagne).
- Pour un travail important, faites une **sauvegarde manuelle nommée** : c'est
  le seul niveau qui garde un historique consultable dans *Ouvrir*.
