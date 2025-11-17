mapboxgl.accessToken = "pk.eyJ1IjoibWF1ZGVyYXVpIiwiYSI6ImNtNXdkdnB5ZjA3aW8ya3IweTFiZGY1OTcifQ.J_AuOGPRTgESe7otKIRdmw";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mausderau/cm6rzbdio014m01pbcbhs9drt",
  center: [-4.2518, 55.8642],
  zoom: 10.5
});

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

  const filters = ["all"];

  if (day !== "all") filters.push(["==", ["get", "DayofQuiz"], day]);
  if (time !== "all") filters.push(["==", ["get", "QuizStartTime"], time]);
  if (free !== "all") {
    filters.push(free === "free" ? ["==", ["get", "EntryCost"], "free"] : ["!=", ["get", "EntryCost"], "free"]);
  }
  if (phone !== "all") filters.push(["==", ["get", "SmartphoneQuiz"], phone]);

  map.setFilter("pubquizlocs", filters);
}
