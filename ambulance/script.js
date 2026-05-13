// ---------------- MAP (HYDERABAD) ----------------
const map = L.map('map').setView([17.385, 78.4867], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// ---------------- MESSAGE HANDLER ----------------   
let messageTimeout = null;

function showMessage(text, duration = 2000) {
  const box = document.getElementById("messageBox");
  box.innerText = text;
  box.style.display = "block";
  if (messageTimeout) clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => box.style.display = "none", duration);
}

// ---------------- BIG AMBULANCE EMOJI ----------------
function ambulanceIcon() {
  return L.divIcon({
    html: "<div style='font-size:44px'>🚑</div>",
    iconSize: [44, 44],
    className: ""
  });
}

// ---------------- TRAFFIC LIGHT ICON ----------------
function trafficLightIcon() {
  return L.divIcon({
    html: "<div style='font-size:40px'>🚦</div>",
    iconSize: [40, 40],
    className: ""
  });
}

// ---------------- STATE ----------------
let selecting = null;
let clicks = 0;
let intersectionPoint = null;
let signalMarker = null;
let bReleased = false;

const ambulanceA = { start: null, end: null, route: [], marker: null, line: null, timer: null };
const ambulanceB = { start: null, end: null, route: [], marker: null, line: null, timer: null };

// ---------------- SELECTION ----------------
function selectAmbulance(type) {
  selecting = type;
  clicks = 0;
  showMessage(`Select START and DESTINATION for Ambulance ${type}`);
}

map.on('click', e => {
  if (!selecting) return;
  clicks++;
  const amb = selecting === 'A' ? ambulanceA : ambulanceB;

  if (clicks === 1) {
    amb.start = e.latlng;
    L.marker(e.latlng).addTo(map).bindPopup("Start").openPopup();
    amb.marker = L.marker(e.latlng, { icon: ambulanceIcon() }).addTo(map);
  } else {
    amb.end = e.latlng;
    L.marker(e.latlng).addTo(map).bindPopup("Destination").openPopup();
    selecting = null;
    showMessage("Selection complete");
  }
});

// ---------------- ROUTING HELPERS ----------------
async function fetchRoute(start, end) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();
  return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
}

// ---------------- HEURISTIC COST MODEL ----------------
function computeRouteCost(route) {
  const distance = route.length;
  const estimatedTime = route.length * 0.09; // proxy ETA
  const complexity = route.length;

  return (
    0.6 * distance +
    0.3 * estimatedTime +
    0.1 * complexity
  );
}

// ---------------- INTERSECTION DETECTION ----------------
function findIntersectionPoint(r1, r2) {
  for (let p1 of r1) {
    for (let p2 of r2) {
      const d =
        Math.abs(p1[0] - p2[0]) +
        Math.abs(p1[1] - p2[1]);
      if (d < 0.0006) return p1;
    }
  }
  return null;
}

// ---------------- RUN SIMULATION ----------------
async function runSimulation() {
  if (!ambulanceA.start || !ambulanceA.end || !ambulanceB.start || !ambulanceB.end) {
    alert("Please select all points");
    return;
  }

  showMessage("Calculating real road routes...");

  ambulanceA.route = await fetchRoute(ambulanceA.start, ambulanceA.end);
  ambulanceB.route = await fetchRoute(ambulanceB.start, ambulanceB.end);

  ambulanceA.line = L.polyline(ambulanceA.route, { color: '#4285F4', weight: 5 }).addTo(map);
  ambulanceB.line = L.polyline(ambulanceB.route, { color: '#EA4335', weight: 5 }).addTo(map);

  const pA = document.getElementById("priorityA").value;
  const pB = document.getElementById("priorityB").value;

  intersectionPoint = findIntersectionPoint(ambulanceA.route, ambulanceB.route);

  // -------- CASE 1: BOTH PRIORITY 1 (OPTIMAL REROUTING) --------
  if (pA === "1" && pB === "1" && intersectionPoint) {
    showMessage("Both ambulances Priority 1 — evaluating optimal reroute");

    const offsets = [
      [0.01, 0],
      [-0.01, 0],
      [0, 0.01],
      [0, -0.01],
      [0.008, -0.008]
    ];

    let bestRoute = null;
    let bestCost = Infinity;

    for (let off of offsets) {
      try {
        const via = L.latLng(
          ambulanceB.start.lat + off[0],
          ambulanceB.start.lng + off[1]
        );

        const r1 = await fetchRoute(ambulanceB.start, via);
        const r2 = await fetchRoute(via, ambulanceB.end);
        const fullRoute = r1.concat(r2);

        const cost = computeRouteCost(fullRoute);
        if (cost < bestCost) {
          bestCost = cost;
          bestRoute = fullRoute;
        }
      } catch (e) {
        console.warn("Invalid detour skipped");
      }
    }

    if (bestRoute) {
      map.removeLayer(ambulanceB.line);

      ambulanceB.route = bestRoute;
      ambulanceB.line = L.polyline(ambulanceB.route, {
        color: '#8E24AA',
        dashArray: '6,6',
        weight: 5
      }).addTo(map);

      showMessage("Optimal conflict-free route selected for Ambulance B");
    }

    animateAmbulances();
    return;
  }

  // -------- CASE 2: A HIGH PRIORITY, B LOWER --------
  if (pA === "1" && pB !== "1" && intersectionPoint) {
    showMessage("Ambulance A higher priority — activating green corridor");

    signalMarker = L.marker(intersectionPoint, {
      icon: trafficLightIcon()
    }).addTo(map);

    moveAmbulanceAControlled();
    moveAmbulanceBControlled();
    return;
  }

  // -------- DEFAULT --------
  animateAmbulances();
}

// ---------------- CONTROLLED MOVEMENT ----------------
function moveAmbulanceAControlled() {
  let i = 0;
  ambulanceA.timer = setInterval(() => {
    if (i >= ambulanceA.route.length) {
      clearInterval(ambulanceA.timer);
      return;
    }

    const p = ambulanceA.route[i];
    ambulanceA.marker.setLatLng(p);

    if (
      !bReleased &&
      Math.abs(p[0] - intersectionPoint[0]) +
      Math.abs(p[1] - intersectionPoint[1]) < 0.0006
    ) {
      bReleased = true;
      showMessage("Ambulance A cleared intersection — releasing Ambulance B");
    }

    i++;
  }, 90);
}

function moveAmbulanceBControlled() {
  let i = 0;
  ambulanceB.timer = setInterval(() => {
    if (i >= ambulanceB.route.length) {
      clearInterval(ambulanceB.timer);
      return;
    }

    const p = ambulanceB.route[i];

    if (
      !bReleased &&
      Math.abs(p[0] - intersectionPoint[0]) +
        Math.abs(p[1] - intersectionPoint[1]) < 0.0006
    ) {
      clearInterval(ambulanceB.timer);
      ambulanceB._pausedIndex = i;
      showMessage("Ambulance B halted at intersection");
      return;
    }

    ambulanceB.marker.setLatLng(p);
    i++;
  }, 90);
}

// ---------------- DEFAULT ANIMATION ----------------
function animateAmbulances() {
  moveAmbulanceSimple(ambulanceA);
  moveAmbulanceSimple(ambulanceB);
}

function moveAmbulanceSimple(amb) {
  let i = 0;
  amb.timer = setInterval(() => {
    if (i >= amb.route.length) {
      clearInterval(amb.timer);
      return;
    }
    amb.marker.setLatLng(amb.route[i]);
    i++;
  }, 90);
}

// ---------------- RESET ----------------
function resetSimulation() {
  location.reload();
}
