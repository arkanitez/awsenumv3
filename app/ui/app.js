
console.log("[ui] script loaded");

document.addEventListener("DOMContentLoaded", () => {
  console.log("[ui] DOMContentLoaded");

  const cy = cytoscape({
    container: document.getElementById("cy"),
    elements: [],
    layout: { name: "cose-bilkent" },
    wheelSensitivity: 0.2,
  });

  document.getElementById("enumerate").addEventListener("click", () => {
    console.log("[ui] Enumerate clicked");
    // Placeholder - add AJAX call here later
  });
});
