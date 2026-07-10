# Étape 1 : Build de l'application
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copie des fichiers de configuration des dépendances
COPY package*.json ./

# Installation de toutes les dépendances (y compris de dev pour le build)
RUN npm install

# Copie du schéma Prisma pour générer le client
COPY prisma ./prisma/
RUN npx prisma generate

# Copie du reste des sources
COPY . .

# Build de l'application NestJS
RUN npm run build

# Étape 2 : Runtime de production
FROM node:20-alpine

WORKDIR /usr/src/app

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Copie des dépendances de production et des fichiers buildés
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 3000

# Lancement du serveur NestJS en mode production
CMD ["node", "dist/main"]
