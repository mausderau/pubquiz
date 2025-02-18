mapboxgl.accessToken =
  "pk.eyJ1IjoibWF1c2RlcmF1IiwiYSI6ImNtNXdkdnB5ZjA3aW8ya3IweTFiZGY1OTcifQ.J_AuOGPRTgESe7otKIRdmw";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mausderau/cm6rzbdio014m01pbcbhs9drt",
  center: [-4.2518, 55.8642],
  zoom: 10.5
});

map.addControl(new mapboxgl.NavigationControl());
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

      console.log("GeoJSON loaded successfully:", geoJson);

      // Validate coordinates
      geoJson.features.forEach((feature, index) => {
        const coords = feature.geometry.coordinates;
        if (
          !coords ||
          coords.length !== 2 ||
          isNaN(coords[0]) ||
          isNaN(coords[1])
        ) {
          console.error(
            `Feature at index ${index} has invalid coordinates:`,
            feature
          );
        }
      });

      map.addSource("pubquizlocs", {
        type: "geojson",
        data: geoJson
      });

      if (!map.getLayer("pubquizlocs")) {
        map.addLayer({
          id: "pubquizlocs",
          type: "circle",
          source: "pubquizlocs",
          paint: {
            "circle-radius": 6,
            "circle-color": "#007cbf"
          }
        });
      }

      setupPopups();
      setupFiltering();
      filterPubQuizData();
    })
    .catch((error) => console.error("Error fetching GeoJSON:", error));
});

//Create popups
function setupPopups() {
  let hoverPopup = new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: false
  });

  let clickPopup = new mapboxgl.Popup({ closeButton: true });

  map.on("mousemove", "pubquizlocs", function (e) {
    if (e.features.length > 0) {
      var feature = e.features[0];
      hoverPopup
        .setLngLat(e.lngLat)
        .setHTML(`<h3>${feature.properties.PubName}</h3>`)
        .addTo(map);
      hoverPopup.getElement().classList.add("hover-popup");
    }
  });

  map.on("mouseleave", "pubquizlocs", function () {
    hoverPopup.remove();
  });

  map.on("click", "pubquizlocs", function (e) {
    if (e.features.length > 0) {
      const feature = e.features[0];
      hoverPopup.remove();
      clickPopup
        .setLngLat(e.lngLat)
        .setHTML(
          `
            <h3>${feature.properties.PubName}</h3>
            <p>Address: ${feature.properties.PubAddress}</p>
            <p>Quiz Day: ${feature.properties.DayofQuiz}</p>
            <p>Start Time: ${feature.properties.QuizStartTime}</p>
            <p>Frequency: ${feature.properties.Frequency}</p>
            <p>Entry Cost: ${feature.properties.EntryCost}</p>
            <p>Smartphone Quiz: ${feature.properties.SmartphoneQuiz}</p>
            <p>Website: <a href="${feature.properties.PubWebsite}" target="_blank">${feature.properties.PubWebsite}</a></p>
          `
        )
        .addTo(map)
        .getElement()
        .classList.add("click-popup");
    }
  });
}

//filter setup
function setupFiltering() {
  document
    .getElementById("dayFilter")
    .addEventListener("change", filterPubQuizData);
  document
    .getElementById("timeFilter")
    .addEventListener("change", filterPubQuizData);
  document
    .getElementById("freeEntryFilter")
    .addEventListener("change", filterPubQuizData);
  document
    .getElementById("smartphoneQuizFilter")
    .addEventListener("change", filterPubQuizData);
}

//filter function
function filterPubQuizData() {
  if (!geoJson) {
    console.error("GeoJSON data is not loaded yet.");
    return;
  }

  const selectedDay = document.getElementById("dayFilter").value;
  const selectedTime = document.getElementById("timeFilter").value;
  const selectedFreeEntry = document.getElementById("freeEntryFilter").value;
  const selectedSmartphoneQuiz = document.getElementById("smartphoneQuizFilter")
    .value;

  console.log("Selected Filters:", {
    selectedDay,
    selectedTime,
    selectedFreeEntry,
    selectedSmartphoneQuiz
  });

  // Filter features based on user selection
  const filteredData = geoJson.features.filter((feature) => {
    const props = feature.properties;
    if (!props) {
      console.warn("Feature missing properties:", feature);
      return false;
    }

    const dayOfQuiz = props.DayofQuiz ?? "";
    const quizStartTime = props.QuizStartTime ?? "";
    const entryCost = props.EntryCost ? props.EntryCost.toLowerCase() : "";
    const smartphoneQuiz = props.SmartphoneQuiz ?? "";

    const matchesDay = selectedDay === "all" || dayOfQuiz === selectedDay;
    const matchesTime =
      selectedTime === "all" || quizStartTime === selectedTime;
    const matchesFreeEntry =
      selectedFreeEntry === "all" ||
      (selectedFreeEntry === "free" && entryCost.includes("free")) ||
      (selectedFreeEntry === "no" && !entryCost.includes("free"));
    const matchesSmartphoneQuiz =
      selectedSmartphoneQuiz === "all" ||
      smartphoneQuiz === selectedSmartphoneQuiz;

    return (
      matchesDay && matchesTime && matchesFreeEntry && matchesSmartphoneQuiz
    );
  });

  console.log("Filtered Data Length:", filteredData.length);
  console.log("Filtered Data:", filteredData);

  // Ensure all filtered features have valid coordinates
  const validFilteredData = filteredData.filter((feature, index) => {
    const coords = feature.geometry.coordinates;

    if (
      !coords ||
      coords.length !== 2 ||
      isNaN(coords[0]) ||
      isNaN(coords[1])
    ) {
      console.error(`Invalid coordinates at index ${index}:`, feature);
      return false;
    }
    return true;
  });

  console.log("Valid Filtered Data Length:", validFilteredData.length);

  // Ensure the map source exists before setting data
  const source = map.getSource("pubquizlocs");
  if (source) {
    source.setData({
      type: "FeatureCollection",
      features: validFilteredData
    });
    console.log("Map source updated successfully.");
    map.triggerRepaint(); // Force a re-render
  } else {
    console.error("Map source 'pubquizlocs' not found. Reloading...");
    reloadMapSource(validFilteredData);
  }
}
// Function to reload map source if it fails to update
function reloadMapSource(filteredData) {
  if (map.getLayer("pubquizlocs")) {
    map.removeLayer("pubquizlocs");
  }
  if (map.getSource("pubquizlocs")) {
    map.removeSource("pubquizlocs");
  }
  map.addSource("pubquizlocs", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: filteredData
    }
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

  console.log("Map source reloaded with new filtered data.");
}

//geolocate
map.addControl(
  new mapboxgl.GeolocateControl({ trackUserLocation: true }),
  "top-right"
);

//geocoder
const geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl
});
map.addControl(geocoder, "top-right");
console.log("Geocoder initialized");

//scale
const scale = new mapboxgl.ScaleControl({ maxWidth: 100, unit: "metric" });
map.addControl(scale, "top-right");