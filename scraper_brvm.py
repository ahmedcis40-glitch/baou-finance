import datetime
import json
import time
import requests
from bs4 import BeautifulSoup
import os
import urllib3

# Désactiver les avertissements SSL en cas de requêtes HTTPS non vérifiées
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration de l'API officielle de la BRVM
AUTH_URL = "https://bfin.brvm.org:443/apimrkd/token"
DATA_URL = "https://bfin.brvm.org:443/apimrkd/api/GetCoursActions"

USERNAME = "adminip"  # À remplacer par vos identifiants officiels
PASSWORD = "admin"     # À remplacer par vos identifiants officiels

HEADERS_HTML = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def obtenir_nouveau_token():
    """Se connecte à la BRVM pour récupérer le jeton d'accès (valable 24h)"""
    payload = {
        'grant_type': 'password',
        'username': USERNAME,
        'password': PASSWORD
    }
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    try:
        print(f"[{datetime.datetime.now()}] Demande d'un nouveau jeton d'accès à l'API BRVM...")
        response = requests.post(AUTH_URL, data=payload, headers=headers, verify=False, timeout=10)
        
        if response.status_code == 200:
            donnees_token = response.json()
            return donnees_token.get('access_token')
        else:
            print(f"Échec de l'authentification API. Code HTTP : {response.status_code}. Response: {response.text}")
            return None
    except Exception as e:
        print(f"Erreur lors de la connexion d'authentification API : {e}")
        return None

def recuperer_cours_actions_api(token):
    """Récupère les données d'actions en fournissant le jeton de sécurité"""
    if not token:
        print("Impossible de lancer la requête : Token manquant.")
        return None
        
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    
    try:
        print(f"[{datetime.datetime.now()}] Appel de la route API GetCoursActions...")
        response = requests.get(DATA_URL, headers=headers, verify=False, timeout=15)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Erreur lors de la récupération des données de l'API. Code HTTP : {response.status_code}")
            return None
    except Exception as e:
        print(f"Erreur réseau / API : {e}")
        return None

def mapper_api_brvm(item):
    """Mappe les champs de l'API officielle vers notre format standardisé"""
    # Recherche robuste du symbole
    symbole = item.get("symbole") or item.get("Symbole") or item.get("code") or item.get("Code") or ""
    
    # Recherche robuste du nom de l'entreprise
    nom_entreprise = item.get("nom_entreprise") or item.get("nom") or item.get("Nom") or item.get("designation") or item.get("Designation") or ""
    
    # Recherche du volume
    volume_raw = item.get("volume") or item.get("Volume") or item.get("qte") or item.get("Quantite") or 0
    try:
        volume = int(volume_raw)
    except:
        volume = 0
        
    # Recherche du cours de clôture
    cours_raw = item.get("cours_cloture") or item.get("coursCloture") or item.get("CoursCloture") or item.get("dernierCours") or item.get("valeur") or 0.0
    try:
        cours_cloture = float(str(cours_raw).replace(',', '.'))
    except:
        cours_cloture = 0.0
        
    # Recherche de la variation
    var_raw = item.get("variation") or item.get("Variation") or item.get("pctVar") or item.get("variationPourcentage") or 0.0
    try:
        variation = float(str(var_raw).replace(',', '.'))
    except:
        variation = 0.0
        
    return {
        "symbole": symbole.strip(),
        "nom_entreprise": nom_entreprise.strip(),
        "date": datetime.date.today().isoformat(),
        "heure_recup": datetime.datetime.now().strftime("%H:%M:%S"),
        "volume": volume,
        "cours_cloture": cours_cloture,
        "variation": variation
    }

def scraper_cours_brvm_html():
    """Scraper HTML de secours en cas d'indisponibilité ou d'erreur d'identifiants de l'API"""
    url = "https://www.brvm.org/fr/cours-actions/0"
    print(f"[{datetime.datetime.now()}] Mode Secours : Scraping HTML de secours...")
    
    try:
        response = requests.get(url, headers=HEADERS_HTML, timeout=15)
        if response.status_code != 200:
            print(f"Erreur HTTP Scraper : {response.status_code}")
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        table = None
        for t in soup.find_all('table'):
            first_row = t.find('tr')
            if first_row and "Symbole" in first_row.text:
                table = t
                break
                
        if not table:
            print("Tableau des cours boursiers introuvable sur la page BRVM.")
            return None
            
        rows = table.find_all('tr')
        liste_actions = []
        date_du_jour = datetime.date.today().isoformat()
        
        for row in rows[1:]:
            cols = row.find_all('td')
            if len(cols) >= 7:
                symbole = cols[0].text.strip()
                nom_entreprise = cols[1].text.strip()
                volume = cols[2].text.strip()
                cours_cloture = cols[5].text.strip()
                variation = cols[6].text.strip()
                
                try:
                    clean_vol = volume.replace(' ', '').replace('\xa0', '')
                    vol_val = int(clean_vol) if clean_vol.isdigit() else 0
                except ValueError:
                    vol_val = 0
                    
                try:
                    clean_cloture = cours_cloture.replace(',', '.').replace(' ', '').replace('\xa0', '')
                    cours_val = float(clean_cloture) if clean_cloture else 0.0
                except ValueError:
                    cours_val = 0.0
                    
                try:
                    clean_var = variation.replace(',', '.').replace(' ', '').replace('\xa0', '').replace('%', '')
                    var_val = float(clean_var) if clean_var else 0.0
                except ValueError:
                    var_val = 0.0
                
                action_data = {
                    "symbole": symbole,
                    "nom_entreprise": nom_entreprise,
                    "date": date_du_jour,
                    "heure_recup": datetime.datetime.now().strftime("%H:%M:%S"),
                    "volume": vol_val,
                    "cours_cloture": cours_val,
                    "variation": var_val
                }
                liste_actions.append(action_data)
                
        return liste_actions
    except Exception as e:
        print(f"Erreur constatée lors du scraping HTML de secours : {e}")
        return None

def executer_chargement_donnees():
    """Tente de charger via l'API, sinon bascule sur le scraper HTML"""
    # 1. Essai API officielle
    token = obtenir_nouveau_token()
    if token:
        donnees_brutes = recuperer_cours_actions_api(token)
        if donnees_brutes and isinstance(donnees_brutes, list):
            try:
                donnees_mappes = [mapper_api_brvm(item) for item in donnees_brutes]
                if len(donnees_mappes) > 0:
                    print(f"[{datetime.datetime.now()}] API BRVM : Récupération réussie ({len(donnees_mappes)} actions).")
                    enregistrer_en_local(donnees_mappes)
                    return True
            except Exception as ex:
                print(f"Erreur de traitement des données API : {ex}")
        else:
            print("API renvoyant des données vides ou non conformes.")
    else:
        print("API officielle inaccessible (identifiants incorrects ou serveur indisponible).")

    # 2. Secours : Scraper HTML
    print("Basculement sur le scraper HTML de secours...")
    donnees_secours = scraper_cours_brvm_html()
    if donnees_secours:
        print(f"[{datetime.datetime.now()}] Scraper de secours : Récupération réussie ({len(donnees_secours)} actions).")
        enregistrer_en_local(donnees_secours)
        return True
        
    return False

def enregistrer_en_local(donnees):
    if donnees:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Le nom du fichier inclut l'heure pour ne pas écraser les données précédentes de la journée
        heure_actuelle = datetime.datetime.now().strftime("%Hh%M")
        filename = f"brvm_{datetime.date.today().isoformat()}_{heure_actuelle}.json"
        filePath = os.path.join(base_dir, filename)
        
        with open(filePath, 'w', encoding='utf-8') as f:
            json.dump(donnees, f, ensure_ascii=False, indent=4)
        print(f"Sauvegardé dans {filePath} ({len(donnees)} lignes).")
        
        # Enregistrer également sous brvm_latest.json pour que le backend NestJS le lise
        latestPath = os.path.join(base_dir, "brvm_latest.json")
        with open(latestPath, 'w', encoding='utf-8') as f:
            json.dump(donnees, f, ensure_ascii=False, indent=4)
        print(f"Sauvegardé également dans {latestPath}")

# --- Boucle horaire principale ---
if __name__ == "__main__":
    print("=== INITIALISATION DU CLIENT API ET DU SCRAPER DE SECOURS BRVM ===")
    
    # Exécution immédiate au démarrage pour initialiser les données
    print("Exécution initiale au démarrage...")
    executer_chargement_donnees()

    while True:
        maintenant = datetime.datetime.now()
        jour_semaine = maintenant.weekday()  # 0 = Lundi, 4 = Vendredi
        heure = maintenant.hour
        
        # Le marché BRVM n'est ouvert que la journée en semaine
        if jour_semaine < 5 and (8 <= heure <= 17):
            executer_chargement_donnees()
        else:
            print(f"[{maintenant}] En dehors des heures de marché (8h-17h Lun-Ven). Mode veille active.")

        # Mise en veille de 60 minutes
        print("Mise en veille pour 60 minutes...\n")
        time.sleep(3600)
