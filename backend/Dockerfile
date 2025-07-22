# backend/Dockerfile
FROM node:20

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Expose port
EXPOSE 3001

# Run app
CMD [ "node", "index.js" ]
