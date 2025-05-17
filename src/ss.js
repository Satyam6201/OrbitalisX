// Initialize Spacekit Simulation
const viz = new Spacekit.Simulation(document.getElementById("main-container"), {
  basePath: "https://typpo.github.io/spacekit/src",
});

// Create stars background
viz.createStars();

// Create Sun and planets
viz.createObject("sun", Spacekit.SpaceObjectPresets.SUN);
["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"].forEach((planet) => {
  viz.createObject(planet, Spacekit.SpaceObjectPresets[planet.toUpperCase()]);
});

// Create Starman Roadster
const roadster = viz.createObject("starman", {
  labelText: "Starman in Roadster",
  ephem: new Spacekit.Ephem(
    {
      a: 1.324870564730606,
      e: 2.557785995665682e-1,
      i: 1.07755072280486,
      om: 3.170946964325638e2,
      w: 1.774865822248395e2,
      ma: 1.764302192487955e2,
      epoch: 2458426.5,
    },
    "deg"
  ),
});

// Create 2025 YR4 asteroid
const yr4 = viz.createObject("2025-yr4", {
  labelText: "2025 YR4",
  ephem: new Spacekit.Ephem(
    {
      epoch: 2460600.5, // 16 October 2024 (JD)
      a: 2.54000858,    // Semi-major axis (AU)
      e: 0.664269,      // Eccentricity
      i: 3.45326192,    // Inclination (deg)
      om: 271.41230059, // Longitude ascending node (deg)
      w: 134.64151115,  // Argument of perihelion (deg)
      ma: 351.07992528, // Mean anomaly (deg)
    },
    "deg"
  ),
});

// Show orbits for planets and space objects
["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "starman", "2025-yr4"].forEach((name) => {
  const obj = viz.getObject(name);
  if (obj) obj.showOrbit(true);
});

// Add Saturn's rings
const saturn = viz.getObject("saturn");
if (saturn) {
  saturn.addRing({
    innerRadius: 1.1,
    outerRadius: 2.5,
    textureUrl: "https://typpo.github.io/spacekit/src/textures/saturn-ring.png",
    opacity: 0.6,
  });
}

// Rotate Earth on its axis (24h period)
const earth = viz.getObject("earth");
if (earth) {
  earth.setRotation({ period: 24 * 3600, axis: [0, 0, 1] });
}

// Update labels with distance from Sun and velocity every 2 seconds
function updateLabels() {
  ["earth", "mars", "starman", "2025-yr4"].forEach((name) => {
    const obj = viz.getObject(name);
    if (obj) {
      const dist = obj.getDistanceToSun(); // in AU
      const vel = obj.getVelocityMagnitude(); // in km/s
      obj.setLabelText(`${name.toUpperCase()}\nDist: ${dist.toFixed(2)} AU\nVel: ${vel.toFixed(2)} km/s`);
    }
  });
}
setInterval(updateLabels, 2000);

// Display simulation date/time in bottom-left corner
const timeDiv = document.getElementById("simulation-time");

function updateTime() {
  const jd = viz.getTime();
  const date = Spacekit.JulianDateToDate(jd);
  timeDiv.innerText = `Simulation Date: ${date.toUTCString()}`;
}
setInterval(updateTime, 1000);

// Zoom and focus controls
window.zoomIn = function () {
  viz.camera.setZoom(viz.camera.getZoom() * 1.2);
};
window.zoomOut = function () {
  viz.camera.setZoom(viz.camera.getZoom() / 1.2);
};
window.focusPlanet = function (name) {
  const obj = viz.getObject(name);
  if (obj) {
    viz.camera.track(obj);
  }
};

// Simulation speed controls
window.setSpeed = function (multiplier) {
  viz.setTimeMultiplier(multiplier);
};

// Optional: Click on an object to alert its name and details
viz.on("objectClick", (obj) => {
  alert(`You clicked on ${obj.name}\nOrbit parameters:\n${JSON.stringify(obj.ephem, null, 2)}`);
});

// Create a tooltip div and add it to the body
const tooltip = document.createElement("div");
tooltip.style.position = "fixed";
tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
tooltip.style.color = "white";
tooltip.style.padding = "4px 8px";
tooltip.style.borderRadius = "4px";
tooltip.style.pointerEvents = "none";
tooltip.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
tooltip.style.fontSize = "13px";
tooltip.style.zIndex = 10000;
tooltip.style.display = "none";
document.body.appendChild(tooltip);

// Function to update tooltip position and content
function showTooltip(name, x, y) {
  tooltip.style.left = (x + 10) + "px";
  tooltip.style.top = (y + 10) + "px";
  tooltip.innerText = name;
  tooltip.style.display = "block";
}
function hideTooltip() {
  tooltip.style.display = "none";
}

// Raycast utility to get the object under mouse
function getObjectUnderPointer(event) {
  // Get mouse coordinates relative to canvas
  const rect = viz.renderer.domElement.getBoundingClientRect();
  let mouseX = 0, mouseY = 0;

  if (event.touches) {
    // Touch event (use first touch point)
    mouseX = event.touches[0].clientX;
    mouseY = event.touches[0].clientY;
  } else {
    // Mouse event
    mouseX = event.clientX;
    mouseY = event.clientY;
  }

  // Normalize to [-1, 1]
  const x = ((mouseX - rect.left) / rect.width) * 2 - 1;
  const y = - ((mouseY - rect.top) / rect.height) * 2 + 1;

  // Raycast with Spacekit
  const intersects = viz.raycastFromNormalizedCoords(x, y);

  if (intersects.length > 0) {
    // Return first intersected object with name
    for (const i of intersects) {
      if (i.object && i.object.name) {
        return i.object;
      }
    }
  }
  return null;
}

// Event listeners for mouse move and touch move
viz.renderer.domElement.addEventListener("mousemove", (event) => {
  const obj = getObjectUnderPointer(event);
  if (obj) {
    showTooltip(obj.name, event.clientX, event.clientY);
  } else {
    hideTooltip();
  }
});
viz.renderer.domElement.addEventListener("touchmove", (event) => {
  const obj = getObjectUnderPointer(event);
  if (obj) {
    showTooltip(obj.name, event.touches[0].clientX, event.touches[0].clientY);
  } else {
    hideTooltip();
  }
});

// Hide tooltip on mouse out or touch end
viz.renderer.domElement.addEventListener("mouseout", hideTooltip);
viz.renderer.domElement.addEventListener("touchend", hideTooltip);
