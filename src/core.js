import {
  Viewer,
  Ion,
  Cartesian3,
  SampledPositionProperty,
  Color,
  ClockRange,
  JulianDate,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  LabelStyle,
  Cartesian2,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import * as satellite from "satellite.js";

Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmNzkzOGM1OS02YzlkLTQ5ZjEtYTM1Yi01YjdjNGFhNjBiNjAiLCJpZCI6Mjc2MjI5LCJpYXQiOjE3Mzk2MTk1NzB9.tuZe5TGfhDCXLkSS8rmZYIwP0d8eUEAKmVbQzWDokNw";

// Initialize Cesium Viewer
const viewer = new Viewer("wrapper", {
  timeline: true,
  animation: true,
  baseLayerPicker: true,
  geocoder: true,
  homeButton: false, // We'll create a custom one
  infoBox: false,
  sceneModePicker: true,
  navigationHelpButton: true,
  fullscreenButton: true,
  shouldAnimate: true,
});

// --- UTILS ---

// Format km with commas
function formatKm(meters) {
  return (meters / 1000).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " km";
}

// Calculate velocity magnitude in m/s
function velocityMagnitude(velocity) {
  return Math.sqrt(
    velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z
  );
}

// --- CREATE SATELLITE ORBIT FUNCTION ---
function createSatelliteOrbit(viewer, tleLine1, tleLine2, satelliteName = "Satellite") {
  // Parse TLE data with satellite.js
  const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
  if (!satrec) {
    throw new Error("Invalid TLE data");
  }

  // Calculate orbital period in seconds
  const orbitalPeriod = (24 * 60) / satrec.no; // revolutions per day
  const periodInSeconds = orbitalPeriod * 60;

  // Sample positions along the orbit
  const samplesNum = 120;
  const positions = [];

  // Set start and end time
  const startTime = JulianDate.fromDate(new Date());
  const endTime = JulianDate.addSeconds(startTime, periodInSeconds, new JulianDate());

  // Calculate positions for orbit path
  for (let i = 0; i <= samplesNum; i++) {
    const timeSinceStart = (i / samplesNum) * periodInSeconds;
    const date = new Date(JulianDate.toDate(startTime));
    date.setSeconds(date.getSeconds() + timeSinceStart);

    const posVel = satellite.propagate(satrec, date);
    if (!posVel.position) continue; // skip if no position

    const gmst = satellite.gstime(date);
    const ecfPos = satellite.eciToEcf(posVel.position, gmst);

    positions.push(
      new Cartesian3(ecfPos.x * 1000, ecfPos.y * 1000, ecfPos.z * 1000)
    );
  }

  // Add orbit polyline entity
  const orbitEntity = viewer.entities.add({
    name: `${satelliteName} Orbit Path`,
    polyline: {
      positions: positions,
      width: 2,
      material: Color.CYAN,
      arcType: Cesium.ArcType.NONE,
    },
  });

  // Add satellite point entity with sampled position
  const positionProperty = new SampledPositionProperty();
  const satelliteEntity = viewer.entities.add({
    name: satelliteName,
    position: positionProperty,
    point: {
      pixelSize: 14,
      color: Color.ORANGE,
      outlineColor: Color.BLACK,
      outlineWidth: 2,
    },
    label: {
      text: satelliteName,
      font: "bold 16px Arial",
      fillColor: Color.WHITE,
      style: LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cartesian2(0, -20),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  // Add position samples for animation
  for (let i = 0; i <= samplesNum; i++) {
    const time = JulianDate.addSeconds(
      startTime,
      (i / samplesNum) * periodInSeconds,
      new JulianDate()
    );

    const date = new Date(JulianDate.toDate(time));
    const posVel = satellite.propagate(satrec, date);
    if (!posVel.position) continue;

    const gmst = satellite.gstime(date);
    const ecfPos = satellite.eciToEcf(posVel.position, gmst);

    const cartesian = new Cartesian3(ecfPos.x * 1000, ecfPos.y * 1000, ecfPos.z * 1000);
    positionProperty.addSample(time, cartesian);
  }

  // Setup clock
  viewer.clock.startTime = startTime.clone();
  viewer.clock.stopTime = endTime.clone();
  viewer.clock.currentTime = startTime.clone();
  viewer.clock.clockRange = ClockRange.LOOP_STOP;
  viewer.clock.multiplier = 10; // speed up animation
  viewer.clock.shouldAnimate = true;

  // Initial camera fly to satellite orbit altitude
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(0, 0, 25000000),
    orientation: {
      heading: 0,
      pitch: -CesiumMath.PI_OVER_TWO,
      roll: 0,
    },
  });

  // Return satrec and satelliteEntity for further use
  return { satrec, satelliteEntity };
}

// --- UI Elements ---

// Create info panel container
const infoPanel = document.createElement("div");
infoPanel.style.position = "absolute";
infoPanel.style.top = "20px";
infoPanel.style.right = "20px";
infoPanel.style.width = "320px";
infoPanel.style.padding = "15px 20px";
infoPanel.style.backgroundColor = "rgba(20, 20, 30, 0.85)";
infoPanel.style.color = "#fff";
infoPanel.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
infoPanel.style.fontSize = "14px";
infoPanel.style.borderRadius = "8px";
infoPanel.style.boxShadow = "0 0 15px rgba(0,0,0,0.5)";
infoPanel.style.zIndex = "1000";
infoPanel.style.userSelect = "none";

// Toggle orbit visibility button
const toggleOrbitBtn = document.getElementById("toggleOrbitBtn");
const resetCameraBtn = document.getElementById("resetCameraBtn");

// --- MAIN ---

// ISS TLE example lines
const tle1 =
  "1 25544U 98067A   25046.92811457  .00015329  00000+0  27452-3 0  9996";
const tle2 =
  "2 25544  51.6387 187.6089 0004148 321.8517 184.3797 15.50154024496358";

const { satrec, satelliteEntity } = createSatelliteOrbit(viewer, tle1, tle2, "ISS");

// Control orbit path visibility
let orbitVisible = true;
toggleOrbitBtn.onclick = () => {
  orbitVisible = !orbitVisible;
  viewer.entities.values.forEach((entity) => {
    if (entity.polyline && entity.name.includes("Orbit Path")) {
      entity.show = orbitVisible;
    }
  });
  toggleOrbitBtn.textContent = orbitVisible ? "Hide Orbit Path" : "Show Orbit Path";
};

// Reset camera to initial position
resetCameraBtn.onclick = () => {
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(0, 0, 25000000),
    orientation: {
      heading: 0,
      pitch: -CesiumMath.PI_OVER_TWO,
      roll: 0,
    },
  });
};

// Update satellite info panel dynamically
const satNameElem = document.getElementById("sat-name");
const satAltElem = document.getElementById("sat-altitude");
const satVelElem = document.getElementById("sat-velocity");
const satNextPassElem = document.getElementById("sat-nextpass");

// Calculate next pass over a given location (example: equator, Greenwich)
function calculateNextPass(satrec, observerLat = 0, observerLon = 0) {
  const now = new Date();
  for (let i = 0; i < 1440; i++) {
    const date = new Date(now.getTime() + i * 60000);
    const positionAndVelocity = satellite.propagate(satrec, date);
    if (!positionAndVelocity.position) continue;
    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
    const lat = geodetic.latitude * (180 / Math.PI);
    const lon = geodetic.longitude * (180 / Math.PI);

    // Simple check: pass within 5 degrees of observer's location
    if (Math.abs(lat - observerLat) < 5 && Math.abs(lon - observerLon) < 5) {
      return date.toUTCString();
    }
  }
  return "No pass in next 24h";
}

// Setup mouse hover tooltip
const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
const tooltip = document.createElement("div");
tooltip.style.position = "absolute";
tooltip.style.padding = "5px 10px";
tooltip.style.background = "rgba(0, 0, 0, 0.7)";
tooltip.style.color = "#fff";
tooltip.style.borderRadius = "5px";
tooltip.style.pointerEvents = "none";
tooltip.style.display = "none";
tooltip.style.fontSize = "13px";
tooltip.style.fontFamily = "Segoe UI, Tahoma, Geneva, Verdana, sans-serif";
document.body.appendChild(tooltip);

handler.setInputAction((movement) => {
  const picked = viewer.scene.pick(movement.endPosition);
  if (picked && picked.id === satelliteEntity) {
    const position = satelliteEntity.position.getValue(viewer.clock.currentTime);
    if (position) {
      const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(position);
      const lon = CesiumMath.toDegrees(cartographic.longitude).toFixed(3);
      const lat = CesiumMath.toDegrees(cartographic.latitude).toFixed(3);
      const alt = (cartographic.height / 1000).toFixed(2);
      tooltip.style.left = movement.endPosition.x + 15 + "px";
      tooltip.style.top = movement.endPosition.y + 15 + "px";
      tooltip.style.display = "block";
      tooltip.innerHTML = `Lat: ${lat}°, Lon: ${lon}°, Alt: ${alt} km`;
    }
  } else {
    tooltip.style.display = "none";
  }
}, ScreenSpaceEventType.MOUSE_MOVE);

// Update satellite info in info panel every 500ms
setInterval(() => {
  satNameElem.textContent = "ISS";

  // Get current position and velocity
  const currentTime = JulianDate.toDate(viewer.clock.currentTime);
  const pv = satellite.propagate(satrec, currentTime);
  if (!pv.position || !pv.velocity) {
    satAltElem.textContent = "--";
    satVelElem.textContent = "--";
    satNextPassElem.textContent = "--";
    return;
  }

  const gmst = satellite.gstime(currentTime);

  // Convert ECI to geodetic coordinates
  const geo = satellite.eciToGeodetic(pv.position, gmst);
  const altitudeMeters = geo.height * 1000; // km to meters
  satAltElem.textContent = formatKm(altitudeMeters);

  // Velocity magnitude in m/s
  const vel = pv.velocity;
  satVelElem.textContent = `${velocityMagnitude(vel).toFixed(2)} m/s`;

  // Next pass over Greenwich (lat 0, lon 0)
  satNextPassElem.textContent = calculateNextPass(satrec, 0, 0);
}, 500);

// Optional: Show viewer clock timeline and animation controls (enabled in viewer constructor)

// Optional: Set viewer to fullscreen size
window.addEventListener("resize", () => {
  viewer.resize();
});

