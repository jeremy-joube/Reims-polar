/*
 * ============================================================
 * REIMS POLAR PLANNER
 * Interface
 * ============================================================
 */


let currentCategory = "TOUS";

let currentSearch = "";

let activeRealtimeChannel = null;


/*
 * ============================================================
 * INITIALISATION
 * ============================================================
 */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            const response =
                await fetch(
                    "data/Reims_Polar_2026.json"
                );


            festivalData =
                await response.json();


            await planner.initPlanner(
                festivalData
            );


            setupNavigation();

            setupCategoryFilters();

            setupSearch();

            setupCollaboration();

            setupPlanningActions();

            renderCatalogue();

            renderPlanning();

            updateCounters();

            updateCollaborationInterface();


            activeRealtimeChannel =
                planner.subscribeToSharedPlanning(
                    () => {

                        updateCollaborationInterface();

                        renderPlanning();

                        updateCounters();

                    }
                );


        } catch (error) {

            console.error(
                "Erreur d'initialisation",
                error
            );

        }

    }
);


/*
 * ============================================================
 * NAVIGATION
 * ============================================================
 */

function setupNavigation() {

    document
        .querySelectorAll(
            ".nav-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    showView(
                        button.dataset.view
                    );

                }
            );

        });


    document
        .querySelectorAll(
            "[data-view]"
        )
        .forEach(button => {

            if (
                button.classList.contains(
                    "nav-button"
                )
            ) {
                return;
            }


            button.addEventListener(
                "click",
                () => {

                    showView(
                        button.dataset.view
                    );

                }
            );

        });

}


function showView(view) {

    document
        .querySelectorAll(
            ".view"
        )
        .forEach(element => {

            element.classList.remove(
                "active"
            );

        });


    const target =
        document.getElementById(
            `${view}-view`
        );


    if (target) {

        target.classList.add(
            "active"
        );

    }


    document
        .querySelectorAll(
            ".nav-button"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.view === view
            );

        });


    if (view === "planning") {

        renderPlanning();

    }

}


/*
 * ============================================================
 * CATÉGORIES
 * ============================================================
 */

function setupCategoryFilters() {

    const container =
        document.getElementById(
            "category-filters"
        );


    container.innerHTML = "";


    const categories =
        [
            "TOUS",
            ...new Set(
                festivalData.films
                    .map(
                        film =>
                            film.categorie
                    )
                    .filter(Boolean)
            )
        ];


    categories.forEach(
        category => {

            const button =
                document.createElement(
                    "button"
                );


            button.type = "button";

            button.className =
                "category-button";


            button.dataset.category =
                category;


            button.textContent =
                category === "TOUS"
                    ? "Tous"
                    : category;


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


    updateActiveCategoryButton();

}


function updateActiveCategoryButton() {

    document
        .querySelectorAll(
            ".category-button"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.category ===
                    currentCategory
            );

        });

}


/*
 * ============================================================
 * RECHERCHE
 * ============================================================
 */

function setupSearch() {

    const input =
        document.getElementById(
            "search-input"
        );


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


/*
 * ============================================================
 * CATALOGUE
 * ============================================================
 */

function renderCatalogue() {

    const grid =
        document.getElementById(
            "film-grid"
        );


    let films =
        festivalData.films || [];


    if (
        currentCategory !==
        "TOUS"
    ) {

        films =
            films.filter(
                film =>
                    film.categorie ===
                    currentCategory
            );

    }


    if (currentSearch) {

        films =
            films.filter(
                film =>
                    film.titre
                        .toLowerCase()
                        .includes(
                            currentSearch
                        )
            );

    }


    films.sort(
        (a, b) =>
            a.titre.localeCompare(
                b.titre
            )
    );


    grid.innerHTML = "";


    if (!films.length) {

        grid.innerHTML = `
            <div class="empty-state">
                <h3>Aucun film trouvé</h3>
                <p>
                    Aucun film ne correspond
                    à votre recherche.
                </p>
            </div>
        `;

        return;

    }


    films.forEach(
        film => {

            grid.appendChild(
                createFilmCard(film)
            );

        }
    );

}


function createFilmCard(film) {

    const card =
        document.createElement(
            "article"
        );


    const selected =
        planner.isFilmSelected(
            film.id
        );


    card.className =
        "film-card" +
        (
            selected
                ? " selected"
                : ""
        );


    const sessionsCount =
        (
            film.seances || []
        ).length;


    card.innerHTML = `

        <div class="film-card-top">

            <span class="film-category">
                ${escapeHtml(
                    film.categorie || ""
                )}
            </span>

            ${
                selected
                    ? `
                        <span class="selected-badge">
                            ✓ Sélectionné
                        </span>
                    `
                    : ""
            }

        </div>


        <h3>
            ${escapeHtml(
                film.titre
            )}
        </h3>


        <div class="film-meta">

            <span>
                ${escapeHtml(
                    film.duree || ""
                )}
            </span>

            <span>
                ${sessionsCount}
                séance${
                    sessionsCount > 1
                        ? "s"
                        : ""
                }
            </span>

        </div>


        <div class="film-card-actions">

            <button
                type="button"
                class="secondary-button"
                data-action="details"
            >
                Détails
            </button>

            <button
                type="button"
                class="${
                    selected
                        ? "danger-button"
                        : "primary-button"
                }"
                data-action="toggle"
            >
                ${
                    selected
                        ? "Retirer"
                        : "Ajouter"
                }
            </button>

        </div>

    `;


    card
        .querySelector(
            '[data-action="details"]'
        )
        .addEventListener(
            "click",
            () => openFilmModal(film)
        );


    card
        .querySelector(
            '[data-action="toggle"]'
        )
        .addEventListener(
            "click",
            () => {

                if (
                    planner.isFilmSelected(
                        film.id
                    )
                ) {

                    planner.deselectFilm(
                        film.id
                    );

                } else {

                    planner.selectFilm(
                        film.id
                    );

                }


                renderCatalogue();

                renderPlanning();

                updateCounters();

            }
        );


    return card;

}


/*
 * ============================================================
 * MODAL
 * ============================================================
 */

function openFilmModal(film) {

    const modal =
        document.getElementById(
            "film-modal"
        );


    const body =
        document.getElementById(
            "modal-body"
        );


    const sessions =
        planner.sortSessions(
            (
                film.seances || []
            ).map(
                session => ({
                    ...session,
                    filmId: film.id,
                    filmTitle: film.titre,
                    filmDurationMinutes:
                        film.duree_minutes || 0
                })
            )
        );


    body.innerHTML = `

        <p class="eyebrow">
            ${escapeHtml(
                film.categorie || ""
            )}
        </p>

        <h2>
            ${escapeHtml(
                film.titre
            )}
        </h2>

        <p class="modal-duration">
            Durée :
            ${escapeHtml(
                film.duree || ""
            )}
        </p>


        <h3>
            Séances
        </h3>


        <div class="modal-sessions">

            ${
                sessions.map(
                    session => `

                    <div class="modal-session">

                        <strong>
                            ${escapeHtml(
                                formatDate(
                                    session.date
                                )
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(
                                session.heure
                            )}
                        </span>

                        <span>
                            ${escapeHtml(
                                session.salle || ""
                            )}
                        </span>

                    </div>

                    `
                ).join("")
            }

        </div>

    `;


    modal.classList.remove(
        "hidden"
    );

}


function closeFilmModal() {

    document
        .getElementById(
            "film-modal"
        )
        .classList.add(
            "hidden"
        );

}


document.addEventListener(
    "click",
    event => {

        if (
            event.target.dataset.action ===
            "close-modal"
        ) {

            closeFilmModal();

        }

    }
);


/*
 * ============================================================
 * PLANNING
 * ============================================================
 */

function renderPlanning() {

    const container =
        document.getElementById(
            "planning-content"
        );


    const empty =
        document.getElementById(
            "empty-planning"
        );


    let sessions =
        planner.getPlanningSessions();


    sessions =
        planner.sortSessions(
            sessions
        );


    if (
        currentPlanningView ===
        "combined" &&
        !planner.isColleagueVisible()
    ) {

        sessions =
            planner.getSelectedSessions();

    }


    container.innerHTML = "";


    if (!sessions.length) {

        container.classList.add(
            "hidden"
        );

        empty.classList.remove(
            "hidden"
        );

        return;

    }


    container.classList.remove(
        "hidden"
    );

    empty.classList.add(
        "hidden"
    );


    const grouped =
        groupSessionsByDay(
            sessions
        );


    const conflictKeys =
        planner.getConflictSessionKeys(
            sessions
        );


    Object.entries(
        grouped
    ).forEach(
        ([date, daySessions]) => {

            const day =
                document.createElement(
                    "section"
                );


            day.className =
                "planning-day";


            day.innerHTML = `

                <div class="planning-day-header">

                    <h3>
                        ${escapeHtml(
                            formatDate(date)
                        )}
                    </h3>

                    <span>
                        ${daySessions.length}
                        séance${
                            daySessions.length > 1
                                ? "s"
                                : ""
                        }
                    </span>

                </div>


                <div class="planning-sessions"></div>

            `;


            const sessionsContainer =
                day.querySelector(
                    ".planning-sessions"
                );


            daySessions.forEach(
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
                day
            );

        }
    );


    updateConflictAlert(
        conflictKeys.size > 0
    );

}


/*
 * ============================================================
 * CARTE SÉANCE
 * ============================================================
 */

function createSessionCard(
    session,
    conflictKeys
) {

    const card =
        document.createElement(
            "article"
        );


    const key =
        planner.sessionKey(
            session
        );


    const conflict =
        conflictKeys.has(
            key
        );


    const owner =
        session.owner ||
        (
            currentPlanningView ===
            "colleague"
                ? "colleague"
                : "mine"
        );


    card.className =
        "session-card";


    if (conflict) {

        card.classList.add(
            "conflict"
        );

    }


    if (owner === "colleague") {

        card.classList.add(
            "colleague-session"
        );

    }


    if (owner === "both") {

        card.classList.add(
            "shared-session"
        );

    }


    const start =
        session.heure_minutes || 0;


    const duration =
        session.filmDurationMinutes || 0;


    const end =
        planner.calculateEndTime(
            start,
            duration
        );


    const isMine =
        owner === "mine";


    card.innerHTML = `

        <div class="session-time">

            <strong>
                ${escapeHtml(
                    session.heure
                )}
            </strong>

            <span>
                →
                ${escapeHtml(
                    end
                )}
            </span>

        </div>


        <div class="session-main">

            <div class="session-title-row">

                <h4>
                    ${escapeHtml(
                        session.filmTitle
                    )}
                </h4>

                ${
                    conflict
                        ? `
                            <span class="conflict-badge">
                                CONFLIT
                            </span>
                        `
                        : ""
                }

                ${
                    owner === "colleague"
                        ? `
                            <span class="colleague-badge">
                                COLLÈGUE
                            </span>
                        `
                        : ""
                }

                ${
                    owner === "both"
                        ? `
                            <span class="shared-badge">
                                COMMUN
                            </span>
                        `
                        : ""
                }

            </div>


            <div class="session-meta">

                <span>
                    ${escapeHtml(
                        session.salle || ""
                    )}
                </span>

                <span>
                    ${escapeHtml(
                        session.filmDurationMinutes
                            + " min"
                    )}
                </span>

            </div>

        </div>


        ${
            isMine
                ? `
                    <button
                        type="button"
                        class="remove-session-button"
                        data-action="remove-session"
                    >
                        Retirer
                    </button>
                `
                : ""
        }

    `;


    if (isMine) {

        card
            .querySelector(
                '[data-action="remove-session"]'
            )
            .addEventListener(
                "click",
                () => {

                    planner.removeSession(
                        session
                    );

                    renderPlanning();

                    updateCounters();

                }
            );

    }


    return card;

}


/*
 * ============================================================
 * CONFLITS
 * ============================================================
 */

function updateConflictAlert(
    hasConflict
) {

    const alert =
        document.getElementById(
            "conflict-alert"
        );


    alert.classList.toggle(
        "hidden",
        !hasConflict
    );

}


/*
 * ============================================================
 * COLLABORATION
 * ============================================================
 */

function setupCollaboration() {

    document
        .getElementById(
            "create-planning-button"
        )
        .addEventListener(
            "click",
            async () => {

                const name =
                    document
                        .getElementById(
                            "user-name"
                        )
                        .value
                        .trim();


                try {

                    await planner
                        .createSharedPlanning(
                            name
                        );


                    updateCollaborationInterface();

                } catch (error) {

                    alert(
                        error.message ||
                        "Impossible de créer le planning."
                    );

                }

            }
        );


    document
        .getElementById(
            "join-planning-button"
        )
        .addEventListener(
            "click",
            async () => {

                const name =
                    document
                        .getElementById(
                            "user-name"
                        )
                        .value
                        .trim();


                const code =
                    document
                        .getElementById(
                            "planning-code"
                        )
                        .value
                        .trim();


                try {

                    await planner
                        .joinSharedPlanning(
                            code,
                            name
                        );


                    updateCollaborationInterface();

                    renderPlanning();

                } catch (error) {

                    alert(
                        error.message ||
                        "Impossible de rejoindre le planning."
                    );

                }

            }
        );


    document
        .getElementById(
            "toggle-colleague-visibility"
        )
        .addEventListener(
            "change",
            event => {

                planner.setColleagueVisible(
                    event.target.checked
                );


                renderPlanning();

            }
        );


    document
        .getElementById(
            "show-my-planning"
        )
        .addEventListener(
            "click",
            () => {

                planner.setPlanningView(
                    "mine"
                );

                updatePlanningViewButtons();

                renderPlanning();

            }
        );


    document
        .getElementById(
            "show-colleague-planning"
        )
        .addEventListener(
            "click",
            () => {

                planner.setPlanningView(
                    "colleague"
                );

                updatePlanningViewButtons();

                renderPlanning();

            }
        );


    document
        .getElementById(
            "show-combined-planning"
        )
        .addEventListener(
            "click",
            () => {

                planner.setPlanningView(
                    "combined"
                );

                updatePlanningViewButtons();

                renderPlanning();

            }
        );


    document
        .getElementById(
            "leave-planning-button"
        )
        .addEventListener(
            "click",
            () => {

                localStorage.removeItem(
                    "reims-polar-2026-shared-planning"
                );

                location.reload();

            }
        );

}


function updateCollaborationInterface() {

    const createPanel =
        document.getElementById(
            "collaboration-create"
        );


    const activePanel =
        document.getElementById(
            "collaboration-active"
        );


    const room =
        planner.getSharedPlanning();


    if (!room) {

        createPanel.classList.remove(
            "hidden"
        );

        activePanel.classList.add(
            "hidden"
        );

        return;

    }


    createPanel.classList.add(
        "hidden"
    );

    activePanel.classList.remove(
        "hidden"
    );


    const user =
        planner.getCurrentUser();


    const colleague =
        planner.getColleagueUser();


    document
        .getElementById(
            "planning-name"
        )
        .textContent =
        room.name || "Planning partagé";


    document
        .getElementById(
            "planning-code-display"
        )
        .textContent =
        room.code;


    document
        .getElementById(
            "my-name"
        )
        .textContent =
        user?.name || "Moi";


    const colleagueElement =
        document.getElementById(
            "colleague-user"
        );


    colleagueElement.innerHTML =
        colleague
            ? `
                <span class="collaborator-dot"></span>
                <span>
                    ${escapeHtml(
                        colleague.name
                    )}
                </span>
            `
            : `
                <span class="collaborator-dot"></span>
                <span>
                    En attente d'un collègue
                </span>
            `;


    document
        .getElementById(
            "toggle-colleague-visibility"
        )
        .checked =
        planner.isColleagueVisible();

}


function updatePlanningViewButtons() {

    const buttons = {

        mine:
            document.getElementById(
                "show-my-planning"
            ),

        colleague:
            document.getElementById(
                "show-colleague-planning"
            ),

        combined:
            document.getElementById(
                "show-combined-planning"
            )

    };


    Object.entries(
        buttons
    ).forEach(
        ([key, button]) => {

            button.classList.toggle(
                "active",
                currentPlanningView ===
                    key
            );

        }
    );

}


/*
 * ============================================================
 * ACTIONS PLANNING
 * ============================================================
 */

function setupPlanningActions() {

    document
        .getElementById(
            "clear-selection-button"
        )
        .addEventListener(
            "click",
            () => {

                if (
                    !confirm(
                        "Supprimer tout votre planning ?"
                    )
                ) {

                    return;

                }


                festivalData.films
                    .forEach(
                        film => {

                            planner.deselectFilm(
                                film.id
                            );

                        }
                    );


                renderCatalogue();

                renderPlanning();

                updateCounters();

            }
        );

}


/*
 * ============================================================
 * COMPTEURS
 * ============================================================
 */

function updateCounters() {

    const films =
        festivalData.films.filter(
            film =>
                planner.isFilmSelected(
                    film.id
                )
        );


    const sessions =
        planner.getSelectedSessions();


    document
        .getElementById(
            "selected-films-count"
        )
        .textContent =
        films.length;


    document
        .getElementById(
            "selected-sessions-count"
        )
        .textContent =
        sessions.length;

}


/*
 * ============================================================
 * GROUPES
 * ============================================================
 */

function groupSessionsByDay(
    sessions
) {

    const grouped = {};


    sessions.forEach(
        session => {

            if (!grouped[session.date]) {

                grouped[session.date] =
                    [];

            }


            grouped[
                session.date
            ].push(session);

        }
    );


    return grouped;

}


/*
 * ============================================================
 * DATES
 * ============================================================
 */

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


    return date.toLocaleDateString(
        "fr-FR",
        {
            weekday: "long",
            day: "numeric",
            month: "long"
        }
    );

}


/*
 * ============================================================
 * HTML
 * ============================================================
 */

function escapeHtml(value) {

    return String(
        value ?? ""
    )
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