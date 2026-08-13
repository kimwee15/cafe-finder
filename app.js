// ========================================
// CafeFinder
// ========================================


// ----------------------------------------
// Geoapify API key
// ----------------------------------------

const API_KEY = "315d70174378408b9fba6369d3381a20";


// ----------------------------------------
// Default location
// Sydney, Australia
// ----------------------------------------

const DEFAULT_LOCATION = {
    lat: -33.8688,
    lon: 151.2093
};


// ----------------------------------------
// Create Leaflet map
// ----------------------------------------

const map = L.map("map").setView(
    [
        DEFAULT_LOCATION.lat,
        DEFAULT_LOCATION.lon
    ],
    13
);


// ----------------------------------------
// Add OpenStreetMap tiles
// ----------------------------------------

L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,

        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
).addTo(map);


// ----------------------------------------
// Layer containing cafe markers
// ----------------------------------------

const cafeLayer = L.layerGroup().addTo(map);


// ----------------------------------------
// User marker
// ----------------------------------------

let userMarker = null;

let allCafes = [];

let favourites = JSON.parse(
    localStorage.getItem("cafeFavourites")
) || [];

// ----------------------------------------
// HTML elements
// ----------------------------------------

const locationBtn =
    document.getElementById("locationBtn");

const statusText =
    document.getElementById("status");

const cafeList =
    document.getElementById("cafeList");

const searchInput =
    document.getElementById("searchInput");

const sortSelect =
    document.getElementById("sortSelect");


// ----------------------------------------
// Location button
// ----------------------------------------

locationBtn.addEventListener(
    "click",
    findMyLocation
);

searchInput.addEventListener(
    "input",
    filterAndSortCafes
);


sortSelect.addEventListener(
    "change",
    filterAndSortCafes
);


// ----------------------------------------
// Get user's current location
// ----------------------------------------

function findMyLocation() {

    statusText.textContent =
        "Finding your location...";


    if (!navigator.geolocation) {

        statusText.textContent =
            "Your browser does not support location services.";

        return;
    }


    navigator.geolocation.getCurrentPosition(

        locationSuccess,

        locationError,

        {
            enableHighAccuracy: true,

            timeout: 10000
        }

    );
}


// ----------------------------------------
// Location found
// ----------------------------------------

async function locationSuccess(position) {

    const lat =
        position.coords.latitude;

    const lon =
        position.coords.longitude;


    // Move map to user
    map.setView(
        [lat, lon],
        15
    );


    // Remove old user marker
    if (userMarker) {

        map.removeLayer(userMarker);

    }


    // Add user marker
    userMarker =
        L.marker([lat, lon])
            .addTo(map)
            .bindPopup("📍 You are here")
            .openPopup();


    // Search nearby cafes
    await searchNearbyCafes(
        lat,
        lon
    );
}


// ----------------------------------------
// Location unavailable
// ----------------------------------------

async function locationError(error) {

    console.error(
        "Location error:",
        error
    );


    statusText.textContent =
        "Location access was unavailable. Showing cafes around Sydney instead.";


    map.setView(
        [
            DEFAULT_LOCATION.lat,
            DEFAULT_LOCATION.lon
        ],
        14
    );


    await searchNearbyCafes(
        DEFAULT_LOCATION.lat,
        DEFAULT_LOCATION.lon
    );
}


// ----------------------------------------
// Search nearby cafes
// ----------------------------------------

async function searchNearbyCafes(
    lat,
    lon
) {

    statusText.textContent =
        "☕ Searching for nearby cafes...";


    cafeList.innerHTML = "";


    cafeLayer.clearLayers();


    try {

        const params =
            new URLSearchParams({

                categories:
                    "catering.cafe",

                filter:
                    `circle:${lon},${lat},3000`,

                bias:
                    `proximity:${lon},${lat}`,

                limit:
                    "20",

                apiKey:
                    API_KEY

            });


        const url =
            `https://api.geoapify.com/v2/places?${params}`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                `API request failed: ${response.status}`
            );

        }


        const data =
            await response.json();


        allCafes =
            data.features || [];    


        statusText.textContent =
            `${allCafes.length} cafes found nearby`;


        filterAndSortCafes();

    }

    catch (error) {

        console.error(
            "Cafe search error:",
            error
        );


        statusText.textContent =
            "Something went wrong while searching for cafes.";


        cafeList.innerHTML = `
            <p>
                Unable to load cafes.
                Check your API key and try again.
            </p>
        `;

    }
}

// ----------------------------------------
// Search and sort cafes
// ----------------------------------------

function filterAndSortCafes() {

    const searchTerm =
        searchInput.value
            .trim()
            .toLowerCase();


    let filteredCafes =
        allCafes.filter(
            (cafe) => {

                const name =
                    cafe.properties.name ||
                    "";

                return name
                    .toLowerCase()
                    .includes(searchTerm);

            }
        );


    const sortOption =
        sortSelect.value;


    if (sortOption === "nearest") {

        filteredCafes.sort(
            (a, b) => {

                const distanceA =
                    a.properties.distance ??
                    Infinity;


                const distanceB =
                    b.properties.distance ??
                    Infinity;


                return distanceA - distanceB;

            }
        );

    }


    if (sortOption === "name") {

        filteredCafes.sort(
            (a, b) => {

                const nameA =
                    a.properties.name ||
                    "Unnamed Cafe";


                const nameB =
                    b.properties.name ||
                    "Unnamed Cafe";


                return nameA.localeCompare(
                    nameB
                );

            }
        );

    }


    displayCafes(
        filteredCafes
    );
}


// ----------------------------------------
// Display cafes
// ----------------------------------------

function displayCafes(cafes) {

    cafeList.innerHTML = "";

    // Remove existing cafe markers
    cafeLayer.clearLayers();


    if (cafes.length === 0) {

        cafeList.innerHTML = `
            <p>
                No cafes match your search.
            </p>
        `;

        return;
    }


    cafes.forEach((cafe) => {

        const properties =
            cafe.properties;


        const coordinates =
            cafe.geometry.coordinates;


        const cafeLon =
            coordinates[0];


        const cafeLat =
            coordinates[1];


        const name =
            properties.name ||
            "Unnamed Cafe";


        const address =
            properties.formatted ||
            "Address unavailable";


        const distance =
            properties.distance;


        const cafeId =
            properties.place_id ||
            `${cafeLat}-${cafeLon}`;


        const isFavourite =
            favourites.includes(cafeId);


        // --------------------------------
        // Map marker
        // --------------------------------

        const marker =
            L.marker([
                cafeLat,
                cafeLon
            ]);


        marker.bindPopup(`
            <strong>${escapeHTML(name)}</strong>
            <br>
            ${escapeHTML(address)}
        `);


        marker.addTo(cafeLayer);


        // --------------------------------
        // Cafe card
        // --------------------------------

        const card =
            document.createElement(
                "article"
            );


        card.className =
            "cafe-card";


        // Card header
        const cardHeader =
            document.createElement(
                "div"
            );


        cardHeader.className =
            "card-header";


        // Cafe name
        const cafeName =
            document.createElement(
                "h3"
            );


        cafeName.textContent =
            `☕ ${name}`;


        // Favourite button
        const favouriteButton =
            document.createElement(
                "button"
            );


        favouriteButton.className =
            "favorite-btn";


        favouriteButton.textContent =
            isFavourite
                ? "♥ Saved"
                : "♡ Save";


        favouriteButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                toggleFavourite(
                    cafeId
                );

            }
        );


        // Add name + favourite to header
        cardHeader.appendChild(
            cafeName
        );


        cardHeader.appendChild(
            favouriteButton
        );


        // Address
        const cafeAddress =
            document.createElement(
                "p"
            );


        cafeAddress.className =
            "cafe-address";


        cafeAddress.textContent =
            address;


        // Distance
        const cafeDistance =
            document.createElement(
                "p"
            );


        cafeDistance.className =
            "cafe-distance";


        if (
            typeof distance === "number"
        ) {

            cafeDistance.textContent =
                `📍 ${formatDistance(distance)} away`;

        }

        else {

            cafeDistance.textContent =
                "📍 Distance unavailable";

        }


        // --------------------------------
        // Show on map button
        // --------------------------------

        const mapButton =
            document.createElement(
                "button"
            );


        mapButton.className =
            "map-btn";


        mapButton.textContent =
            "Show on Map";


        mapButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();


                map.setView(
                    [cafeLat, cafeLon],
                    17
                );


                marker.openPopup();

            }
        );


        // --------------------------------
        // Directions button
        // --------------------------------

        const directionsLink =
            document.createElement(
                "a"
            );


        directionsLink.className =
            "directions-btn";


        directionsLink.textContent =
            "Directions ↗";


        directionsLink.href =
            `https://www.google.com/maps/dir/?api=1&destination=${cafeLat},${cafeLon}`;


        directionsLink.target =
            "_blank";


        directionsLink.rel =
            "noopener noreferrer";


        directionsLink.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

            }
        );


        // Action buttons container
        const actionButtons =
            document.createElement(
                "div"
            );


        actionButtons.className =
            "card-actions";


        actionButtons.appendChild(
            mapButton
        );


        actionButtons.appendChild(
            directionsLink
        );


        // --------------------------------
        // Build card
        // --------------------------------

        card.appendChild(
            cardHeader
        );


        card.appendChild(
            cafeAddress
        );


        card.appendChild(
            cafeDistance
        );


        card.appendChild(
            actionButtons
        );


        // Clicking card also focuses map
        card.addEventListener(
            "click",
            () => {

                map.setView(
                    [cafeLat, cafeLon],
                    17
                );


                marker.openPopup();

            }
        );


        cafeList.appendChild(
            card
        );

    });
}

// ----------------------------------------
// Favourite cafes
// ----------------------------------------

function toggleFavourite(cafeId) {

    if (favourites.includes(cafeId)) {

        favourites =
            favourites.filter(
                id => id !== cafeId
            );

    }

    else {

        favourites.push(cafeId);

    }


    localStorage.setItem(
        "cafeFavourites",
        JSON.stringify(favourites)
    );


    filterAndSortCafes();
}


// ----------------------------------------
// Format distance
// ----------------------------------------

function formatDistance(metres) {

    if (metres < 1000) {

        return `${Math.round(metres)} m`;

    }


    return `${(metres / 1000).toFixed(1)} km`;
}


// ----------------------------------------
// Escape HTML from external API data
// ----------------------------------------

function escapeHTML(value) {

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");
}