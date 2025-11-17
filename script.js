
// WAIT FOR MAPBOX GL TO LOAD
function waitForMapbox(callback) {
  if (window.mapboxgl && window.mapboxgl.Map) {
    callback();
  } else {
    requestAnimationFrame(() => waitForMapbox(callback));
  }
}
waitForMapbox(initMap);

// MAIN MAP INITIALIZER
function initMap() {
  mapboxgl.accessToken = "pk.eyJ1IjoibWF1ZGVyYXVpIiwiYSI6ImNtNXdkdnB5ZjA3aW8ya3IweTFiZGY1OTcifQ.J_AuOGPRTgESe7otKIRdmw";

  const map = (window.map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mausderau/cm6rzbdio014m01pbcbhs9drt",
    center: [-4.2518, 55.8642],
    zoom: 10.5,
    fadeDuration: 0,
    pitchWithRotate: false
  }));

  map.addControl(new mapboxgl.NavigationControl());
  map.addControl(new mapboxgl.GeolocateControl({ trackUserLocation: true }), "top-right");
  map.addControl(new MapboxGeocoder({ accessToken: mapboxgl.accessToken, mapboxgl }), "top-right");
  map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: "metric" }), "top-right");

  // important: fix Lighthouse disappearing map
  map.on("load", () => {
    map.resize();
    setTimeout(() => map.resize(), 350);
  });

  loadData();
}

// LOAD GEOJSON + INIT LAYERS

function loadData() {
  const DATA_URL = "https://raw.githubusercontent.com/mausderau/quizdata/main/PubQuizLocsFix-3.geojson";

  fetch(DATA_URL)
    .then(r => r.json())
    .then(data => initLayers(data))
    .catch(err => console.error("GeoJSON Load Error:", err));
}

function initLayers(data) {
  map.addSource("pubquizlocs", { type: "geojson", data });

  map.addLayer({
    id: "pubquizlocs",
    type: "circle",
    source: "pubquizlocs",
    paint: {
      "circle-radius": 6,
      "circle-color": "#007cbf"
    }
  });

  initPopups();
  initFiltering();
}


// POPUPS

function initPopups() {
  let hoverPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: "hover-popup"
  });

  let clickPopup = new mapboxgl.Popup({
    closeButton: true,
    className: "click-popup"
  });

  map.on("mousemove", "pubquizlocs", e => {
    const feature = e.features?.[0];
    if (!feature) return;

    hoverPopup
      .setLngLat(e.lngLat)
      .setHTML(`<h3>${feature.properties.PubName}</h3>`)
      .addTo(map);
  });

  map.on("mouseleave", "pubquizlocs", () => hoverPopup.remove());

  map.on("click", "pubquizlocs", e => {
    const p = e.features?.[0]?.properties;
    if (!p) return;

    clickPopup
      .setLngLat(e.lngLat)
      .setHTML(buildPopupHTML(p))
      .addTo(map);
  });
}

function buildPopupHTML(p) {
  return `
    <h3>${p.PubName}</h3>
    <p><strong>Address:</strong> ${p.PubAddress}</p>
    <p><strong>Quiz Day:</strong> ${p.DayofQuiz}</p>
    <p><strong>Start Time:</strong> ${p.QuizStartTime}</p>
    <p><strong>Frequency:</strong> ${p.Frequency}</p>
    <p><strong>Entry Cost:</strong> ${p.EntryCost}</p>
    <p><strong>Smartphone Quiz:</strong> ${p.SmartphoneQuiz}</p>
    <p><strong>Website:</strong> <a href="${p.PubWebsite}" target="_blank">${p.PubWebsite}</a></p>
  `;
}


// FILTERING (DEBOUNCED)

function initFiltering() {
  const filterIds = [
    "dayFilter",
    "timeFilter",
    "freeEntryFilter",
    "smartphoneQuizFilter"
  ];

  filterIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", debounce(applyFilters, 120));
  });
}

function applyFilters() {
  const day = val("dayFilter");
  const time = val("timeFilter");
  const free = val("freeEntryFilter");
  const phone = val("smartphoneQuizFilter");

  const filterExpr = ["all"];

  if (day !== "all") filterExpr.push(["==", ["get", "DayofQuiz"], day]);
  if (time !== "all") filterExpr.push(["==", ["get", "QuizStartTime"], time]);

  if (free !== "all") {
    filterExpr.push(
      free === "free"
        ? ["==", ["get", "EntryCost"], "free"]
        : ["!=", ["get", "EntryCost"], "free"]
    );
  }

  if (phone !== "all") {
    filterExpr.push(["==", ["get", "SmartphoneQuiz"], phone]);
  }

  map.setFilter("pubquizlocs", filterExpr);
}

function val(id) {
  return document.getElementById(id).value;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
