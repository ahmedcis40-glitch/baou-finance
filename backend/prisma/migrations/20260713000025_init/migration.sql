/*
  Warnings:

  - You are about to drop the `JekoTransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "JekoTransaction_idJeko_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "sgiPartenaireId" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "JekoTransaction";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PawaPayTransaction" (
    "idInternal" TEXT NOT NULL PRIMARY KEY,
    "idPawaPay" TEXT,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EN_COURS',
    "webhookSignature" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PawaPayTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DcaPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "frequency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "nextRun" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DcaPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsappPhone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "kycStatus" TEXT NOT NULL DEFAULT 'EN_ATTENTE_VALIDATION',
    "kycDocuments" TEXT,
    "consentSMS" BOOLEAN NOT NULL DEFAULT true,
    "consentWhatsApp" BOOLEAN NOT NULL DEFAULT true,
    "investorProfile" TEXT DEFAULT 'MODERE',
    "investorHorizon" TEXT DEFAULT 'MOYEN_TERME',
    "investorObjective" TEXT DEFAULT 'EPARGNE',
    "sgiPartenaire" TEXT DEFAULT 'Société Générale Capital Securities',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("consentSMS", "createdAt", "email", "firstName", "id", "kycDocuments", "kycStatus", "lastName", "password", "phone", "role", "updatedAt") SELECT "consentSMS", "createdAt", "email", "firstName", "id", "kycDocuments", "kycStatus", "lastName", "password", "phone", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PawaPayTransaction_idPawaPay_key" ON "PawaPayTransaction"("idPawaPay");
