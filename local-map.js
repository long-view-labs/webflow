// Variables for Google maps
var mapElem, markerImg, infoWindow, marker;
var mapOptions = {
  mapTypeId: "roadmap",
};

const geocoder = new google.maps.Geocoder();

function geocodeAddress(cityState) {
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address: cityState }, function (results, status) {
      if (status === "OK") {
        const location = results[0].geometry.location;
        resolve(location);
      } else {
        reject(status);
      }
    });
  });
}

function initialize() {
  // Loop through our array of cars
  for (i = 0; i < locations.length; i++) {
    var location = locations[i];

    // Generate an infowindow content for the marker
    var infoWindow = new google.maps.InfoWindow();
    infoWindow.setContent(
      "<div>" +
        "<p>" +
        location.city +
        ", " +
        location.state +
        " " +
        location.zip +
        "</p>" +
        '<p><a href="/locations/' +
        location.slug +
        '"><button class="button">Go To Location</button></a></p>' +
        "</div>"
    );
  }
}

function createMarker(x, y, i) {
  marker = new google.maps.Marker({
    map: gmap,
    //icon: markerImg,
    position: new google.maps.LatLng(x, y),
    title: locations[i].name,
  });
  marker._index = i;
  markers.push(marker);

  var state_marker_set = state_markers.find(
    (element) => element.state === locations[i].state
  );

  if (!state_marker_set) {
    state_markers.push({
      state: locations[i].state,
      markers: [marker],
    });
  } else {
    state_marker_set.markers.push(marker);
  }
}

//-----------MAPBOX SETUP CODE BELOW-----------

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!! REPLACE ACCESS TOKEN WITH YOURS HERE !!!
mapboxgl.accessToken =
  "pk.eyJ1Ijoibm9ydnZyIiwiYSI6ImNreXQ5N2M2ajFiaTQyc3BlbmNuMnc1aTIifQ.ysZ1NdFhK8VMQFfAvvDhog";
// !!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// create empty locations geojson object
let mapLocations = {
  type: "FeatureCollection",
  features: [],
};

let selectedMapLocations = [];

// Initialize map and load in #map wrapper
let map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/norvvr/ckyultx23000314qoa1uxwvg9",
  center: [-96, 38.5],
  zoom: 3.6,
});

// Adjust zoom of map for mobile and desktop
let mq = window.matchMedia("(min-width: 480px)");
if (mq.matches) {
  map.setZoom(3.6); //set map zoom level for desktop size
} else {
  map.setZoom(2.6); //set map zoom level for mobile size
}

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl());

// Get cms items
let listLocations = document.getElementById("location-list").childNodes;

async function getGeoData() {
  listLocations.forEach(async function (location) {
    let locationInfo = location.querySelector(".loc-pop").innerHTML;
    let city = location.querySelector("#city").value;
    let state = location.querySelector("#state ").value;
    let cityState = city + ", " + state;
    let coordObj = await geocodeAddress(cityState);
    let coordinates = [coordObj.lng(), coordObj.lat()];
    let locationID = location.querySelector("#locationID").value;
    let geoData = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: coordinates,
      },
      properties: {
        id: locationID,
        description: locationInfo,
      },
    };

    if (mapLocations.features.includes(geoData) === false) {
      mapLocations.features.push(geoData);
    }
    location.onclick = function () {
      map.flyTo({
        center: coordinates,
        speed: 0.5,
        curve: 1,
        easing(t) {
          return t;
        },
      });

      // Close the current popup if it exists
      if (currentPopup) {
        currentPopup.remove();
      }

      // Create a new popup and assign it to currentPopup
      currentPopup = new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(locationInfo)
        .addTo(map);
    };
  });
}
// Invoke function
getGeoData();

let currentPopup = null;

// Define mapping function to be invoked later
// Define mapping function to be invoked later
function addMapPoints() {
  /* Add the data to your map as a layer */
  map.addLayer({
    id: "locations",
    type: "circle",
    /* Add a GeoJSON source containing place coordinates and information. */
    source: {
      type: "geojson",
      data: mapLocations,
    },
    paint: {
      "circle-radius": 8,
      "circle-stroke-width": 1,
      "circle-color": "#FFC700",
      "circle-opacity": 1,
      "circle-stroke-color": "white",
    },
  });

  // When a click event occurs on a feature in the places layer, open a popup at the
  // location of the feature, with description HTML from its properties.
  map.on("click", "locations", (e) => {
    // Copy coordinates array.
    const coordinates = e.features[0].geometry.coordinates.slice();
    const description = e.features[0].properties.description;

    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    // Close the current popup if it exists
    if (currentPopup) {
      currentPopup.remove();
    }

    // Create a new popup and assign it to currentPopup
    currentPopup = new mapboxgl.Popup()
      .setLngLat(coordinates)
      .setHTML(description)
      .addTo(map);
  });

  // Center the map on the coordinates of any clicked circle from the 'locations' layer.
  map.on("click", "locations", (e) => {
    map.flyTo({
      center: e.features[0].geometry.coordinates,
      speed: 0.5,
      curve: 1,
      easing(t) {
        return t;
      },
    });
  });

  // Change the cursor to a pointer when the mouse is over the 'locations' layer.
  map.on("mouseenter", "locations", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  // Change it back to a pointer when it leaves.
  map.on("mouseleave", "locations", () => {
    map.getCanvas().style.cursor = "";
  });
}

function addClickEvents() {
  let locationContainers = document.querySelectorAll(".location-block");
  locationContainers.forEach(function (locationContainer) {
    locationContainer.onclick = async function () {
      let cityState = this.getAttribute("data-citystate");
      let coordObj = await geocodeAddress(cityState);
      let coordinates = [coordObj.lng(), coordObj.lat()];
      let htmlMarkup = this.getAttribute("data-html");

      map.flyTo({
        center: coordinates,
        speed: 0.5,
        curve: 1,
        easing(t) {
          return t;
        },
      });

      // Close the current popup if it exists
      if (currentPopup) {
        currentPopup.remove();
      }

      // Create a new popup and assign it to currentPopup
      currentPopup = new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(htmlMarkup)
        .addTo(map);
    };
  });
}

//When map is loaded initialize with data
map.on("load", function (e) {
  // Invoke function
  addMapPoints();
  addClickEvents();
});

$(document).ready(function () {
  var sortedStates = $(".state-container").sort(function (a, b) {
    return $(a)
      .find(".state-block")
      .text()
      .toUpperCase()
      .localeCompare($(b).find(".state-block").text().toUpperCase());
  });

  $("#states_container").empty().append(sortedStates);

  // New sorting logic for .location-block elements
  $(".state-container-locations").each(function () {
    var sortedLocations = $(this)
      .find(".location-block")
      .sort(function (a, b) {
        return $(a)
          .data("citystate")
          .toUpperCase()
          .localeCompare($(b).data("citystate").toUpperCase());
      });
    $(this).empty().append(sortedLocations);
  });
});
