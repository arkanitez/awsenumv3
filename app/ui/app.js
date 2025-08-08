let cy;

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

function initCy() {
  cy = cytoscape({
    container: document.getElementById('cy'),
    elements: [],
    wheelSensitivity: 0.02,
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
  cy.minimap({});
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

function openWarnings() {
  // auto-open the warnings details so errors are visible
  const details = document.querySelector('sl-details[summary="Warnings"]') || document.querySelector('#panel sl-details:nth-of-type(3)');
  if (details) details.setAttribute('open', '');
}

function renderWarnings(list){
  const el = document.getElementById('warnings'); el.innerHTML = '';
  (list||[]).forEach(w => {
    const a = document.createElement('sl-alert'); a.variant='warning'; a.closable=true;
    a.innerHTML = `<sl-icon name="exclamation-triangle" slot="icon"></sl-icon>${w}`;
    el.appendChild(a);
  });
  if ((list||[]).length) openWarnings();
}

function renderFindings(list){
  const el = document.getElementById('findings'); el.innerHTML = '';
  (list||[]).forEach(f => {
    const a = document.createElement('sl-alert'); a.variant = (f.severity||'info').toLowerCase(); a.closable=true;
    a.innerHTML = `<sl-icon name="info-circle" slot="icon"></sl-icon>[${f.severity}] ${f.title}${f.detail?': '+f.detail:''}`;
    el.appendChild(a);
  });
}

async function enumerate(){
  console.log('[ui] Enumerate clicked');
  const akEl = document.getElementById('ak');
  const skEl = document.getElementById('sk');
  const btn = document.getElementById('enumerate');

  const ak = (akEl?.value || '').trim();
  const sk = (skEl?.value || '').trim();

  if (!ak || !sk) {
    renderWarnings(['Please provide both Access Key ID and Secret Access Key.']);
    return;
  }

  // Turn on loading safely regardless of upgrade timing
  try { btn.setAttribute('loading', ''); } catch {}

  try {
    const res = await fetch('/enumerate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ access_key_id: ak, secret_access_key: sk })
    });

    let data;
    try { data = await res.json(); } catch { data = null; }

    if (!res.ok) {
      const msg = data?.error || `Request failed with ${res.status}`;
      console.error('[ui] enumerate error:', msg, data);
      renderWarnings([msg]);
      return;
    }

    console.log('[ui] enumerate ok. elements:', data?.elements?.length || 0);
    cy.elements().remove();
    cy.add(data.elements || []);
    cy.layout({
      name: 'cose-bilkent',
      quality: 'default',
      animate: false,
      nodeRepulsion: 80000,
      idealEdgeLength: 220,
      gravity: 0.25,
      numIter: 1200,
      tile: true
    }).run();
    cy.fit(null, 60);
    renderFindings(data.findings || []);
    renderWarnings(data.warnings || []);
  } catch (e){
    console.error('[ui] enumerate exception:', e);
    renderWarnings([String(e)]);
  } finally {
    try { btn.removeAttribute('loading'); } catch {}
  }
}

function bindUI(){
  const btn = document.getElementById('enumerate');
  // Make sure custom elements are defined before attaching listeners (defensive)
  Promise.all([
    customElements.whenDefined('sl-button'),
    customElements.whenDefined('sl-input')
  ]).then(() => {
    btn.addEventListener('click', enumerate);
  }).catch(() => {
    // Fall back anyway
    btn.addEventListener('click', enumerate);
  });

  document.getElementById('fit').addEventListener('click', () => cy.fit(null, 60));
  document.getElementById('export-png').addEventListener('click', () => downloadDataURL(cy.png({full:true}), 'topology.png'));
  document.getElementById('export-svg').addEventListener('click', () => downloadText(cy.svg({full:true}), 'topology.svg'));
  document.getElementById('export-json').addEventListener('click', () => downloadText(JSON.stringify({elements: cy.json().elements}, null, 2), 'topology.json'));

  // Enter key submits (AK/SK)
  ['ak','sk'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') enumerate();
    });
  });
}

function downloadDataURL(dataUrl, filename){
  const a = document.createElement('a'); a.href = dataUrl; a.download = filename; a.click();
}
function downloadText(text, filename){
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => { initCy(); bindUI(); legend(); });
