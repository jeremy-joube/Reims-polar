/*
 * ============================================================
 * REIMS POLAR PLANNER
 * Gestion des plannings personnels et partagés
 * ============================================================
 */


const LOCAL_USER_KEY =
    "reims-polar-2026-user";

const LOCAL_EXCLUDED_KEY =
    "reims-polar-2026-excluded-sessions";

const LOCAL_PLANNING_KEY =
    "reims-polar-2026-shared-planning";

const LOCAL_VISIBILITY_KEY =
    "reims-polar-2026-colleague-visible";


let selectedFilms = new Set();

let excludedSessions = new Set();

let festivalData = null;

let currentUser = null;

let currentSharedPlanning = null;

let colleagueUser = null;

let colleagueSelectedFilms = new Set();

let colleagueExcludedSessions = new Set();

let colleagueVisible = true;

let currentPlanningView = "mine";


/*
 * ============================================================
 * INITIALISATION
 * ============================================================
 */

function initPlanner(data) {

    festivalData = data;

    loadLocalState();

    return loadSharedPlanning();
}


/*
 * ============================================================
 * STOCKAGE LOCAL
 * ============================================================
 */

function loadLocalState() {

    try {

        const savedUser =
            localStorage.getItem(LOCAL_USER_KEY);

        if (savedUser) {

            currentUser =
                JSON.parse(savedUser);

        }

    } catch (error) {

        console.error(
            "Impossible de charger l'utilisateur",
            error
        );

    }


    try {

        const savedExcluded =
            localStorage.getItem(
                LOCAL_EXCLUDED_KEY
            );

        if (savedExcluded) {

            excludedSessions =
                new Set(
                    JSON.parse(savedExcluded)
                );

        }

    } catch (error) {

        console.error(
            "Impossible de charger les séances exclues",
            error
        );

    }


    try {

        const savedPlanning =
            localStorage.getItem(
                LOCAL_PLANNING_KEY
            );

        if (savedPlanning) {

            currentSharedPlanning =
                JSON.parse(savedPlanning);

        }

    } catch (error) {

        console.error(
            "Impossible de charger le planning",
            error
        );

    }


    try {

        const savedVisibility =
            localStorage.getItem(
                LOCAL_VISIBILITY_KEY
            );

        if (savedVisibility !== null) {

            colleagueVisible =
                savedVisibility === "true";

        }

    } catch (error) {

        colleagueVisible = true;

    }

}


/*
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function saveLocalState() {

    localStorage.setItem(
        LOCAL_EXCLUDED_KEY,
        JSON.stringify(
            [...excludedSessions]
        )
    );


    if (currentUser) {

        localStorage.setItem(
            LOCAL_USER_KEY,
            JSON.stringify(currentUser)
        );

    }


    if (currentSharedPlanning) {

        localStorage.setItem(
            LOCAL_PLANNING_KEY,
            JSON.stringify(
                currentSharedPlanning
            )
        );

    }


    localStorage.setItem(
        LOCAL_VISIBILITY_KEY,
        String(colleagueVisible)
    );

}


function sessionKey(session) {

    return [
        session.filmId || "",
        session.date || "",
        session.heure || "",
        session.salle || ""
    ].join("|");

}


function isSessionExcluded(session) {

    return excludedSessions.has(
        sessionKey(session)
    );

}


/*
 * ============================================================
 * FILMS
 * ============================================================
 */

function getFilmById(filmId) {

    if (!festivalData) {
        return null;
    }

    return festivalData.films.find(
        film => film.id === filmId
    ) || null;

}


function selectFilm(filmId) {

    selectedFilms.add(filmId);

    saveLocalState();

    updateSharedPlanning();

}


function deselectFilm(filmId) {

    selectedFilms.delete(filmId);

    removeExcludedSessionsForFilm(
        filmId
    );

    saveLocalState();

    updateSharedPlanning();

}


function isFilmSelected(filmId) {

    return selectedFilms.has(
        filmId
    );

}


function removeExcludedSessionsForFilm(
    filmId
) {

    for (const key of excludedSessions) {

        if (
            key.startsWith(
                `${filmId}|`
            )
        ) {

            excludedSessions.delete(key);

        }

    }

}


/*
 * ============================================================
 * SÉANCES
 * ============================================================
 */

function removeSession(session) {

    excludedSessions.add(
        sessionKey(session)
    );

    saveLocalState();

    updateSharedPlanning();

}


function restoreSession(session) {

    excludedSessions.delete(
        sessionKey(session)
    );

    saveLocalState();

    updateSharedPlanning();

}


function getSelectedSessions() {

    if (!festivalData) {
        return [];
    }


    const sessions = [];


    for (const film of festivalData.films) {

        if (!selectedFilms.has(film.id)) {
            continue;
        }


        for (const session of film.seances || []) {

            if (
                isSessionExcluded({
                    ...session,
                    filmId: film.id
                })
            ) {
                continue;
            }


            sessions.push({

                ...session,

                filmId: film.id,

                filmTitle: film.titre,

                filmDurationMinutes:
                    film.duree_minutes || 0

            });

        }

    }


    return sessions;

}


/*
 * ============================================================
 * SÉANCES D'UN AUTRE UTILISATEUR
 * ============================================================
 */

function getColleagueSessions() {

    if (!festivalData) {
        return [];
    }


    const sessions = [];


    for (
        const film of festivalData.films
    ) {

        if (
            !colleagueSelectedFilms.has(
                film.id
            )
        ) {
            continue;
        }


        for (
            const session of film.seances || []
        ) {

            const enriched = {

                ...session,

                filmId: film.id,

                filmTitle: film.titre,

                filmDurationMinutes:
                    film.duree_minutes || 0

            };


            if (
                colleagueExcludedSessions.has(
                    sessionKey(enriched)
                )
            ) {
                continue;
            }


            sessions.push(enriched);

        }

    }


    return sessions;

}


/*
 * ============================================================
 * TRI
 * ============================================================
 */

function sortSessions(sessions) {

    return [...sessions].sort(
        (a, b) => {

            const dateA =
                a.date || "";

            const dateB =
                b.date || "";

            if (dateA !== dateB) {

                return dateA.localeCompare(
                    dateB
                );

            }


            return (
                (a.heure_minutes || 0) -
                (b.heure_minutes || 0)
            );

        }
    );

}


/*
 * ============================================================
 * FIN DE SÉANCE
 * ============================================================
 */

function calculateEndTime(
    startMinutes,
    durationMinutes
) {

    const total =
        startMinutes +
        durationMinutes;


    const hours =
        Math.floor(total / 60) % 24;

    const minutes =
        total % 60;


    return (
        String(hours).padStart(2, "0") +
        "h" +
        String(minutes).padStart(2, "0")
    );

}


/*
 * ============================================================
 * CONFLITS
 * ============================================================
 */

function getSessionEndMinutes(session) {

    return (
        session.heure_minutes || 0
    ) +
    (
        session.filmDurationMinutes || 0
    );

}


function sessionsConflict(a, b) {

    if (a.date !== b.date) {
        return false;
    }


    const startA =
        a.heure_minutes || 0;

    const endA =
        getSessionEndMinutes(a);


    const startB =
        b.heure_minutes || 0;

    const endB =
        getSessionEndMinutes(b);


    return (
        startA < endB &&
        startB < endA
    );

}


function getConflictSessionKeys(
    sessions
) {

    const conflicts =
        new Set();


    for (
        let i = 0;
        i < sessions.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < sessions.length;
            j++
        ) {

            if (
                sessionsConflict(
                    sessions[i],
                    sessions[j]
                )
            ) {

                conflicts.add(
                    sessionKey(
                        sessions[i]
                    )
                );

                conflicts.add(
                    sessionKey(
                        sessions[j]
                    )
                );

            }

        }

    }


    return conflicts;

}


/*
 * ============================================================
 * COLLABORATION
 * ============================================================
 */

async function createSharedPlanning(
    userName
) {

    if (!userName.trim()) {

        throw new Error(
            "Veuillez renseigner votre prénom."
        );

    }


    const code =
        generatePlanningCode();


    const planningName =
        `${userName} & collègue`;


    const {
        data,
        error
    } = await supabaseClient
        .from("planning_rooms")
        .insert({

            code: code,

            name: planningName

        })
        .select()
        .single();


    if (error) {

        console.error(error);

        throw error;

    }


    currentSharedPlanning =
        data;


    const user =
        await registerUser(
            data.id,
            userName
        );


    currentUser =
        user;


    saveLocalState();

    return data;

}


async function joinSharedPlanning(
    code,
    userName
) {

    if (!code.trim()) {

        throw new Error(
            "Veuillez renseigner un code."
        );

    }


    if (!userName.trim()) {

        throw new Error(
            "Veuillez renseigner votre prénom."
        );

    }


    const {
        data: room,
        error
    } = await supabaseClient
        .from("planning_rooms")
        .select("*")
        .eq(
            "code",
            code.trim().toUpperCase()
        )
        .single();


    if (error || !room) {

        throw new Error(
            "Planning introuvable."
        );

    }


    currentSharedPlanning =
        room;


    currentUser =
        await registerUser(
            room.id,
            userName
        );


    saveLocalState();

    return room;

}


async function registerUser(
    roomId,
    userName
) {

    const existingUser =
        await supabaseClient
            .from("planning_users")
            .select("*")
            .eq(
                "room_id",
                roomId
            )
            .eq(
                "name",
                userName.trim()
            )
            .maybeSingle();


    if (
        existingUser.data
    ) {

        return existingUser.data;

    }


    const {
        data,
        error
    } = await supabaseClient
        .from("planning_users")
        .insert({

            room_id: roomId,

            name: userName.trim()

        })
        .select()
        .single();


    if (error) {

        throw error;

    }


    return data;

}


function generatePlanningCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    let result =
        "RP26-";


    for (
        let i = 0;
        i < 4;
        i++
    ) {

        result +=
            chars[
                Math.floor(
                    Math.random() *
                    chars.length
                )
            ];

    }


    return result;

}


/*
 * ============================================================
 * CHARGEMENT DU PLANNING PARTAGÉ
 * ============================================================
 */

async function loadSharedPlanning() {

    if (
        !currentSharedPlanning ||
        !currentUser
    ) {

        return;

    }


    await loadAllSharedSelections();

}


async function loadAllSharedSelections() {

    if (
        !currentSharedPlanning
    ) {
        return;
    }


    const {
        data: users,
        error: usersError
    } =
        await supabaseClient
            .from("planning_users")
            .select("*")
            .eq(
                "room_id",
                currentSharedPlanning.id
            );


    if (usersError) {

        console.error(usersError);

        return;

    }


    colleagueUser =
        users.find(
            user =>
                user.id !==
                currentUser.id
        ) || null;


    if (!colleagueUser) {

        colleagueSelectedFilms =
            new Set();

        colleagueExcludedSessions =
            new Set();

        return;

    }


    const {
        data: selections,
        error: selectionsError
    } =
        await supabaseClient
            .from("planning_selections")
            .select("*")
            .eq(
                "user_id",
                colleagueUser.id
            );


    if (selectionsError) {

        console.error(
            selectionsError
        );

        return;

    }


    colleagueSelectedFilms =
        new Set(
            selections
                .filter(
                    item =>
                        item.selected
                )
                .map(
                    item =>
                        item.film_id
                )
        );


    colleagueExcludedSessions =
        new Set(
            selections
                .filter(
                    item =>
                        item.session_excluded
                )
                .map(
                    item =>
                        item.session_key
                )
                .filter(Boolean)
        );

}


/*
 * ============================================================
 * SYNCHRONISATION
 * ============================================================
 */
async function updateSharedPlanning() {

    if (
        !currentSharedPlanning ||
        !currentUser
    ) {
        return;
    }


    const rows = [];


    /*
     * ============================================================
     * SÉANCES SÉLECTIONNÉES
     * ============================================================
     *
     * Une ligne est créée pour chaque séance réellement
     * sélectionnée.
     */

    const selectedSessions =
        getSelectedSessions();


    for (
        const session of selectedSessions
    ) {

        rows.push({

            user_id:
                currentUser.id,

            film_id:
                session.filmId,

            selected:
                true,

            session_excluded:
                false,

            session_key:
                sessionKey(session)

        });

    }


    /*
     * ============================================================
     * SÉANCES EXCLUES MANUELLEMENT
     * ============================================================
     */

    for (
        const sessionKeyValue
        of excludedSessions
    ) {

        const filmId =
            sessionKeyValue.split("|")[0];


        rows.push({

            user_id:
                currentUser.id,

            film_id:
                filmId,

            selected:
                false,

            session_excluded:
                true,

            session_key:
                sessionKeyValue

        });

    }


    /*
     * ============================================================
     * SUPPRESSION DES ANCIENNES SÉLECTIONS
     * ============================================================
     */

    const {
        error: deleteError
    } =
        await supabaseClient
            .from("planning_selections")
            .delete()
            .eq(
                "user_id",
                currentUser.id
            );


    if (deleteError) {

        console.error(
            "Erreur lors de la suppression des anciennes sélections :",
            deleteError
        );

        return;

    }


    /*
     * ============================================================
     * INSERTION DES NOUVELLES SÉLECTIONS
     * ============================================================
     */

    if (!rows.length) {
        return;
    }


    const {
        error: insertError
    } =
        await supabaseClient
            .from("planning_selections")
            .insert(rows);


    if (insertError) {

        console.error(
            "Erreur lors de l'enregistrement du planning partagé :",
            insertError
        );

    }

}

/*
 * ============================================================
 * ABONNEMENT TEMPS RÉEL
 * ============================================================
 */

function subscribeToSharedPlanning(
    callback
) {

    if (
        !currentSharedPlanning
    ) {

        return null;

    }


    const channel =
        supabaseClient
            .channel(
                `planning-${currentSharedPlanning.id}`
            )
            .on(

                "postgres_changes",

                {
                    event: "*",

                    schema: "public",

                    table: "planning_selections",

                    filter:
                        `user_id=neq.${currentUser.id}`

                },

                async () => {

                    await loadAllSharedSelections();

                    if (callback) {
                        callback();
                    }

                }

            )
            .subscribe();


    return channel;

}


/*
 * ============================================================
 * VUE
 * ============================================================
 */

function setPlanningView(view) {

    currentPlanningView =
        view;

}


function getPlanningSessions() {

    if (
        currentPlanningView ===
        "colleague"
    ) {

        return getColleagueSessions();

    }


    if (
        currentPlanningView ===
        "combined"
    ) {

        const mine =
            getSelectedSessions();

        const colleague =
            getColleagueSessions();


        const map =
            new Map();


        for (const session of mine) {

            map.set(
                sessionKey(session),
                {
                    ...session,
                    owner: "mine"
                }
            );

        }


        for (
            const session of colleague
        ) {

            const key =
                sessionKey(session);


            if (map.has(key)) {

                map.get(key).owner =
                    "both";

            } else {

                map.set(
                    key,
                    {
                        ...session,
                        owner:
                            "colleague"
                    }
                );

            }

        }


        return [
            ...map.values()
        ];

    }


    return getSelectedSessions();

}


/*
 * ============================================================
 * API PUBLIQUE
 * ============================================================
 */

window.planner = {

    initPlanner,

    getFilmById,

    selectFilm,

    deselectFilm,

    isFilmSelected,

    removeSession,

    restoreSession,

    getSelectedSessions,

    getColleagueSessions,

    getPlanningSessions,

    sortSessions,

    calculateEndTime,

    sessionKey,

    getConflictSessionKeys,

    sessionsConflict,

    createSharedPlanning,

    joinSharedPlanning,

    loadAllSharedSelections,

    subscribeToSharedPlanning,

    updateSharedPlanning,

    setPlanningView,

    getCurrentUser:
        () => currentUser,

    getSharedPlanning:
        () => currentSharedPlanning,

    getColleagueUser:
        () => colleagueUser,

    isColleagueVisible:
        () => colleagueVisible,

    setColleagueVisible:
        value => {

            colleagueVisible =
                value;

            saveLocalState();

        }

};