/* =========================================================
   REIMS POLAR — APPLICATION
========================================================= */


let festivalData = null;

let activeCategory = "ALL";

let searchTerm = "";

let currentModalFilm = null;


/* =========================================================
   INITIALISATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);


async function init() {

    setupNavigation();

    setupSearch();

    setupModal();

    setupPlanningButtons();

    await loadData();

}


/* =========================================================
   CHARGEMENT JSON
========================================================= */

async function loadData() {

    const catalogue =
        document.getElementById(
            "catalogue-grid"
        );

    try {

        const response =
            await fetch(
                "./data/Reims_Polar_2026.json"
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        festivalData =
            await response.json();

        console.log(
            "Programme chargé :",
            festivalData
        );

        buildCategoryFilters();

        renderCatalogue();

        renderPlanning();

        updateCounters();

    } catch (error) {

        console.error(
            "Erreur de chargement du JSON :",
            error
        );

        catalogue.innerHTML = `
            <div class="loading">
                <strong>
                    Impossible de charger le programme.
                </strong>
                <br><br>
                Vérifiez que le fichier
                <code>
                    Reims_Polar_2026.json
                </code>
                est présent dans
                <code>
                    web/data/
                </code>.
            </div>
        `;

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const buttons =
        document.querySelectorAll(
            ".nav-button"
        );

    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const view =
                        button.dataset.view;

                    switchView(
                        view
                    );

                }
            );

        }
    );

}


function switchView(view) {

    document
        .querySelectorAll(
            ".nav-button"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.view
                    === view
                );

            }
        );


    document
        .querySelectorAll(
            ".view"
        )
        .forEach(
            section => {

                section.classList.toggle(
                    "active",
                    section.id
                    === `${view}-view`
                );

            }
        );


    if (
        view ===
        "planning"
    ) {

        renderPlanning();

    }

}


/* =========================================================
   RECHERCHE
========================================================= */

function setupSearch() {

    const input =
        document.getElementById(
            "search-input"
        );

    input.addEventListener(
        "input",
        event => {

            searchTerm =
                event.target.value
                    .trim()
                    .toLowerCase();

            renderCatalogue();

        }
    );

}


/* =========================================================
   CATÉGORIES
========================================================= */

function buildCategoryFilters() {

    const container =
        document.getElementById(
            "category-filters"
        );

    const categories =
        [
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

            button.className =
                "category-button";

            button.dataset.category =
                category;

            button.textContent =
                category;

            button.addEventListener(
                "click",
                () => {

                    activeCategory =
                        category;

                    updateCategoryButtons();

                    renderCatalogue();

                }
            );

            container.appendChild(
                button
            );

        }
    );


    updateCategoryButtons();

}


function updateCategoryButtons() {

    document
        .querySelectorAll(
            ".category-button"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.category
                    === activeCategory
                );

            }
        );

}


/* =========================================================
   FILTRAGE
========================================================= */

function getFilteredFilms() {

    if (!festivalData) {
        return [];
    }

    return festivalData.films.filter(
        film => {

            const matchesCategory =
                activeCategory ===
                "ALL"
                ||
                film.categorie ===
                activeCategory;


            const matchesSearch =
                !searchTerm
                ||
                film.titre
                    .toLowerCase()
                    .includes(
                        searchTerm
                    );


            return (
                matchesCategory
                &&
                matchesSearch
            );

        }
    );

}


/* =========================================================
   CATALOGUE
========================================================= */

function renderCatalogue() {

    if (!festivalData) {
        return;
    }

    const grid =
        document.getElementById(
            "catalogue-grid"
        );

    const noResults =
        document.getElementById(
            "no-results"
        );

    const films =
        getFilteredFilms();


    grid.innerHTML = "";


    if (
        films.length === 0
    ) {

        noResults.classList.remove(
            "hidden"
        );

        return;

    }


    noResults.classList.add(
        "hidden"
    );


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


/* =========================================================
   CARTE FILM
========================================================= */

function createFilmCard(
    film
) {

    const selected =
        isSelected(
            film.id
        );


    const card =
        document.createElement(
            "article"
        );

    card.className =
        "film-card";


    if (selected) {

        card.classList.add(
            "selected"
        );

    }


    const sessionCount =
        film.seances.length;


    card.innerHTML = `

        <div class="film-category">
            ${escapeHtml(
                film.categorie
                || "FILM"
            )}
        </div>


        <h3 class="film-title">
            ${escapeHtml(
                film.titre
            )}
        </h3>


        <div class="film-info">

            <span>
                ${escapeHtml(
                    film.duree
                    || "Durée inconnue"
                )}
            </span>

            <span>
                ${sessionCount}
                séance${sessionCount > 1 ? "s" : ""}
            </span>

        </div>


        <div class="film-actions">

            <button
                class="film-button details-button"
            >
                Détails
            </button>


            <button
                class="
                    film-button
                    selection-button
                    ${selected
                        ? "selected-button"
                        : ""
                    }
                "
            >
                ${
                    selected
                    ? "Sélectionné"
                    : "Ajouter"
                }
            </button>

        </div>

    `;


    card
        .querySelector(
            ".details-button"
        )
        .addEventListener(
            "click",
            () => {

                openFilmModal(
                    film
                );

            }
        );


    card
        .querySelector(
            ".selection-button"
        )
        .addEventListener(
            "click",
            () => {

                toggleFilm(
                    film.id
                );

            }
        );


    return card;

}


/* =========================================================
   COMPTEURS
========================================================= */

function updateCounters() {

    const selectedCount =
        document.getElementById(
            "selected-count"
        );

    const sessionCount =
        document.getElementById(
            "session-count"
        );


    const films =
        getSelectedFilms();


    const sessions =
        getSelectedSessions();


    selectedCount.textContent =
        films.length;


    sessionCount.textContent =
        sessions.length;

}


/* =========================================================
   PLANNING
========================================================= */

function renderPlanning() {

    const container =
        document.getElementById(
            "planning-container"
        );

    const selected =
        getSelectedFilms();


    if (
        selected.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-planning">

                <div class="empty-icon">
                    +
                </div>

                <h3>
                    Votre planning est vide
                </h3>

                <p>
                    Retournez dans le catalogue et
                    sélectionnez vos premiers films.
                </p>

                <button
                    class="primary-button"
                    id="go-catalogue-inner"
                >
                    Explorer le catalogue
                </button>

            </div>

        `;


        document
            .getElementById(
                "go-catalogue-inner"
            )
            .addEventListener(
                "click",
                () => {

                    switchView(
                        "catalogue"
                    );

                }
            );


        updateConflictAlert();

        return;

    }


    const grouped =
        getSessionsByDay();


    container.innerHTML = "";


    Object
        .keys(grouped)
        .sort()
        .forEach(
            date => {

                container.appendChild(
                    createDaySection(
                        date,
                        grouped[date]
                    )
                );

            }
        );


    updateConflictAlert();

}


/* =========================================================
   JOUR
========================================================= */

function createDaySection(
    date,
    sessions
) {

    const section =
        document.createElement(
            "section"
        );

    section.className =
        "day-section";


    const readableDate =
        formatDate(
            date
        );


    const dayName =
        sessions[0]?.jour
        || "";


    section.innerHTML = `

        <div class="day-header">

            <div class="day-name">
                ${escapeHtml(
                    dayName
                )}
            </div>

            <div class="day-date">
                ${readableDate}
            </div>

        </div>


        <div class="day-sessions">
        </div>

    `;


    const sessionsContainer =
        section.querySelector(
            ".day-sessions"
        );


    sessions.forEach(
        session => {

            sessionsContainer.appendChild(
                createSessionCard(
                    session
                )
            );

        }
    );


    return section;

}


/* =========================================================
   SÉANCE
========================================================= */

function createSessionCard(
    session
) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "session-card";


    const hasConflict =
        detectConflicts().some(
            conflict =>
                (
                    conflict.first ===
                    session
                )
                ||
                (
                    conflict.second ===
                    session
                )
        );


    if (hasConflict) {

        card.classList.add(
            "conflict"
        );

    }


    card.innerHTML = `

        <button
            class="session-remove"
            title="Retirer le film"
        >
            ×
        </button>


        <div class="session-time">

            <span class="session-start">
                ${escapeHtml(
                    session.heure
                )}
            </span>

            ${
                session.heure_fin
                ?
                `
                <span>
                    →
                </span>

                <span class="session-end">
                    ${escapeHtml(
                        session.heure_fin
                    )}
                </span>
                `
                :
                ""
            }

        </div>


        <div class="session-film">
            ${escapeHtml(
                session.filmTitle
            )}
        </div>


        <div class="session-details">

            <span>
                ${escapeHtml(
                    session.salle
                )}
            </span>

            ${
                session.duration
                ?
                `
                <span>
                    ${escapeHtml(
                        session.duration
                    )}
                </span>
                `
                :
                ""
            }

        </div>

    `;


    card
        .querySelector(
            ".session-remove"
        )
        .addEventListener(
            "click",
            () => {

                removeFilm(
                    session.filmId
                );

            }
        );


    return card;

}


/* =========================================================
   CONFLITS
========================================================= */

function updateConflictAlert() {

    const alert =
        document.getElementById(
            "conflict-alert"
        );

    const message =
        document.getElementById(
            "conflict-message"
        );


    const conflicts =
        detectConflicts();


    if (
        conflicts.length === 0
    ) {

        alert.classList.add(
            "hidden"
        );

        return;

    }


    alert.classList.remove(
        "hidden"
    );


    message.textContent =
        `${conflicts.length} conflit${
            conflicts.length > 1
                ? "s"
                : ""
        } détecté${
            conflicts.length > 1
                ? "s"
                : ""
        } dans votre sélection.`;

}


/* =========================================================
   MODAL
========================================================= */

function setupModal() {

    document
        .getElementById(
            "close-modal"
        )
        .addEventListener(
            "click",
            closeFilmModal
        );


    document
        .querySelector(
            ".modal-backdrop"
        )
        .addEventListener(
            "click",
            closeFilmModal
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeFilmModal();

            }

        }
    );


    document
        .getElementById(
            "modal-selection-button"
        )
        .addEventListener(
            "click",
            () => {

                if (
                    currentModalFilm
                ) {

                    toggleFilm(
                        currentModalFilm.id
                    );

                    updateModalButton();

                }

            }
        );

}


function openFilmModal(
    film
) {

    currentModalFilm =
        film;


    document
        .getElementById(
            "modal-category"
        )
        .textContent =
        film.categorie
        || "FILM";


    document
        .getElementById(
            "modal-title"
        )
        .textContent =
        film.titre;


    document
        .getElementById(
            "modal-duration"
        )
        .textContent =
        film.duree
        || "Durée inconnue";


    document
        .getElementById(
            "modal-session-count"
        )
        .textContent =
        `${film.seances.length} séance${
            film.seances.length > 1
                ? "s"
                : ""
        }`;


    const container =
        document.getElementById(
            "modal-sessions"
        );


    container.innerHTML = "";


    film.seances.forEach(
        session => {

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "modal-session";


            element.innerHTML = `

                <div class="modal-session-left">

                    <span class="modal-session-time">
                        ${escapeHtml(
                            session.heure
                        )}
                    </span>

                    <span class="modal-session-date">
                        ${formatDate(
                            session.date
                        )}
                    </span>

                </div>


                <span class="modal-session-room">
                    ${escapeHtml(
                        session.salle
                    )}
                </span>

            `;


            container.appendChild(
                element
            );

        }
    );


    updateModalButton();


    document
        .getElementById(
            "film-modal"
        )
        .classList.remove(
            "hidden"
        );

}


function updateModalButton() {

    const button =
        document.getElementById(
            "modal-selection-button"
        );


    if (
        !currentModalFilm
    ) {
        return;
    }


    if (
        isSelected(
            currentModalFilm.id
        )
    ) {

        button.textContent =
            "Retirer de ma sélection";

    } else {

        button.textContent =
            "Ajouter à ma sélection";

    }

}


function closeFilmModal() {

    document
        .getElementById(
            "film-modal"
        )
        .classList.add(
            "hidden"
        );

    currentModalFilm =
        null;

}


/* =========================================================
   BOUTONS PLANNING
========================================================= */

function setupPlanningButtons() {

    document
        .getElementById(
            "clear-selection"
        )
        .addEventListener(
            "click",
            () => {

                if (
                    selectedFilms.size ===
                    0
                ) {

                    return;

                }


                const confirmed =
                    confirm(
                        "Voulez-vous vraiment supprimer toute votre sélection ?"
                    );


                if (confirmed) {

                    clearSelection();

                }

            }
        );


    document
        .getElementById(
            "go-catalogue"
        )
        .addEventListener(
            "click",
            () => {

                switchView(
                    "catalogue"
                );

            }
        );

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    isoDate
) {

    const date =
        new Date(
            `${isoDate}T12:00:00`
        );


    return date.toLocaleDateString(
        "fr-FR",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

}


/* =========================================================
   SÉCURITÉ HTML
========================================================= */

function escapeHtml(
    value
) {

    if (
        value === null
        ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}