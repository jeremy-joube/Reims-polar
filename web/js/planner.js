/* =========================================================
   PLANNER
========================================================= */

const STORAGE_KEY = "reims-polar-2026-selection";


let selectedFilms = new Set();


/* =========================================================
   CHARGEMENT
========================================================= */

function loadSelection() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!saved) {
            return;
        }

        const ids =
            JSON.parse(saved);

        if (Array.isArray(ids)) {

            selectedFilms =
                new Set(ids);

        }

    } catch (error) {

        console.error(
            "Impossible de charger la sélection.",
            error
        );

    }

}


/* =========================================================
   SAUVEGARDE
========================================================= */

function saveSelection() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            Array.from(
                selectedFilms
            )
        )
    );

}


/* =========================================================
   AJOUT / RETRAIT
========================================================= */

function toggleFilm(filmId) {

    if (
        selectedFilms.has(
            filmId
        )
    ) {

        selectedFilms.delete(
            filmId
        );

    } else {

        selectedFilms.add(
            filmId
        );

    }

    saveSelection();

    updateInterface();

}


/* =========================================================
   RETRAIT
========================================================= */

function removeFilm(filmId) {

    selectedFilms.delete(
        filmId
    );

    saveSelection();

    updateInterface();

}


/* =========================================================
   VIDER
========================================================= */

function clearSelection() {

    selectedFilms.clear();

    saveSelection();

    updateInterface();

}


/* =========================================================
   TEST SÉLECTION
========================================================= */

function isSelected(filmId) {

    return selectedFilms.has(
        filmId
    );

}


/* =========================================================
   FILMS SÉLECTIONNÉS
========================================================= */

function getSelectedFilms() {

    if (
        typeof festivalData ===
        "undefined"
    ) {

        return [];

    }

    return festivalData.films.filter(
        film =>
            selectedFilms.has(
                film.id
            )
    );

}


/* =========================================================
   TOUTES LES SÉANCES
========================================================= */

function getSelectedSessions() {

    const sessions = [];

    getSelectedFilms().forEach(
        film => {

            film.seances.forEach(
                session => {

                    sessions.push({
                        ...session,
                        filmId: film.id,
                        filmTitle: film.titre,
                        category: film.categorie,
                        duration: film.duree,
                        durationMinutes:
                            film.duree_minutes
                    });

                }
            );

        }
    );

    return sessions;

}


/* =========================================================
   TRI
========================================================= */

function sortSessions(
    sessions
) {

    return sessions.sort(
        (a, b) => {

            const dateCompare =
                a.date.localeCompare(
                    b.date
                );

            if (
                dateCompare !== 0
            ) {

                return dateCompare;

            }

            return (
                a.heure_minutes
                -
                b.heure_minutes
            );

        }
    );

}


/* =========================================================
   GROUPEMENT PAR JOUR
========================================================= */

function getSessionsByDay() {

    const grouped = {};

    const sessions =
        sortSessions(
            getSelectedSessions()
        );

    sessions.forEach(
        session => {

            if (
                !grouped[
                    session.date
                ]
            ) {

                grouped[
                    session.date
                ] = [];

            }

            grouped[
                session.date
            ].push(
                session
            );

        }
    );

    return grouped;

}


/* =========================================================
   CONFLITS
========================================================= */

function detectConflicts() {

    const sessions =
        sortSessions(
            getSelectedSessions()
        );

    const conflicts = [];

    for (
        let i = 0;
        i < sessions.length;
        i++
    ) {

        const current =
            sessions[i];

        if (
            current.heure_fin_minutes
            === null ||
            current.heure_fin_minutes
            === undefined
        ) {

            continue;

        }

        for (
            let j = i + 1;
            j < sessions.length;
            j++
        ) {

            const next =
                sessions[j];

            // On ne compare que les séances
            // du même jour.

            if (
                next.date !==
                current.date
            ) {

                break;

            }

            if (
                next.heure_minutes <
                current.heure_fin_minutes
            ) {

                conflicts.push({
                    first: current,
                    second: next
                });

            }

        }

    }

    return conflicts;

}


/* =========================================================
   MISE À JOUR GLOBALE
========================================================= */

function updateInterface() {

    if (
        typeof renderCatalogue ===
        "function"
    ) {

        renderCatalogue();

    }

    if (
        typeof renderPlanning ===
        "function"
    ) {

        renderPlanning();

    }

    if (
        typeof updateCounters ===
        "function"
    ) {

        updateCounters();

    }

}


/* =========================================================
   INITIALISATION
========================================================= */

loadSelection();