mapboxgl.accessToken =
  "pk.eyJ1IjoibWF1c2RlcmF1IiwiYSI6ImNtNXdkdnB5ZjA3aW8ya3IweTFiZGY1OTcifQ.J_AuOGPRTgESe7otKIRdmw";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mausderau/cm6rzbdio014m01pbcbhs9drt",
  center: [-4.2518, 55.8642],
  zoom: 10.5
});

map.addControl(new mapboxgl.NavigationControl());
map.addControl(
  new mapboxgl.GeolocateControl({ trackUserLocation: true }),
  "top-right"
);
map.addControl(
  new MapboxGeocoder({ accessToken: mapboxgl.accessToken, mapboxgl: mapboxgl }),
  "top-right"
);
map.addControl(
  new mapboxgl.ScaleControl({ maxWidth: 100, unit: "metric" }),
  "top-right"
);

let geoJson;

map.on("load", () => {
  const data_url =
    "https://raw.githubusercontent.com/mausderau/quizdata/main/PubQuizLocsFix%20(3).geojson";

  fetch(data_url)
    .then((response) => response.json())
    .then((data) => {
      geoJson = data;

      if (!geoJson.features) {
        console.error("Invalid GeoJSON format:", geoJson);
        return;
      }

      map.addSource("pubquizlocs", {
        type: "geojson",
        data: geoJson
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
      setupFiltering();
    })
    .catch((error) => console.error("Error fetching GeoJSON:", error));
});

// Create hover and click popups
function setupPopups() {
  const hoverPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: "hover-popup" // Add this line
  });

  const clickPopup = new mapboxgl.Popup({
    closeButton: true,
    className: "click-popup" // Add this line
  });

  map.on("mousemove", "pubquizlocs", (e) => {
    if (!e.features.length) return;
    const feature = e.features[0];
    hoverPopup
      .setLngLat(e.lngLat)
      .setHTML(`<h3>${feature.properties.PubName}</h3>`)
      .addTo(map);
  });
  map.on("mouseleave", "pubquizlocs", () => hoverPopup.remove());

  map.on("click", "pubquizlocs", (e) => {
    if (!e.features.length) return;
    const p = e.features[0].properties;
    clickPopup
      .setLngLat(e.lngLat)
      .setHTML(
        `<h3>${p.PubName}</h3>
         <p>Address: ${p.PubAddress}</p>
         <p>Quiz Day: ${p.DayofQuiz}</p>
         <p>Start Time: ${p.QuizStartTime}</p>
         <p>Frequency: ${p.Frequency}</p>
         <p>Entry Cost: ${p.EntryCost}</p>
         <p>Smartphone Quiz: ${p.SmartphoneQuiz}</p>
         <p>Website: <a href="${p.PubWebsite}" target="_blank">${p.PubWebsite}</a></p>`
      )
      .addTo(map);
  });
}

// Bind filter controls
function setupFiltering() {
  [
    "dayFilter",
    "timeFilter",
    "freeEntryFilter",
    "smartphoneQuizFilter"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", applyFilters);
  });
}

// Apply filters by setting layer filter
function applyFilters() {
  const selectedDay = document.getElementById("dayFilter").value;
  const selectedTime = document.getElementById("timeFilter").value;
  const selectedFree = document.getElementById("freeEntryFilter").value;
  const selectedPhone = document.getElementById("smartphoneQuizFilter").value;

  const filters = ["all"];

  if (selectedDay !== "all") {
    filters.push(["==", ["get", "DayofQuiz"], selectedDay]);
  }
  if (selectedTime !== "all") {
    filters.push(["==", ["get", "QuizStartTime"], selectedTime]);
  }
  if (selectedFree !== "all") {
    if (selectedFree === "free") {
      filters.push(["in", "free", ["to-string", ["get", "EntryCost"]]]);
    } else {
      // pay to enter: not containing "free"
      filters.push(["!in", "free", ["to-string", ["get", "EntryCost"]]]);
    }
  }
  if (selectedPhone !== "all") {
    filters.push(["==", ["get", "SmartphoneQuiz"], selectedPhone]);
  }

  // Update layer filter
  map.setFilter("pubquizlocs", filters);
}