# Festibar – Gestion des commandes pour un bar de festival

Festibar est une application web conçue pour prendre rapidement les commandes d’une buvette lors d’un festival ou d’un événement associatif.
Les serveurs saisissent les commandes sur leur téléphone (même sans réseau), le gestionnaire gère la carte et suit les ventes.

---

## 🚀 Technologies & Architecture

- **Frontend** : Vue 3 + Vite + Tailwind CSS (application installable, fonctionnement hors-ligne)
- **Backend** : Node.js + Express
- **Base de données** : SQLite (`bar.db`), sauvegardée automatiquement
- **Conteneurisation** : Docker & Docker Compose (prod/dev), exposé en HTTPS derrière Traefik

---

## 🛠 Mise en route

### 🐳 Production (Docker, derrière Traefik)

Une seule image contient l'API Express **et** le frontend Vue compilé (build multi-étapes, voir `Dockerfile`).
L'application ne publie aucun port : elle est servie en HTTPS par la stack Traefik, via le réseau Docker partagé `proxy`.

**Prérequis** :
- la stack Traefik démarrée (elle crée le réseau `proxy`, l'entrypoint `websecure`, le resolver `letsencrypt` et le middleware `security-headers@file`) ;
- un enregistrement DNS du domaine choisi pointant vers le serveur.

1. **Choisir le domaine** (fichier `.env` à la racine, lu par Docker Compose) :

```bash
cp .env.example .env   # puis FESTIBAR_HOST=bar.exemple.fr
```

2. **Configurer l'application** (mot de passe admin, fuseau horaire, SMTP, mentions légales…) :

```bash
cp backend/.env.example backend/.env.local   # puis éditer les valeurs
```

3. **Construire et lancer** :

```bash
docker compose up -d --build
```

4. Accéder à l'application : `https://<FESTIBAR_HOST>` (certificat Let's Encrypt obtenu par Traefik).

La base SQLite est persistée dans `./data/bar.db` sur l'hôte, avec des sauvegardes automatiques dans `./data/backups/`.
Pour reprendre une base existante, copiez-la dans `./data/bar.db` avant le premier lancement (elle est migrée automatiquement).

`TRUST_PROXY=1` est défini dans `docker-compose.yml` : l'application lit la vraie IP des clients transmise par Traefik (limitation des tentatives de connexion).
Le HTTPS est aussi ce qui permet d'installer l'application et de la recharger sans réseau (service worker).

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
├── backend/                  # API Express + SQLite
│   ├── config/               # Base de données (schéma + migrations), authentification
│   ├── controllers/          # Logique métier
│   ├── middlewares/          # Authentification admin / organisation
│   ├── routes/               # Routes /api
│   ├── scripts/              # hash-password.js
│   └── utils/                # Sauvegardes, journal d'audit, fuseau horaire…
├── frontend/                 # Application Vue 3
│   ├── src/
│   └── public/               # Manifest, icône, service worker
├── data/                     # Base SQLite et sauvegardes (créé au lancement Docker)
├── Dockerfile                # Image de production multi-étapes
├── docker-compose.yml        # Production (derrière Traefik)
├── .env.example              # Domaine (FESTIBAR_HOST) pour docker-compose.yml
├── docker-compose.dev.yml    # Développement
└── README.md
```

---

## ✨ Fonctionnalités

### Prise de commande (serveurs)

- Grille de gros boutons : un appui = un article, bouton « − » pour corriger
- Raccourcis vers les catégories, produits épuisés grisés
- Panier conservé en cas de rechargement, protection contre le double envoi
- Choix du moyen de paiement (espèces, carte, autre)
- Récapitulatif avec numéro de commande en grand, montants rapides (juste, 5, 10, 20, 50 €) et calcul du rendu
- **Hors-ligne** : sans réseau, la commande est gardée sur le téléphone et envoyée automatiquement au retour de la connexion (sans doublon)
- Écran maintenu allumé pendant le service, carte rafraîchie toutes les 30 s
- Annulation possible par le serveur pendant 15 minutes (configurable)

### Gestion (gestionnaire)

- Produits : ajout, modification, bascule « en vente / épuisé » en un appui
- Catégories : ordre modifiable par glisser-déposer ou flèches
- Commandes : historique par soirée, annulation (conservée et tracée), retrait de ligne
- Ventes : totaux par soirée, par moyen de paiement, nombre d'annulations
- Export Excel (commandes + journal des annulations/suppressions)
- Remise à zéro protégée (export proposé, confirmation par saisie)

### Administration (administrateur global)

- Création des organisations, avec mot de passe gestionnaire et mot de passe serveurs

---

## 🔐 Authentification et sécurité

### Rôles

| Rôle | Connexion | Accès |
|---|---|---|
| Administrateur | `/admin/auth/login` (`ADMIN_PASSWORD_HASH`) | Organisations |
| Gestionnaire | `/<organisation>/login` (mot de passe gestionnaire) | Tout pour son organisation |
| Serveur | `/<organisation>/login` (mot de passe serveurs) | Prise de commande uniquement |

Chaque connexion renvoie un **jeton signé (JWT)** vérifié par le serveur à chaque requête, limité à son organisation et à son rôle.

### Mot de passe administrateur

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

### Protections

- Mots de passe hachés (bcrypt), 8 caractères minimum pour les organisations
- Limitation des tentatives de connexion et des envois du formulaire de contact
- En-têtes de sécurité (helmet, CSP), CORS fermé par défaut, erreurs génériques
- Validation des commandes côté serveur (quantités, produits disponibles, prix issus de la base)
- Annulations et suppressions tracées dans un journal d'audit

---

## 💾 Données

- Base SQLite `bar.db`, migrée automatiquement au démarrage
- Sauvegarde automatique toutes les heures (`BACKUP_INTERVAL_MINUTES`), 48 conservées (`BACKUP_KEEP`)
- Ventes regroupées par **journée de service** dans le fuseau de l'événement (`APP_TIMEZONE`) :
  avec `SERVICE_DAY_START_HOUR=6`, une vente à 1h du matin compte pour la soirée de la veille
- Les commandes annulées ne sont jamais effacées (statut « annulée »)
- Demandes de contact supprimées automatiquement après `CONTACT_RETENTION_DAYS` jours

---

## ⚖️ Mentions légales et RGPD

L'application fournit les pages **Mentions légales** (`/mentions-legales`), **Confidentialité** (`/confidentialite`) et **CGU** (`/cgu`).
Renseignez les variables `LEGAL_*` de `backend/.env.local` (éditeur, directeur de publication, hébergeur…) : les champs manquants s'affichent « [à compléter] ».

Points d'attention :

- **Festibar n'est pas un logiciel de caisse certifié** (art. 286, I-3° bis du CGI). Une organisation assujettie à la TVA doit utiliser un système de caisse certifié.
- Réglementation des buvettes temporaires (autorisation municipale, interdiction de vente d'alcool aux mineurs, affichage des prix TTC) : à la charge de l'organisation.
- Si l'application est exploitée par un organisme public, une déclaration d'accessibilité (RGAA) est obligatoire.

Ces textes sont une base de travail et ne remplacent pas l'avis d'un juriste.

---

## 🐛 Débogage & Tests
- Utiliser console.log() + DevTools Vue
- Supprimer `data/bar.db` pour repartir d’une base vide

---

## 📝 Pistes d'amélioration

- Montants stockés en centimes (entiers) plutôt qu'en nombres à virgule
- Impression de tickets de commande
- Gestion de stock (quantités) et alertes de rupture
- Plusieurs événements par organisation
- Internationalisation (i18n)

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
