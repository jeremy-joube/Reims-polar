const STORAGE_KEY = "reims-polar-2026-selection";
const EXCLUDED_SESSIONS_STORAGE_KEY =
    "reims-polar-2026-excluded-sessions";


let selectedFilms = new Set();

let excludedSessions = new Set();


// ============================================================
// STORAGE
// ============================================================

function loadSelection() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (saved) {

            const parsed =
                JSON.parse(saved);


            if (Array.isArray(parsed)) {

                selectedFilms =
                    new Set(parsed);
            }
        }


    } catch (error) {

        console.error(
            "Impossible de charger la sélection :",
            error
        );

        selectedFilms =
            new Set();
    }
}


function saveSelection() {

    try {

        localStorage.setItem(

            STORAGE_KEY,

            JSON.stringify(
                [...selectedFilms]
            )

        );

    } catch (error) {

        console.error(
            "Impossible de sauvegarder la sélection :",
            error
        );
    }
}


// ============================================================
// SÉANCES EXCLUES
// ============================================================

function loadExcludedSessions() {

    try {

        const saved =
            localStorage.getItem(
                EXCLUDED_SESSIONS_STORAGE_KEY
            );


        if (saved) {

            const parsed =
                JSON.parse(saved);


            if (Array.isArray(parsed)) {

                excludedSessions =
                    new Set(parsed);
            }
        }


    } catch (error) {

        console.error(
            "Impossible de charger les séances retirées :",
            error
        );

        excludedSessions =
            new Set();
    }
}


function saveExcludedSessions() {

    try {

        localStorage.setItem(

            EXCLUDED_SESSIONS_STORAGE_KEY,

            JSON.stringify(
                [...excludedSessions]
            )

        );

    } catch (error) {

        console.error(
            "Impossible de sauvegarder les séances retirées :",
            error
        );
    }
}


// ============================================================
// FILMS
// ============================================================

function toggleFilm(filmId) {

    if (
        selectedFilms.has(
            filmId
        )
    ) {

        selectedFilms.delete(
            filmId
        );

        // Quand on retire complètement
        // un film, on réinitialise aussi
        // ses éventuelles séances exclues.

        removeExcludedSessionsForFilm(
            filmId
        );

    } else {

        selectedFilms.add(
            filmId
        );
    }


    saveSelection();

    saveExcludedSessions();

    updateInterface();
}


function removeFilm(filmId) {

    selectedFilms.delete(
        filmId
    );


    removeExcludedSessionsForFilm(
        filmId
    );


    saveSelection();

    saveExcludedSessions();

    updateInterface();
}


function clearSelection() {

    selectedFilms.clear();

    excludedSessions.clear();


    saveSelection();

    saveExcludedSessions();

    updateInterface();
}


function isSelected(filmId) {

    return selectedFilms.has(
        filmId
    );
}


function getSelectedFilms() {

    if (

        !window.festivalData ||

        !Array.isArray(
            window.festivalData.films
        )

    ) {

        return [];
    }


    return window.festivalData.films.filter(

        film =>
            selectedFilms.has(
                film.id
            )

    );
}


// ============================================================
// CLÉ UNIQUE D'UNE SÉANCE
// ============================================================

function sessionKey(session) {

    return [

        session.filmId || "",

        session.date || "",

        session.heure || "",

        session.salle || ""

    ].join("|");
}


// ============================================================
// SÉANCE EXCLUE ?
// ============================================================

function isSessionExcluded(
    session
) {

    return excludedSessions.has(
        sessionKey(session)
    );
}


// ============================================================
// RETIRER UNE SÉANCE
// ============================================================

function removeSession(session) {

    const key =
        sessionKey(
            session
        );


    excludedSessions.add(
        key
    );


    saveExcludedSessions();

    updateInterface();
}


// ============================================================
// RESTAURER UNE SÉANCE
// ============================================================

function restoreSession(session) {

    const key =
        sessionKey(
            session
        );


    excludedSessions.delete(
        key
    );


    saveExcludedSessions();

    updateInterface();
}


// ============================================================
// RETIRER LES EXCLUSIONS D'UN FILM
// ============================================================

function removeExcludedSessionsForFilm(
    filmId
) {

    const prefix =
        `${filmId}|`;


    excludedSessions =
        new Set(

            [...excludedSessions].filter(
                key =>
                    !key.startsWith(
                        prefix
                    )
            )

        );
}


// ============================================================
// SÉANCES SÉLECTIONNÉES
// ============================================================

function getSelectedSessions() {

    const sessions = [];


    getSelectedFilms().forEach(
        film => {

            if (
                !Array.isArray(
                    film.seances
                )
            ) {

                return;
            }


            film.seances.forEach(
                session => {

                    const enrichedSession = {

                        ...session,

                        filmId:
                            film.id,

                        filmTitle:
                            film.titre,

                        filmCategory:
                            film.categorie,

                        filmDuration:
                            film.duree,

                        filmDurationMinutes:
                            film.duree_minutes

                    };


                    // ----------------------------------------
                    // Séance exclue ?
                    // ----------------------------------------

                    if (
                        isSessionExcluded(
                            enrichedSession
                        )
                    ) {

                        return;
                    }


                    sessions.push(
                        enrichedSession
                    );
                }
            );
        }
    );


    return sessions;
}


// ============================================================
// TRI
// ============================================================

function sortSessions(
    sessions
) {

    return [...sessions].sort(
        (a, b) => {

            const dateA =
                a.date || "";


            const dateB =
                b.date || "";


            if (
                dateA !==
                dateB
            ) {

                return dateA.localeCompare(
                    dateB
                );
            }


            const timeA =
                Number(
                    a.heure_minutes ||
                    0
                );


            const timeB =
                Number(
                    b.heure_minutes ||
                    0
                );


            if (
                timeA !==
                timeB
            ) {

                return (
                    timeA -
                    timeB
                );
            }


            return (

                a.salle ||
                ""

            ).localeCompare(

                b.salle ||
                ""

            );
        }
    );
}


// ============================================================
// SÉANCES PAR JOUR
// ============================================================

function getSessionsByDay() {

    const sessions =
        sortSessions(
            getSelectedSessions()
        );


    const days = {};


    sessions.forEach(
        session => {

            if (
                !days[
                    session.date
                ]
            ) {

                days[
                    session.date
                ] = {

                    date:
                        session.date,

                    jour:
                        session.jour,

                    sessions:
                        []

                };
            }


            days[
                session.date
            ].sessions.push(
                session
            );
        }
    );


    return Object.values(
        days
    );
}


// ============================================================
// FIN DE SÉANCE
// ============================================================

function getSessionEndMinutes(
    session
) {

    if (

        typeof
            session.heure_fin_minutes ===
            "number"

        &&

        !Number.isNaN(
            session.heure_fin_minutes
        )

    ) {

        return session.heure_fin_minutes;
    }


    const start =
        Number(
            session.heure_minutes ||
            0
        );


    const duration =
        Number(

            session.filmDurationMinutes ||

            session.duree_minutes ||

            0

        );


    return (
        start +
        duration
    );
}


// ============================================================
// CONFLITS
// ============================================================

function detectConflicts() {

    const sessions =
        getSelectedSessions();


    const conflicts = [];


    for (
        let i = 0;
        i < sessions.length;
        i++
    ) {

        const first =
            sessions[i];


        const firstStart =
            Number(
                first.heure_minutes ||
                0
            );


        const firstEnd =
            getSessionEndMinutes(
                first
            );


        for (
            let j = i + 1;
            j < sessions.length;
            j++
        ) {

            const second =
                sessions[j];


            if (
                first.date !==
                second.date
            ) {

                continue;
            }


            const secondStart =
                Number(
                    second.heure_minutes ||
                    0
                );


            const secondEnd =
                getSessionEndMinutes(
                    second
                );


            const overlap =

                firstStart <
                secondEnd

                &&

                secondStart <
                firstEnd;


            if (overlap) {

                conflicts.push({

                    first,

                    second

                });
            }
        }
    }


    return conflicts;
}


// ============================================================
// CLÉS DES SÉANCES EN CONFLIT
// ============================================================

function getConflictSessionKeys() {

    const keys =
        new Set();


    detectConflicts().forEach(
        conflict => {

            keys.add(
                sessionKey(
                    conflict.first
                )
            );


            keys.add(
                sessionKey(
                    conflict.second
                )
            );
        }
    );


    return keys;
}


// ============================================================
// INTERFACE
// ============================================================

function updateInterface() {

    if (
        typeof window.renderCatalogue ===
        "function"
    ) {

        window.renderCatalogue();
    }


    if (
        typeof window.renderPlanning ===
        "function"
    ) {

        window.renderPlanning();
    }


    if (
        typeof window.updateCounters ===
        "function"
    ) {

        window.updateCounters();
    }
}


// ============================================================
// INITIALISATION
// ============================================================

loadSelection();

loadExcludedSessions();


// ============================================================
// API PUBLIQUE
// ============================================================

window.planner = {

    toggleFilm,

    removeFilm,

    clearSelection,

    isSelected,

    getSelectedFilms,

    getSelectedSessions,

    sortSessions,

    getSessionsByDay,

    detectConflicts,

    getConflictSessionKeys,

    sessionKey,

    getSessionEndMinutes,

    isSessionExcluded,

    removeSession,

    restoreSession,

    updateInterface

};