# Étape 1 : Utiliser Node.js
FROM node:20

# Créer un dossier de travail
WORKDIR /app

# Copier les fichiers de config backend d'abord pour le cache
COPY backend/package*.json ./backend/

# Installer les dépendances backend
RUN cd backend && npm install --omit=dev

# Copier tous les fichiers backend
COPY backend/ ./

# Exposer le port du serveur Express
EXPOSE 80

# Commande de démarrage
CMD ["node", "server.js"]
