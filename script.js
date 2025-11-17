mapboxgl.accessToken = "pk.eyJ1IjoibWF1c2RlcmF1IiwiYSI6ImNtaTNrMWNjMzE2YTUycXExbzR3N2VwaTkifQ.sKPK1b5jJkchCV_dbGptAw";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mausderau/cmi3ky9fe002801ry1qyq148o", // updated style ID
  center: [-4.2518, 55.8642],
  zoom: 10.5
});

map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.GeolocateControl({ trackUserLocation: true }), "top-right");
map.addControl(new MapboxGeocoder({ accessToken: mapboxgl.accessToken, mapboxgl: mapboxgl }), "top-right");
map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: "metric" }), "top-right");

map.on("load", () => {
    // 1. CONFIRM YOUR GEOJSON URL HERE (Using the URL that worked before)
    const data_url = "https://raw.githubusercontent.com/mausderau/quizdata/main/PubQuizLocsFresh.geojson";
    
    // 2. DEFINE THE INTERACTIVE LAYER ID (Using the name from the working diagnostic)
    const layerID = "pubquizdata-override"; 

    fetch(data_url)
        .then(r => {
            if (!r.ok) throw new Error(`HTTP error! Status: ${r.status}`);
            return r.json();
        })
        .then(data => {
            // 3. ADD SOURCE
            map.addSource("pubquizdata-source", { type: "geojson", data });

            // 4. ADD LAYER AND FORCE ICON STYLING VIA JAVASCRIPT
            // Using 'symbol' type to explicitly display the icon.
            map.addLayer({
                id: layerID,
                type: "symbol", 
                source: "pubquizdata-source",
                layout: {
                    'icon-image': 'question-mark-svgrepo-com (1)', 
                    'icon-allow-overlap': true,
                    'icon-size': 1.0 
                }
            });

            // 5. ATTACH FUNCTIONS
            setupPopups(layerID);
            setupFiltering(layerID);
            map.on('mouseenter', layerID, () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', layerID, () => {
                map.getCanvas().style.cursor = '';
            });
        })
        .catch(e => console.error("CRITICAL ERROR: Failed to load interactive GeoJSON.", e));
});

function setupPopups(layerID) { // <--- Add argument here
  const hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, className: "hover-popup" });
  const clickPopup = new mapboxgl.Popup({ closeButton: true, className: "click-popup" });

  // Use layerID variable instead of "pubquizlocs" string
  map.on("mousemove", layerID, e => {
    if (!e.features.length) return;
    const f = e.features[0];
    hoverPopup.setLngLat(e.lngLat).setHTML(`<h3>${f.properties.PubName}</h3>`).addTo(map);
  });

  map.on("mouseleave", layerID, () => hoverPopup.remove());

  map.on("click", layerID, e => {
    if (!e.features.length) return;
    const p = e.features[0].properties;
    clickPopup.setLngLat(e.lngLat)
      .setHTML(`
        <h3>${p.PubName}</h3>
        <p>Address: ${p.PubAddress}</p>
        <p>Quiz Day: ${p.DayofQuiz}</p>
        <p>Start Time: ${p.QuizStartTime}</p>
        <p>Frequency: ${p.Frequency}</p>
        <p>Entry Cost: ${p.EntryCost}</p>
        <p>Smartphone Quiz: ${p.SmartphoneQuiz}</p>
        <p>Website: <a href="${p.PubWebsite}" target="_blank">${p.PubWebsite}</a></p>
      `)
      .addTo(map);
  });
}

let targetLayerID = "";
function setupFiltering(layerID) {
  targetLayerID = layerID; // Save the ID
  ["dayFilter", "timeFilter", "freeEntryFilter", "smartphoneQuizFilter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", applyFilters);
  });
}

function applyFilters() {
  const day = document.getElementById("dayFilter").value;
  const time = document.getElementById("timeFilter").value;
  const free = document.getElementById("freeEntryFilter").value;
  const phone = document.getElementById("smartphoneQuizFilter").value;

  // Start with the "all" operator
  const filters = ["all"];

  // Day Filter
  if (day !== "all") {
    filters.push(["==", ["get", "DayofQuiz"], day]);
  }

  // Time Filter
  if (time !== "all") {
    filters.push(["==", ["get", "QuizStartTime"], time]);
  }

  // Free Entry Filter
  if (free !== "all") {
    filters.push(
      free === "free" 
        ? ["==", ["get", "EntryCost"], "free"] 
        : ["!=", ["get", "EntryCost"], "free"]
    );
  }

  // Smartphone Filter (Fixed Logic)
  if (phone !== "all") {
    const isCheckingForYes = phone.toLowerCase() === "yes";
    
    // Create an expression that checks if the data says "yes" (case insensitive)
    const dataIsYes = ["==", ["downcase", ["get", "SmartphoneQuiz"]], "yes"];

    if (isCheckingForYes) {
      // User wants "Yes", so data must match "yes"
      filters.push(dataIsYes);
    } else {
      // User wants "No", so data must NOT match "yes"
      filters.push(["!", dataIsYes]);
    }
  }

  if (targetLayerID) {
      map.setFilter(targetLayerID, filters.length > 1 ? filters : null);
  }
}
