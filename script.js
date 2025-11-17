mapboxgl.accessToken = "pk.eyJ1IjoibWF1c2RlcmF1IiwiYSI6ImNtaTNrMWNjMzE2YTUycXExbzR3N2VwaTkifQ.sKPK1b5jJkchCV_dbGptAw";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mausderau/cmi3ky9fe002801ry1qyq148o", // updated style ID
  center: [-4.2518, 55.8642],
  zoom: 10.5
});
// --- EVERYTHING ELSE REMAINS THE SAME ---

map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.GeolocateControl({ trackUserLocation: true }), "top-right");
map.addControl(new MapboxGeocoder({ accessToken: mapboxgl.accessToken, mapboxgl: mapboxgl }), "top-right");
map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: "metric" }), "top-right");

map.on("load", () => {
  const data_url = "https://raw.githubusercontent.com/mausderau/quizdata/main/PubQuizLocsFix-3.geojson";
  fetch(data_url)
    .then(r => r.json())
    .then(data => {
      map.addSource("pubquizlocs", { type: "geojson", data });
      map.addLayer({
        id: "pubquizlocs",
        type: "circle",
        source: "pubquizlocs",
        paint: { "circle-radius": 6, "circle-color": "#007cbf" }
      });
      setupPopups();
      setupFiltering();
    })
    .catch(e => console.error("Error loading GeoJSON:", e));
});

function setupPopups() {
  const hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, className: "hover-popup" });
  const clickPopup = new mapboxgl.Popup({ closeButton: true, className: "click-popup" });

  map.on("mousemove", "pubquizlocs", e => {
    if (!e.features.length) return;
    const f = e.features[0];
    hoverPopup.setLngLat(e.lngLat).setHTML(`<h3>${f.properties.PubName}</h3>`).addTo(map);
  });

  map.on("mouseleave", "pubquizlocs", () => hoverPopup.remove());

  map.on("click", "pubquizlocs", e => {
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

function setupFiltering() {
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

  // Apply the combined filters
  map.setFilter("pubquizlocs", filters.length > 1 ? filters : null);
}
