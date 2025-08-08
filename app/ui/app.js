// Module scope (no accidental globals)
console.log('[ui] script loaded');

// Show runtime errors instead of silently dying
window.addEventListener('error', e => {
  console.error('[ui] window error:', e.error || e.message || e);
  const w = document.getElementById('warnings');
  if (w) {
    const a = document.createElement('sl-alert'); a.variant='warning'; a.closable=true;
    a.innerHTML = `<sl-icon name="exclamation-triangle" slot="icon"></sl-icon>${String(e.error || e.message || e)}`;
    w.appendChild(a);
    const det = [...document.querySelectorAll('sl-details')].find(d => d.getAttribute('summary') === 'Warnings');
    if (det) det.setAttribute('open', '');
  }
});
window.addEventListener('unhandledrejection', e => {
  console.error('[ui] unhandledrejection:', e.reason);
  const w = document.getElementById('warnings');
  if (w) {
    const a = document.createElement('sl-alert'); a.variant='warning'; a.closable=true;
    a.innerHTML = `<sl-icon name="exclamation-triangle" slot="icon"></sl-icon>${String(e.reason)}`;
    w.appendChild(a);
    const det = [...document.querySelectorAll('sl-details')].find(d => d.getAttribute('summary') === 'Warnings');
    if (det) det.setAttribute('open', '');
  }
});

let cy;

function registerCytoscapePlugins() {
  // Defensive registration: handle both UMD globals and pre-registered plugins
  try {
    if (window.cytoscapeCoseBilkent) {
      cytoscape.use(window.cytoscapeCoseBilkent);
      console.log('[ui] cose-bilkent registered via UMD');
    }
  } catch (e) { console.warn('[ui] cose-bilkent registration failed', e); }

  try {
    if (window.cytoscapeMinimap) {
      cytoscape.use(window.cytoscapeMinimap);
      console.log('[ui] minimap registered via UMD');
    }
  } catch (e) { console.warn('[ui] minimap registration failed', e); }

  try {
    if (window.cytoscapeSvg) {
      cytoscape.use(window.cytoscapeSvg);
      console.log('[ui] svg export registered via UMD');
    }
  } catch (e) { console.warn('[ui] svg export registration failed', e); }
}

const NODE_STYLES = [
  { sel: 'node', style: { 'label': 'data(label)', 'font-size': 11, 'text-wrap': 'wrap', 'text-max-width': 160, 'background-color': '#0ea5e9', 'shape': 'round-rectangle', 'border-width': 1, 'border-color': '#0c4a6e', 'color':'#0b1220' } },
  { sel: 'node[type = "vpc"]', style: { 'background-opacity': 0.08, 'background-color': '#16a34a', 'border-color': '#14532d', 'shape': 'round-rectangle' } },
  { sel: 'node[type = "subnet"]', style: { 'background-color': '#22c55e' } },
  { sel: 'node[type = "security_group"]', style: { 'background-color': '#a855f7', 'shape': 'hexagon' } },
  { sel: 'node[type = "route_table"]', style: { 'background-color': '#15803d' } },
  { sel: 'node[type = "igw"]', style: { 'shape': 'triangle', 'background-color': '#ef4444' } },
  { sel: 'node[type = "nat_gateway"]', style: { 'shape': 'triangle', 'background-color': '#f59e0b' } },
  { sel: 'node[type = "eni"]', style: { 'background-color': '#64748b' } },
  { sel: 'node[type = "instance"]', style: { 'background-color': '#10b981' } },
  { sel: 'node[type = "load_balancer"]', style: { 'background-color': '#60a5fa' } },
  { sel: 'node[type = "target_group"]', style: { 'background-color': '#6366f1' } },
  { sel: 'node[type = "lambda"]', style: { 'background-color': '#fb7185', 'shape':'diamond' } },
  { sel: 'node[type = "api_gw_v2"]', style: { 'background-color': '#f97316' } },
  { sel: 'node[type = "s3_bucket"]', style: { 'background-color': '#84cc16' } },
  { sel: 'node[type = "sns_topic"]', style: { 'background-color': '#14b8a6' } },
  { sel: 'node[type = "sqs_queue"]', style: { 'background-color': '#06b6d4' } },
  { sel: 'node[type = "dynamodb_table"]', style: { 'background-color': '#6366f1' } },
  { sel: 'node[type = "rds_instance"]', style: { 'background-color': '#1d4ed8' } },
  { sel: 'node[type = "eks_cluster"]', style: { 'background-color': '#fca5a5' } },
  { sel: 'node[type = "ecs_cluster"], node[type = "ecs_service"]', style: { 'background-color': '#ef43ba' } },
  { sel: 'node[type = "cidr"], node[type = "external"]', style: { 'background-color': '#e5e7eb', 'shape': 'ellipse' } },
  { sel: 'node:selected', style: { 'border-color': '#111827', 'border-width': 3 } },
];

const EDGE_STYLES = [
  { sel: 'edge', style: { 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', 'arrow-scale': 0.9, 'width': 2, 'label': 'data(label)', 'font-size': 9, 'color':'#0b1220' } },
  { sel: 'edge[category = "resource"]', style: { 'line-color': '#2563eb', 'target-arrow-color': '#2563eb' } },
  { sel: 'edge[category = "network"]', style: { 'line-color': '#f97316', 'target-arrow-color': '#f97316' } },
  { sel: 'edge[category = "data"]', style: { 'line-color': '#0ea5e9', 'target-arrow-color': '#0ea5e9', 'line-style': 'dotted' } },
  { sel: 'edge[derived = "true"]', style: { 'line-style': 'dashed' } },
  { sel: 'edge[type = "attach"], edge[type = "assoc"]', style: { 'opacity': 0.45 } },
  { sel: 'edge:selected', style: { 'width': 3 } },
];

function initCySafe() {
  console.log('[ui] initCy');
  if (!window.cytoscape) throw new Error('Cytoscape failed to load. Check network or CSP.');
  const container = document.getElementById('cy');
  if (!container) throw new Error('#cy container not found');

  // Make sure plugins are registered even if CDN didn’t auto-register
  registerCytoscapePlugins();

  cy = cytoscape({
    container,
    elements: [],
    // Keep zoom natural to silence Cytoscape warning; we can tune later
    // wheelSensitivity: 0.05,
    minZoom: 0.25,
    maxZoom: 2.5,
    pixelRatio: 1,
    boxSelectionEnabled: false,
    style: [
      ...NODE_STYLES.map(s => ({ selector: s.sel, style: s.style })),
      ...EDGE_STYLES.map(s => ({ selector: s.sel, style: s.style })),
    ],
    layout: { name: 'cose-bilkent', quality: 'default', animate: false, nodeRepulsion: 80000, idealEdgeLength: 220, gravity: 0.25, numIter: 1200, tile: true },
  });

  // Minimap is optional — never let it crash the app
  try {
    if (typeof cy.minimap === 'function') {
      cy.minimap({});
    } else {
      console.warn('[ui] minimap plugin missing — continuing');
    }
  } catch (e) {
    console.warn('[ui] minimap init failed — continuing', e);
  }

  cy.on('select', 'node,edge', (e) => {
    const d = e.target.data();
    document.getElementById('details').innerHTML = '<pre>' + JSON.stringify(d, null, 2) + '</pre>';
  });
  cy.on('unselect', () => {
    document.getElementById('details').innerHTML = '<div class="muted">Select a node or edge.</div>';
  });
}

function legend(){
  const items = [
    ['Resource edges', '#2563eb'],
    ['Network edges', '#f97316'],
    ['Data/invoke edges', '#0ea5e9 (dotted)'],
    ['Derived', 'dashed'],
    ['VPC','var(--sl-color-success-300)'],
    ['Subnet','#22c55e'],['EC2','#10b981'],['SG','#a855f7'],['RTB','#15803d'],
    ['IGW','#ef4444'],['NAT','#f59e0b'],['ENI','#64748b'],
    ['LB','#60a5fa'],['TG','#6366f1'],['Lambda','#fb7185'],['API GW','#f97316'],
    ['S3','#84cc16'],['SNS','#14b8a6'],['SQS','#06b6d4'],['DynamoDB','#6366f1'],
    ['RDS','#1d4ed8'],['EKS','#fca5a5'],['ECS','#ef43ba']
  ];
  const el = document.getElementById('legend'); el.innerHTML = '';
  for (const [name, color] of items){
    const row = document.createElement('div'); row.className = 'legend-row';
    const sw = document.createElement('span'); sw.className = 'swatch';
    if (color === 'dashed'){ sw.style.border = '1px dashed var(--sl-color-neutral-600)'; sw.style.background='transparent'; }
    else { sw.style.background = color.split(' ')[0]; }
    row.appendChild(sw); row.appendChild(document.createTextNode(name)); el.appendChild(row);
  }
}

function renderWarnings(list){
  const el = document.getElementById('warnings'); el.innerHTML = '';
  (list||[]).forEach(w => {
    const a = document.createElement('sl-alert'); a.variant='warning'; a.closable=true;
    a.innerHTML = `<sl-icon name="exclamation-triangle" slot="icon"></sl-icon>${w}`;
    el.appendChild(a);
  });
  if ((list||[]).length) {
    const det = [...document.querySelectorAll('sl-details')].find(d => d.getAttribute('summary') === 'Warnings');
    if (det) det.setAttribute('open', '');
  }
}

function renderFindings(list){
  const el = document.getElementById('findings'); el.innerHTML = '';
  (list||[]).forEach(f => {
    const a = document.createElement('sl-alert'); a.variant = (f.severity||'info').toLowerCase(); a.closable=true;
    a.innerHTML = `<sl-icon name="info-circle" slot="icon"></sl-icon>[${f.severity}] ${f.title}${f.detail?': '+f.detail:''}`;
    el.appendChild(a);
  });
}

async function handleEnumerateClick(){
  console.log('[ui] Enumerate clicked');
  const ak = (document.getElementById('ak')?.value || '').trim();
  const sk = (document.getElementById('sk')?.value || '').trim();
  const btn = document.getElementById('btn-enumerate');

  if (!ak || !sk) { renderWarnings(['Please provide both Access Key ID and Secret Access Key.']); return; }

  btn.loading = true; // Shoelace boolean property

  try {
    const res = await fetch('/enumerate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ access_key_id: ak, secret_access_key: sk })
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) { renderWarnings([data?.error || `Request failed with ${res.status}`]); return; }

    cy?.elements().remove();
    cy?.add(data.elements || []);
    cy?.layout({ name:'cose-bilkent', quality:'default', animate:false, nodeRepulsion:80000, idealEdgeLength:220, gravity:0.25, numIter:1200, tile:true }).run();
    cy?.fit(null, 60);
    renderFindings(data.findings || []); renderWarnings(data.warnings || []);
  } catch (e) {
    renderWarnings([String(e)]);
  } finally {
    btn.loading = false;
  }
}

function bindUI(){
  console.log('[ui] bindUI');
  const btn = document.getElementById('btn-enumerate');
  if (!btn) { console.error('[ui] enumerate button not found'); return; }

  // Ensure Shoelace elements are upgraded before binding
  Promise.all([ customElements.whenDefined('sl-button'), customElements.whenDefined('sl-input') ])
    .then(() => {
      console.log('[ui] custom elements ready; binding click handlers');
      btn.addEventListener('click', handleEnumerateClick);
      btn.addEventListener('sl-click', handleEnumerateClick);
      // Enter key submits (AK/SK)
      ['ak','sk'].forEach(id => document.getElementById(id).addEventListener('keydown', e => { if (e.key==='Enter') handleEnumerateClick(); }));
    })
    .catch(err => {
      console.error('[ui] custom element upgrade failed', err);
      btn.addEventListener('click', handleEnumerateClick);
    });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('[ui] DOMContentLoaded');
  // Bind UI first so clicks always work even if graph init fails
  bindUI();
  // Then init the graph (safe)
  try { initCySafe(); } catch (e) { console.error('[ui] initCy failed', e); renderWarnings([String(e)]); }
  legend();
});
