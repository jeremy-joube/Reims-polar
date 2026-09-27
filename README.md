# Jérémy Joube


> "L'informatique, c'est le Chaos, l'art et la Science. C'est une malédiction, une bénédiction et un progrès."

---

# 🎬 Reims Polar Planner

Application web permettant de consulter le programme du festival **Reims Polar** et de construire facilement son propre planning de projections.

Le projet automatise la récupération des informations du programme officiel et propose une interface permettant de sélectionner les films et les séances souhaitées, tout en détectant les conflits horaires.

> Projet personnel réalisé autour de l'édition 2026 du festival Reims Polar.

🌐 Site

[https://jeremy-joube.github.io/Reims-polar/web/](https://jeremy-joube.github.io/Reims-polar/web/)

---

## ✨ Fonctionnalités

### 📚 Catalogue des films

- Consultation de l'ensemble des films du festival
- Recherche par titre
- Filtrage par catégorie
- Affichage de la durée
- Consultation des séances disponibles
- Affichage des salles
- Ajout ou retrait d'un film du planning

### 📅 Création d'un planning

- Sélection des films souhaités
- Affichage des séances sélectionnées par journée
- Tri automatique par horaire
- Calcul de l'heure de fin des projections
- Affichage de la salle
- Comptage du nombre de films et de séances sélectionnés

### ⚠️ Gestion des conflits

L'application détecte automatiquement les séances qui se chevauchent.

Les séances en conflit sont mises en évidence afin de permettre à l'utilisateur de modifier son planning.

Il est possible de :

- conserver plusieurs séances d'un même film ;
- retirer individuellement une séance ;
- conserver les autres séances du même film ;
- supprimer complètement un film du planning.

### 💾 Sauvegarde locale

Le planning est sauvegardé dans le `localStorage` du navigateur.

Ainsi, l'utilisateur peut fermer puis rouvrir l'application sans perdre sa sélection.
