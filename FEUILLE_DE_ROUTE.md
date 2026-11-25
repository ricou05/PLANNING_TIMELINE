# Feuille de route

Idées validées avec l'utilisateur, à réaliser dans une phase ultérieure.
(Aucun nom de salarié dans ce fichier : le dépôt est public.)

## Phase 4 — Référence N-1 tirée des plannings de l'application (prévu vs réalisé)

**Quand :** dès que l'application aura environ un an d'utilisation, les plannings
N-1 existeront dans l'application elle-même (sauvegardes nommées, collection
Firestore `schedules`, une sauvegarde = une semaine `weekNumber`/`year`).

**Objectifs :**

1. **Source N-1 = l'application** quand elle a la semaine de référence ;
   l'historique Excel (collection `historique`) reste la source pour les
   semaines antérieures à l'utilisation de l'application.
   - Plusieurs sauvegardes pour une même semaine : retenir la plus récente
     (ou celle marquée « réalisé », voir point 2).
   - Avantage : les **couleurs** suivent. « Reprendre les horaires N-1 »
     recopierait aussi les couleurs, donc le **jaune « St Pierre »** (magasin
     UTILE 2) sans attribut « magasin » à gérer — c'est la raison pour
     laquelle cet attribut a été écarté pour l'instant (pas de complexité en
     plus tant que la référence vient de l'Excel, qui mélange les deux
     magasins sans couleur).
   - Même logique de correspondances N / N-1 (`correspondances`) : les
     salariés N-1 sont alors des salariés de l'application.

2. **Planning réalisé** : les plannings sont souvent modifiés sur le terrain
   (conditions de travail, météo, affluence). Il faut pouvoir, après coup,
   ajuster la semaine pour qu'elle reflète ce qui a **réellement** été fait :
   - marquer une semaine comme « réalisé » (ou garder deux versions : prévu
     et réalisé) ;
   - la référence N-1 utilise le **réalisé** en priorité, sinon le prévu ;
   - afficher l'écart prévu / réalisé (heures, effectifs) pour apprendre
     d'une saison sur l'autre.

**Points à trancher au démarrage de la phase :** une seule version
« réalisé » qui remplace le prévu, ou deux versions conservées ; qui peut
valider un réalisé (admin seulement ?) ; faut-il des règles Firestore
supplémentaires (nouveau champ contrôlé dans `schedules`).

## À revoir — Liste des salariés par période

La fonction « Coller une liste de salariés » (1.18.0) a été retirée en 1.18.1 :
la liste des salariés de l'application est **commune à toutes les semaines**,
donc renommer « Isa » en nom complet ou réutiliser un « Employe N » modifiait
aussi les plannings des semaines passées. Besoin réel : n'appliquer la liste
du personnel de la saison qu'aux semaines **à venir**, au moment de reprendre
un planning N-1 (correspondances N / N-1). Piste : une liste de salariés propre
à chaque semaine (ou à chaque saison), copiée de la semaine précédente, au lieu
d'une liste unique.
