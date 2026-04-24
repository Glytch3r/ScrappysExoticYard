let parentGenes = { sire: {}, dam: {} };
let geneIdCounter = { sire: 0, dam: 0 };

function addGene(parent) {
  const id = geneIdCounter[parent]++;
  const container = document.getElementById(`${parent}-genes`);
  
  const geneSelect = Object.keys(GENES).sort();
  const geneRow = document.createElement('div');
  geneRow.className = 'gene-row';
  geneRow.id = `${parent}-gene-row-${id}`;
  
  geneRow.innerHTML = `
    <select id="${parent}-gene-${id}-select" class="gene-select">
      <option value="">-- Select Gene --</option>
      ${geneSelect.map(g => `<option value="${g}">${g}</option>`).join('')}
    </select>
    <div class="state-radios" id="${parent}-gene-${id}-states"></div>
    <label class="proven-check">
      <input type="checkbox" id="${parent}-gene-${id}-proven">
      <span>Proven</span>
    </label>
    <button class="btn-remove" onclick="removeGene('${parent}', ${id})">Remove</button>
  `;
  
  container.appendChild(geneRow);
  
  const select = geneRow.querySelector('select');
  select.addEventListener('change', (e) => updateGeneStates(parent, id, e.target.value));
}

function updateGeneStates(parent, id, geneName) {
  const statesDiv = document.getElementById(`${parent}-gene-${id}-states`);
  statesDiv.innerHTML = '';
  
  if (!geneName || !GENES[geneName]) return;
  
  const gene = GENES[geneName];
  const states = gene.states || ['Normal', 'Heterozygous', 'Visual'];
  
  states.forEach((state, idx) => {
    const radioId = `${parent}-gene-${id}-state-${idx}`;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `${parent}-gene-${id}-state`;
    input.id = radioId;
    input.value = state;
    input.onchange = () => {
      parentGenes[parent][id] = { gene: geneName, state: state };
    };
    
    const label = document.createElement('label');
    label.htmlFor = radioId;
    label.textContent = state;
    
    statesDiv.appendChild(input);
    statesDiv.appendChild(label);
  });
  
  if (states.length > 0) {
    document.querySelector(`#${parent}-gene-${id}-state-0`).checked = true;
    parentGenes[parent][id] = { gene: geneName, state: states[0] };
  }
}

function removeGene(parent, id) {
  const row = document.getElementById(`${parent}-gene-row-${id}`);
  if (row) row.remove();
  delete parentGenes[parent][id];
}

function resetForm() {
  document.getElementById('sire-name').value = '';
  document.getElementById('sire-gf').value = '';
  document.getElementById('sire-gm').value = '';
  document.getElementById('dam-name').value = '';
  document.getElementById('dam-gf').value = '';
  document.getElementById('dam-gm').value = '';
  
  document.getElementById('sire-genes').innerHTML = '';
  document.getElementById('dam-genes').innerHTML = '';
  
  parentGenes = { sire: {}, dam: {} };
  geneIdCounter = { sire: 0, dam: 0 };
  
  document.getElementById('results-section').classList.remove('visible');
}

function stateToProb(state, proven) {
  if (state === 'Normal') return { visual: 0, het: 0, normal: 1 };
  if (state === 'Heterozygous') return { visual: 0, het: 1, normal: 0 };
  if (state === 'Visual') return { visual: 1, het: 0, normal: 0 };
  if (state === 'Unknown') return { visual: 0.33, het: 0.33, normal: 0.34 };
  return { visual: 0, het: 0, normal: 1 };
}

function crossRecessive(sireProb, damProb) {
  const sV = sireProb.visual, sH = sireProb.het, sN = sireProb.normal;
  const dV = damProb.visual, dH = damProb.het, dN = damProb.normal;
  
  const visual = (sV * dV) + (sV * dH) * 0.5 + (sH * dV) * 0.5 + (sH * dH) * 0.25;
  const het = (sH * dN) + (sV * dN) * 0 + (sN * dH) + (sH * dV) * 0.5 + (sH * dH) * 0.5 + (sN * dV) * 0;
  const normal = (sN * dN) + (sH * dN) * 0 + (sN * dH) * 0 + (sH * dH) * 0.25;
  
  return { visual, het, normal };
}

function crossDominant(sireState, damState) {
  if (sireState === 'Visual' || damState === 'Visual') {
    return { visual: 0.5, normal: 0.5 };
  }
  return { normal: 1 };
}

function combineGeneResults(allGeneResults) {
  let combined = [{}];
  let combinedProbs = [1];
  
  for (const { geneName, outcomes } of allGeneResults) {
    const newCombined = [];
    const newProbs = [];
    
    for (let i = 0; i < combined.length; i++) {
      for (const [state, prob] of Object.entries(outcomes)) {
        const newEntry = { ...combined[i], [geneName]: state };
        newCombined.push(newEntry);
        newProbs.push(combinedProbs[i] * prob);
      }
    }
    combined = newCombined;
    combinedProbs = newProbs;
  }
  
  return combined.map((combo, i) => ({ combo, prob: combinedProbs[i] }));
}

function formatPhenotype(combo) {
  const visuals = [], hets = [], possHets = [], supers = [];
  const genotypeparts = [];

  for (const [gene, state] of Object.entries(combo)) {
    const g = GENES[gene];
    if (!g) continue;

    if (g.category === 'recessive') {
      if (state === 'Visual') { visuals.push(gene); genotypeparts.push(`hom ${g.short}`); }
      else if (state === 'Heterozygous') { hets.push(gene); genotypeparts.push(`het ${g.short}`); }
      else { genotypeparts.push(`nrm ${g.short}`); }
    } else if (g.category === 'dominant') {
      if (state === 'Visual') { visuals.push(gene); genotypeparts.push(`${g.short} dominant`); }
      else { genotypeparts.push(`nrm ${g.short}`); }
    }
  }

  const parts = [];
  if (supers.length) parts.push(...supers.map(s => `Super ${s}`));
  if (visuals.length) parts.push(...visuals);
  if (hets.length) parts.push(...hets.map(h => `Het ${h}`));
  if (possHets.length) parts.push(...possHets.map(h => `Poss Het ${h}`));
  if (!parts.length) parts.push('Normal / Wildtype');
  const phenotype = parts.join(', ');

  return {
    phenotype,
    genotype: genotypeparts.join(' / ') || 'nrm',
    hasSuper: supers.length > 0,
    hasVisual: visuals.length > 0,
    hasHet: hets.length > 0
  };
}

function calculate() {
  const warnings = [];
  const infos = [];
  const allGeneResults = [];

  const sireGenes = Object.values(parentGenes.sire);
  const damGenes = Object.values(parentGenes.dam);
  const allGeneNames = [...new Set([
    ...sireGenes.map(g => g.gene),
    ...damGenes.map(g => g.gene)
  ])];

  if (allGeneNames.length === 0) {
    alert('Please add at least one gene to calculate.');
    return;
  }

  [...sireGenes, ...damGenes].forEach(g => {
    if (g.state === 'Unknown') {
      warnings.push(`⚠ ${g.gene}: one parent has Unknown state — treated as Normal. Genetic potential may be hidden.`);
    }
  });

  for (const geneName of allGeneNames) {
    const gene = GENES[geneName];
    const sireEntry = sireGenes.find(g => g.gene === geneName);
    const damEntry = damGenes.find(g => g.gene === geneName);

    const sireState = sireEntry?.state || 'Normal';
    const damState = damEntry?.state || 'Normal';

    const sireProven = document.getElementById(`sire-gene-${Object.keys(parentGenes.sire).find(k => parentGenes.sire[k].gene === geneName)}-proven`)?.checked || false;
    const damProven = document.getElementById(`dam-gene-${Object.keys(parentGenes.dam).find(k => parentGenes.dam[k].gene === geneName)}-proven`)?.checked || false;

    let outcomes = {};

    if (gene.category === 'recessive') {
      const sP = stateToProb(sireState, sireProven);
      const dP = stateToProb(damState, damProven);
      outcomes = crossRecessive(sP, dP);
    } else if (gene.category === 'dominant') {
      outcomes = crossDominant(sireState, damState);
    }

    const total = Object.values(outcomes).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const k in outcomes) outcomes[k] = outcomes[k] / total;
    }

    allGeneResults.push({ geneName, outcomes });
  }

  const combined = combineGeneResults(allGeneResults);

  const merged = {};
  for (const { combo, prob } of combined) {
    const fmt = formatPhenotype(combo);
    const key = fmt.phenotype;
    if (merged[key]) {
      merged[key].prob += prob;
    } else {
      merged[key] = { ...fmt, prob };
    }
  }

  const sorted = Object.values(merged).sort((a, b) => b.prob - a.prob);

  renderResults(sorted, warnings, infos);
}

function renderResults(results, warnings, infos) {
  const section = document.getElementById('results-section');
  const body = document.getElementById('results-body');
  const warnContainer = document.getElementById('warnings-container');
  const infoContainer = document.getElementById('info-container');
  const meta = document.getElementById('results-meta');

  warnContainer.innerHTML = '';
  infoContainer.innerHTML = '';

  warnings.forEach(w => {
    const box = document.createElement('div');
    box.className = 'warning-box';
    box.innerHTML = `<span class="warning-icon">⚠</span><span>${w}</span>`;
    warnContainer.appendChild(box);
  });

  infos.forEach(info => {
    const box = document.createElement('div');
    box.className = 'info-box';
    box.textContent = info;
    infoContainer.appendChild(box);
  });

  const sireName = document.getElementById('sire-name').value || 'Sire';
  const damName = document.getElementById('dam-name').value || 'Dam';
  meta.textContent = `${sireName} × ${damName} — ${results.length} phenotype combination${results.length !== 1 ? 's' : ''}`;

  body.innerHTML = '';

  results.forEach(r => {
    const pct = (r.prob * 100).toFixed(1);
    const tr = document.createElement('tr');

    const tdPheno = document.createElement('td');
    let tagHtml = '';
    if (r.hasSuper) tagHtml += `<span class="tag tag-super">Super</span> `;
    if (r.hasVisual && !r.hasSuper) tagHtml += `<span class="tag tag-visual">Visual</span> `;
    if (r.hasHet) tagHtml += `<span class="tag tag-het">Het</span> `;
    tdPheno.innerHTML = `<div class="phenotype-name">${tagHtml}${r.phenotype}</div>`;
    tr.appendChild(tdPheno);

    const tdGeno = document.createElement('td');
    tdGeno.innerHTML = `<div class="genotype-code">${r.genotype}</div>`;
    tr.appendChild(tdGeno);

    const tdProb = document.createElement('td');
    tdProb.className = 'prob-bar-cell';
    tdProb.innerHTML = `
      <div class="prob-bar-wrap">
        <div class="prob-bar"><div class="prob-bar-fill" style="width:${Math.min(pct,100)}%"></div></div>
        <div class="prob-pct">${pct}%</div>
      </div>`;
    tr.appendChild(tdProb);

    body.appendChild(tr);
  });

  section.classList.add('visible');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}