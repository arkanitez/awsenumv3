console.log('[ui] script loaded');

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

const ICONS = {
  vpc: '/ui/icons/vpc.svg',
  subnet: '/ui/icons/subnet.svg',
  security_group: '/ui/icons/security-group.svg',
  route_table: '/ui/icons/route-table.svg',
  igw: '/ui/icons/internet-gateway.svg',
  nat_gateway: '/ui/icons/nat-gateway.svg',
  eni: '/ui/icons/eni.svg',
  instance: '/ui/icons/ec2-instance.svg',
  load_balancer: '/ui/icons/alb.svg',
  target_group: '/ui/icons/target-group.svg',
  lambda: '/ui/icons/lambda.svg',
  api_gw_v2: '/ui/icons/api-gateway.svg',
  s3_bucket: '/ui/icons/s3.svg',
  sns_topic: '/ui/icons/sns.svg',
  sqs_queue: '/ui/icons/sqs.svg',
  dynamodb_table: '/ui/icons/dynamodb.svg',
  rds_instance: '/ui/icons/rds.svg',
  eks_cluster: '/ui/icons/eks.svg',
  ecs_cluster: '/ui/icons/ecs.svg',
  ecs_service: '/ui/icons/ecs-service.svg',
  eventbridge_bus: '/ui/icons/eventbridge.svg',
  eventbridge_rule: '/ui/icons/eventbridge-rule.svg',
  kinesis: '/ui/icons/kinesis.svg',
  cloudfront: '/ui/icons/cloudfront.svg',
  custom_origin: '/ui/icons/custom-origin.svg',
  cidr: '/ui/icons/cidr.svg',
  external: '/ui/icons/internet.svg',
  kms: '/ui/icons/kms.svg',
  secret: '/ui/icons/secrets-manager.svg',
  ssmparam: '/ui/icons/ssm.svg',
  integration: '/ui/icons/integration.svg',
  api_gw_v2_route: '/ui/icons/api-gateway-route.svg'
};

const NODE_STYLES = [
  { sel: 'node', style: {
      'label': 'data(label)',
      'font-size': 11,
      'text-wrap': 'wrap',
      'text-max-width': 160,
      'background-color': '#ffffff',
      'shape': 'round-rectangle',
      'border-width': 1,
      'border-color': '#e5e7eb',
      'background-image': 'data(icon)',
      'background-fit': 'contain',
      'background-clip': 'node',
      'background-opacity': 1,
      'background-width': '80%',
      'background-height': '80%',
      'background-position-x': '50%',
      'background-position-y': '40%',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'color':'#111827'
  }},
  { sel: 'node:selected', style: { 'border-color': '#111827', 'border-width': 3 } },
];

const EDGE_STYLES = [
  { sel: 'edge', style: { 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', 'arrow-scale': 0.9, 'width': 2, 'label': 'data(label)', 'font-size': 9, 'color':'#111827' } },
  { sel: 'edge[category = "resource"]', style: { 'line-color': '#2563eb', 'target-arrow-color': '#2563eb' } },
  { sel: 'edge[category = "network"]', style: { 'line-color': '#f97316', 'target-arrow-color': '#f97316' } },
  { sel: 'edge[category = "data"]', style: { 'line-color': '#0ea5e9', 'target-arrow-color': '#0ea5e9', 'line-style': 'dotted' } },
  { sel: 'edge[derived = "true"]', style: { 'line-style': 'dashed' } },
  { sel: 'edge[type = "attach"], edge[type = "assoc"]', style: { 'opacity': 0.45 } },
  { sel: 'edge:selected', style: { 'width': 3 } },
];

function registerCytoscapePlugins() {
  try { if (window.cytoscapeCoseBilkent) cytoscape.use(window.cytoscapeCoseBilkent); } catch (e) {}
  try { if (window.cytoscapeMinimap) cytoscape.use(window.cytoscapeMinimap); } catch (e) {}
  try { if (window.cytoscapeSvg) cytoscape.use(window.cytoscapeSvg); } catch (e) {}
}

function initCySafe() {
  console.log('[ui] initCy');
  if (!window.cytoscape) throw new Error('Cytoscape failed to load.');
  const container = document.getElementById('cy');
  if (!container) throw new Error('#cy container not found');

  registerCytoscapePlugins();

  cy = cytoscape({
    container,
    elements: [],
    minZoom: 0.25,
    maxZoom: 2.5,
    pixelRatio: 1,
    boxSelectionEnabled: false,
    style: [
      ...NODE_STYLES.map(s => ({ selector: s.sel, style: s.style })),
      ...EDGE_STYLES.map(s => ({ selector: s.sel, style: s.style })),
    ],
    layout: { name: (window.cytoscapeCoseBilkent ? 'cose-bilkent' : 'breadthfirst'),
      quality: 'default', animate: false, nodeRepulsion: 80000, idealEdgeLength: 220, gravity: 0.25, numIter: 1200, tile: true },
  });

  if (typeof cy.minimap === 'function') { try { cy.minimap({}); } catch {} }

  cy.on('select', 'node,edge', (e) => {
    const d = e.target.data();
    document.getElementById('details').innerHTML = '<pre>' + JSON.stringify(d, null, 2) + '</pre>';
  });
  cy.on('unselect', () => {
    document.getElementById('details').innerHTML = '<div class="muted">Select a node or edge.</div>';
  });

  // Reset view button
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) resetBtn.addEventListener('click', () => { cy.fit(null, 60); });
}

function legend(){
  const items = [
    ['Resource edges', '#2563eb'],
    ['Network edges', '#f97316'],
    ['Data/invoke edges', '#0ea5e9 (dotted)'],
    ['Derived', 'dashed']
  ];
  const el = document.getElementById('legend'); el.innerHTML = '';
  for (const [name, color] of items){
    const row = document.createElement('div'); row.className = 'legend-row';
    const sw = document.createElement('span'); sw.className = 'swatch';
    if (color === 'dashed'){ sw.style.border = '1px dashed #9ca3af'; sw.style.background='transparent'; }
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

function iconFor(type){ return ICONS[type] || ''; }
function injectIcons(elements){
  return (elements || []).map(el => {
    if (el.data && !('source' in el.data)) {
      el.data.icon = iconFor(el.data.type);
    }
    return el;
  });
}

// ---- Enumerate helpers ----
async function postEnumerate(){
  const ak = (document.getElementById('ak')?.value || '').trim();
  const sk = (document.getElementById('sk')?.value || '').trim();
  const payload = { access_key_id: ak, secret_access_key: sk };

  const res = await fetch('/enumerate', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

// ---- Enumerate button handler ----
async function handleEnumerateClick(){
  console.log('[ui] Enumerate clicked');
  const ak = (document.getElementById('ak')?.value || '').trim();
  const sk = (document.getElementById('sk')?.value || '').trim();
  const btn = document.getElementById('btn-enumerate');
  if (!ak || !sk) { renderWarnings(['Please provide both Access Key ID and Secret Access Key.']); return; }

  btn.loading = true;
  try {
    const { ok, status, data } = await postEnumerate();
    if (!ok) { renderWarnings([data?.error || `Request failed with ${status}`]); return; }

    const elements = data?.elements || [];
    console.log('[ui] elements count:', elements.length);

    cy.elements().remove();
    cy.add(injectIcons(elements));
    cy.resize(); // <-- important if CSS just applied
    const layout = cy.layout({
      name: (window.cytoscapeCoseBilkent ? 'cose-bilkent' : 'breadthfirst'),
      quality: 'default', animate:false, nodeRepulsion:80000, idealEdgeLength:220, gravity:0.25, numIter:1200, tile:true
    });
    layout.run();
    layout.on('layoutstop', () => { cy.fit(null, 60); });
    // Fallback fit in case layout doesn't emit event
    setTimeout(() => { cy.fit(null, 60); }, 100);

    renderFindings(data.findings || []); renderWarnings(data.warnings || []);
  } catch (e){
    renderWarnings([String(e)]);
  } finally { btn.loading = false; }
}

function bindUI(){
  console.log('[ui] bindUI');
  const btn = document.getElementById('btn-enumerate');
  if (!btn) { console.error('[ui] enumerate button not found'); return; }
  Promise.all([ customElements.whenDefined('sl-button'), customElements.whenDefined('sl-input') ])
    .then(() => {
      console.log('[ui] custom elements ready; binding click handlers');
      btn.addEventListener('click', handleEnumerateClick);
      btn.addEventListener('sl-click', handleEnumerateClick);
      ['ak','sk'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('keydown', e => { if (e.key === 'Enter') handleEnumerateClick(); });
      });
    }).catch(() => { btn.addEventListener('click', handleEnumerateClick); });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('[ui] DOMContentLoaded');
  bindUI();
  try { initCySafe(); } catch (e) { renderWarnings([String(e)]); }
  legend();
});
