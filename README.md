# Hassan Landslide Susceptibility Mapping (LSM) — Web Frontend

An interactive web frontend for visualizing the **Landslide Susceptibility Map (LSM) of Hassan District, Karnataka**, developed as part of a GIS and Machine Learning based landslide susceptibility study.

The application allows users to explore high-susceptibility locations (≥60%) through an interactive Leaflet/OpenStreetMap map and search/filter locations by **taluk, PIN code, and village**. The Hassan district boundary is displayed as a GeoJSON overlay.

## Features

- Interactive Leaflet map with OpenStreetMap base layer
- Hassan district boundary overlay
- Visualization of locations with susceptibility ≥60%
- Risk classification:
  - **Moderate:** 60–69%
  - **High:** 70–79%
  - **Very High:** ≥80%
- Taluk-wise filtering
- PIN-code-wise filtering
- Village search
- Combined Taluk + PIN code + Village filtering
- Location popup with susceptibility information and coordinates
- Risk Explorer for identifying high-risk villages
- Responsive frontend interface
- Separate JSON dataset for efficient frontend loading

## Project Structure

```text
hassan_lsm_frontend_final/
├── index.html
├── style.css
├── script.js
├── README.md
│
├── data/
│   ├── Hassan_LSM_Frontend_Data.json
│   └── Hassan_District_Boundary.geojson
│
└── assets/
    └── hassan_final_talukwise_lsm.png
```

## Data

The frontend uses the following data sources/files:

### Hassan_LSM_Frontend_Data.json

This is the filtered frontend dataset containing locations with **susceptibility ≥60%**.

### Hassan_District_Boundary.geojson

GeoJSON representation of the Hassan district boundary used as an overlay on the Leaflet/OpenStreetMap map.

### Original CSV

The project CSV stores `SUSCEPTIBILITY` as a value between **0 and 1**. The JavaScript converts this value into a percentage for display.

The frontend JSON is a filtered/processed dataset intended to make the web application lighter and faster.

## LSM Classes

The project uses five susceptibility classes in the underlying LSM workflow. The Risk Explorer and frontend map specifically focus on locations with susceptibility **≥60%**.

For the frontend risk display:

| Susceptibility | Risk Class |
|---:|---|
| 60–69% | Moderate |
| 70–79% | High |
| ≥80% | Very High |

Only locations with susceptibility **≥60%** are displayed in the Risk Explorer/map dataset.

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Leaflet.js
- OpenStreetMap
- GeoJSON
- JSON
- Python
- QGIS
- Machine Learning / GIS preprocessing

## Running Locally

Do **not** open `index.html` directly using `file://`, because browsers may block JavaScript `fetch()` requests for the JSON and GeoJSON files.

Open a terminal inside the project folder and run:

```bash
python -m http.server 5500
```

Then open:

```text
http://127.0.0.1:5500
```

### Alternative: VS Code Live Server

You can also open the project folder in Visual Studio Code and run `index.html` using the **Live Server** extension.

## Important Data Distinction

There are two important data representations in this project:

1. **Original CSV**
   - Stores `SUSCEPTIBILITY` as a decimal value from 0 to 1.
   - Example: `0.80` represents approximately `80%`.

2. **Frontend JSON**
   - Contains the filtered high-susceptibility dataset.
   - Only locations with susceptibility **≥60%** are included.

The JavaScript converts susceptibility values into percentages for display and applies the project's risk-class thresholds.

## Map

The map uses **OpenStreetMap** as the basemap and overlays the Hassan district boundary using GeoJSON.

The boundary is a geographic reference layer and should not be interpreted as a susceptibility layer itself.

## Purpose

The frontend is intended to provide a simple and interactive way to communicate the results of the Hassan District Landslide Susceptibility Mapping study.

Users can quickly identify high-susceptibility locations and explore them by:

- District
- Taluk
- PIN code
- Village
- Susceptibility percentage
- Risk class
- Geographic coordinates

## Research Context

The broader project focuses on:

**Landslide Susceptibility Mapping for Hassan District, Karnataka (Western Ghats region) using GIS and Machine Learning.**

The frontend is the visualization and user-facing component of the project, presenting processed susceptibility results in an accessible web-based interface.

## Limitations

- The frontend displays the filtered dataset supplied for visualization and does not calculate susceptibility in the browser.
- The displayed risk locations depend on the contents of `Hassan_LSM_Frontend_Data.json`.
- Map accuracy depends on the quality and coordinate reference system of the supplied GIS datasets.
- OpenStreetMap is used as the base map; the susceptibility results are project-generated data.

## Future Enhancements

- Taluk-wise susceptibility statistics
- Interactive charts and dashboards
- More detailed susceptibility layers
- Mobile-friendly improvements
- Download/export of filtered locations
- Integration with additional GIS layers
- Deployment using GitHub Pages or another web hosting platform

## License

This repository is intended for academic and research purposes. Please verify the licensing and attribution requirements of any external datasets, maps, or GIS boundary data before redistribution.

## Author

Developed as an academic project on **Landslide Susceptibility Mapping of Hassan District, Karnataka** using GIS and Machine Learning.
