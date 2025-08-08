console.log("[ui] script loaded");

cytoscape.use(window.cytoscapeCoseBilkent);
cytoscape.use(window.cytoscapeMinimap);
cytoscape.use(window.cytoscapeSvg);

document.addEventListener("DOMContentLoaded", () => {
  console.log("[ui] DOMContentLoaded");
  bindUI();
});

function bindUI() {
  console.log("[ui] bindUI");

  const cy = initCy();

  document.getElementById("enumerate").addEventListener("click", async () => {
    console.log("[ui] Enumerate clicked");
    const ak = document.getElementById("ak").value.trim();
    const sk = document.getElementById("sk").value.trim();
    const btn = document.getElementById("enumerate");
    btn.loading = true;

    if (!ak || !sk) {
      warn("Both access key and secret key are required.");
      btn.loading = false;
      return;
    }

    try {
      const res = await fetch("/enumerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_key: ak, secret_key: sk }),
      });

      console.log("[ui] response.status", res.status);
      const data = await res.json().catch(err => {
        warn("Failed to parse JSON: " + err);
        return null;
      });

      if (!data) {
        warn("Empty or invalid response from backend.");
        return;
      }

      console.log("[ui] data received", data);

      // Build graph
      if (data.nodes?.length && data.edges?.length) {
        cy.elements().remove();
        cy.add(data.nodes.concat(data.edges));
        cy.layout({ name: "cose-bilkent", animate: true }).run();
      } else {
        warn("No resources found.");
      }

    } catch (err) {
      warn("Enumerate failed: " + err);
    } finally {
      btn.loading = false;
    }
  });
}

function warn(msg) {
  const w = document.getElementById("warnings");
  w.innerHTML += `<div>⚠️ ${msg}</div>`;
}

function initCy() {
  console.log("[ui] initCy");

  const cy = cytoscape({
    container: document.getElementById("cy"),
    elements: [],
    style: [
      {
        selector: "node",
        style: {
          "label": "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "background-color": "#4A90E2",
          "color": "white",
          "font-size": 10,
          "width": 40,
          "height": 40,
          "shape": "ellipse"
        }
      },
      {
        selector: "edge",
        style: {
          "width": 2,
          "line-color": "#ccc",
          "target-arrow-color": "#ccc",
          "target-arrow-shape": "triangle"
        }
      }
    ],
    layout: { name: "cose-bilkent" },
    wheelSensitivity: 0.2
  });

  cy.on("select", "node, edge", (e) => {
    const data = e.target.data();
    document.getElementById("details").innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  });

  const minimap = cy.minimap({ /* optional config */ });
  minimap.render();

  return cy;
}
