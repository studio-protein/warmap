const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyjPxTFyXWY7Tdk_dSYGoTs8DypMVvxY9WzYT_OTBQyC4o4vujx47y_NJejMBq3wTwriQ/exec";

const TILE_TYPES = {
  EMPTY: "",
  BEAR1: "BEAR 1",
  BEAR2: "BEAR 2",
  HQ: "Alliance HQ",
  BANNER: "Banner",
  CITY: "City"
};

const TILE_COLORS = {
  [TILE_TYPES.BEAR1]: "bg-gray-400",
  [TILE_TYPES.BEAR2]: "bg-gray-500",
  [TILE_TYPES.HQ]: "bg-yellow-400",
  [TILE_TYPES.BANNER]: "bg-blue-500"
};

const TILE_SIZES = {
  [TILE_TYPES.BEAR1]: 3,
  [TILE_TYPES.BEAR2]: 3,
  [TILE_TYPES.HQ]: 3,
  [TILE_TYPES.BANNER]: 1,
  [TILE_TYPES.CITY]: 2
};

let mapWidth = 20;
let mapHeight = 20;
let map = [];
let cityLabels = {};
let cityColors = {};
let selectedType = TILE_TYPES.CITY;
let selectedCityColor = "bg-green-300";
let zoom = 1;
let isPerspective = false;
let offset = { x: 0, y: 0 };
let dragging = false;
let dragStart = { x: 0, y: 0 };

const mapDiv = document.getElementById("map");
const colorPicker = document.getElementById("colorPicker");

function autoSave() {
  fetch(GOOGLE_SHEET_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "save",
      data: { map, cityLabels, cityColors, mapWidth, mapHeight }
    })
  });
}

function initMap() {
  fetch(`${GOOGLE_SHEET_URL}?action=load`)
    .then(res => res.json())
    .then(result => {
      map = result.map || Array.from({ length: mapHeight }, () => Array(mapWidth).fill(null));
      mapWidth = result.mapWidth || 20;
      mapHeight = result.mapHeight || 20;
      cityLabels = result.cityLabels || {};
      cityColors = result.cityColors || {};
      renderMap();
    })
    .catch(() => {
      map = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(null));
      renderMap();
    });
}

function renderMap() {
  mapDiv.innerHTML = "";
  mapDiv.style.gridTemplateColumns = `repeat(${mapWidth}, 40px)`;
  mapDiv.style.gridTemplateRows = `repeat(${mapHeight}, 40px)`;
  mapDiv.style.transform = isPerspective
    ? `perspective(800px) rotateX(45deg) rotateZ(45deg) scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`
    : `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`;

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const cell = map[y][x];
      const tile = document.createElement("div");
      const key = `${x}-${y}`;
      const color = cell === TILE_TYPES.CITY ? cityColors[key] : TILE_COLORS[cell] || "bg-empty";

      tile.className = `grid-tile ${color}`;
      tile.textContent =
        cell === TILE_TYPES.CITY ? (cityLabels[key] || "") : cell || "";

      tile.onclick = () => {
        if (cell) clearTile(x, y);
        else placeTile(x, y);
      };

      mapDiv.appendChild(tile);
    }
  }
}

function placeTile(x, y) {
  const size = TILE_SIZES[selectedType] || 1;
  if (checkOverlap(x, y, size)) return;

  const label = selectedType === TILE_TYPES.CITY ? prompt("City name:") : "";

  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      map[y + dy][x + dx] = selectedType;
      const key = `${x + dx}-${y + dy}`;
      if (selectedType === TILE_TYPES.CITY) {
        cityLabels[key] = label;
        cityColors[key] = selectedCityColor;
      }
    }
  }

  renderMap();
  autoSave();
}

function clearTile(x, y) {
  const type = map[y][x];
  const size = TILE_SIZES[type];
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const key = `${x + dx}-${y + dy}`;
      if (map[y + dy] && map[y + dy][x + dx] === type) {
        map[y + dy][x + dx] = null;
        delete cityLabels[key];
        delete cityColors[key];
      }
    }
  }
  renderMap();
  autoSave();
}

function checkOverlap(x, y, size) {
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      if (map[y + dy]?.[x + dx]) return true;
    }
  }
  return false;
}

document.getElementById("zoomIn").onclick = () => { zoom += 0.1; renderMap(); };
document.getElementById("zoomOut").onclick = () => { zoom = Math.max(0.2, zoom - 0.1); renderMap(); };
document.getElementById("toggleView").onclick = () => { isPerspective = !isPerspective; renderMap(); };
document.getElementById("exportImage").onclick = () => {
  html2canvas(mapDiv).then(canvas => {
    const link = document.createElement("a");
    link.download = "war-map.png";
    link.href = canvas.toDataURL();
    link.click();
  });
};

colorPicker.onchange = (e) => { selectedCityColor = e.target.value; };

Object.values(TILE_TYPES).forEach(type => {
  const btn = document.createElement("button");
  btn.textContent = type || "Eraser";
  btn.classList.add("tile-btn");
  btn.onclick = () => {
    selectedType = type;
    document.querySelectorAll(".tile-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  };
  if (type === selectedType) btn.classList.add("active");
  document.getElementById("controls").prepend(btn);
});

document.getElementById("map-wrapper").addEventListener("mousedown", (e) => {
  dragging = true;
  dragStart = { x: e.clientX - offset.x, y: e.clientY - offset.y };
});
document.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  offset = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
  renderMap();
});
document.addEventListener("mouseup", () => { dragging = false; });

document.getElementById("map-wrapper").addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) return;
  dragging = true;
  dragStart = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y };
});
document.addEventListener("touchmove", (e) => {
  if (!dragging || e.touches.length !== 1) return;
  offset = { x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y };
  renderMap();
});
document.addEventListener("touchend", () => { dragging = false; });

initMap();
