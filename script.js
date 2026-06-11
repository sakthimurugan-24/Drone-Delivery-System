let map;
let timer = null;
let running = false;
let tick = 0;
let speedMultiplier = 1;

let rewardChart;
let batteryChart;
let taskChart;

let startMarker = null;
let goalMarker = null;
let routeLine = null;

const droneColors = ["#5b58e7", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

const state = {
  wind: 0.30,
  rain: 0.10,
  traffic: 0.20,
  pending: 3,
  inFlight: 0,
  completed: 0,
  cancelled: 0,
  collisionsAvoided: 0,
  drones: [],
  startPlace: "",
  goalPlace: ""
};

function initMap() {
  map = L.map("map").setView([11.0168, 76.9558], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
}

function createCharts() {
  rewardChart = new Chart(document.getElementById("rewardChart"), {
    type: "line",
    data: {
      labels: [],
      datasets: []
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  batteryChart = new Chart(document.getElementById("batteryChart"), {
    type: "bar",
    data: {
      labels: [],
      datasets: [{
        label: "Battery",
        data: [],
        backgroundColor: []
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 100 }
      }
    }
  });

  taskChart = new Chart(document.getElementById("taskChart"), {
    type: "doughnut",
    data: {
      labels: ["Pending", "In-Flight", "Completed", "Cancelled"],
      datasets: [{
        data: [3, 0, 0, 0],
        backgroundColor: ["#f4c542", "#6aa7ff", "#39c782", "#f080a0"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

async function geocodePlace(placeName) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(placeName)}`;
  const response = await fetch(url, { headers: { "Accept": "application/json" } });

  if (!response.ok) throw new Error("Geocoding request failed");

  const data = await response.json();
  if (!data.length) throw new Error(`Place not found: ${placeName}`);

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    name: data[0].display_name
  };
}

function toggleInputMode() {
  const mode = document.getElementById("inputMode").value;
  document.getElementById("placeInputs").style.display = mode === "place" ? "block" : "none";
  document.getElementById("coordInputs").style.display = mode === "coords" ? "block" : "none";
}

function getMissionInput() {
  const mode = document.getElementById("inputMode").value;

  if (mode === "place") {
    return {
      mode: "place",
      startPlace: document.getElementById("startPlace").value.trim(),
      goalPlace: document.getElementById("goalPlace").value.trim()
    };
  }

  return {
    mode: "coords",
    startLat: parseFloat(document.getElementById("startLat").value),
    startLng: parseFloat(document.getElementById("startLng").value),
    goalLat: parseFloat(document.getElementById("goalLat").value),
    goalLng: parseFloat(document.getElementById("goalLng").value)
  };
}

function clearMapObjects() {
  if (startMarker) map.removeLayer(startMarker);
  if (goalMarker) map.removeLayer(goalMarker);
  if (routeLine) map.removeLayer(routeLine);

  state.drones.forEach(drone => {
    if (drone.marker) map.removeLayer(drone.marker);
  });

  startMarker = null;
  goalMarker = null;
  routeLine = null;
}

function generateOffsetPath(start, goal, droneIndex, totalDrones, steps = 60) {
  const path = [];
  const spread = 0.02;
  const offsetFactor = droneIndex - (totalDrones - 1) / 2;
  const latOffset = offsetFactor * spread * 0.15;
  const lngOffset = offsetFactor * spread;

  for (let i = 0; i <= steps; i++) {
    const lat = start.lat + ((goal.lat - start.lat) * i) / steps + latOffset * Math.sin((i / steps) * Math.PI);
    const lng = start.lng + ((goal.lng - start.lng) * i) / steps + lngOffset * Math.sin((i / steps) * Math.PI);
    path.push([lat, lng]);
  }

  return path;
}

function createDroneIcon(color, label) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:22px;
        height:22px;
        border-radius:50%;
        background:${color};
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.18);
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-size:10px;
        font-weight:700;
      ">${label}</div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

function buildLeaderboard() {
  const body = document.getElementById("leaderboardBody");
  body.innerHTML = "";

  [...state.drones]
    .sort((a, b) => b.reward - a.reward)
    .forEach((drone, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${drone.name}</td>
        <td>${drone.deliveries}</td>
        <td>${drone.reward}</td>
      `;
      body.appendChild(row);
    });
}

function resetStateValues() {
  const count = parseInt(document.getElementById("droneCount").value, 10);
  state.pending = count;
  state.inFlight = 0;
  state.completed = 0;
  state.cancelled = 0;
  state.collisionsAvoided = 0;
  state.drones = [];
}

async function buildMission() {
  const input = getMissionInput();
  let start;
  let goal;

  document.getElementById("statusText").textContent = "Preparing...";

  try {
    if (input.mode === "place") {
      if (!input.startPlace || !input.goalPlace) {
        alert("Please enter both start and destination places.");
        return false;
      }

      document.getElementById("statusText").textContent = "Geocoding...";
      start = await geocodePlace(input.startPlace);
      goal = await geocodePlace(input.goalPlace);
    } else {
      if (
        isNaN(input.startLat) || isNaN(input.startLng) ||
        isNaN(input.goalLat) || isNaN(input.goalLng)
      ) {
        alert("Please enter valid coordinates.");
        return false;
      }

      start = {
        lat: input.startLat,
        lng: input.startLng,
        name: `(${input.startLat.toFixed(4)}, ${input.startLng.toFixed(4)})`
      };

      goal = {
        lat: input.goalLat,
        lng: input.goalLng,
        name: `(${input.goalLat.toFixed(4)}, ${input.goalLng.toFixed(4)})`
      };
    }

    state.startPlace = start.name;
    state.goalPlace = goal.name;

    clearMapObjects();
    resetStateValues();

    const droneCount = parseInt(document.getElementById("droneCount").value, 10);

    startMarker = L.marker([start.lat, start.lng]).addTo(map).bindPopup(`Start: ${state.startPlace}`).openPopup();
    goalMarker = L.marker([goal.lat, goal.lng]).addTo(map).bindPopup(`Destination: ${state.goalPlace}`);
    routeLine = L.polyline([[start.lat, start.lng], [goal.lat, goal.lng]], {
      color: "#5b58e7",
      weight: 4,
      opacity: 0.65,
      dashArray: "8, 8"
    }).addTo(map);

    for (let i = 0; i < droneCount; i++) {
      const path = generateOffsetPath(start, goal, i, droneCount, 60);
      const marker = L.marker(path[0], {
        icon: createDroneIcon(droneColors[i % droneColors.length], i + 1)
      }).addTo(map);

      state.drones.push({
        id: i + 1,
        name: `D-${i + 1}`,
        color: droneColors[i % droneColors.length],
        marker,
        path,
        currentStep: 0,
        battery: 100,
        reward: 0,
        deliveries: 0,
        distance: 0,
        completed: false
      });
    }

    map.fitBounds(L.latLngBounds([[start.lat, start.lng], [goal.lat, goal.lng]]), { padding: [50, 50] });

    resetCharts();
    renderAll();
    updateCharts();
    document.getElementById("statusText").textContent = "Ready";
    return true;
  } catch (error) {
    alert(error.message);
    document.getElementById("statusText").textContent = "Reconnecting...";
    return false;
  }
}

function moveDrones() {
  if (!state.drones.length) return;

  let finishedCount = 0;
  tick++;
  document.getElementById("tickValue").textContent = tick;

  state.drones.forEach((drone, index) => {
    if (drone.completed) {
      finishedCount++;
      return;
    }

    if (drone.currentStep >= drone.path.length) {
      drone.completed = true;
      drone.deliveries = 1;
      drone.reward = 100;
      finishedCount++;
      return;
    }

    const point = drone.path[drone.currentStep];
    drone.marker.setLatLng(point);
    drone.currentStep++;
    drone.distance = drone.currentStep;

    const drain = 0.5 + state.wind * 0.4 + state.rain * 0.2 + state.traffic * 0.3 + index * 0.05;
    drone.battery = Math.max(0, drone.battery - drain);

    if ((tick + index) % 7 === 0) {
      state.collisionsAvoided += 1;
    }

    drone.reward = Math.max(0, Math.round(drone.battery + drone.deliveries * 20));
  });

  state.inFlight = state.drones.filter(d => !d.completed).length;
  state.completed = state.drones.filter(d => d.completed).length;
  state.pending = 0;

  if (state.completed === state.drones.length) {
    clearInterval(timer);
    timer = null;
    running = false;
    document.getElementById("statusText").textContent = "Completed";
  } else {
    document.getElementById("statusText").textContent = "Live";
  }

  renderAll();
  updateCharts();
}

function renderAll() {
  document.getElementById("pendingCount").textContent = state.pending;
  document.getElementById("inFlightCount").textContent = state.inFlight;
  document.getElementById("completedCount").textContent = state.completed;
  document.getElementById("cancelledCount").textContent = state.cancelled;

  const totalDistance = state.drones.reduce((sum, d) => sum + d.distance, 0);
  const avgBattery = state.drones.length
    ? Math.round(state.drones.reduce((sum, d) => sum + d.battery, 0) / state.drones.length)
    : 100;
  const totalDeliveries = state.drones.reduce((sum, d) => sum + d.deliveries, 0);

  document.getElementById("totalDistance").textContent = totalDistance;
  document.getElementById("avgBattery").textContent = `${avgBattery}%`;
  document.getElementById("collisionsAvoided").textContent = state.collisionsAvoided;
  document.getElementById("deliveriesDone").textContent = totalDeliveries;

  buildLeaderboard();
}

function resetCharts() {
  rewardChart.data.labels = [];
  rewardChart.data.datasets = state.drones.map(drone => ({
    label: drone.name,
    data: [],
    borderColor: drone.color,
    backgroundColor: drone.color + "22",
    tension: 0.35,
    fill: false
  }));
  rewardChart.update();

  batteryChart.data.labels = state.drones.map(d => d.name);
  batteryChart.data.datasets[0].data = state.drones.map(d => d.battery);
  batteryChart.data.datasets[0].backgroundColor = state.drones.map(d => d.color);
  batteryChart.update();

  taskChart.data.datasets[0].data = [state.pending, state.inFlight, state.completed, state.cancelled];
  taskChart.update();
}

function updateCharts() {
  rewardChart.data.labels.push(`T${tick}`);

  if (rewardChart.data.labels.length > 15) {
    rewardChart.data.labels.shift();
    rewardChart.data.datasets.forEach(ds => ds.data.shift());
  }

  state.drones.forEach((drone, index) => {
    rewardChart.data.datasets[index].data.push(drone.reward);
  });

  batteryChart.data.labels = state.drones.map(d => d.name);
  batteryChart.data.datasets[0].data = state.drones.map(d => Math.round(d.battery));

  taskChart.data.datasets[0].data = [state.pending, state.inFlight, state.completed, state.cancelled];

  rewardChart.update();
  batteryChart.update();
  taskChart.update();
}

async function startSimulation() {
  if (running) return;

  if (!state.drones.length) {
    const ok = await buildMission();
    if (!ok) return;
  }

  running = true;
  document.getElementById("statusText").textContent = "Live";

  const interval = Math.max(120, 1000 / speedMultiplier);
  timer = setInterval(moveDrones, interval);
}

function pauseSimulation() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  running = false;
  document.getElementById("statusText").textContent = "Paused";
}

async function resetSimulation() {
  pauseSimulation();
  tick = 0;
  document.getElementById("tickValue").textContent = "0";
  clearMapObjects();
  resetStateValues();
  renderAll();
  resetCharts();
  await buildMission();
}

function bindEvents() {
  document.getElementById("startBtn").addEventListener("click", startSimulation);
  document.getElementById("pauseBtn").addEventListener("click", pauseSimulation);
  document.getElementById("resetBtn").addEventListener("click", resetSimulation);
  document.getElementById("inputMode").addEventListener("change", toggleInputMode);

  document.getElementById("applyEnvBtn").addEventListener("click", () => {
    state.wind = parseFloat(document.getElementById("windSlider").value);
    state.rain = parseFloat(document.getElementById("rainSlider").value);
    state.traffic = parseFloat(document.getElementById("trafficSlider").value);
    document.getElementById("statusText").textContent = "Environment Applied";
  });

  document.getElementById("windSlider").addEventListener("input", e => {
    document.getElementById("windValue").textContent = Number(e.target.value).toFixed(2);
  });

  document.getElementById("rainSlider").addEventListener("input", e => {
    document.getElementById("rainValue").textContent = Number(e.target.value).toFixed(2);
  });

  document.getElementById("trafficSlider").addEventListener("input", e => {
    document.getElementById("trafficValue").textContent = Number(e.target.value).toFixed(2);
  });

  document.getElementById("droneCount").addEventListener("input", e => {
    document.getElementById("droneCountValue").textContent = e.target.value;
    state.drones = [];
  });

  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      speedMultiplier = parseInt(btn.dataset.speed, 10);

      if (running) {
        clearInterval(timer);
        timer = setInterval(moveDrones, Math.max(120, 1000 / speedMultiplier));
      }
    });
  });
}

window.addEventListener("load", async () => {
  initMap();
  createCharts();
  bindEvents();
  toggleInputMode();
  document.getElementById("droneCountValue").textContent = document.getElementById("droneCount").value;
  await buildMission();
});