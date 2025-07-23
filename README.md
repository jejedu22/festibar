# 🎪 Bar Festival – Gestion des Commandes

Une application web simple pour gérer les commandes d’un bar lors d’un festival, avec interface admin, gestion de produits, catégories, commandes et rapports de ventes journaliers.

## 📊 Stack technique

* **Frontend** : Vue 3 + Vite + Tailwind CSS
* **Backend** : Node.js + Express
* **Base de données** : SQLite
* **Conteneurisation** : Docker + Docker Compose

---

## 🚀 Lancer le projet

### 🐳 Via Docker

1. **Construire et lancer** les conteneurs :

```bash
docker-compose -f docker-compose.prod.yml up --build
```

2. Accéder à l'application :

   * Frontend : [http://localhost:8001](http://localhost:8001)
   * Backend API : [http://localhost:3001](http://localhost:3001)

---

## 📁 Structure du projet

```
.
├── backend/            # API Express + SQLite
│   └── index.js
├── frontend/           # Vue 3 App
│   ├── src/
│   └── public/
├── docker-compose.prod.yml
├── .gitignore
└── README.md
```

---

## 🔐 Fonctionnalités

### Côté utilisateur (commande)

* Sélection de produits groupés par **catégories dépliables**
* Ajout / suppression des quantités
* Calcul automatique du total
* Validation de commande → redirection vers un **récapitulatif clair**

### Côté administrateur

* Interface de gestion des **produits** et **catégories**
* Saisie des prix / modifications
* Suppression des produits
* Suppression des catégories (si non utilisées)
* **Connexion requise** (authentification basique en localStorage)

### Ventes & statistiques

* Vue par jour : total **par produit** (quantité + montant)
* **Total global journalier**
* Bouton pour **vider toutes les commandes** (avec confirmation)

---

## 🔒 Authentification

* Connexion simple pour accéder aux routes `/admin` et `/categories`
* Stockage d’un flag `isAuthenticated` dans le `localStorage`
* Redirection automatique si non connecté

---

## 🗃️ Données persistées

Les données sont stockées dans un fichier SQLite (`bar.db`) monté dans le conteneur `backend`.

---

## 🧪 Tests et débogage

* Utilise `console.log()` ou les DevTools Vue pour inspecter l’état du panier.
* En cas de problème avec SQLite, supprime `bar.db` pour repartir de zéro.

---

## 🧼 Reset des données

Pour supprimer toutes les commandes existantes :

1. Accéder à `/admin`
2. Cliquer sur **🗑️ Vider les commandes**
3. Valider la confirmation

---

## ✨ À faire / améliorations possibles

* Authentification sécurisée (JWT, sessions)
* Édition des commandes
* Impression du ticket de commande
* Export CSV des ventes

---

## 📄 Licence

Ce projet est open-source et libre de droit pour usage personnel ou en festival. 🍻
