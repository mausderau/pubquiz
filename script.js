// Mapbox access token
mapboxgl.accessToken = "pk.eyJ1IjoibWF1IjoibWF1ZGVyYXVpIiwiYSI6ImNtNXdkdnB5ZjA3aW8ya3IweTFiZGY1OTcifQ.J_AuOGPRTgESe7otKIRdmw";

// Initialize the map
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mausderau/cmi3ky9fe002801ry1qyq148o", // your style with pink question marks
  center: [-4.2518, 55.8642],
  zoom: 10.5
});

// Controls
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.GeolocateControl({ trackUserLocation: true }), "top-right");
map.addControl(new MapboxGeocoder({ accessToken: mapboxgl.accessToken, mapboxgl: mapboxgl }), "top-right");
map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: "metric" }), "top-right");

// Layer ID of your pink question mark symbols
const PUB_LAYER_ID = "pubquizlocsfix";

map.on("load", () => {
  setupPopups(PUB_LAYER_ID);
  setupFilters(PUB_LAYER_ID);
});

function setupPopups(layerId) {
  const hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, className: "hover-popup" });
  const clickPopup = new mapboxgl.Popup({ closeButton: true, className: "click-popup" });

  // Hover popup
  map.on("mousemove", layerId, e => {
    if (!e.features || !e.features.length) return;
    const feature = e.features[0];
    hoverPopup
      .setLngLat(feature.geometry.coordinates)
      .setHTML(`<h3>${feature.properties.PubName}</h3>`)
      .addTo(map);
  });

  map.on("mouseleave", layerId, () => hoverPopup.remove());

  // Click popup
  map.on("click", layerId, e => {
    if (!e.features || !e.features.length) return;
    const p = e.features[0].properties;
    clickPopup
      .setLngLat(e.lngLat)
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

function setupFilters(layerId) {
  ["dayFilter","timeFilter","freeEntryFilter","smartphoneQuizFilter"].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.addEventListener("change", () => applyFilters(layerId));
  });
}

function applyFilters(layerId) {
  const day = document.getElementById("dayFilter").value;
  const time = document.getElementById("timeFilter").value;
  const free = document.getElementById("freeEntryFilter").value;
  const phone = document.getElementById("smartphoneQuizFilter").value;

  const filters = ["all"];
  if (day !== "all") filters.push(["==", ["get", "DayofQuiz"], day]);
  if (time !== "all") filters.push(["==", ["get", "QuizStartTime"], time]);
  if (free !== "all") filters.push(
    free === "free" ? ["==", ["get", "EntryCost"], "free"] : ["!=", ["get", "EntryCost"], "free"]
  );
  if (phone !== "all") filters.push(["==", ["get", "SmartphoneQuiz"], phone]);

  map.setFilter(layerId, filters);
}

