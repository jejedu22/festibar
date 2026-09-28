# Festibar – Gestion des commandes pour un bar de festival

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

### 🐳 Production (Docker)

Une seule image contient l'API Express **et** le frontend Vue compilé (build multi-étapes, voir `Dockerfile`).

1. **Configurer** les variables d'environnement (mot de passe admin, SMTP…) :

```bash
cp backend/.env.example backend/.env.local   # puis éditer les valeurs
```

2. **Construire et lancer** :

```bash
docker compose up -d --build
```

3. Accéder à l'application : [http://localhost:3001](http://localhost:3001)  
   (autre port : `FESTIBAR_PORT=8080 docker compose up -d --build`)

La base SQLite est persistée dans `./data/bar.db` sur l'hôte.  
Pour reprendre une base existante, copiez-la dans `./data/bar.db` avant le premier lancement.

Commandes utiles :

```bash
docker compose logs -f            # logs
docker compose down               # arrêt
docker compose up -d --build      # mise à jour après un git pull
```

### 🧑‍💻 Développement (Docker, rechargement à chaud)

```bash
docker compose -f docker-compose.dev.yml up
```

- Frontend (Vite) : [http://localhost:8001](http://localhost:8001)
- Backend API (nodemon) : [http://localhost:3001](http://localhost:3001)

### Sans Docker

```bash
npm run dev
```

---

## 📂 Organisation du projet

```
.
├── backend/              # API Express + SQLite
│   └── index.js
├── frontend/             # App Vue 3
│   ├── src/
│   └── public/
├── data/                 # Base SQLite (créée au lancement Docker)
├── Dockerfile            # Image de production multi-étapes
├── docker-compose.yml    # Production
├── docker-compose.dev.yml # Développement
├── .gitignore
└── README.md
```

---

## ✨ Fonctionnalités

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

### Administrateur global (`/admin/auth/login`)

- Le mot de passe n'est jamais stocké en clair : seule son **empreinte bcrypt** est configurée (`ADMIN_PASSWORD_HASH`).
- À la connexion, le serveur renvoie un **jeton signé (JWT)** valable `ADMIN_TOKEN_TTL` (12h par défaut), exigé par toutes les routes de gestion des organisations.
- 5 tentatives échouées par IP → blocage 15 minutes.

Configuration (dans `backend/.env.local`) :

```bash
# Générer l'empreinte du mot de passe
node backend/scripts/hash-password.js "mon-mot-de-passe"
# ou avec Docker :
docker compose run --rm festibar node scripts/hash-password.js "mon-mot-de-passe"
```

```env
ADMIN_PASSWORD_HASH='$2b$12$...'      # garder les apostrophes
JWT_SECRET=<openssl rand -hex 32>
```

> `ADMIN_PASSWORD` (en clair) reste accepté temporairement si `ADMIN_PASSWORD_HASH` est absent, avec un avertissement au démarrage.

### Organisations

- Mot de passe par organisation, stocké haché (bcrypt).

---

## 💾 Données
- Persistées via un fichier SQLite bar.db
- Simple à sauvegarder / restaurer
- Idéal pour un usage éphémère (festivals, événements temporaires)

---

## 🐛 Débogage & Tests
- Utiliser console.log() + DevTools Vue
- Supprimer `data/bar.db` pour repartir d’une base vide

---

## 📝 Plan d’améliorations (TODO)

- Authentification sécurisée des organisations (JWT, sessions)
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
