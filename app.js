let parentGenes = { sire: {}, dam: {} };
let geneIdCounter = { sire: 0, dam: 0 };

document.getElementById('sire-add-gene').addEventListener('click', () => addGeneRow('sire'));
document.getElementById('dam-add-gene').addEventListener('click', () => addGeneRow('dam'));
document.getElementById('calculate-btn').addEventListener('click', calculate);
document.getElementById('reset-btn').addEventListener('click', resetForm);

function addGeneRow(parent) {
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
  
  states.forEach(state => {
    const radioId = `${parent}-gene-${id}-state-${state}`;
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="radio" name="${parent}-gene-${id}-state" value="${state}" id="${radioId}">
      <label for="${radioId}">${state}</label>
    `;
    const input = label.querySelector('input');
    const labelEl = label.querySelector('label');
    
    input.addEventListener('change', () => {
      parentGenes[parent][id] = { gene: geneName, state: state };
    });
    
    statesDiv.appendChild(input);
    statesDiv.appendChild(labelEl);
  });
  
  if (states.length > 0) {
    document.querySelector(`#${parent}-gene-${id}-states input[type="radio"]`).checked = true;
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
  document.getElementById('sire-morph').value = '';
  document.getElementById('sire-notes').value = '';
  document.getElementById('dam-name').value = '';
  document.getElementById('dam-morph').value = '';
  document.getElementById('dam-notes').value = '';
  
  document.getElementById('sire-genes').innerHTML = '';
  document.getElementById('dam-genes').innerHTML = '';
  
  parentGenes = { sire: {}, dam: {} };
  geneIdCounter = { sire: 0, dam: 0 };
  
  document.getElementById('results-section').classList.remove('visible');
}

// ─── GENETIC CALCULATIONS ────────────────────────────────────────────────────────

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

function crossIncDominant(sireState, damState) {
  const outcomes = {};
  
  if (sireState === 'Normal' && damState === 'Normal') {
    outcomes.normal = 1;
  } else if (sireState === 'Super (Silkback)' || damState === 'Super (Silkback)') {
    outcomes.visual = 0.5;
    outcomes.super = 0.5;
  } else {
    outcomes.visual = 0.5;
    outcomes.normal = 0.5;
  }
  
  return outcomes;
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
      else if (state === '66poss') { possHets.push(gene); genotypeparts.push(`66% poss het ${g.short}`); }
      else { genotypeparts.push(`nrm ${g.short}`); }
    } else if (g.category === 'incdominant') {
      if (state === 'Super (Silkback)') { supers.push(gene); genotypeparts.push(`${g.short}/Silkback`); }
      else if (state === 'Visual') { visuals.push(`Leatherback`); genotypeparts.push(`het ${g.short}`); }
      else { genotypeparts.push(`nrm ${g.short}`); }
    } else if (g.category === 'dominant') {
      if (state === 'Visual') { visuals.push(gene); genotypeparts.push(`${g.short} dominant`); }
      else { genotypeparts.push(`nrm ${g.short}`); }
    } else if (g.category === 'nonmendelian') {
      if (state !== 'None') { visuals.push(`${state} ${gene}`); genotypeparts.push(state); }
    } else if (g.category === 'lineage') {
      if (state === 'Visual') { visuals.push(gene); genotypeparts.push(`${g.short} lineage`); }
    }
  }

  let phenotype = '';
  const parts = [];
  if (supers.length) parts.push(...supers.map(s => `Super ${s}`));
  if (visuals.length) parts.push(...visuals);
  if (hets.length) parts.push(...hets.map(h => `Het ${h}`));
  if (possHets.length) parts.push(...possHets.map(h => `66% Poss Het ${h}`));
  if (!parts.length) parts.push('Normal / Wildtype');
  phenotype = parts.join(', ');

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

  const sireHasLB = sireGenes.find(g => g.gene === 'Leatherback');
  const damHasLB = damGenes.find(g => g.gene === 'Leatherback');
  if (sireHasLB?.state === 'Super (Silkback)' || damHasLB?.state === 'Super (Silkback)') {
    infos.push('ℹ Silkback parent detected. Note: Silkback × Silkback breeding is generally discouraged due to health concerns in offspring.');
  }

  const sireWitblits = sireGenes.find(g => g.gene === 'Witblits' && g.state === 'Visual');
  const sireZero = sireGenes.find(g => g.gene === 'Zero' && g.state === 'Visual');
  const damWitblits = damGenes.find(g => g.gene === 'Witblits' && g.state === 'Visual');
  const damZero = damGenes.find(g => g.gene === 'Zero' && g.state === 'Visual');
  if ((sireWitblits && sireZero) || (damWitblits && damZero)) {
    infos.push('ℹ Wero parent present (Visual Witblits + Visual Zero). Wero offspring will appear in results.');
  }

  for (const geneName of allGeneNames) {
    const gene = GENES[geneName];
    const sireEntry = sireGenes.find(g => g.gene === geneName);
    const damEntry = damGenes.find(g => g.gene === geneName);

    const sireState = sireEntry?.state || (gene.category === 'incdominant' ? 'Normal' : 'Normal');
    const damState = damEntry?.state || (gene.category === 'incdominant' ? 'Normal' : 'Normal');

    const sireProven = document.getElementById(`sire-gene-${Object.keys(parentGenes.sire).find(k => parentGenes.sire[k].gene === geneName)}-proven`)?.checked || false;
    const damProven = document.getElementById(`dam-gene-${Object.keys(parentGenes.dam).find(k => parentGenes.dam[k].gene === geneName)}-proven`)?.checked || false;

    let outcomes = {};

    if (gene.category === 'recessive') {
      const sP = stateToProb(sireState, sireProven);
      const dP = stateToProb(damState, damProven);
      outcomes = crossRecessive(sP, dP);
      if (outcomes.het) {
        if (sP.het === 1 && dP.het === 1) {
          if (outcomes.visual) outcomes['66poss'] = outcomes.visual;
          delete outcomes.visual;
          if (outcomes['66poss']) {
            outcomes = { '66poss': outcomes['66poss'], het: outcomes.het, normal: outcomes.normal };
          }
        }
      }
    } else if (gene.category === 'incdominant') {
      outcomes = crossIncDominant(sireState, damState);
    } else if (gene.category === 'dominant') {
      const r = crossDominant(sireState, damState);
      outcomes = r;
    } else if (gene.category === 'nonmendelian') {
      if (sireState === 'High Expression' && damState === 'High Expression') outcomes = { 'High Expression': 1 };
      else if (sireState === 'None' && damState === 'None') outcomes = { 'None': 1 };
      else if (sireState === 'High Expression' || damState === 'High Expression') outcomes = { 'High Expression': 0.5, 'Low Expression': 0.5 };
      else outcomes = { 'Low Expression': 0.5, 'None': 0.5 };
    } else if (gene.category === 'lineage') {
      if (sireState === 'Visual' || damState === 'Visual') outcomes = { visual: 0.5, normal: 0.5 };
      else outcomes = { normal: 1 };
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