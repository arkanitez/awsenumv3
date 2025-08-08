console.log('[ui] script loaded');

window.addEventListener('error', e => {
  console.error('[ui] window error:', e.error || e.message || e);
  const w = document.getElementById('warnings');
  if (w) {
    const a = document.createElement('sl-alert'); a.variant='warning'; a.closable=true;
    a.innerText = String(e.error || e.message || e);
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
    a.innerText = String(e.reason);
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

const NODE_STYLE = {
  selector: 'node',
  style: {
    'label': 'data(label)',
    'font-size': 11,
    'text-wrap': 'wrap',
    'text-max-width': 160,
    'background-color': '#ffffff',
    'shape': 'round-rectangle',
    'border-width': 1,
    'border-color': '#e5e7eb',
    'text-valign': 'bottom',
    'text-halign': 'center',
    'color': '#111827',
    'background-image': (ele) => {
      const icon = ele.data('icon');
      return typeof icon === 'string' && icon.trim() ? icon : undefined;
    },
    'background-fit': 'contain',
    'background-clip': 'node',
    'background-opacity': (ele) => ele.data('icon') ? 1 : 0
  }
};

const EDGE_STYLE = {
  selector: 'edge',
  style: {
    'curve-style': 'bezier',
    'target-arrow-shape': 'triangle',
    'arrow-scale': 0.9,
    'width': 2,
    'label': 'data(label)',
    'font-size': 9,
    'color': '#111827'
  }
};

// Init, bindings, layout, etc. (unchanged)...

function sanitizeElements(elements) {
  const nodes = elements.filter(e => e.group === 'nodes');
  const edges = elements.filter(e => e.group === 'edges');
  const nodeIds = new Set(nodes.map(n => n.data.id));
  const cleanedEdges = [];
  let dropped = 0;

  edges.forEach(edge => {
    const d = edge.data;
    if (nodeIds.has(d.source) && nodeIds.has(d.target)) {
      cleanedEdges.push(edge);
    } else {
      dropped++;
    }
  });

  if (dropped) {
    const w = document.getElementById('warnings');
    const a = document.createElement('sl-alert'); a.variant='warning'; a.closable=true;
    a.textContent = `Filtered ${dropped} edges referencing missing nodes.`;
    w.appendChild(a);
  }

  return [...nodes, ...cleanedEdges];
}

// In the enumerate handler:
async function handleEnumerateClick() {
  // ... after fetching elements ...
  let elements = data.elements || [];
  elements = sanitizeElements(elements); // filter first
  elements.forEach(el => {
    if (el.group === 'nodes' && el.data.type) {
      el.data.icon = ICONS[el.data.type] || undefined;
    }
  });
  cy.elements().remove();
  cy.add(elements);
  // layout/run...
}
