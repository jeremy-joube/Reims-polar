import json
import re
import unicodedata
from pathlib import Path
from datetime import datetime

import pandas as pd
import pdfplumber
import requests


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

PDF_DIR = BASE_DIR / "pdf"
OUTPUT_DIR = BASE_DIR / "output"

WEB_DIR = BASE_DIR / "web"
WEB_DATA_DIR = WEB_DIR / "data"

PDF_FILE = PDF_DIR / "programme_reims_polar.pdf"

EXCEL_FILE = OUTPUT_DIR / "Reims_Polar_2026.xlsx"
JSON_FILE = OUTPUT_DIR / "Reims_Polar_2026.json"
WEB_JSON_FILE = WEB_DATA_DIR / "Reims_Polar_2026.json"


URL = (
    "https://reimspolar.com/wp-content/uploads/2026/03/"
    "Programme-des-projections-Seances-par-film-REIMS-POLAR-2026-OK.pdf"
)


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
# DURÉES MANUELLES
# ============================================================
#
# Ces durées sont utilisées uniquement lorsque le PDF
# ne permet pas d'associer correctement une durée au film.
#
# Valeurs en minutes.
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
# PATTERN DES SÉANCES
# ============================================================

PATTERN_SEANCE = re.compile(
    r"(Mar\s*31|Mer\s*1|Jeu\s*2|Ven\s*3|Sam\s*4|Dim\s*5)"
    r"\s*-\s*"
    r"(\d{1,2}h\d{2})"
    r"\s*-\s*"
    r"(Salle\s+\d+)",
    re.IGNORECASE,
)


# ============================================================
# NORMALISATION DES TITRES
# ============================================================

def supprimer_prefixe_categorie(titre):
    """
    Supprime une catégorie éventuellement présente
    devant le titre.
    """

    if not titre:
        return ""

    titre = titre.strip()

    for categorie in CATEGORIES:

        if titre.upper().startswith(categorie + " "):
            titre = titre[len(categorie):].strip()
            break

    return titre


def normaliser_titre(titre):
    """
    Corrige les anomalies d'espacement produites
    par l'extraction PDF.
    """

    if not titre:
        return ""

    titre = titre.upper()

    titre = re.sub(r"\s+", " ", titre).strip()

    titre = supprimer_prefixe_categorie(titre)

    # --------------------------------------------------------
    # Corrections récurrentes du PDF
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

    for ancien, nouveau in corrections.items():
        titre = titre.replace(ancien, nouveau)

    # --------------------------------------------------------
    # Corrections particulières connues
    # --------------------------------------------------------

    corrections_finales = {
        "M EMORIES OF MURDER": "MEMORIES OF MURDER",
        "M ORTE CUCINA": "MORTE CUCINA",
        "M I AMOR": "MI AMOR",
        "L ES CRIMES DE SNOWTOWN": "LES CRIMES DE SNOWTOWN",
        "L ES SILENCES DE RIYAD": "LES SILENCES DE RIYAD",
        "L E MAURE DE KARATAS": "LE MAURE DE KARATAS",
    }

    for ancien, nouveau in corrections_finales.items():
        titre = titre.replace(ancien, nouveau)

    titre = re.sub(r"\s+", " ", titre)

    return titre.strip()


def cle_titre(titre):
    """
    Génère une clé comparable :

    J’AI RENCONTRÉ LE DIABLE
    devient
    JAIRENCONTRELEDIABLE
    """

    titre = normaliser_titre(titre)

    titre = unicodedata.normalize(
        "NFD",
        titre,
    )

    titre = "".join(
        caractere
        for caractere in titre
        if unicodedata.category(caractere) != "Mn"
    )

    titre = re.sub(
        r"[^A-Z0-9]",
        "",
        titre,
    )

    return titre


# ============================================================
# DURÉES
# ============================================================

def extraire_duree(texte):
    """
    Extrait une durée depuis différents formats.

    Exemples :
        (1h30)
        (1 h 30)
        (90')
        (90’)
        1h30
    """

    if not texte:
        return None

    # --------------------------------------------------------
    # Format 1h30 / 1 h 30 / (1h30)
    # --------------------------------------------------------

    match = re.search(
        r"(?<!\d)"
        r"(\d{1,2})\s*h\s*(\d{1,2})"
        r"(?!\d)",
        texte,
        re.IGNORECASE,
    )

    if match:

        heures = int(match.group(1))
        minutes = int(match.group(2))

        # Sécurité pour éviter qu'une heure de séance
        # soit interprétée comme une durée aberrante.
        if heures <= 5 and minutes < 60:
            return heures * 60 + minutes

    # --------------------------------------------------------
    # Format 1h
    # --------------------------------------------------------

    match = re.search(
        r"(?<!\d)"
        r"(\d{1,2})\s*h"
        r"(?!\s*\d)",
        texte,
        re.IGNORECASE,
    )

    if match:

        heures = int(match.group(1))

        if heures <= 5:
            return heures * 60

    # --------------------------------------------------------
    # Format 90' ou 90’
    # --------------------------------------------------------

    match = re.search(
        r"(?<!\d)"
        r"(\d{1,3})\s*['’]"
        r"(?!\d)",
        texte,
    )

    if match:

        minutes = int(match.group(1))

        if 1 <= minutes <= 300:
            return minutes

    # --------------------------------------------------------
    # Format 90 min
    # --------------------------------------------------------

    match = re.search(
        r"(?<!\d)"
        r"(\d{1,3})\s*(?:MIN|MN)"
        r"(?![A-Z])",
        texte,
        re.IGNORECASE,
    )

    if match:

        minutes = int(match.group(1))

        if 1 <= minutes <= 300:
            return minutes

    return None


def duree_formattee(minutes):
    """
    98 -> 1h38
    24 -> 24 min
    """

    if minutes is None:
        return ""

    heures = minutes // 60
    minutes_restantes = minutes % 60

    if heures == 0:
        return f"{minutes_restantes} min"

    return f"{heures}h{minutes_restantes:02d}"


# ============================================================
# TÉLÉCHARGEMENT
# ============================================================

def telecharger_pdf():

    print("Téléchargement du PDF...")

    response = requests.get(
        URL,
        timeout=30,
    )

    response.raise_for_status()

    with open(
        PDF_FILE,
        "wb",
    ) as fichier:

        fichier.write(
            response.content
        )

    print(
        f"✓ PDF téléchargé : {PDF_FILE}"
    )


# ============================================================
# LECTURE DU PDF
# ============================================================

def lire_pages_pdf(pdf):
    """
    Extrait une seule fois le texte de toutes les pages.
    """

    pages = []

    for numero, page in enumerate(
        pdf.pages,
        start=1,
    ):

        texte = page.extract_text() or ""

        pages.append(
            {
                "numero": numero,
                "texte": texte,
                "lignes": texte.splitlines(),
            }
        )

    return pages


# ============================================================
# EXTRACTION DES SÉANCES
# ============================================================

def extraire_seances(pages):
    """
    Les titres de référence sont récupérés directement
    depuis la section SÉANCES PAR FILM.

    C'est cette section qui constitue notre référence
    principale pour les titres.
    """

    seances = []

    dans_section = False

    film_courant = None
    categorie_courante = ""

    for page in pages:

        for ligne in page["lignes"]:

            ligne = ligne.strip()

            if not ligne:
                continue

            # ------------------------------------------------
            # Début de la section
            # ------------------------------------------------

            if "SÉANCES PAR FILM" in ligne.upper():

                dans_section = True
                continue

            if not dans_section:
                continue

            correspondances = list(
                PATTERN_SEANCE.finditer(
                    ligne
                )
            )

            if not correspondances:
                continue

            # ------------------------------------------------
            # Tout ce qui se trouve avant la première séance
            # peut être un nouveau film.
            # ------------------------------------------------

            premiere_seance = correspondances[0]

            texte_avant = ligne[
                :premiere_seance.start()
            ]

            texte_avant = (
                texte_avant
                .replace("•", " ")
                .strip()
            )

            if texte_avant:

                nouvelle_categorie = ""
                nouveau_titre = texte_avant

                for categorie in CATEGORIES:

                    pattern = re.compile(
                        rf"^{re.escape(categorie)}\s+",
                        re.IGNORECASE,
                    )

                    if pattern.search(
                        nouveau_titre
                    ):

                        nouvelle_categorie = categorie

                        nouveau_titre = pattern.sub(
                            "",
                            nouveau_titre,
                            count=1,
                        )

                        break

                nouveau_titre = normaliser_titre(
                    nouveau_titre
                )

                if nouveau_titre:

                    film_courant = nouveau_titre
                    categorie_courante = (
                        nouvelle_categorie
                    )

            # ------------------------------------------------
            # Ajout des séances
            # ------------------------------------------------

            if not film_courant:
                continue

            for match in correspondances:

                jour = re.sub(
                    r"\s+",
                    " ",
                    match.group(1),
                )

                # Normalisation de la casse
                jour = jour.title()

                # "Mer 1" reste correct avec title()
                # mais on s'assure de nos clés.
                correspondance_jour = None

                for jour_reference in DATES:

                    if (
                        jour.lower()
                        == jour_reference.lower()
                    ):

                        correspondance_jour = (
                            jour_reference
                        )

                        break

                if not correspondance_jour:
                    continue

                heure = match.group(2)

                salle = re.sub(
                    r"\s+",
                    " ",
                    match.group(3),
                )

                salle = salle.replace(
                    "salle",
                    "Salle",
                )

                seances.append(
                    {
                        "film": film_courant,
                        "categorie": categorie_courante,
                        "duree": "",
                        "duree_minutes": None,
                        "date": DATES[
                            correspondance_jour
                        ],
                        "jour": correspondance_jour,
                        "heure": heure,
                        "salle": salle,
                    }
                )

    return seances


# ============================================================
# RECHERCHE AUTOMATIQUE DES DURÉES
# ============================================================

def construire_candidats_durees(pages):
    """
    Construit une liste de toutes les lignes du PDF
    contenant une durée potentielle.
    """

    candidats = []

    for page in pages:

        # Les dernières pages correspondent à
        # "SÉANCES PAR FILM" et contiennent surtout
        # les heures des projections.
        #
        # On évite ainsi de confondre 20h30 avec
        # une durée de 20 h 30.
        if "SÉANCES PAR FILM" in page["texte"].upper():
            continue

        for ligne in page["lignes"]:

            ligne = ligne.strip()

            if not ligne:
                continue

            duree = extraire_duree(
                ligne
            )

            if duree is None:
                continue

            candidats.append(
                {
                    "ligne": ligne,
                    "cle": cle_titre(ligne),
                    "duree": duree,
                    "page": page["numero"],
                }
            )

    return candidats


def trouver_duree_automatique(
    titre,
    candidats,
):
    """
    Recherche le titre d'un film dans les lignes
    comportant une durée.

    Si plusieurs résultats correspondent, on choisit
    celui dont la ligne ressemble le plus au titre
    recherché.
    """

    cle_film = cle_titre(
        titre
    )

    if not cle_film:
        return None

    correspondances = []

    for candidat in candidats:

        cle_ligne = candidat["cle"]

        if cle_film in cle_ligne:

            # Plus la différence de taille est faible,
            # plus la ligne ressemble au titre attendu.
            difference = abs(
                len(cle_ligne)
                - len(cle_film)
            )

            correspondances.append(
                (
                    difference,
                    candidat["duree"],
                    candidat["ligne"],
                )
            )

    if not correspondances:
        return None

    correspondances.sort(
        key=lambda x: x[0]
    )

    return correspondances[0][1]


# ============================================================
# ASSOCIATION DES DURÉES
# ============================================================

def associer_durees(
    seances,
    pages,
):
    """
    Associe une durée à chaque film.

    Ordre :
        1. Recherche dans le PDF
        2. Dictionnaire manuel
        3. Signalement si toujours introuvable
    """

    print()
    print("Association des durées...")

    candidats = construire_candidats_durees(
        pages
    )

    # --------------------------------------------------------
    # Dictionnaire manuel avec les mêmes clés que nos films
    # --------------------------------------------------------

    durees_manuelles_normalisees = {
        cle_titre(titre): duree
        for titre, duree
        in DUREES_MANUELLES.items()
    }

    # --------------------------------------------------------
    # Une seule recherche par film
    # --------------------------------------------------------

    films_uniques = {}

    for seance in seances:

        cle = cle_titre(
            seance["film"]
        )

        if cle not in films_uniques:

            films_uniques[cle] = (
                seance["film"]
            )

    durees_films = {}

    for cle, titre in films_uniques.items():

        # ----------------------------------------------------
        # 1. Recherche automatique
        # ----------------------------------------------------

        duree = trouver_duree_automatique(
            titre,
            candidats,
        )

        source = "PDF"

        # ----------------------------------------------------
        # 2. Fallback manuel
        # ----------------------------------------------------

        if duree is None:

            duree = (
                durees_manuelles_normalisees
                .get(cle)
            )

            if duree is not None:
                source = "manuel"

        # ----------------------------------------------------
        # Résultat
        # ----------------------------------------------------

        if duree is None:

            print(
                f"⚠ Durée introuvable : "
                f"{titre}"
            )

        else:

            if source == "manuel":

                print(
                    f"✓ Durée manuelle : "
                    f"{titre} → "
                    f"{duree_formattee(duree)}"
                )

        durees_films[cle] = (
            duree
        )

    # --------------------------------------------------------
    # Application aux séances
    # --------------------------------------------------------

    for seance in seances:

        cle = cle_titre(
            seance["film"]
        )

        duree = durees_films.get(
            cle
        )

        seance[
            "duree_minutes"
        ] = duree

        seance[
            "duree"
        ] = duree_formattee(
            duree
        )

    return seances


# ============================================================
# DOUBLONS
# ============================================================

def supprimer_doublons(
    seances,
):

    uniques = {}

    for seance in seances:

        cle = (
            cle_titre(
                seance["film"]
            ),
            seance["date"],
            seance["heure"],
            seance["salle"],
        )

        uniques[cle] = seance

    return list(
        uniques.values()
    )


# ============================================================
# TRI
# ============================================================

def cle_tri_seance(
    seance,
):

    try:

        date = datetime.strptime(
            seance["date"],
            "%d/%m/%Y",
        )

    except ValueError:

        date = datetime.max

    try:

        heure = datetime.strptime(
            seance["heure"],
            "%Hh%M",
        ).time()

        minutes = (
            heure.hour * 60
            + heure.minute
        )

    except ValueError:

        minutes = 9999

    salle_match = re.search(
        r"\d+",
        seance["salle"],
    )

    numero_salle = (
        int(salle_match.group())
        if salle_match
        else 9999
    )

    return (
        date,
        minutes,
        numero_salle,
        seance["film"],
    )


def trier_seances(
    seances,
):

    return sorted(
        seances,
        key=cle_tri_seance,
    )


# ============================================================
# GÉNÉRATION EXCEL
# ============================================================

def generer_excel(
    seances,
):

    dataframe = pd.DataFrame(
        seances
    )

    colonnes = [
        "film",
        "categorie",
        "duree",
        "duree_minutes",
        "date",
        "jour",
        "heure",
        "salle",
    ]

    dataframe = dataframe[
        colonnes
    ]

    dataframe.to_excel(
        EXCEL_FILE,
        index=False,
    )

    print(
        f"✓ Excel généré : "
        f"{EXCEL_FILE}"
    )


# ============================================================
# GÉNÉRATION JSON
# ============================================================

def generer_json(
    seances,
):

    films = {}

    for seance in seances:

        titre = seance[
            "film"
        ]

        cle = cle_titre(
            titre
        )

        identifiant = (
            cle.lower()
        )

        if cle not in films:

            films[cle] = {
                "id": identifiant,
                "titre": titre,
                "categorie": seance[
                    "categorie"
                ],
                "duree": seance[
                    "duree"
                ],
                "duree_minutes": seance[
                    "duree_minutes"
                ],
                "seances": [],
            }

        # ----------------------------------------------------
        # Date ISO
        # ----------------------------------------------------

        try:

            date_iso = datetime.strptime(
                seance["date"],
                "%d/%m/%Y",
            ).strftime(
                "%Y-%m-%d"
            )

        except ValueError:

            date_iso = (
                seance["date"]
            )

        # ----------------------------------------------------
        # Heure
        # ----------------------------------------------------

        heure_web = (
            seance["heure"]
            .replace(
                "h",
                ":",
            )
        )

        try:

            heures, minutes = (
                heure_web.split(":")
            )

            heure_minutes = (
                int(heures) * 60
                + int(minutes)
            )

        except (
            ValueError,
            AttributeError,
        ):

            heure_minutes = None

        # ----------------------------------------------------
        # Heure de fin
        # ----------------------------------------------------

        heure_fin_minutes = None
        heure_fin = None

        duree_minutes = seance[
            "duree_minutes"
        ]

        if (
            heure_minutes is not None
            and duree_minutes is not None
        ):

            heure_fin_minutes = (
                heure_minutes
                + duree_minutes
            )

            heures_fin = (
                heure_fin_minutes // 60
            )

            minutes_fin = (
                heure_fin_minutes % 60
            )

            heure_fin = (
                f"{heures_fin:02d}:"
                f"{minutes_fin:02d}"
            )

        films[cle][
            "seances"
        ].append(
            {
                "date": date_iso,
                "jour": seance[
                    "jour"
                ],
                "heure": heure_web,
                "heure_minutes": heure_minutes,
                "heure_fin": heure_fin,
                "heure_fin_minutes": (
                    heure_fin_minutes
                ),
                "salle": seance[
                    "salle"
                ],
            }
        )

    # --------------------------------------------------------
    # Liste des films
    # --------------------------------------------------------

    liste_films = list(
        films.values()
    )

    liste_films.sort(
        key=lambda film:
        film["titre"]
    )

    # --------------------------------------------------------
    # Tri des séances de chaque film
    # --------------------------------------------------------

    for film in liste_films:

        film["seances"].sort(
            key=lambda seance: (
                seance["date"],
                (
                    seance[
                        "heure_minutes"
                    ]
                    if seance[
                        "heure_minutes"
                    ] is not None
                    else 9999
                ),
            )
        )

    # --------------------------------------------------------
    # JSON final
    # --------------------------------------------------------

    return {
        "festival": "Reims Polar",
        "annee": 2026,
        "total_films": len(
            liste_films
        ),
        "total_seances": sum(
            len(
                film["seances"]
            )
            for film in liste_films
        ),
        "films": liste_films,
    }


# ============================================================
# SAUVEGARDE JSON
# ============================================================

def sauvegarder_json(
    data,
):

    with open(
        JSON_FILE,
        "w",
        encoding="utf-8",
    ) as fichier:

        json.dump(
            data,
            fichier,
            ensure_ascii=False,
            indent=2,
        )

    with open(
        WEB_JSON_FILE,
        "w",
        encoding="utf-8",
    ) as fichier:

        json.dump(
            data,
            fichier,
            ensure_ascii=False,
            indent=2,
        )

    print(
        f"✓ JSON généré : "
        f"{JSON_FILE}"
    )

    print(
        f"✓ JSON web généré : "
        f"{WEB_JSON_FILE}"
    )


# ============================================================
# PROGRAMME PRINCIPAL
# ============================================================

def main():

    print()
    print(
        "========================================"
    )
    print(
        "      REIMS POLAR 2026 - SCRAPER"
    )
    print(
        "========================================"
    )
    print()

    # --------------------------------------------------------
    # Création des dossiers
    # --------------------------------------------------------

    PDF_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    WEB_DATA_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # --------------------------------------------------------
    # PDF
    # --------------------------------------------------------

    telecharger_pdf()

    print()
    print("Lecture du PDF...")

    with pdfplumber.open(
        PDF_FILE
    ) as pdf:

        print(
            f"✓ Nombre de pages : "
            f"{len(pdf.pages)}"
        )

        pages = lire_pages_pdf(
            pdf
        )

    # --------------------------------------------------------
    # Séances
    # --------------------------------------------------------

    print()
    print(
        "========================================"
    )
    print(
        "1. EXTRACTION DES SÉANCES"
    )
    print(
        "========================================"
    )

    seances = extraire_seances(
        pages
    )

    print(
        f"✓ {len(seances)} séance(s) "
        f"extraite(s)"
    )

    # --------------------------------------------------------
    # Doublons
    # --------------------------------------------------------

    nombre_avant = len(
        seances
    )

    seances = supprimer_doublons(
        seances
    )

    nombre_apres = len(
        seances
    )

    print(
        f"✓ "
        f"{nombre_avant - nombre_apres} "
        f"doublon(s) supprimé(s)"
    )

    # --------------------------------------------------------
    # Durées
    # --------------------------------------------------------

    print()
    print(
        "========================================"
    )
    print(
        "2. ASSOCIATION DES DURÉES"
    )
    print(
        "========================================"
    )

    seances = associer_durees(
        seances,
        pages,
    )

    # --------------------------------------------------------
    # Tri
    # --------------------------------------------------------

    seances = trier_seances(
        seances
    )

    # --------------------------------------------------------
    # Statistiques durées
    # --------------------------------------------------------

    films_uniques = {}

    for seance in seances:

        cle = cle_titre(
            seance["film"]
        )

        films_uniques[cle] = (
            seance
        )

    films_sans_duree = [
        film["film"]
        for film
        in films_uniques.values()
        if film[
            "duree_minutes"
        ] is None
    ]

    print()

    if films_sans_duree:

        print(
            f"⚠ {len(films_sans_duree)} "
            f"film(s) sans durée :"
        )

        for film in sorted(
            films_sans_duree
        ):

            print(
                f"   - {film}"
            )

    else:

        print(
            "✓ Toutes les durées "
            "ont été trouvées."
        )

    # --------------------------------------------------------
    # Excel
    # --------------------------------------------------------

    print()
    print(
        "========================================"
    )
    print(
        "3. GÉNÉRATION EXCEL"
    )
    print(
        "========================================"
    )

    generer_excel(
        seances
    )

    # --------------------------------------------------------
    # JSON
    # --------------------------------------------------------

    print()
    print(
        "========================================"
    )
    print(
        "4. GÉNÉRATION JSON"
    )
    print(
        "========================================"
    )

    data_json = generer_json(
        seances
    )

    sauvegarder_json(
        data_json
    )

    # --------------------------------------------------------
    # Résumé
    # --------------------------------------------------------

    print()
    print(
        "========================================"
    )
    print(
        "       EXTRACTION TERMINÉE"
    )
    print(
        "========================================"
    )

    print(
        f"Films   : "
        f"{data_json['total_films']}"
    )

    print(
        f"Séances : "
        f"{data_json['total_seances']}"
    )

    print(
        f"Durées manquantes : "
        f"{len(films_sans_duree)}"
    )

    print()

    print(
        f"Excel : {EXCEL_FILE}"
    )

    print(
        f"JSON  : {JSON_FILE}"
    )

    print(
        f"Web   : {WEB_JSON_FILE}"
    )

    print()
    print(
        "========================================"
    )


# ============================================================
# LANCEMENT
# ============================================================

if __name__ == "__main__":
    main()