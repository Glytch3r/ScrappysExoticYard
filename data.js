const GENES = {
  'Hypomelanistic': { short: 'Hypo',   category: 'recessive',    states: ['Normal','Het','66% Poss Het','50% Poss Het','Visual','Unknown'] },
  'Translucent':    { short: 'Trans',  category: 'recessive',    states: ['Normal','Het','66% Poss Het','50% Poss Het','Visual','Unknown'] },
  'Witblits':       { short: 'Wit',    category: 'recessive',    states: ['Normal','Het','66% Poss Het','50% Poss Het','Visual','Unknown'] },
  'Zero':           { short: 'Zero',   category: 'recessive',    states: ['Normal','Het','66% Poss Het','50% Poss Het','Visual','Unknown'] },
  'Genetic Stripe': { short: 'Stripe', category: 'recessive',    states: ['Normal','Het','66% Poss Het','50% Poss Het','Visual','Unknown'] },
  'Axanthic':       { short: 'Axn',    category: 'recessive',    states: ['Normal','Het','66% Poss Het','50% Poss Het','Visual','Unknown'] },
  'Leatherback':    { short: 'LB',     category: 'incdominant',  states: ['Normal','Visual (Leatherback)','Super (Silkback)'] },
  'Dunner':         { short: 'Dunner', category: 'dominant',     states: ['Normal','Visual'] },
  'German Giant':   { short: 'GG',     category: 'lineage',      states: ['Normal','Visual'] },
  'Red/Citrus':     { short: 'Color',  category: 'nonmendelian', states: ['None','Low Expression','High Expression'] }
};

const SPECIAL_NOTES = {
  'Leatherback': 'Incomplete dominant. Homozygous = Silkback',
  'Witblits + Zero': 'Both Visual = Wero offspring',
  'Silkback × Silkback': 'Health concerns in offspring'
};