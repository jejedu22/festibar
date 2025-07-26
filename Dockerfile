# Étape 1 : Utiliser Node.js
FROM node:20

# Créer un dossier de travail
WORKDIR /app

# Copier tous les fichiers backend
COPY backend/ ./

# Installer les dépendances backend
RUN npm install --omit=dev

# Exposer le port du serveur Express
EXPOSE 80

# Commande de démarrage
CMD ["node", "server.js"]
