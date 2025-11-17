mapboxgl.accessToken = "pk.eyJ1IjoibWF1c2RlcmF1IiwiYSI6ImNtNXdkdnB5ZjA3aW8ya3IweTFiZGY1OTcifQ.J_AuOGPRTgESe7otKIRdmw";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mausderau/cmi3ky9fe002801ry1qyq148o",
  center: [-4.2518, 55.8642],
  zoom: 10.5
});

// Controls
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.GeolocateControl({ trackUserLocation: true }), "top-right");
map.addControl(new MapboxGeocoder({ accessToken: mapboxgl.accessToken, mapboxgl: mapboxgl }), "top-right");
map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: "metric" }), "top-right");

// Load GeoJSON data as a separate source
const data_url = "https://raw.githubusercontent.com/mausderau/quizdata/main/PubQuizLocsFix%20(3).geojson";

map.on("load", () => {
  map.addSource("pubquizlocsfix", {
    type: "geojson",
    data: data_url
  });

  map.addLayer({
    id: "pubquizlocsfix",
    type: "symbol",
    source: "pubquizlocsfix",
    layout: {
      "icon-image": "question-mark-svgrepo-com (1)"
      "icon-size": 1.5
    }
  });

  setupPopups();
  setupFilters();
});

function setupPopups() {
  const hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, className: "hover-popup" });
  const clickPopup = new mapboxgl.Popup({ closeButton: true, className: "click-popup" });

  map.on("mouseenter", "pubquizlocsfix", (e) => {
    if (!e.features || !e.features.length) return;
    const f = e.features[0];
    hoverPopup.setLngLat(f.geometry.coordinates)
      .setHTML(`<h3>${f.properties.PubName}</h3>`)
      .addTo(map);
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "pubquizlocsfix", () => {
    hoverPopup.remove();
    map.getCanvas().style.cursor = "";
  });

  map.on("click", "pubquizlocsfix", (e) => {
    if (!e.features || !e.features.length) return;
    const p = e.features[0].properties;
    clickPopup.setLngLat(e.features[0].geometry.coordinates)
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

function setupFilters() {
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

  const filters = ["all"];
  if (day !== "all") filters.push(["==", ["get", "DayofQuiz"], day]);
  if (time !== "all") filters.push(["==", ["get", "QuizStartTime"], time]);
  if (free !== "all") {
    filters.push(free === "free" ? ["==", ["get", "EntryCost"], "free"] : ["!=", ["get", "EntryCost"], "free"]);
  }
  if (phone !== "all") filters.push(["==", ["get", "SmartphoneQuiz"], phone]);

  map.setFilter("pubquizlocsfix", filters);
}

