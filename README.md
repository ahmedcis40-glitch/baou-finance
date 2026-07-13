# Baou Finance - Guide de démarrage Localhost

Ce projet contient l'infrastructure complète pour la plateforme Baou Finance. Ce document vous explique comment lancer le projet dans votre environnement local.

---

## Architecture du Projet
* **[admin-portal](file:///d:/Antigravity/projet/finance/v1.0.1/admin-portal)** : Portail web destiné aux administrateurs SGI (KYC, validation d'ordres, etc.).
* **[client-portal](file:///d:/Antigravity/projet/finance/v1.0.1/client-portal)** : Portail web grand public pour les clients.
* **[backend](file:///d:/Antigravity/projet/finance/v1.0.1/backend)** : API Backend NestJS utilisant Prisma ORM.
* **[mobile-flutter](file:///d:/Antigravity/projet/finance/v1.0.1/mobile-flutter)** : Application mobile développée avec Flutter.
* **[mobile-simulator](file:///d:/Antigravity/projet/finance/v1.0.1/mobile-simulator)** : Simulateur web de l'application mobile.
* **[docker-compose.yml](file:///d:/Antigravity/projet/finance/v1.0.1/docker-compose.yml)** : Configuration Docker Compose pour orchestrer tous les services en local.

---

## Méthode 1 : Lancement avec Docker Compose (Recommandé)

Cette méthode configure et démarre automatiquement tous les composants (Base de données PostgreSQL, Backend API, Portails Web et Simulateur) en une seule commande.

### Prérequis
* Avoir installé **Docker Desktop** et s'assurer qu'il est démarré.

### Instructions
1. Ouvrez votre terminal PowerShell à la racine du projet (`d:\Antigravity\projet\finance\v1.0.1`).
2. Exécutez la commande suivante :
   ```powershell
   docker compose up --build
   ```
3. Une fois les conteneurs démarrés, vous pouvez accéder aux services :
   * **Backend API** : [http://localhost:3000](http://localhost:3000)
   * **Portail Client** : [http://localhost:8080](http://localhost:8080)
   * **Portail Admin** : [http://localhost:8081](http://localhost:8081)
   * **Simulateur Mobile** : [http://localhost:8082](http://localhost:8082)

---

## Méthode 2 : Lancement Manuel (Sans Docker)

Si vous préférez exécuter l'application sans utiliser Docker, vous devez configurer et lancer chaque composant individuellement.

### 1. Base de données SQLite (Par défaut en local)
Le projet est configuré par défaut pour utiliser **SQLite** (base de données locale stockée dans un fichier `dev.db`), éliminant ainsi le besoin de démarrer un serveur de base de données externe ou Docker.

Le fichier `.env` a déjà été créé et préconfiguré dans le dossier `/backend` :
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="superSecretJwtTokenKeyForBaou2026"
PORT=3000
```

### 2. Démarrer le Backend (NestJS)
Ouvrez un terminal PowerShell et lancez :
```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```
L'API écoutera sur [http://localhost:3000](http://localhost:3000).

### 3. Démarrer les Portails Web (React / Vite)
Ouvrez un terminal PowerShell pour chaque service souhaité :

* **Portail Client** :
  ```powershell
  cd client-portal
  npm install
  npm run dev
  ```
* **Portail Admin** :
  ```powershell
  cd admin-portal
  npm install
  npm run dev
  ```
* **Simulateur Mobile** :
  ```powershell
  cd mobile-simulator
  npm install
  npm run dev
  ```

### 4. Démarrer l'application Flutter (Mobile)
Avoir le SDK Flutter configuré ainsi qu'un simulateur/appareil connecté :
```powershell
cd mobile-flutter
flutter pub get
flutter run
```

---

## 👥 Comptes de Test (Seed de Démo)

Lors de l'initialisation de la base de données (`npx prisma db seed`), deux comptes de test pré-configurés sont créés avec le mot de passe **`password123`** :

### 1. Compte Client
* **Email** : `client@sgi.ci`
* **Mot de passe** : `password123`
* **Description** : Compte utilisateur standard dont le profil KYC est approuvé.
* **Actifs initiaux** :
  * Solde Espèces : **1 000 000 XOF**
  * Actions détenues : **50 actions Sonatel (SNTS)** et **100 actions CIE (CIEC)**

### 2. Compte SGI Administrateur (Trader / Conformité)
* **Email** : `admin@sgi.ci`
* **Mot de passe** : `password123`
* **Description** : Compte administrateur SGI permettant de valider les dossiers KYC et de traiter/exécuter les ordres du carnet.

