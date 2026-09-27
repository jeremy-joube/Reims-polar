let festivalData = null;

let currentCategory = "TOUS";

let currentSearch = "";


// ============================================================
// INITIALISATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            const response =
                await fetch(
                    "./data/Reims_Polar_2026.json"
                );


            if (!response.ok) {

                throw new Error(
                    `Erreur HTTP ${response.status}`
                );
            }


            festivalData =
                await response.json();


            window.festivalData =
                festivalData;


            initializeInterface();


        } catch (error) {

            console.error(
                "Impossible de charger les données :",
                error
            );


            const catalogue =
                document.getElementById(
                    "film-grid"
                );


            if (catalogue) {

                catalogue.innerHTML = `

                    <div class="empty-state">

                        <h3>
                            Impossible de charger le catalogue
                        </h3>

                        <p>
                            Vérifiez que le fichier JSON
                            est bien présent dans
                            <code>web/data/</code>.
                        </p>

                    </div>

                `;
            }
        }
    }
);


// ============================================================
// INITIALISATION
// ============================================================

function initializeInterface() {

    setupCategoryFilters();

    setupSearch();

    setupNavigation();

    setupPlanningButtons();

    setupModal();

    setupClearSelection();


    renderCatalogue();

    renderPlanning();

    updateCounters();


    showView(
        "catalogue"
    );
}


// ============================================================
// CATÉGORIES
// ============================================================

function setupCategoryFilters() {

    const container =
        document.getElementById(
            "category-filters"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    // --------------------------------------------------------
    // TOUS
    // --------------------------------------------------------

    const allButton =
        document.createElement(
            "button"
        );


    allButton.type =
        "button";


    allButton.className =
        "category-button active";


    allButton.dataset.category =
        "TOUS";


    allButton.textContent =
        "Tous";


    allButton.addEventListener(
        "click",
        () => {

            currentCategory =
                "TOUS";


            updateActiveCategoryButton();

            renderCatalogue();
        }
    );


    container.appendChild(
        allButton
    );


    // --------------------------------------------------------
    // CATÉGORIES
    // --------------------------------------------------------

    const categories = [

        ...new Set(

            festivalData.films

                .map(
                    film =>
                        film.categorie
                )

                .filter(Boolean)

        )

    ].sort();


    categories.forEach(
        category => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "category-button";


            button.dataset.category =
                category;


            button.textContent =
                category;


            button.addEventListener(
                "click",
                () => {

                    currentCategory =
                        category;


                    updateActiveCategoryButton();

                    renderCatalogue();
                }
            );


            container.appendChild(
                button
            );
        }
    );
}


// ============================================================
// CATÉGORIE ACTIVE
// ============================================================

function updateActiveCategoryButton() {

    const buttons =
        document.querySelectorAll(
            ".category-button"
        );


    buttons.forEach(
        button => {

            button.classList.toggle(

                "active",

                button.dataset.category ===
                currentCategory

            );
        }
    );
}


// ============================================================
// RECHERCHE
// ============================================================

function setupSearch() {

    const input =
        document.getElementById(
            "film-search"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        event => {

            currentSearch =
                event.target.value
                    .trim()
                    .toLowerCase();


            renderCatalogue();
        }
    );
}


// ============================================================
// FILMS FILTRÉS
// ============================================================

function getFilteredFilms() {

    if (
        !festivalData ||
        !festivalData.films
    ) {

        return [];
    }


    return festivalData.films.filter(
        film => {

            const categoryMatch =

                currentCategory ===
                "TOUS"

                ||

                film.categorie ===
                currentCategory;


            const searchMatch =

                !currentSearch

                ||

                film.titre
                    .toLowerCase()
                    .includes(
                        currentSearch
                    );


            return (
                categoryMatch &&
                searchMatch
            );
        }
    );
}


// ============================================================
// CATALOGUE
// ============================================================

function renderCatalogue() {

    const grid =
        document.getElementById(
            "film-grid"
        );


    if (!grid) {
        return;
    }


    const films =
        getFilteredFilms();


    grid.innerHTML = "";


    if (
        films.length === 0
    ) {

        grid.innerHTML = `

            <div class="empty-state">

                <h3>
                    Aucun film trouvé
                </h3>

                <p>
                    Essayez une autre recherche
                    ou une autre catégorie.
                </p>

            </div>

        `;


        return;
    }


    films.forEach(
        film => {

            grid.appendChild(
                createFilmCard(
                    film
                )
            );
        }
    );
}


// ============================================================
// CARTE FILM
// ============================================================

function createFilmCard(
    film
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "film-card";


    const selected =
        planner.isSelected(
            film.id
        );


    if (selected) {

        card.classList.add(
            "selected"
        );
    }


    const category =
        film.categorie || "";


    const duration =
        film.duree || "";


    const sessionsCount =

        Array.isArray(
            film.seances
        )

            ? film.seances.length

            : 0;


    card.innerHTML = `

        <div class="film-card-header">

            <span class="film-category">

                ${escapeHtml(
                    category
                )}

            </span>


            ${
                selected

                    ? `

                        <span
                            class="selected-badge"
                        >

                            SÉLECTIONNÉ

                        </span>

                      `

                    : ""
            }

        </div>


        <div class="film-card-body">

            <h3 class="film-title">

                ${escapeHtml(
                    film.titre
                )}

            </h3>


            <div class="film-meta">

                ${
                    duration

                        ? `

                            <span>

                                ${escapeHtml(
                                    duration
                                )}

                            </span>

                          `

                        : ""
                }


                <span>

                    ${sessionsCount}

                    ${
                        sessionsCount > 1
                            ? "séances"
                            : "séance"
                    }

                </span>

            </div>

        </div>


        <div class="film-card-footer">

            <button
                type="button"
                class="film-details-button"
                data-action="details"
            >
                Détails
            </button>


            <button
                type="button"
                class="film-select-button"
                data-action="select"
            >

                ${
                    selected
                        ? "Retirer"
                        : "Ajouter"
                }

            </button>

        </div>

    `;


    const detailsButton =
        card.querySelector(
            '[data-action="details"]'
        );


    detailsButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            openFilmModal(
                film
            );
        }
    );


    const selectButton =
        card.querySelector(
            '[data-action="select"]'
        );


    selectButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            planner.toggleFilm(
                film.id
            );
        }
    );


    card.addEventListener(
        "click",
        () => {

            openFilmModal(
                film
            );
        }
    );


    return card;
}


// ============================================================
// MODAL
// ============================================================

function setupModal() {

    const modal =
        document.getElementById(
            "film-modal"
        );


    if (!modal) {
        return;
    }


    const closeButtons =
        modal.querySelectorAll(
            "[data-close-modal]"
        );


    closeButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                closeFilmModal
            );
        }
    );


    const overlay =
        modal.querySelector(
            ".modal-overlay"
        );


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeFilmModal
        );
    }
}


function openFilmModal(
    film
) {

    const modal =
        document.getElementById(
            "film-modal"
        );


    if (!modal) {
        return;
    }


    const title =
        modal.querySelector(
            "#modal-film-title"
        );


    const category =
        modal.querySelector(
            "#modal-film-category"
        );


    const duration =
        modal.querySelector(
            "#modal-film-duration"
        );


    const sessions =
        modal.querySelector(
            "#modal-film-sessions"
        );


    const selectButton =
        modal.querySelector(
            "#modal-select-film"
        );


    if (title) {

        title.textContent =
            film.titre;
    }


    if (category) {

        category.textContent =
            film.categorie || "";
    }


    if (duration) {

        duration.textContent =
            film.duree || "";
    }


    // --------------------------------------------------------
    // SÉANCES
    // --------------------------------------------------------

    if (sessions) {

        sessions.innerHTML = "";


        const filmSessions =
            planner.sortSessions(
                film.seances || []
            );


        if (
            filmSessions.length === 0
        ) {

            sessions.innerHTML = `

                <p class="empty-state">

                    Aucune séance disponible.

                </p>

            `;

        } else {

            filmSessions.forEach(
                session => {

                    const item =
                        document.createElement(
                            "div"
                        );


                    item.className =
                        "modal-session";


                    const endTime =

                        session.heure_fin

                        ||

                        calculateEndTime(

                            session.heure,

                            session.duree_minutes

                            ||

                            film.duree_minutes

                        );


                    item.innerHTML = `

                        <div>

                            <strong>

                                ${escapeHtml(
                                    formatDate(
                                        session.date
                                    )
                                )}

                            </strong>


                            <span>

                                ${escapeHtml(
                                    session.jour ||
                                    ""
                                )}

                            </span>

                        </div>


                        <div>

                            <strong>

                                ${escapeHtml(
                                    session.heure ||
                                    ""
                                )}

                            </strong>


                            ${
                                endTime

                                    ? `

                                        <span>

                                            →
                                            ${escapeHtml(
                                                endTime
                                            )}

                                        </span>

                                      `

                                    : ""
                            }

                        </div>


                        <div>

                            ${escapeHtml(
                                session.salle ||
                                ""
                            )}

                        </div>

                    `;


                    sessions.appendChild(
                        item
                    );
                }
            );
        }
    }


    if (selectButton) {

        selectButton.textContent =

            planner.isSelected(
                film.id
            )

                ? "Retirer du planning"

                : "Ajouter au planning";


        selectButton.onclick = () => {

            planner.toggleFilm(
                film.id
            );


            selectButton.textContent =

                planner.isSelected(
                    film.id
                )

                    ? "Retirer du planning"

                    : "Ajouter au planning";
        };
    }


    modal.classList.add(
        "open"
    );


    document.body.classList.add(
        "modal-open"
    );
}


function closeFilmModal() {

    const modal =
        document.getElementById(
            "film-modal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "open"
    );


    document.body.classList.remove(
        "modal-open"
    );
}


// ============================================================
// PLANNING
// ============================================================

function renderPlanning() {

    const container =
        document.getElementById(
            "planning-content"
        );


    if (!container) {
        return;
    }


    const days =
        planner.getSessionsByDay();


    container.innerHTML = "";


    // --------------------------------------------------------
    // PLANNING VIDE
    // --------------------------------------------------------

    if (
        days.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-planning">

                <div class="empty-planning-icon">
                    +
                </div>


                <h3>
                    Votre planning est vide
                </h3>


                <p>

                    Ajoutez des films depuis
                    le catalogue pour construire
                    votre programme.

                </p>


                <button
                    type="button"
                    class="primary-button"
                    id="go-catalogue-inner"
                >

                    Voir le catalogue

                </button>

            </div>

        `;


        const button =
            document.getElementById(
                "go-catalogue-inner"
            );


        if (button) {

            button.addEventListener(
                "click",
                () =>
                    showView(
                        "catalogue"
                    )
            );
        }


        updateConflictAlert(
            new Set()
        );


        return;
    }


    // --------------------------------------------------------
    // CONFLITS
    // --------------------------------------------------------

    const conflictKeys =
        planner.getConflictSessionKeys();


    updateConflictAlert(
        conflictKeys
    );


    // --------------------------------------------------------
    // JOURS
    // --------------------------------------------------------

    days.forEach(
        day => {

            const dayBlock =
                document.createElement(
                    "section"
                );


            dayBlock.className =
                "planning-day";


            dayBlock.innerHTML = `

                <div
                    class="planning-day-header"
                >

                    <div>

                        <span
                            class="planning-day-label"
                        >

                            ${escapeHtml(
                                day.jour ||
                                ""
                            )}

                        </span>


                        <h2>

                            ${escapeHtml(
                                formatDate(
                                    day.date
                                )
                            )}

                        </h2>

                    </div>


                    <span
                        class="planning-day-count"
                    >

                        ${day.sessions.length}

                        ${
                            day.sessions.length > 1
                                ? "séances"
                                : "séance"
                        }

                    </span>

                </div>


                <div
                    class="planning-sessions"
                >
                </div>

            `;


            const sessionsContainer =
                dayBlock.querySelector(
                    ".planning-sessions"
                );


            day.sessions.forEach(
                session => {

                    sessionsContainer.appendChild(

                        createSessionCard(

                            session,

                            conflictKeys

                        )

                    );
                }
            );


            container.appendChild(
                dayBlock
            );
        }
    );
}


// ============================================================
// CARTE SÉANCE
// ============================================================

function createSessionCard(
    session,
    conflictKeys
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "planning-session";


    const key =
        planner.sessionKey(
            session
        );


    const hasConflict =
        conflictKeys.has(
            key
        );


    if (hasConflict) {

        card.classList.add(
            "conflict"
        );
    }


    const endTime =

        session.heure_fin

        ||

        calculateEndTime(

            session.heure,

            session.filmDurationMinutes

        );


    card.innerHTML = `

        <div class="session-time">

            <strong>

                ${escapeHtml(
                    session.heure ||
                    ""
                )}

            </strong>


            ${
                endTime

                    ? `

                        <span>

                            →
                            ${escapeHtml(
                                endTime
                            )}

                        </span>

                      `

                    : ""
            }

        </div>


        <div class="session-info">

            <div class="session-category">

                ${escapeHtml(
                    session.filmCategory ||
                    ""
                )}

            </div>


            <h3>

                ${escapeHtml(
                    session.filmTitle ||
                    ""
                )}

            </h3>


            <div class="session-meta">

                <span>

                    ${escapeHtml(
                        session.salle ||
                        ""
                    )}

                </span>


                ${
                    session.filmDuration

                        ? `

                            <span>

                                ${escapeHtml(
                                    session.filmDuration
                                )}

                            </span>

                          `

                        : ""
                }

            </div>

        </div>


        <div class="session-status">

            ${
                hasConflict

                    ? `

                        <span
                            class="conflict-badge"
                        >

                            CONFLIT

                        </span>

                      `

                    : ""
            }


            <button
                type="button"
                class="remove-session-button"
                data-action="remove-session"
            >

                Retirer

            </button>

        </div>

    `;


    // ========================================================
    // RETIRER CETTE SÉANCE
    // ========================================================

    const removeButton =
        card.querySelector(
            '[data-action="remove-session"]'
        );


    if (removeButton) {

        removeButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                planner.removeSession(
                    session
                );
            }
        );
    }


    return card;
}


// ============================================================
// ALERTE CONFLITS
// ============================================================

function updateConflictAlert(
    conflictKeys
) {

    const alert =
        document.getElementById(
            "conflict-alert"
        );


    if (!alert) {
        return;
    }


    const count =
        conflictKeys.size;


    if (
        count > 0
    ) {

        alert.classList.remove(
            "hidden"
        );


        alert.innerHTML = `

            <strong>

                ${count}

                ${
                    count > 1
                        ? "séances sont en conflit."
                        : "séance est en conflit."
                }

            </strong>


            <span>

                Les séances concernées
                sont signalées en rouge.
                Vous pouvez retirer
                individuellement une séance.

            </span>

        `;

    } else {

        alert.classList.add(
            "hidden"
        );
    }
}


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    const catalogueButtons =
        document.querySelectorAll(
            '[data-view="catalogue"]'
        );


    const planningButtons =
        document.querySelectorAll(
            '[data-view="planning"]'
        );


    catalogueButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () =>
                    showView(
                        "catalogue"
                    )
            );
        }
    );


    planningButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () =>
                    showView(
                        "planning"
                    )
            );
        }
    );
}


function setupPlanningButtons() {

    const button =
        document.getElementById(
            "go-catalogue"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () =>
            showView(
                "catalogue"
            )
    );
}


function showView(
    view
) {

    const catalogue =
        document.getElementById(
            "catalogue-view"
        );


    const planning =
        document.getElementById(
            "planning-view"
        );


    const catalogueTabs =
        document.querySelectorAll(
            '[data-view="catalogue"]'
        );


    const planningTabs =
        document.querySelectorAll(
            '[data-view="planning"]'
        );


    if (
        view ===
        "catalogue"
    ) {

        if (catalogue) {

            catalogue.classList.add(
                "active"
            );
        }


        if (planning) {

            planning.classList.remove(
                "active"
            );
        }


        catalogueTabs.forEach(
            button =>
                button.classList.add(
                    "active"
                )
        );


        planningTabs.forEach(
            button =>
                button.classList.remove(
                    "active"
                )
        );


    } else {

        if (catalogue) {

            catalogue.classList.remove(
                "active"
            );
        }


        if (planning) {

            planning.classList.add(
                "active"
            );
        }


        catalogueTabs.forEach(
            button =>
                button.classList.remove(
                    "active"
                )
        );


        planningTabs.forEach(
            button =>
                button.classList.add(
                    "active"
                )
        );
    }
}


// ============================================================
// COMPTEURS
// ============================================================

function updateCounters() {

    const selectedFilms =
        planner.getSelectedFilms();


    const selectedSessions =
        planner.getSelectedSessions();


    const filmCounter =
        document.getElementById(
            "selected-films-count"
        );


    const sessionCounter =
        document.getElementById(
            "selected-sessions-count"
        );


    if (filmCounter) {

        filmCounter.textContent =
            selectedFilms.length;
    }


    if (sessionCounter) {

        sessionCounter.textContent =
            selectedSessions.length;
    }
}


// ============================================================
// EFFACER
// ============================================================

function setupClearSelection() {

    const button =
        document.getElementById(
            "clear-selection"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            if (
                planner
                    .getSelectedFilms()
                    .length === 0
            ) {

                return;
            }


            const confirmed =
                window.confirm(

                    "Voulez-vous vraiment supprimer tous les films de votre planning ?"

                );


            if (confirmed) {

                planner.clearSelection();
            }
        }
    );
}


// ============================================================
// DATE
// ============================================================

function formatDate(
    dateString
) {

    if (!dateString) {
        return "";
    }


    const date =
        new Date(
            `${dateString}T12:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;
    }


    return date.toLocaleDateString(
        "fr-FR",
        {

            weekday:
                "long",

            day:
                "numeric",

            month:
                "long"

        }
    );
}


// ============================================================
// HEURE DE FIN
// ============================================================

function calculateEndTime(
    startTime,
    durationMinutes
) {

    if (
        !startTime ||
        !durationMinutes
    ) {

        return "";
    }


    const match =
        startTime.match(
            /(\d{1,2})h(\d{2})?/
        );


    if (!match) {
        return "";
    }


    const hours =
        Number(
            match[1]
        );


    const minutes =
        Number(
            match[2] || 0
        );


    const total =

        hours * 60 +

        minutes +

        Number(
            durationMinutes
        );


    const endHours =
        Math.floor(
            total / 60
        ) % 24;


    const endMinutes =
        total % 60;


    return (

        `${String(
            endHours
        ).padStart(2, "0")}h` +

        `${String(
            endMinutes
        ).padStart(2, "0")}`

    );
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


// ============================================================
// API GLOBALE
// ============================================================

window.renderCatalogue =
    renderCatalogue;


window.renderPlanning =
    renderPlanning;


window.updateCounters =
    updateCounters;


window.showView =
    showView;