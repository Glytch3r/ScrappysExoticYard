let geneCounters = { sire: 0, dam: 0 };
const parentGenes = { sire: {}, dam: {} };

function getUsedGenes(parent) {
  return Object.values(parentGenes[parent]).map(g => g.gene);
}

function addGene(parent, prefillGene, prefillState) {
  const list = document.getElementById(`${parent}-genes`);
  const empty = document.getElementById(`${parent}-empty`);

  const used = getUsedGenes(parent);
  const available = Object.keys(GENES).filter(g => !used.includes(g));
  if (available.length === 0) return;

  const geneToAdd = prefillGene && available.includes(prefillGene) ? prefillGene : available[0];

  const id = ++geneCounters[parent];
  const rowId = `${parent}-gene-${id}`;

  const row = document.createElement('div');
  row.className = 'gene-row';
  row.id = rowId;

  const sel = document.createElement('select');
  refreshGeneSelect(sel, parent, geneToAdd);
  sel.onchange = () => {
    const usedNow = getUsedGenes(parent);
    const oldGene = parentGenes[parent][id]?.gene;
    const newGene = sel.value;
    if (usedNow.includes(newGene) && newGene !== oldGene) {
      sel.value = oldGene;
      return;
    }
    renderStates(row, sel.value, parent, id);
    refreshAllGeneSelects(parent);
    checkWeroLogic(parent);
  };
  row.appendChild(sel);

  const stateCol = document.createElement('div');
  stateCol.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

  const stateWrap = document.createElement('div');
  stateWrap.className = 'state-radios';
  stateWrap.id = `${rowId}-states`;
  stateCol.appendChild(stateWrap);

  const percentDiv = document.createElement('div');
  percentDiv.style.cssText = 'font-size:9px;color:var(--text-muted);margin-top:2px;';
  percentDiv.id = `${rowId}-percent`;
  stateCol.appendChild(percentDiv);

  row.appendChild(stateCol);

  const btRemove = document.createElement('button');
  btRemove.className = 'btn-remove';
  btRemove.textContent = '✕';
  btRemove.onclick = (e) => {
    e.preventDefault();
    row.remove();
    delete parentGenes[parent][id];
    refreshAllGeneSelects(parent);
    updateEmptyMessage(parent);
  };
  row.appendChild(btRemove);

  list.appendChild(row);
  renderStates(row, geneToAdd, parent, id);
  refreshAllGeneSelects(parent);
  updateEmptyMessage(parent);
}

function renderStates(row, geneName, parent, id) {
  const gene = GENES[geneName];
  if (!gene) return;

  const stateWrap = row.querySelector(`#${parent}-gene-${id}-states`);
  stateWrap.innerHTML = '';

  gene.states.forEach((state, idx) => {
    const radioId = `${parent}-gene-${id}-state-${idx}`;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `${parent}-gene-${id}-state`;
    input.id = radioId;
    input.value = state;
    input.onchange = () => {
      parentGenes[parent][id] = { gene: geneName, state: state };
      updatePercent(row, gene, parent, id);
    };
    stateWrap.appendChild(input);

    const label = document.createElement('label');
    label.htmlFor = radioId;
    label.textContent = state;
    stateWrap.appendChild(label);
  });

  if (gene.states.length > 0) {
    document.getElementById(`${parent}-gene-${id}-state-0`).checked = true;
    parentGenes[parent][id] = { gene: geneName, state: gene.states[0] };
    updatePercent(row, gene, parent, id);
  }
}

function updatePercent(row, gene, parent, id) {
  const state = parentGenes[parent][id]?.state;
  let prob = 0;

  if (gene.category === 'recessive') {
    switch (state) {
      case 'Visual': prob = 100; break;
      case 'Het': prob = 50; break;
      case '66% Poss Het': prob = 66; break;
      case '50% Poss Het': prob = 50; break;
      default: prob = 0;
    }
  } else if (gene.category === 'dominant') {
    prob = state === 'Visual' ? 50 : 0;
  } else if (gene.category === 'incdominant') {
    switch (state) {
      case 'Visual (Leatherback)': prob = 50; break;
      case 'Super (Silkback)': prob = 25; break;
      default: prob = 0;
    }
  } else if (gene.category === 'lineage') {
    prob = state === 'Visual' ? 50 : 0;
  } else if (gene.category === 'nonmendelian') {
    prob = state !== 'None' ? 50 : 0;
  }

  const percentDiv = row.querySelector(`#sire-gene-${id}-percent`) || row.querySelector(`#dam-gene-${id}-percent`);
  if (percentDiv) {
    percentDiv.textContent = `~${prob}% in offspring`;
  }
}

function refreshGeneSelect(sel, parent, geneToAdd) {
  const used = getUsedGenes(parent);
  sel.innerHTML = '';

  Object.keys(GENES).forEach(g => {
    if (!used.includes(g) || g === geneToAdd) {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      if (g === geneToAdd) opt.selected = true;
      sel.appendChild(opt);
    }
  });
}

function refreshAllGeneSelects(parent) {
  const rows = document.querySelectorAll(`#${parent}-genes .gene-row`);
  rows.forEach(row => {
    const sel = row.querySelector('select');
    if (sel) {
      const currentGene = sel.value;
      refreshGeneSelect(sel, parent, currentGene);
    }
  });
}

function updateEmptyMessage(parent) {
  const empty = document.getElementById(`${parent}-empty`);
  const list = document.getElementById(`${parent}-genes`);
  if (list.children.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
  }
}

function checkWeroLogic(parent) {
  const genes = parentGenes[parent];
  const witblits = Object.values(genes).find(g => g.gene === 'Witblits' && g.state === 'Visual');
  const zero = Object.values(genes).find(g => g.gene === 'Zero' && g.state === 'Visual');

  const notice = document.getElementById(`${parent}-auto-notice`);
  if (witblits && zero) {
    notice.textContent = '⚡ Wero parent detected! Both Witblits and Zero are Visual.';
    notice.classList.add('visible');
  } else {
    notice.classList.remove('visible');
  }
}

function stateToProb(state, category) {
  if (category === 'recessive') {
    switch (state) {
      case 'Visual': return { visual: 1, het: 0, normal: 0 };
      case 'Het': return { visual: 0, het: 1, normal: 0 };
      case '66% Poss Het': return { visual: 0.66, het: 0, normal: 0.34 };
      case '50% Poss Het': return { visual: 0.5, het: 0, normal: 0.5 };
      case 'Unknown': return { visual: 0.25, het: 0.5, normal: 0.25 };
      default: return { visual: 0, het: 0, normal: 1 };
    }
  }
  return { visual: 0, het: 0, normal: 1 };
}

function crossRecessive(sP, dP) {
  const visual = (sP.visual * dP.visual) + (sP.visual * dP.het * 0.5) + (sP.het * dP.visual * 0.5) + (sP.het * dP.het * 0.25);
  const het = (sP.het * dP.normal) + (sP.visual * dP.normal * 0) + (sP.normal * dP.het) + (sP.het * dP.visual * 0.5) + (sP.het * dP.het * 0.5) + (sP.normal * dP.visual * 0);
  const normal = (sP.normal * dP.normal) + (sP.het * dP.normal * 0) + (sP.normal * dP.het * 0) + (sP.het * dP.het * 0.25);

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
      else if (state === 'Het') { hets.push(gene); genotypeparts.push(`het ${g.short}`); }
      else if (state === '66% Poss Het' || state === '50% Poss Het') { possHets.push(gene); genotypeparts.push(`poss het ${g.short}`); }
      else { genotypeparts.push(`nrm ${g.short}`); }
    } else if (g.category === 'incdominant') {
      if (state === 'Super (Silkback)') { supers.push(gene); genotypeparts.push(`${g.short}/Silkback`); }
      else if (state === 'Visual (Leatherback)') { visuals.push(`Leatherback`); genotypeparts.push(`het ${g.short}`); }
      else { genotypeparts.push(`nrm ${g.short}`); }
    } else if (g.category === 'dominant') {
      if (state === 'Visual') { visuals.push(gene); genotypeparts.push(`${g.short} dominant`); }
      else { genotypeparts.push(`nrm ${g.short}`); }
    } else if (g.category === 'nonmendelian') {
      if (state !== 'None') { visuals.push(`${state.split('(')[0].trim()}`); genotypeparts.push(state); }
    } else if (g.category === 'lineage') {
      if (state === 'Visual') { visuals.push(gene); genotypeparts.push(`${g.short} lineage`); }
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

    const sireState = sireEntry?.state || 'Normal';
    const damState = damEntry?.state || 'Normal';

    let outcomes = {};

    if (gene.category === 'recessive') {
      const sP = stateToProb(sireState, 'recessive');
      const dP = stateToProb(damState, 'recessive');
      outcomes = crossRecessive(sP, dP);
    } else if (gene.category === 'incdominant') {
      outcomes = crossIncDominant(sireState, damState);
    } else if (gene.category === 'dominant') {
      outcomes = crossDominant(sireState, damState);
    } else if (gene.category === 'nonmendelian') {
      if ((sireState.includes('High') || sireState === 'Visual') && (damState.includes('High') || damState === 'Visual')) {
        outcomes = { 'High (Deep Red)': 0.5, 'Low (Pastel)': 0.5 };
      } else if (sireState === 'None' && damState === 'None') {
        outcomes = { 'None': 1 };
      } else if (sireState.includes('High') || sireState === 'Visual' || damState.includes('High') || damState === 'Visual') {
        outcomes = { 'High (Deep Red)': 0.25, 'Low (Pastel)': 0.5, 'None': 0.25 };
      } else {
        outcomes = { 'Low (Pastel)': 0.5, 'None': 0.5 };
      }
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
