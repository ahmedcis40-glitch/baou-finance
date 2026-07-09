# Guide de Migration vers PostgreSQL (Plateforme SGI BRVM)

L'application a été programmée de manière **dynamique**. Les codes sources du Backend (`PrismaService`) et du script d'initialisation (`seed.ts`) détectent automatiquement le type de base de données à partir de l'URL fournie.

Pour migrer de SQLite vers PostgreSQL, suivez ces 3 étapes simples :

---

## Étape 1 : Mettre à jour le fichier `schema.prisma`

Ouvrez le fichier [schema.prisma](file:///d:/Antigravity/projet/finance/backend/prisma/schema.prisma) et remplacez le bloc `datasource db` par le suivant (modifier `sqlite` en `postgresql`) :

```prisma
datasource db {
  provider = "postgresql"
}
```

---

## Étape 2 : Configurer l'URL de connexion dans le `.env`

Ouvrez le fichier `.env` du backend à l'emplacement [backend/.env](file:///d:/Antigravity/projet/finance/backend/.env) et remplacez la ligne `DATABASE_URL` par vos accès de connexion PostgreSQL :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/finance_db?schema=public"
```

*(Remplacez `user`, `password`, `localhost:5432` et `finance_db` par les véritables accès de votre serveur PostgreSQL).*

---

## Étape 3 : Exécuter la migration et le seeding

Ouvrez votre console dans le dossier `/backend` et lancez les commandes suivantes pour créer les tables sur PostgreSQL et injecter les utilisateurs de démo :

```bash
# 1. Générer le client Prisma et exécuter la migration sur PostgreSQL
npx prisma migrate dev --name init_postgres

# 2. Injecter les données de démonstration (Seed)
npx prisma db seed
```

Le code s'adaptera automatiquement en créant une piscine de connexions (*connection pool*) sécurisée vers votre serveur PostgreSQL, sans aucune autre modification.
