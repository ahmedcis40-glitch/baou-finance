# Directives de langue

- **Langue de communication** : Vous devez communiquer exclusivement en français. Toutes vos réponses, explications, processus de pensée (thought blocks), plans d'implémentation, carnets de tâches et rapports doivent être rédigés en français.
- **Documentation et code** : Conservez les commentaires de code en anglais s'il s'agit de la norme du projet, mais toute communication avec l'utilisateur doit être en français.

# Règlement SGI

# SPÉCIFICATIONS RÉGLEMENTAIRES ET RÈGLES DE GESTION (AMF-UMOA / BRVM)

Ce document récapitule les contraintes réglementaires imposées par l'AMF-UMOA (Instruction n°065/CREPMF/2021) et la BRVM. Ces règles doivent être impérativement codées dans l'architecture logique du backend de l'application.

---

## 1. LIMITES DU STATUT DE L'APPLICATION
* **Monopole de Négociation :** Seules les SGI agréées possèdent le droit légal d'exécuter des transactions sur le marché de la BRVM. 
* **Positionnement de l'application :** L'application agit strictement en tant qu'**Apporteur d'Affaires Technologique**. Elle collecte, formate et route les intentions d'ordres vers l'API de la SGI partenaire, qui conserve la responsabilité juridique finale de l'exécution.
* **Séparation des fonds :** L'application ne stocke ni ne conserve les fonds des investisseurs. Les flux financiers (dépôts/retraits via Mobile Money ou carte bancaire) doivent transiter directement vers les comptes de la SGI ou via un agrégateur de paiement tiers sécurisé agréé par la BCEAO.

---

## 2. RÈGLES LOGIQUES DU SYSTEME D'ORDRES (BACKEND APP)

### A. Règle de Provision Préalable (Impératif légal - Article 54)
* **Logique de validation :** Avant d'autoriser l'envoi d'un ordre d'achat à la SGI via l'API, le backend doit vérifier que le solde disponible du client est supérieur ou égal au montant total de l'ordre (Prix de l'action × Quantité) + les frais de courtage estimés.
* **Action système :** Si le solde est insuffisant, l'ordre doit être immédiatement bloqué dans l'application avec un message d'erreur : `Solde insuffisant pour couvrir l'achat et les frais associés`.

### B. Traçabilité et Horodatage (Time-stamping)
* **Logique de journalisation :** Tout ordre généré par un utilisateur doit être marqué électroniquement de manière inviolable dans la base de données.
* **Champs requis par transaction :** 
  * `timestamp_reception` (Date et heure précises à la milliseconde près).
  * `client_id` (Identifiant unique du compte-titres).
  * `sgi_partenaire_id` (Identifiant de la SGI réceptrice).
  * `statut_ordre` (En attente, Transmis, Exécuté, Rejeté).

### C. Types et Durées de Validité Réglementaires
Le formulaire d'achat de l'application doit obligatoirement proposer un sélecteur avec les durées de validité officielles de la BRVM :
1. **Ordre Jour :** Expire automatiquement à la clôture du marché du jour même (16h00 UTC).
2. **Ordre Mensuel :** Expire automatiquement le dernier jour calendaire du mois en cours.
3. **Ordre à Révocation (GTC) :** Reste actif dans le carnet d'ordres pendant une durée maximale stricte de 90 jours calendaires (à annuler automatiquement côté backend au jour 91).

---

## 3. OBLIGATIONS DE CONFORMITÉ CLIENT (MODULE E-KYC)

Aucun ordre ne peut être transmis à l'API de la SGI si le statut du profil client n'est pas marqué comme `VÉRIFIÉ` (Conformité Lutte contre le Blanchiment - LBC/FT). Le module d'onboarding de l'application doit obligatoirement collecter :

* **Données d'identité :** Nom, Prénoms, Date de naissance, Nationalité.
* **Documents obligatoires (Upload requis) :**
  1. Pièce d'identité en cours de validité (CNI pour les Ivoiriens, Passeport pour la diaspora).
  2. Justificatif de domicile de moins de 3 mois (Facture CIE/SODECI ou certificat de résidence).
  3. Relevé d'Identité Bancaire (RIB) officiel.
* **Formulaire de Profil Investisseur (Questionnaire KYC) :** Enregistrement des objectifs financiers du client et de son aversion au risque avant l'activation du compte.

---

## 4. CONFIDENTIALITÉ ET SÉCURITÉ DES DONNÉES (Article 47)
* **Secret Professionnel :** Les SGI sont soumises à la discrétion absolue. L'application doit garantir le même niveau de sécurité.
* **Sécurité technique minimale :** 
  * Chiffrement de toutes les communications de bout en bout via le protocole HTTPS / TLS 1.3.
  * Chiffrement au repos (AES-256) des pièces d'identité stockées dans les serveurs de stockage (ex: AWS S3).
  * Masquage ou hachage des informations financières sensibles dans les journaux d'erreurs (Logs).

