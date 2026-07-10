# Étape 1 : Build de l'application React / Vite
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Argument de build pour injecter l'URL de l'API lors de la compilation Vite
ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}

RUN npm run build

# Étape 2 : Serveur web Nginx pour héberger les fichiers statiques
FROM nginx:alpine

COPY --from=builder /usr/src/app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
