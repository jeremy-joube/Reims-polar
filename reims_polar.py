import requests
import pdfplumber
import re
from pathlib import Path
from openpyxl import Workbook


# ============================================================
# CONFIGURATION
# ============================================================

URL = (
    "https://reimspolar.com/wp-content/uploads/2026/03/"
    "Programme-des-projections-Seances-par-film-REIMS-POLAR-2026-OK.pdf"
)

# Dossier où se trouve le script Python
BASE_DIR = Path(__file__).resolve().parent

# Dossiers de travail
PDF_DIR = BASE_DIR / "pdf"
EXCEL_DIR = BASE_DIR / "excel"

# Fichiers
PDF_FILE = PDF_DIR / "programme_reims_polar.pdf"
EXCEL_FILE = EXCEL_DIR / "Reims_Polar_2026.xlsx"


# ============================================================
# CRÉATION DES DOSSIERS
# ============================================================

PDF_DIR.mkdir(exist_ok=True)
EXCEL_DIR.mkdir(exist_ok=True)


# ============================================================
# DATES DU FESTIVAL
# ============================================================

DATES = {
    "Mar 31": "31/03/2026",
    "Mer 1": "01/04/2026",
    "Jeu 2": "02/04/2026",
    "Ven 3": "03/04/2026",
    "Sam 4": "04/04/2026",
    "Dim 5": "05/04/2026",
}


# ============================================================
# CATÉGORIES
# ============================================================

CATEGORIES = [
    "COMP",
    "CORSE",
    "SK",
    "GVS",
    "FOCUS",
    "SANG",
    "AVP",
    "PCC",
    "SÉRIE",
]


# ============================================================
# REGEX
# ============================================================

# Exemple :
# Mer 1 - 14h30 - Salle 1
PATTERN_SEANCE = re.compile(
    r"(Mar 31|Mer 1|Jeu 2|Ven 3|Sam 4|Dim 5)"
    r"\s*-\s*"
    r"(\d{1,2}h\d{2})"
    r"\s*-\s*"
    r"(Salle[^•\n]+)"
)


# Exemple :
# COMP LE MAURE DE KARATAS • Mer 1 - 14h30 - Salle 1
PATTERN_FILM = re.compile(
    r"^(COMP|CORSE|SK|GVS|FOCUS|SANG|AVP|PCC|SÉRIE)\s+(.+?)"
    r"\s*•\s*(.*)$"
)


# Exemple :
# COMP LE MAURE DE KARATAS (1h23) SALLE 1
PATTERN_DUREE = re.compile(
    r"\((\d+h\d{2})\)"
)


# ============================================================
# NETTOYAGE DES TITRES
# ============================================================

def nettoyer_titre(titre):
    """
    Corrige certaines anomalies d'espacement provoquées
    par l'extraction du texte du PDF.

    Exemples :
        L E MAURE -> LE MAURE
        L ES CRIMES -> LES CRIMES
        M EMORIES -> MEMORIES
        M ORTE -> MORTE
    """

    titre = titre.strip()

    # Suppression des espaces multiples
    titre = re.sub(r"\s+", " ", titre)

    # Corrections des articles français
    titre = re.sub(r"\bL\s+E\b", "LE", titre)
    titre = re.sub(r"\bL\s+ES\b", "LES", titre)

    # Corrections de certains mots séparés
    titre = re.sub(r"\bM\s+EMORIES\b", "MEMORIES", titre)
    titre = re.sub(r"\bM\s+ORTE\b", "MORTE", titre)

    # Nettoyage espaces autour des apostrophes
    titre = re.sub(r"\s+'\s*", "'", titre)

    # Nettoyage final
    titre = re.sub(r"\s+", " ", titre)

    return titre.strip()


# ============================================================
# CONVERSION DE DURÉE
# ============================================================

def convertir_duree(duree):
    """
    Transforme :
        1h23 -> 83 minutes
        2h07 -> 127 minutes
        32'  -> 32 minutes
    """

    if not duree:
        return None

    match = re.match(r"(\d+)h(\d{2})", duree)

    if match:
        heures = int(match.group(1))
        minutes = int(match.group(2))

        return heures * 60 + minutes

    match = re.match(r"(\d+)'", duree)

    if match:
        return int(match.group(1))

    return None


# ============================================================
# 1. TÉLÉCHARGEMENT DU PDF
# ============================================================

print("=" * 60)
print("TÉLÉCHARGEMENT DU PROGRAMME")
print("=" * 60)

if not PDF_FILE.exists():

    print("Téléchargement du PDF...")

    response = requests.get(URL)
    response.raise_for_status()

    with open(PDF_FILE, "wb") as file:
        file.write(response.content)

    print(f"PDF enregistré : {PDF_FILE}")

else:

    print("PDF déjà présent.")
    print(f"Utilisation de : {PDF_FILE}")


# ============================================================
# 2. EXTRACTION DES INFORMATIONS
# ============================================================

films = {}
seances = []

print()
print("=" * 60)
print("ANALYSE DU PDF")
print("=" * 60)


with pdfplumber.open(PDF_FILE) as pdf:

    print(f"Nombre de pages : {len(pdf.pages)}")

    for numero_page, page in enumerate(pdf.pages, start=1):

        texte = page.extract_text()

        if not texte:
            continue

        lignes = texte.splitlines()

        # ====================================================
        # PAGES DU PROGRAMME
        # ====================================================

        for ligne in lignes:

            ligne = ligne.strip()

            # Recherche d'une catégorie
            categorie_trouvee = None

            for categorie in CATEGORIES:

                if ligne.startswith(categorie + " "):

                    categorie_trouvee = categorie
                    break

            if not categorie_trouvee:
                continue

            # Recherche de la durée
            match_duree = PATTERN_DUREE.search(ligne)

            if not match_duree:
                continue

            duree = match_duree.group(1)

            # Suppression de la catégorie
            contenu = ligne[len(categorie_trouvee):].strip()

            # Suppression de la durée
            contenu = re.sub(
                r"\s*\(\d+h\d{2}\)\s*",
                " ",
                contenu
            )

            # Suppression éventuelle de la salle
            contenu = re.sub(
                r"\s+SALLE\s+\d+.*$",
                "",
                contenu,
                flags=re.IGNORECASE
            )

            film = nettoyer_titre(contenu)

            if film:

                films[film] = {
                    "categorie": categorie_trouvee,
                    "duree": duree,
                    "duree_minutes": convertir_duree(duree),
                }


        # ====================================================
        # PAGES "SÉANCES PAR FILM"
        # ====================================================

        if "SÉANCES PAR FILM" not in texte:
            continue

        print(f"Page séances détectée : {numero_page}")

        categorie = None
        film = None

        for ligne in lignes:

            ligne = ligne.strip()

            if not ligne:
                continue

            # ------------------------------------------------
            # NOUVEAU FILM
            # ------------------------------------------------

            match_film = PATTERN_FILM.match(ligne)

            if match_film:

                categorie = match_film.group(1)

                film = nettoyer_titre(
                    match_film.group(2)
                )

                premiere_seance = match_film.group(3)

                # Première séance éventuellement sur la même ligne
                if premiere_seance:

                    matches = PATTERN_SEANCE.findall(
                        premiere_seance
                    )

                    for match in matches:

                        jour = match[0]
                        heure = match[1]
                        salle = match[2].strip()

                        seances.append({
                            "categorie": categorie,
                            "film": film,
                            "jour": jour,
                            "date": DATES[jour],
                            "heure": heure,
                            "salle": salle
                        })

                continue

            # ------------------------------------------------
            # SÉANCES SUIVANTES
            # ------------------------------------------------

            if film:

                matches = PATTERN_SEANCE.findall(ligne)

                for match in matches:

                    jour = match[0]
                    heure = match[1]
                    salle = match[2].strip()

                    seances.append({
                        "categorie": categorie,
                        "film": film,
                        "jour": jour,
                        "date": DATES[jour],
                        "heure": heure,
                        "salle": salle
                    })


# ============================================================
# 3. ASSOCIATION DURÉE / SÉANCES
# ============================================================

for seance in seances:

    film = seance["film"]

    if film in films:

        seance["duree"] = films[film]["duree"]
        seance["duree_minutes"] = films[film]["duree_minutes"]

    else:

        seance["duree"] = None
        seance["duree_minutes"] = None


# ============================================================
# 4. AFFICHAGE DES RÉSULTATS
# ============================================================

print()
print("=" * 60)
print("RÉSULTATS")
print("=" * 60)

print(f"Films détectés   : {len(films)}")
print(f"Séances détectées : {len(seances)}")

print()
print("Quelques exemples :")

for seance in seances[:15]:

    print(
        f"{seance['categorie']} | "
        f"{seance['film']} | "
        f"{seance['duree']} | "
        f"{seance['date']} | "
        f"{seance['heure']} | "
        f"{seance['salle']}"
    )


# ============================================================
# 5. CRÉATION DE L'EXCEL
# ============================================================

print()
print("=" * 60)
print("CRÉATION DE L'EXCEL")
print("=" * 60)


workbook = Workbook()

sheet = workbook.active
sheet.title = "Séances"


# En-têtes
headers = [
    "Catégorie",
    "Film",
    "Durée",
    "Durée (minutes)",
    "Jour",
    "Date",
    "Heure",
    "Salle",
]

sheet.append(headers)


# Données
for seance in seances:

    sheet.append([
        seance["categorie"],
        seance["film"],
        seance["duree"],
        seance["duree_minutes"],
        seance["jour"],
        seance["date"],
        seance["heure"],
        seance["salle"],
    ])


# ============================================================
# 6. MISE EN FORME EXCEL
# ============================================================

sheet.freeze_panes = "A2"

sheet.auto_filter.ref = sheet.dimensions


# Largeur des colonnes

largeurs = {
    "A": 12,
    "B": 40,
    "C": 12,
    "D": 18,
    "E": 12,
    "F": 15,
    "G": 10,
    "H": 15,
}

for colonne, largeur in largeurs.items():

    sheet.column_dimensions[colonne].width = largeur


# ============================================================
# 7. SAUVEGARDE
# ============================================================

workbook.save(EXCEL_FILE)

print()
print("=" * 60)
print("TERMINÉ")
print("=" * 60)

print(f"Excel créé :")
print(EXCEL_FILE)