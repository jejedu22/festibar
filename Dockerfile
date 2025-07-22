# 🐳 Étape 1 : Image légère avec Node
FROM node:20

# Dossier de travail dans le container
WORKDIR /app

# Copier le backend
COPY backend/ ./backend

# Copier uniquement le frontend déjà compilé
COPY frontend/dist/ ./backend/public/

# Copier les fichiers de config backend (ex: package.json à la racine ou dans backend)
COPY backend/package*.json ./backend/

# Installer les dépendances backend
RUN cd backend && npm install --omit=dev

# Exposer le port du serveur Express
EXPOSE 3000

# Lancer le backend
CMD ["node", "backend/server.js"]
