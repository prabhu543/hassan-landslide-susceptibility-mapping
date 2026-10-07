/* =====================================================
   HASSAN LANDSLIDE SUSCEPTIBILITY MAP
   FINAL FRONTEND JAVASCRIPT
====================================================== */


/* =====================================================
   CONFIGURATION
====================================================== */

const MAP_CENTER = [13.0068, 76.1003];

const DEFAULT_ZOOM = 9;

const HIGH_RISK_THRESHOLD = 60;

const VERY_HIGH_THRESHOLD = 80;

const JSON_PATH =
    "data/Hassan_LSM_Frontend_Data.json";

/*
    Hassan district boundary GeoJSON.

    Put this file inside:

        data/Hassan_District_Boundary.geojson
*/
const BOUNDARY_PATH =
    "data/Hassan_District_Boundary.geojson";


/* =====================================================
   MAP INITIALIZATION
====================================================== */

const map = L.map("map", {
    preferCanvas: true,
    zoomControl: true
}).setView(
    MAP_CENTER,
    DEFAULT_ZOOM
);


/* OpenStreetMap */

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,

        attribution:
            "&copy; OpenStreetMap contributors"
    }
).addTo(map);


/* Canvas renderer */

const canvasRenderer = L.canvas({
    padding: 0.5
});


/* =====================================================
   MAP LAYERS
====================================================== */

const allPointsLayer =
    L.layerGroup().addTo(map);

const veryHighRiskLayer =
    L.layerGroup();

const selectedLayer =
    L.layerGroup().addTo(map);

let boundaryLayer = null;


/* =====================================================
   APPLICATION STATE
====================================================== */

const state = {

    riskData: null,

    locations: [],

    villageIndex: [],

    showingVeryHighOnly: false

};


/* =====================================================
   DOM HELPER
====================================================== */

const $ = (id) =>
    document.getElementById(id);


/* =====================================================
   TEXT UTILITIES
====================================================== */

function cleanText(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "Not available";
    }


    const text =
        String(value).trim();


    if (
        text === "" ||
        text.toLowerCase() === "nan"
    ) {

        return "Not available";
    }


    return text;
}


function escapeHtml(value) {

    return cleanText(value)

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


/* =====================================================
   NUMBER UTILITIES
====================================================== */

function numberValue(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}


function susceptibilityPercent(value) {

    let number =
        numberValue(value);


    if (number === null) {

        return null;
    }


    /*
        JSON may store susceptibility either as:

            0.60
        or
            60
    */

    if (
        number >= 0 &&
        number <= 1
    ) {

        number *= 100;
    }


    return number;
}


/* =====================================================
   RISK CLASSIFICATION
====================================================== */

function getRiskClass(percent) {

    const value =
        susceptibilityPercent(percent);


    if (value === null) {

        return "Unknown";
    }


    if (value >= 80) {

        return "Very High";
    }


    if (value >= 70) {

        return "High";
    }


    if (value >= 60) {

        return "Moderate";
    }


    return "Below 60%";
}


/* =====================================================
   RISK COLORS
====================================================== */

function getRiskColor(percent) {

    const value =
        susceptibilityPercent(percent);


    if (value === null) {

        return "#777777";
    }


    if (value >= 80) {

        return "#d73027";
    }


    if (value >= 70) {

        return "#fc8d59";
    }


    if (value >= 60) {

        return "#ffffbf";
    }


    return "#91cf60";
}


/* =====================================================
   RISK BADGE
====================================================== */

function riskClassName(risk) {

    const value =
        String(risk || "")
            .toLowerCase()
            .replace(/\s+/g, "-");


    if (
        value === "very-high"
    ) {

        return "risk-very-high";
    }


    if (
        value === "high"
    ) {

        return "risk-high";
    }


    return "risk-moderate";
}


/* =====================================================
   SEARCH NORMALIZATION
====================================================== */

function normalizeName(value) {

    return String(value || "")

        .toLowerCase()

        .replace(/taluk[u]?/g, "")

        .replace(
            /[^a-z0-9]+/g,
            ""
        )

        .trim();
}


/* =====================================================
   PIN NORMALIZATION
====================================================== */

function normalizePincode(value) {

    const text =
        String(
            value ?? ""
        ).trim();


    if (
        !text ||
        text.toLowerCase() === "nan"
    ) {

        return "";
    }


    return text.replace(
        /\.0$/,
        ""
    );
}


/* =====================================================
   NORMALIZE JSON
====================================================== */

function normalizeRiskData(data) {

    const normalized = {
        ...data
    };


    normalized.taluks =
        (
            data.taluks ||
            []
        ).map(

            (taluk) => ({

                ...taluk,

                taluk:
                    cleanText(
                        taluk.taluk ||
                        taluk.name
                    ),

                villages:
                    (
                        taluk.villages ||
                        []
                    ).map(

                        (village) => ({

                            ...village,

                            village:
                                cleanText(
                                    village.village ||
                                    village.name
                                ),

                            pin_codes:
                                (
                                    village.pin_codes ||
                                    []
                                ).map(
                                    normalizePincode
                                ),

                            locations:
                                village.locations ||
                                []

                        })
                    )

            })
        );


    return normalized;
}


/* =====================================================
   FLATTEN JSON LOCATIONS
====================================================== */

function flattenRiskLocations() {

    const locations = [];


    for (
        const taluk
        of state.riskData?.taluks || []
    ) {

        for (
            const village
            of taluk.villages || []
        ) {

            for (
                const location
                of village.locations || []
            ) {

                const lat =
                    numberValue(
                        location.latitude ??
                        location.lat ??
                        location.LATITUDE
                    );


                const lon =
                    numberValue(
                        location.longitude ??
                        location.lon ??
                        location.lng ??
                        location.LONGITUDE
                    );


                const susceptibility =
                    susceptibilityPercent(
                        location.susceptibility ??
                        location.SUSCEPTIBILITY ??
                        location.risk ??
                        location.probability
                    );


                if (
                    lat === null ||
                    lon === null ||
                    susceptibility === null
                ) {

                    continue;
                }


                /*
                    Only ≥60% locations
                */

                if (
                    susceptibility <
                    HIGH_RISK_THRESHOLD
                ) {

                    continue;
                }


                const pincode =
                    normalizePincode(
                        location.pincode ??
                        location.pin_code ??
                        location.postcode
                    );


                locations.push({

                    latitude:
                        lat,

                    longitude:
                        lon,

                    susceptibility:
                        susceptibility,

                    risk:
                        getRiskClass(
                            susceptibility
                        ),

                    taluk:
                        cleanText(
                            location.taluk ||
                            taluk.taluk
                        ),

                    village:
                        cleanText(
                            location.village ||
                            village.village
                        ),

                    pincode:
                        pincode,

                    address:
                        cleanText(
                            location.address
                        )

                });

            }

        }

    }


    return locations;
}


/* =====================================================
   BUILD VILLAGE INDEX
====================================================== */

function buildVillageIndex() {

    const rows = [];


    for (
        const taluk
        of state.riskData?.taluks || []
    ) {

        for (
            const village
            of taluk.villages || []
        ) {

            const locations =
                village.locations || [];


            const validLocations =
                locations
                    .map(
                        (location) =>
                            susceptibilityPercent(
                                location.susceptibility ??
                                location.SUSCEPTIBILITY ??
                                location.risk ??
                                location.probability
                            )
                    )
                    .filter(
                        (value) =>
                            value !== null &&
                            value >=
                            HIGH_RISK_THRESHOLD
                    );


            const maxRisk =
                validLocations.length
                    ? Math.max(
                        ...validLocations
                    )
                    : 0;


            const averageRisk =
                validLocations.length
                    ? validLocations.reduce(
                        (a, b) => a + b,
                        0
                    ) /
                    validLocations.length
                    : 0;


            rows.push({

                taluk:
                    cleanText(
                        taluk.taluk
                    ),

                village:
                    cleanText(
                        village.village
                    ),

                pinCodes:
                    (
                        village.pin_codes ||
                        []
                    ).map(
                        normalizePincode
                    ),

                highRiskPoints:
                    validLocations.length,

                maximumSusceptibility:
                    maxRisk,

                averageSusceptibility:
                    averageRisk,

                locations:
                    locations

            });

        }

    }


    state.villageIndex =
        rows;
}


/* =====================================================
   UPDATE STATISTICS
====================================================== */

function updateStats() {

    const data =
        state.riskData;


    if (!data) {

        return;
    }


    const talukCount =
        Array.isArray(data.taluks)
            ? data.taluks.length
            : 0;


    const pointCount =
        state.locations.length;


    if ($("totalTaluks")) {

        $("totalTaluks")
            .textContent =
            talukCount.toLocaleString();
    }


    if ($("highRiskPoints")) {

        $("highRiskPoints")
            .textContent =
            pointCount.toLocaleString();
    }
}


/* =====================================================
   LOAD JSON
====================================================== */

async function loadJSON() {

    const response =
        await fetch(
            JSON_PATH
        );


    if (!response.ok) {

        throw new Error(
            `Could not load ${JSON_PATH}. HTTP ${response.status}`
        );
    }


    const data =
        await response.json();


    return normalizeRiskData(
        data
    );
}


/* =====================================================
   LOAD HASSAN BOUNDARY
====================================================== */

async function loadHassanBoundary() {

    try {

        const response =
            await fetch(
                BOUNDARY_PATH
            );


        if (!response.ok) {

            throw new Error(
                `Boundary file HTTP ${response.status}`
            );
        }


        const geojson =
            await response.json();


        return geojson;

    } catch (error) {

        console.warn(
            "Hassan boundary could not be loaded:",
            error
        );


        if ($("mapStatus")) {

            $("mapStatus").textContent =
                "Risk data loaded. Hassan boundary unavailable.";
        }


        return null;
    }
}


/* =====================================================
   ADD HASSAN DISTRICT BOUNDARY
====================================================== */

function addHassanBoundary(geojson) {

    if (!geojson) {

        return;
    }


    /*
        If the file contains all Karnataka districts,
        find Hassan automatically.
    */

    let hassanGeoJSON =
        geojson;


    if (
        geojson.type ===
        "FeatureCollection"
    ) {

        const features =
            geojson.features || [];


        const hassanFeatures =
            features.filter(
                (feature) => {

                    const properties =
                        feature.properties ||
                        {};


                    const values =
                        Object.values(
                            properties
                        );


                    return values.some(
                        (value) =>
                            String(
                                value || ""
                            )
                            .trim()
                            .toLowerCase()
                            === "hassan"
                    );

                }
            );


        if (
            hassanFeatures.length
        ) {

            hassanGeoJSON = {

                type:
                    "FeatureCollection",

                features:
                    hassanFeatures

            };

        }

    }


    boundaryLayer =
        L.geoJSON(
            hassanGeoJSON,
            {

                style: {

                    color:
                        "#0b6b3a",

                    weight:
                        4,

                    opacity:
                        0.95,

                    fillColor:
                        "#1a9850",

                    fillOpacity:
                        0.035,

                    dashArray:
                        "9 6"

                },


                onEachFeature:
                    function (
                        feature,
                        layer
                    ) {

                        layer.bindTooltip(
                            "HASSAN DISTRICT",
                            {

                                permanent:
                                    true,

                                direction:
                                    "center",

                                className:
                                    "district-label"

                            }
                        );


                        layer.bindPopup(
                            `
                                <div class="popup-title">
                                    Hassan District
                                </div>

                                <div class="popup-grid">

                                    <div>
                                        <b>District:</b>
                                        Hassan
                                    </div>

                                    <div>
                                        <b>State:</b>
                                        Karnataka
                                    </div>

                                    <div>
                                        <b>Risk threshold:</b>
                                        ≥60%
                                    </div>

                                </div>
                            `
                        );

                    }

            }
        ).addTo(map);


    /*
        Put boundary below risk points
        visually.
    */

    if (
        boundaryLayer.bringToBack
    ) {

        boundaryLayer.bringToBack();
    }


    /*
        Zoom map to Hassan district.
    */

    const bounds =
        boundaryLayer.getBounds();


    if (
        bounds &&
        bounds.isValid()
    ) {

        map.fitBounds(
            bounds,
            {
                padding:
                    [25, 25]
            }
        );

    }
}


/* =====================================================
   ADD RISK MARKERS
====================================================== */

function addRiskMarkers(
    locations
) {

    allPointsLayer.clearLayers();

    veryHighRiskLayer.clearLayers();

    selectedLayer.clearLayers();


    let visibleCount =
        0;


    for (
        const row
        of locations
    ) {

        const percent =
            row.susceptibility;


        const isVeryHigh =
            percent >=
            VERY_HIGH_THRESHOLD;


        const color =
            getRiskColor(
                percent
            );


        const marker =
            L.circleMarker(

                [
                    row.latitude,
                    row.longitude
                ],

                {

                    renderer:
                        canvasRenderer,

                    radius:
                        isVeryHigh
                            ? 6
                            : 5,

                    fillColor:
                        color,

                    color:
                        "#34443a",

                    weight:
                        1,

                    opacity:
                        0.95,

                    fillOpacity:
                        0.85

                }

            );


        marker.bindPopup(
            createPointPopup(row)
        );


        marker.on(
    "click",
    function (event) {

        /*
            Stop this click from bubbling to
            the map itself.
        */
        L.DomEvent.stopPropagation(
            event
        );


        /*
            Select this location.
        */
        showSelectedLocation(
            row
        );

    }
);


        /*
            Always show ≥60% locations
        */

        marker.addTo(
            allPointsLayer
        );


        /*
            ≥80% layer
        */

        if (isVeryHigh) {

            const highMarker =
                L.circleMarker(

                    [
                        row.latitude,
                        row.longitude
                    ],

                    {

                        renderer:
                            canvasRenderer,

                        radius:
                            6,

                        fillColor:
                            "#d73027",

                        color:
                            "#8f1712",

                        weight:
                            1,

                        fillOpacity:
                            0.9

                    }

                );


            highMarker.bindPopup(
                createPointPopup(row)
            );


            highMarker.on(
    "click",
    function (event) {

        L.DomEvent.stopPropagation(
            event
        );

        showSelectedLocation(
            row
        );

    }
);


            highMarker.addTo(
                veryHighRiskLayer
            );

        }


        visibleCount++;
    }


    /*
        Toggle layer depending on filter.
    */

    if (
        state.showingVeryHighOnly
    ) {

        allPointsLayer.removeFrom(
            map
        );

        veryHighRiskLayer.addTo(
            map
        );

    } else {

        veryHighRiskLayer.removeFrom(
            map
        );

        allPointsLayer.addTo(
            map
        );

    }


    if ($("mapStatus")) {

        $("mapStatus")
            .textContent =
            `${visibleCount.toLocaleString()} JSON locations loaded`;
    }
}


/* =====================================================
   CREATE POPUP
====================================================== */

function createPointPopup(
    row
) {

    const percent =
        row.susceptibility
            .toFixed(2);


    return `

        <div>

            <div class="popup-title">
                Landslide Susceptibility
            </div>


            <div class="popup-grid">

                <div>
                    <b>Village:</b>
                    ${escapeHtml(row.village)}
                </div>


                <div>
                    <b>Taluk:</b>
                    ${escapeHtml(row.taluk)}
                </div>


                <div>
                    <b>PIN:</b>
                    ${escapeHtml(row.pincode)}
                </div>


                <div>
                    <b>Susceptibility:</b>
                    ${percent}%
                </div>


                <div>
                    <b>Risk Class:</b>
                    ${escapeHtml(row.risk)}
                </div>


                <div>
                    <b>Latitude:</b>
                    ${row.latitude.toFixed(6)}
                </div>


                <div>
                    <b>Longitude:</b>
                    ${row.longitude.toFixed(6)}
                </div>

            </div>

        </div>

    `;
}


/* =====================================================
   SELECTED LOCATION
====================================================== */

function showSelectedLocation(row) {

    /*
        Remove the previous selected/highlighted
        location before selecting a new one.
    */
    selectedLayer.clearLayers();


    /*
        Create the highlighted marker.
    */
    const selectedMarker =
        L.circleMarker(
            [
                row.latitude,
                row.longitude
            ],
            {
                radius: 11,

                color: "#111111",

                weight: 3,

                fillColor:
                    getRiskColor(
                        row.susceptibility
                    ),

                fillOpacity: 0.95,

                /*
                    Make sure the selected marker
                    does not stay active after popup
                    is closed.
                */
                interactive: true
            }
        );


    /*
        Add selected marker to the map.
    */
    selectedMarker.addTo(
        selectedLayer
    );


    /*
        Update selected-location information.
    */

    if ($("selectedVillage")) {

        $("selectedVillage")
            .textContent =
            row.village;
    }


    if ($("selectedTaluk")) {

        $("selectedTaluk")
            .textContent =
            row.taluk;
    }


    if ($("selectedPincode")) {

        $("selectedPincode")
            .textContent =
            row.pincode ||
            "Not available";
    }


    if ($("selectedRisk")) {

        $("selectedRisk")
            .textContent =
            `${Number(
                row.susceptibility
            ).toFixed(2)}%`;
    }


    if ($("selectedRiskClass")) {

        $("selectedRiskClass")
            .textContent =
            row.risk;
    }


    if ($("selectedCoordinates")) {

        $("selectedCoordinates")
            .textContent =
            `${Number(
                row.latitude
            ).toFixed(5)}, ${Number(
                row.longitude
            ).toFixed(5)}`;
    }


    /*
        IMPORTANT FIX
        ----------------

        When the popup's X button is clicked,
        remove the enlarged selected marker.

        Otherwise the enlarged circle remains
        on the map and can block clicks.
    */
    selectedMarker.on(
        "popupclose",
        function () {

            selectedLayer.clearLayers();

        }
    );


    /*
        Also remove the selection if the user
        clicks somewhere else on the map.
    */
    map.once(
        "click",
        function () {

            selectedLayer.clearLayers();

        }
    );
}


/* =====================================================
   POPULATE TALUKS
====================================================== */

function populateTaluks() {

    const select =
        $("talukFilter");


    if (!select) {

        return;
    }


    select.innerHTML =
        `<option value="">All Taluks</option>`;


    const taluks =
        state.villageIndex

            .map(
                row =>
                    row.taluk
            )

            .filter(Boolean)

            .filter(
                (value, index, array) =>
                    array.indexOf(value)
                    === index
            )

            .sort();


    for (
        const taluk
        of taluks
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            taluk;


        option.textContent =
            taluk;


        select.appendChild(
            option
        );
    }
}


/* =====================================================
   POPULATE PIN CODES
====================================================== */

function populatePincodes() {

    const select =
        $("pincodeFilter");

    if (!select) {
        return;
    }


    /*
        Get currently selected Taluk.
    */
    const selectedTaluk =
        $("talukFilter")?.value || "";


    /*
        Start with "All PIN Codes".
    */
    select.innerHTML = `
        <option value="">
            All PIN Codes
        </option>
    `;


    /*
        Get villages belonging only
        to the selected Taluk.
    */
    let villages =
        state.villageIndex;


    if (selectedTaluk) {

        villages =
            villages.filter(
                row =>
                    String(row.taluk)
                        .trim()
                        .toLowerCase()
                    ===
                    String(selectedTaluk)
                        .trim()
                        .toLowerCase()
            );
    }


    /*
        Collect PIN codes from the
        filtered villages only.
    */
    const pins = new Set();


    for (
        const village
        of villages
    ) {

        for (
            const pin
            of village.pinCodes || []
        ) {

            const normalized =
                normalizePincode(pin);


            if (normalized) {

                pins.add(
                    normalized
                );

            }
        }
    }


    /*
        Add PIN codes to dropdown.
    */
    [...pins]
        .sort()
        .forEach(
            pin => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    pin;

                option.textContent =
                    pin;

                select.appendChild(
                    option
                );
            }
        );
}


/* =====================================================
   FILTER VILLAGES
====================================================== */

function getFilteredVillages() {

    /*
        IMPORTANT:
        Do not use cleanText() here.

        Empty filter = no filtering.
    */

    const taluk =
        $("talukFilter")?.value || "";


    const pincode =
        $("pincodeFilter")?.value || "";


    const query =
        $("villageSearch")?.value.trim() || "";


    let villages =
        state.villageIndex;


    /*
        ================================================
        1. TALUK FILTER
        ================================================
    */

    if (taluk) {

        villages =
            villages.filter(
                village =>

                    String(village.taluk)
                        .trim()
                        .toLowerCase()
                    ===
                    String(taluk)
                        .trim()
                        .toLowerCase()
            );
    }


    /*
        ================================================
        2. PIN CODE FILTER
        ================================================
    */

    if (pincode) {

        const selectedPin =
            normalizePincode(
                pincode
            );


        villages =
            villages.filter(
                village =>

                    (village.pinCodes || [])
                        .map(
                            pin =>
                                normalizePincode(
                                    pin
                                )
                        )
                        .includes(
                            selectedPin
                        )
            );
    }


    /*
        ================================================
        3. VILLAGE SEARCH
        ================================================
    */

    if (query) {

        const search =
            normalizeName(
                query
            );


        villages =
            villages.filter(
                village => {

                    const villageName =
                        normalizeName(
                            village.village
                        );


                    return villageName.includes(
                        search
                    );

                }
            );
    }


    return villages;
}

/* =====================================================
   RENDER VILLAGE RESULTS
====================================================== */

function renderVillageResults(
    rows
) {

    const container =
        $("resultsList");


    const count =
        $("resultCount");


    if (!container) {

        return;
    }


    if (count) {

        count.textContent =
            rows.length.toLocaleString();
    }


    if (!rows.length) {

        container.innerHTML = `

            <div class="no-results">

                No matching high-susceptibility
                villages found.

            </div>

        `;

        return;
    }


    /*
        Sort by highest susceptibility first.
    */

    const sorted =
        [...rows].sort(

            (a, b) =>
                b.maximumSusceptibility -
                a.maximumSusceptibility

        );


    /*
        Limit the number of cards
        displayed initially.
    */

    const visible =
        sorted.slice(
            0,
            150
        );


    container.innerHTML =
        visible.map(

            row => {

                const risk =
                    getRiskClass(
                        row.maximumSusceptibility
                    );


                const riskClass =
                    riskClassName(
                        risk
                    );


                const pins =
                    row.pinCodes.length
                        ? row.pinCodes.join(
                            ", "
                        )
                        : "Not available";


                return `

                    <button
                        class="result-item"
                        type="button"
                        data-village="${escapeHtml(row.village)}"
                        data-taluk="${escapeHtml(row.taluk)}"
                    >

                        <div class="result-top">

                            <strong>
                                ${escapeHtml(row.village)}
                            </strong>

                            <span class="risk-pill ${riskClass}">
                                ${row.maximumSusceptibility.toFixed(1)}%
                            </span>

                        </div>


                        <div class="result-meta">

                            ${escapeHtml(row.taluk)}

                            ·

                            PIN:
                            ${escapeHtml(pins)}

                        </div>


                        <div class="result-footer">

                            ${row.highRiskPoints}
                            high-susceptibility
                            location(s)

                            ·

                            Average:
                            ${row.averageSusceptibility.toFixed(1)}%

                        </div>

                    </button>

                `;

            }

        ).join("");


    /*
        Add click handlers.
    */

    container
        .querySelectorAll(
            ".result-item"
        )
        .forEach(

            button => {

                button.addEventListener(
                    "click",
                    () => {

                        focusVillage(
                            button.dataset.village,
                            button.dataset.taluk
                        );

                    }
                );

            }
        );


    if (
        sorted.length > 150
    ) {

        container.insertAdjacentHTML(

            "beforeend",

            `

                <div class="no-results">

                    Showing first 150 results.
                    Use the filters to narrow
                    the list.

                </div>

            `

        );

    }
}


/* =====================================================
   FOCUS VILLAGE
====================================================== */

function focusVillage(
    villageName,
    talukName
) {

    const village =
        state.villageIndex.find(

            row =>

                row.village ===
                villageName &&

                row.taluk ===
                talukName

        );


    if (!village) {

        return;
    }


    const locations =
        state.locations.filter(

            row =>

                row.village ===
                villageName &&

                row.taluk ===
                talukName

        );


    if (!locations.length) {

        return;
    }


    const bounds =
        L.latLngBounds(
            locations.map(
                row => [
                    row.latitude,
                    row.longitude
                ]
            )
        );


    if (
        bounds.isValid()
    ) {

        map.fitBounds(
            bounds,
            {
                padding:
                    [50, 50],

                maxZoom:
                    14
            }
        );

    }


    /*
        Highlight first location.
    */

    showSelectedLocation(
        locations[0]
    );


    /*
        Open popup on first location.
    */

    const marker =
        L.circleMarker(
            [
                locations[0].latitude,
                locations[0].longitude
            ]
        );


    /*
        Find approximate existing
        marker and open popup by
        panning to the location.
    */

    map.setView(
        [
            locations[0].latitude,
            locations[0].longitude
        ],
        Math.max(
            map.getZoom(),
            12
        )
    );

}


/* =====================================================
   FIT HASSAN
====================================================== */

function fitHassan() {

    if (
        boundaryLayer
    ) {

        const bounds =
            boundaryLayer.getBounds();


        if (
            bounds.isValid()
        ) {

            map.fitBounds(
                bounds,
                {
                    padding:
                        [25, 25]
                }
            );

            return;
        }
    }


    /*
        Fallback if boundary
        is unavailable.
    */

    map.setView(
        MAP_CENTER,
        DEFAULT_ZOOM
    );
}


/* =====================================================
   RESET MAP
====================================================== */

function resetMap() {

    state.showingVeryHighOnly =
        false;


    if ($("highRiskToggle")) {

        $("highRiskToggle")
            .checked =
            false;
    }


    selectedLayer.clearLayers();


    addRiskMarkers(
        state.locations
    );


    fitHassan();


    renderVillageResults(
        getFilteredVillages()
    );


    if ($("talukFilter")) {

        $("talukFilter").value =
            "";
    }


    if ($("pincodeFilter")) {

        $("pincodeFilter").value =
            "";
    }


    if ($("villageSearch")) {

        $("villageSearch").value =
            "";
    }
}


/* =====================================================
   SETUP EVENTS
====================================================== */

function setupEvents() {


    /* Very high toggle */

    $("highRiskToggle")
        ?.addEventListener(
            "change",
            function () {

                state.showingVeryHighOnly =
                    this.checked;


                if (
                    state.showingVeryHighOnly
                ) {

                    allPointsLayer
                        .removeFrom(
                            map
                        );

                    veryHighRiskLayer
                        .addTo(
                            map
                        );


                    if ($("mapStatus")) {

                        const count =
                            state.locations
                                .filter(
                                    row =>
                                        row.susceptibility >=
                                        VERY_HIGH_THRESHOLD
                                )
                                .length;


                        $("mapStatus")
                            .textContent =
                            `${count.toLocaleString()} very-high-risk locations shown`;
                    }

                } else {

                    veryHighRiskLayer
                        .removeFrom(
                            map
                        );

                    allPointsLayer
                        .addTo(
                            map
                        );


                    if ($("mapStatus")) {

                        $("mapStatus")
                            .textContent =
                            `${state.locations.length.toLocaleString()} locations ≥60% shown`;
                    }

                }

            }
        );


    /* Reset map */

    $("resetMap")
        ?.addEventListener(
            "click",
            resetMap
        );


    /* Taluk */

    $("talukFilter")
    ?.addEventListener(
        "change",
        () => {

            /*
                Taluk changed.

                Rebuild the PIN dropdown so
                it contains only PINs from
                the selected Taluk.
            */
            populatePincodes();


            /*
                Reset previously selected PIN.
            */
            if ($("pincodeFilter")) {

                $("pincodeFilter").value =
                    "";
            }


            /*
                Apply Taluk filter.
            */
            renderVillageResults(
                getFilteredVillages()
            );

        }
    );


    /* PIN */

    $("pincodeFilter")
        ?.addEventListener(
            "change",
            () => {

                renderVillageResults(
                    getFilteredVillages()
                );

            }
        );


    /* Village search */

    $("villageSearch")
        ?.addEventListener(
            "input",
            () => {

                renderVillageResults(
                    getFilteredVillages()
                );

            }
        );


    /* Clear search */

    $("clearSearch")
        ?.addEventListener(
            "click",
            () => {

                if ($("villageSearch")) {

                    $("villageSearch")
                        .value =
                        "";
                }


                renderVillageResults(
                    getFilteredVillages()
                );

            }
        );


    /* Show all */

    $("showAll")
        ?.addEventListener(
            "click",
            () => {

                if ($("talukFilter")) {

                    $("talukFilter")
                        .value =
                        "";
                }


                if ($("pincodeFilter")) {

                    $("pincodeFilter")
                        .value =
                        "";
                }


                if ($("villageSearch")) {

                    $("villageSearch")
                        .value =
                        "";
                }


                renderVillageResults(
                    state.villageIndex
                );


                fitHassan();

            }
        );


    /* Reset filters */

    $("resetFilters")
        ?.addEventListener(
            "click",
            () => {

                if ($("talukFilter")) {

                    $("talukFilter")
                        .value =
                        "";
                }


                if ($("pincodeFilter")) {

                    $("pincodeFilter")
                        .value =
                        "";
                }


                if ($("villageSearch")) {

                    $("villageSearch")
                        .value =
                        "";
                }


                renderVillageResults(
                    state.villageIndex
                );

            }
        );
}


/* =====================================================
   INITIALIZATION
====================================================== */

async function init() {

    try {

        console.log(
            "Starting Hassan LSM application..."
        );


        setupEvents();


        if ($("mapStatus")) {

            $("mapStatus")
                .textContent =
                "Loading Hassan boundary and susceptibility data...";
        }


        /*
            Load both files.
        */

        const [
            riskData,
            boundaryData
        ] = await Promise.all([

            loadJSON(),

            loadHassanBoundary()

        ]);


        state.riskData =
            riskData;


        /*
            Convert nested JSON
            into map locations.
        */

        state.locations =
            flattenRiskLocations();


        /*
            Build village search.
        */

        buildVillageIndex();


        /*
            Dashboard.
        */

        updateStats();


        /*
            Dropdowns.
        */

        populateTaluks();

        populatePincodes();


        /*
            Add Hassan boundary
            BEFORE markers.
        */

        addHassanBoundary(
            boundaryData
        );


        /*
            Add risk locations.
        */

        addRiskMarkers(
            state.locations
        );


        /*
            Initial results.
        */

        renderVillageResults(
            state.villageIndex
        );


        /*
            Make sure boundary is
            the main map focus.
        */

        fitHassan();


        setTimeout(
            () => {

                map.invalidateSize();

                fitHassan();

            },
            300
        );


        console.log(
            "Hassan LSM loaded successfully",
            {

                locations:
                    state.locations.length,

                villages:
                    state.villageIndex.length,

                taluks:
                    state.riskData
                        ?.taluks
                        ?.length || 0

            }
        );


    } catch (error) {

        console.error(
            "Hassan LSM loading error:",
            error
        );


        if ($("mapStatus")) {

            $("mapStatus")
                .textContent =
                "Data loading failed.";
        }


        if ($("highRiskPoints")) {

            $("highRiskPoints")
                .textContent =
                "Error";
        }


        if ($("resultsList")) {

            $("resultsList")
                .innerHTML = `

                    <div class="no-results">

                        <strong>
                            Could not load Hassan LSM data.
                        </strong>

                        <br><br>

                        Please check that these files
                        exist:

                        <br><br>

                        <code>
                            data/Hassan_LSM_Frontend_Data.json
                        </code>

                        <br><br>

                        <code>
                            data/Hassan_District_Boundary.geojson
                        </code>

                        <br><br>

                        Also make sure you are running
                        the project using VS Code Live Server.

                    </div>

                `;
        }

    }

}


/* =====================================================
   START APPLICATION
====================================================== */

init();
