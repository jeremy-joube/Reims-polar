import requests
import pdfplumber
import re
import unicodedata

from pathlib import Path
from openpyxl import Workbook


# ============================================================
# CONFIGURATION
# ============================================================

URL = (
    "https://reimspolar.com/wp-content/uploads/2026/03/"
    "Programme-des-projections-Seances-par-film-REIMS-POLAR-2026-OK.pdf"
)

BASE_DIR = Path(__file__).resolve().parent

PDF_DIR = BASE_DIR / "pdf"
OUTPUT_DIR = BASE_DIR / "output"

PDF_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

PDF_FILE = PDF_DIR / "programme_reims_polar.pdf"
EXCEL_FILE = OUTPUT_DIR / "Reims_Polar_2026.xlsx"


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
# CATÉGORIES DU FESTIVAL
# ============================================================

CATEGORIES = (
    "COMP",
    "CORSE",
    "SK",
    "GVS",
    "FOCUS",
    "SANG",
    "AVP",
    "PCC",
    "SÉRIE",
)


# ============================================================
# DURÉES DE SECOURS
#
# Utilisées uniquement lorsque la durée n'a pas pu être
# récupérée automatiquement dans le PDF.
#
# Les valeurs sont exprimées en minutes.
# ============================================================

DUREES_MANUELLES = {

    "BORGO": 117,
    "CHIENS": 24,
    "DIQUA DAI MONTI EN DECA DES MONTS": 27,
    "ELEPHANT": 81,
    "J AI RENCONTRE LE DIABLE": 142,
    "LA CORDE AU COU": 104,
    "LA NUIT EST LA": 25,
    "LE BOUCHER": 90,
    "LE JOUR DE MA MORT": 19,
    "LE MOHICAN": 87,
    "LE ROYAUME": 111,
    "LE SILENCE": 104,
    "LE SIXIEME SENS": 120,
    "LES APACHES": 82,
    "MATA": 98,
    "NUIT BLEUE": 86,
    "PAOLO": 108,
    "PARANOID PARK": 85,
    "PRETE A TOUT": 106,
    "SEULES LES BETES": 117,
    "UNTIL I KILL YOU": 90,

}


# ============================================================
# NETTOYAGE DES PRÉFIXES
# ============================================================

def supprimer_prefixe_categorie(titre):

    titre = titre.strip()

    for categorie in CATEGORIES:

        prefixe = categorie + " "

        if titre.startswith(prefixe):
            titre = titre[len(prefixe):]
            break

    return titre.strip()


# ============================================================
# NORMALISATION DES TITRES
# ============================================================

def normaliser_titre(titre):

    if not titre:
        return ""

    # Majuscules
    titre = titre.upper()

    # Suppression des préfixes de catégorie
    titre = supprimer_prefixe_categorie(titre)

    # Espaces multiples
    titre = re.sub(r"\s+", " ", titre)

    # --------------------------------------------------------
    # Corrections connues du PDF
    # --------------------------------------------------------

    corrections = {

        "L E ": "LE ",
        "L A ": "LA ",
        "L ES ": "LES ",

        "D U ": "DU ",
        "D ES ": "DES ",
        "D E ": "DE ",

        "M EMORIES": "MEMORIES",
        "M ORTE": "MORTE",
        "M I AMOR": "MI AMOR",

        "L ES SILENCES": "LES SILENCES",
        "L ES CRIMES": "LES CRIMES",
        "L E MAURE": "LE MAURE",

    }

    for ancienne, nouvelle in corrections.items():
        titre = titre.replace(ancienne, nouvelle)

    # --------------------------------------------------------
    # Corrections explicites
    # --------------------------------------------------------

    corrections_finales = {

        "M EMORIES OF MURDER":
            "MEMORIES OF MURDER",

        "M ORTE CUCINA":
            "MORTE CUCINA",

        "M I AMOR":
            "MI AMOR",

        "L ES CRIMES DE SNOWTOWN":
            "LES CRIMES DE SNOWTOWN",

        "L ES SILENCES DE RIYAD":
            "LES SILENCES DE RIYAD",

        "L E MAURE DE KARATAS":
            "LE MAURE DE KARATAS",

    }

    for ancienne, nouvelle in corrections_finales.items():
        titre = titre.replace(ancienne, nouvelle)

    return titre.strip()


# ============================================================
# CLÉ DE COMPARAISON DES TITRES
#
# Cette fonction permet de comparer :
#
# J’AI RENCONTRÉ LE DIABLE
#
# avec :
#
# J AI RENCONTRE LE DIABLE
#
# ============================================================

def cle_titre(titre):

    titre = normaliser_titre(titre)

    # Suppression des accents
    titre = unicodedata.normalize("NFD", titre)

    titre = "".join(
        caractere
        for caractere in titre
        if unicodedata.category(caractere) != "Mn"
    )

    # Apostrophes / ponctuation / espaces
    titre = re.sub(r"[^A-Z0-9]", "", titre)

    return titre


# ============================================================
# EXTRACTION D'UNE DURÉE
#
# Exemples :
#
# (1h23)
# (2h07)
# (2h)
# (32’)
#
# Retourne une durée en minutes.
# ============================================================

def extraire_duree(texte):

    if not texte:
        return None

    # Exemple : (1h23)
    match = re.search(
        r"\((\d+)\s*h\s*(\d{2})?\s*\)",
        texte,
        re.IGNORECASE
    )

    if match:

        heures = int(match.group(1))
        minutes = int(match.group(2) or 0)

        return heures * 60 + minutes

    # Exemple : (32’)
    match = re.search(
        r"\((\d+)\s*['’]\)",
        texte
    )

    if match:

        return int(match.group(1))

    return None


# ============================================================
# FORMATAGE DE LA DURÉE
# ============================================================

def format_duree(minutes):

    if minutes is None:
        return ""

    heures = minutes // 60
    minutes_restantes = minutes % 60

    if heures == 0:
        return f"{minutes_restantes} min"

    return f"{heures}h{minutes_restantes:02d}"


# ============================================================
# EXTRACTION D'UN FILM + CATÉGORIE
#
# Exemple :
#
# COMP RED CODE BLUE (2h28)
#
# devient :
#
# catégorie = COMP
# film      = RED CODE BLUE
# ============================================================

def extraire_film_et_categorie(ligne):

    ligne = ligne.strip()

    pattern = (
        r"^(COMP|CORSE|SK|GVS|FOCUS|SANG|AVP|PCC|SÉRIE)"
        r"\s+(.+?)"
        r"\s*\("
    )

    match = re.match(
        pattern,
        ligne
    )

    if match:

        categorie = match.group(1)
        film = match.group(2).strip()

        return categorie, film

    return None, None


# ============================================================
# EXTRACTION D'UNE SÉANCE
#
# Exemple :
#
# Mer 1 - 14h30 - Salle 1
#
# devient :
#
# jour   = Mer 1
# heure  = 14h30
# salle  = Salle 1
# ============================================================

PATTERN_SEANCE = re.compile(
    r"(Mar 31|Mer 1|Jeu 2|Ven 3|Sam 4|Dim 5)"
    r"\s*-\s*"
    r"(\d{1,2}h\d{2})"
    r"\s*-\s*"
    r"(Salle[^•\n]+)"
)


# ============================================================
# DÉBUT DU PROGRAMME
# ============================================================

print()
print("=" * 70)
print("              REIMS POLAR 2026")
print("=" * 70)


# ============================================================
# TÉLÉCHARGEMENT DU PDF
# ============================================================

print()
print("Téléchargement du PDF...")

try:

    response = requests.get(
        URL,
        timeout=30
    )

    response.raise_for_status()

except requests.RequestException as erreur:

    print()
    print("❌ Impossible de télécharger le PDF.")
    print(erreur)

    raise SystemExit(1)


PDF_FILE.write_bytes(
    response.content
)

print(f"✓ PDF téléchargé : {PDF_FILE}")


# ============================================================
# VARIABLES
# ============================================================

films = {}
seances = []


# ============================================================
# OUVERTURE DU PDF
# ============================================================

print()
print("Analyse du PDF...")


with pdfplumber.open(PDF_FILE) as pdf:

    print(
        f"✓ {len(pdf.pages)} pages détectées"
    )


    # ========================================================
    # PREMIÈRE PASSE
    #
    # Recherche des films et de leurs durées.
    # ========================================================

    print()
    print("Recherche des films et des durées...")

    for numero_page, page in enumerate(
        pdf.pages,
        start=1
    ):

        texte = page.extract_text()

        if not texte:
            continue

        lignes = texte.splitlines()

        for ligne in lignes:

            ligne = ligne.strip()

            if not ligne:
                continue

            duree = extraire_duree(ligne)

            if duree is None:
                continue

            categorie, film = (
                extraire_film_et_categorie(ligne)
            )

            if not film:
                continue

            film = normaliser_titre(film)

            cle = cle_titre(film)

            films[cle] = {
                "film": film,
                "categorie": categorie,
                "duree": duree,
            }


    print(
        f"✓ {len(films)} films avec durée détectés"
    )


    # ========================================================
    # DEUXIÈME PASSE
    #
    # Recherche des pages "SÉANCES PAR FILM".
    # ========================================================

    print()
    print("Recherche des séances...")

    for numero_page, page in enumerate(
        pdf.pages,
        start=1
    ):

        texte = page.extract_text()

        if not texte:
            continue

        if "SÉANCES PAR FILM" not in texte:
            continue

        print(
            f"✓ Page {numero_page} : séances par film"
        )

        lignes = texte.splitlines()

        categorie_actuelle = None
        film_actuel = None


        for ligne in lignes:

            ligne = ligne.strip()

            if not ligne:
                continue

            if ligne == "SÉANCES PAR FILM":
                continue


            # =================================================
            # NOUVEAU FILM
            # =================================================

            match_film = re.match(
                r"^(COMP|CORSE|SK|GVS|FOCUS|SANG|AVP|PCC|SÉRIE)"
                r"\s+(.+?)(?:\s*•\s*(.*))?$",
                ligne
            )

            if match_film:

                categorie_actuelle = (
                    match_film.group(1)
                )

                film_actuel = normaliser_titre(
                    match_film.group(2)
                )

                reste = match_film.group(3)


                # ------------------------------------------------
                # Une séance peut être sur la même ligne
                # ------------------------------------------------

                if reste:

                    matches = PATTERN_SEANCE.findall(
                        reste
                    )

                    for (
                        jour,
                        heure,
                        salle
                    ) in matches:

                        seances.append({

                            "categorie":
                                categorie_actuelle,

                            "film":
                                film_actuel,

                            "jour":
                                jour,

                            "date":
                                DATES[jour],

                            "heure":
                                heure,

                            "salle":
                                salle.strip(),

                        })

                continue


            # =================================================
            # SÉANCES SUIVANTES
            # =================================================

            if film_actuel:

                matches = PATTERN_SEANCE.findall(
                    ligne
                )

                for (
                    jour,
                    heure,
                    salle
                ) in matches:

                    seances.append({

                        "categorie":
                            categorie_actuelle,

                        "film":
                            film_actuel,

                        "jour":
                            jour,

                        "date":
                            DATES[jour],

                        "heure":
                            heure,

                        "salle":
                            salle.strip(),

                    })


# ============================================================
# ASSOCIATION DES DURÉES
# ============================================================

print()
print("Association des durées...")
print()


for seance in seances:

    cle = cle_titre(
        seance["film"]
    )


    # ========================================================
    # 1. RECHERCHE AUTOMATIQUE
    # ========================================================

    film_info = films.get(cle)


    if film_info:

        seance["duree_minutes"] = (
            film_info["duree"]
        )

        seance["duree"] = format_duree(
            film_info["duree"]
        )

        continue


    # ========================================================
    # 2. RECHERCHE DANS LES DURÉES DE SECOURS
    # ========================================================

    if cle in DUREES_MANUELLES:

        duree = DUREES_MANUELLES[cle]

        seance["duree_minutes"] = duree

        seance["duree"] = format_duree(
            duree
        )

        print(
            f"✓ Durée corrigée : "
            f"{seance['film']} → "
            f"{seance['duree']}"
        )

        continue


    # ========================================================
    # 3. DURÉE TOUJOURS INTROUVABLE
    # ========================================================

    seance["duree_minutes"] = None
    seance["duree"] = ""

    print(
        f"⚠ Durée introuvable : "
        f"{seance['film']}"
    )


# ============================================================
# CONTRÔLE FINAL
# ============================================================

films_sans_duree = sorted(
    set(
        seance["film"]
        for seance in seances
        if not seance["duree"]
    )
)


print()
print("=" * 70)
print("CONTRÔLE DES DURÉES")
print("=" * 70)


if films_sans_duree:

    print()

    for film in films_sans_duree:

        print(
            f"⚠ {film}"
        )

else:

    print()
    print(
        "✓ Toutes les séances disposent "
        "d'une durée."
    )


# ============================================================
# SUPPRESSION DES DOUBLONS
# ============================================================

seances_uniques = []

seances_vues = set()


for seance in seances:

    cle = (
        seance["film"],
        seance["date"],
        seance["heure"],
        seance["salle"],
    )

    if cle in seances_vues:
        continue

    seances_vues.add(cle)

    seances_uniques.append(
        seance
    )


seances = seances_uniques


# ============================================================
# TRI DES SÉANCES
# ============================================================

ordre_dates = {
    "31/03/2026": 1,
    "01/04/2026": 2,
    "02/04/2026": 3,
    "03/04/2026": 4,
    "04/04/2026": 5,
    "05/04/2026": 6,
}


seances.sort(
    key=lambda s: (
        ordre_dates.get(
            s["date"],
            99
        ),
        s["heure"],
        s["salle"],
        s["film"],
    )
)


# ============================================================
# CRÉATION DE L'EXCEL
# ============================================================

print()
print("Création du fichier Excel...")


workbook = Workbook()

sheet = workbook.active

sheet.title = "Séances"


# ============================================================
# EN-TÊTES
# ============================================================

headers = [
    "Catégorie",
    "Film",
    "Durée",
    "Date",
    "Jour",
    "Heure",
    "Salle",
]

sheet.append(headers)


# ============================================================
# DONNÉES
# ============================================================

for seance in seances:

    sheet.append([

        seance["categorie"],

        seance["film"],

        seance["duree"],

        seance["date"],

        seance["jour"],

        seance["heure"],

        seance["salle"],

    ])


# ============================================================
# MISE EN FORME
# ============================================================

sheet.freeze_panes = "A2"

sheet.auto_filter.ref = (
    sheet.dimensions
)


largeurs = {

    "A": 12,

    "B": 42,

    "C": 12,

    "D": 15,

    "E": 12,

    "F": 10,

    "G": 15,

}


for colonne, largeur in largeurs.items():

    sheet.column_dimensions[
        colonne
    ].width = largeur


# ============================================================
# SAUVEGARDE
# ============================================================

workbook.save(
    EXCEL_FILE
)


# ============================================================
# RÉSUMÉ FINAL
# ============================================================

print()
print("=" * 70)
print("                    TERMINÉ")
print("=" * 70)

print(
    f"✓ Films détectés : {len(films)}"
)

print(
    f"✓ Séances détectées : {len(seances)}"
)

print(
    f"✓ Excel : {EXCEL_FILE}"
)

print("=" * 70)
print()