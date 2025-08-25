from pathlib import Path

# Contenu du README proposé
readme_content = """# Festibar – Gestion des commandes pour un bar de festival

Festibar est une application web simple conçue pour gérer de manière efficace les commandes d’un bar lors d’un festival.  
Elle inclut une interface utilisateur fluide pour passer des commandes et un espace administrateur pour gérer les produits, catégories ainsi que les statistiques de vente.

---

## 🚀 Technologies & Architecture

- **Frontend** : Vue 3 + Vite + Tailwind CSS  
- **Backend** : Node.js + Express  
- **Base de données** : SQLite (`bar.db`)  
- **Conteneurisation** : Docker & Docker Compose (prod/dev)  

---

## 🛠 Mise en route

### 🐳 Via Docker

1. **Construire et lancer** les conteneurs :

```bash
docker-compose -f docker-compose.prod.yml up --build
```

2. Accéder à l'application :

   * Frontend : [http://localhost:8001](http://localhost:8001)
   * Backend API : [http://localhost:3001](http://localhost:3001)

---

## 📂 Organisation du projet

```
.
├── backend/              # API Express + SQLite
│   └── index.js
├── frontend/             # App Vue 3
│   ├── src/
│   └── public/
├── docker-compose.prod.yml
├── .gitignore
└── README.md
```

---

##✨ Fonctionnalités

### Côté client (prise de commandes)

- Produits affichés par catégories déroulables
- Ajout / suppression de quantités
- Total automatiquement mis à jour
- Finalisation de commande avec récapitulatif clair

### Côté administrateur

- Gestion des produits : ajout, modification (prix), suppression
- Gestion des catégories (suppression possible si vide)
- Authentification simple via localStorage
- Réinitialisation totale des commandes

### Ventes & statistiques
- Vue journalière avec détails par produit (quantité vendue + montant)
- Total global journalier
- Bouton “vider toutes les commandes” avec confirmation

---

## 🔐 Authentification

- Basée sur un flag isAuthenticated stocké dans localStorage
- Redirection automatique si l’utilisateur n’est pas authentifié

---

## 💾 Données
- Persistées via un fichier SQLite bar.db
- Simple à sauvegarder / restaurer
- Idéal pour un usage éphémère (festivals, événements temporaires)

---

## 🐛 Débogage & Tests
- Utiliser console.log() + DevTools Vue
- Supprimer bar.db pour repartir d’une base vide

---

## 📝 Plan d’améliorations (TODO)

- Authentification sécurisée (JWT, sessions)
- Édition des commandes en cours
- Impression de tickets de commande
- Export CSV des ventes
- Internationalisation (i18n) et design responsive amélioré

---

## 🤝 Contribuer

1. Fork du projet
2. Créez une branche : git checkout -b feature/ma-fonctionnalite
3. Committez vos changements : git commit -m "Ajout de ma fonctionnalité"
4. Poussez vers la branche : git push origin feature/ma-fonctionnalite
5. Ouvrez une Pull Request
Merci pour vos contributions ! 🎉

---

📜 Licence

Ce projet est open-source et libre de droit pour usage personnel ou en festival. 🍻
