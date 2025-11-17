mapboxgl.accessToken = "pk.eyJ1IjoibWF1ZGVyYXVpIiwiYSI6ImNtNXdkdnB5ZjA3aW8ya3IweTFiZGY1OTcifQ.J_AuOGPRTgESe7otKIRdmw";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mausderau/cm6rzbdio014m01pbcbhs9drt",
  center: [-4.2518, 55.8642],
  zoom: 10.5
});

// Controls
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.GeolocateControl({ trackUserLocation: true }), "top-right");
map.addControl(new MapboxGeocoder({ accessToken: mapboxgl.accessToken, mapboxgl: mapboxgl }), "top-right");
map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: "metric" }), "top-right");

// Correct URL for your file
const data_url = "https://raw.githubusercontent.com/mausderau/quizdata/main/PubQuizLocsFix%20(3).geojson";

map.on("load", () => {
  fetch(data_url)
    .then(r => r.json())
    .then(data => {
      map.addSource("pubquizlocs", {
        type: "geojson",
        data
      });

      map.addLayer({
        id: "pubquizlocs",
        type: "circle",
        source: "pubquizlocs",
        paint: {
          "circle-radius": 6,
          "circle-color": "#007cbf"
        }
      });

      setupPopups();
      setupFilters();
    })
    .catch(err => console.error("GeoJSON Load Error:", err));
});

function setupPopups() {
  const hoverPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: "hover-popup"
  });

  const clickPopup = new mapboxgl.Popup({
    closeButton: true,
    className: "click-popup"
  });

  map.on("mousemove", "pubquizlocs", event => {
    const feature = event.features?.[0];
    if (!feature) return;

    hoverPopup
      .setLngLat(event.lngLat)
      .setHTML(`<h3>${feature.properties.PubName}</h3>`)
      .addTo(map);
  });

  map.on("mouseleave", "pubquizlocs", () => {
    hoverPopup.remove();
  });

  map.on("click", "pubquizlocs", event => {
    const p = event.features?.[0]?.properties;
    if (!p) return;

    clickPopup
      .setLngLat(event.lngLat)
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
  ["dayFilter", "timeFilter", "freeEntryFilter", "smartphoneQuizFilter"]
    .forEach(id => {
      const element = document.getElementById(id);
      if (element) element.addEventListener("change", applyFilters);
    });
}

function applyFilters() {
  const day = document.getElementById("dayFilter").value;
  const time = document.getElementById("timeFilter").value;
  const free = document.getElementById("freeEntryFilter").value;
  const phone = document.getElementById("smartphoneQuizFilter").value;

  // Reset filters
  const filterArray = ["all"];

  // Day filter
  if (day !== "all") {
    filterArray.push(["==", ["get", "DayofQuiz"], day]);
  }

  // Time filter
  if (time !== "all") {
    filterArray.push(["==", ["get", "QuizStartTime"], time]);
  }

  // Free/paid filter
  if (free !== "all") {
    filterArray.push(
      free === "free"
        ? ["==", ["get", "EntryCost"], "free"]
        : ["!=", ["get", "EntryCost"], "free"]
    );
  }

  // Smartphone filter
  if (phone !== "all") {
    filterArray.push(["==", ["get", "SmartphoneQuiz"], phone]);
  }

  // Apply filter to map
  map.setFilter("pubquizlocs", filterArray);
}
