// Basic PWA install flow
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn?.addEventListener('click', async () => {
  installBtn.hidden = true;
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
});

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}

// --- Game Data (sample grocery items; prices are illustrative) ---
const ITEMS = [
  {name: "GV Peanut Butter 16oz", desc: "Creamy, 16oz jar", price: 2.38},
  {name: "GV Large Eggs (12ct)", desc: "Grade A, dozen", price: 2.12},
  {name: "GV Whole Milk 1 gal", desc: "Vitamin D, 1 gallon", price: 3.54},
  {name: "GV Sliced Bread", desc: "White sandwich bread", price: 1.32},
  {name: "GV Cheddar Cheese 8oz", desc: "Shredded, mild", price: 2.22},
  {name: "GV Frozen Mixed Veg 12oz", desc: "Freezer aisle MVP", price: 0.98},
  {name: "GV Spaghetti 16oz", desc: "Pasta night hero", price: 1.08},
  {name: "GV Marinara 24oz", desc: "Tomato basil", price: 1.48},
  {name: "Bananas (per lb)", desc: "Ripe, ready to peel", price: 0.62},
  {name: "Boneless Chicken Breast (lb)", desc: "Fresh, skinless", price: 2.99},
  {name: "GV Butter 4 sticks", desc: "Salted, 16oz", price: 3.98},
  {name: "GV Yogurt Cup", desc: "6oz assorted flavors", price: 0.59},
  {name: "GV Rice 2 lb", desc: "Long grain", price: 1.76},
  {name: "GV Black Beans 15oz", desc: "Canned", price: 0.78},
  {name: "GV Paper Towels (2ct)", desc: "2-pack", price: 3.24},
  {name: "GV Bottled Water (24pk)", desc: "16.9 oz bottles", price: 3.12},
  {name: "GV Corn Flakes 18oz", desc: "Breakfast classic", price: 2.14},
  {name: "GV Coffee 30.5oz", desc: "Ground, medium roast", price: 7.42},
  {name: "GV Apples (3 lb bag)", desc: "Gala", price: 3.94},
  {name: "GV Flour 5 lb", desc: "All-purpose", price: 2.24}
];

// --- State ---
const state = {
  mode: 'solo',
  players: 1,
  rounds: 7,
  currentRound: 0,
  difficulty: 'normal',
  order: [],
  guesses: [],
  scores: [],
  usedIndexes: new Set(),
  currentItem: null,
};

// --- Elements ---
const els = {
  setup: document.getElementById('setup'),
  game: document.getElementById('game'),
  summary: document.getElementById('summary'),
  mode: document.getElementById('mode'),
  players: document.getElementById('players'),
  rounds: document.getElementById('rounds'),
  difficulty: document.getElementById('difficulty'),
  partyOnly: document.querySelector('.party-only'),
  startBtn: document.getElementById('startBtn'),
  itemName: document.getElementById('itemName'),
  itemDesc: document.getElementById('itemDesc'),
  guess: document.getElementById('guess'),
  lockBtn: document.getElementById('lockBtn'),
  reveal: document.getElementById('reveal'),
  actual: document.getElementById('actual'),
  resultText: document.getElementById('resultText'),
  nextBtn: document.getElementById('nextBtn'),
  partyInputs: document.getElementById('partyInputs'),
  soloInput: document.getElementById('soloInput'),
  scorebar: document.getElementById('scorebar'),
  roundbar: document.getElementById('roundbar'),
  summaryBody: document.getElementById('summaryBody'),
  restartBtn: document.getElementById('restartBtn'),
};

// UI events
els.mode.addEventListener('change', () => {
  state.mode = els.mode.value;
  const party = state.mode === 'party';
  els.partyOnly.hidden = !party;
  els.soloInput.hidden = party;
  els.partyInputs.hidden = !party;
});

els.startBtn.addEventListener('click', startGame);
els.lockBtn.addEventListener('click', lockGuess);
els.nextBtn.addEventListener('click', nextRound);
els.restartBtn.addEventListener('click', () => location.reload());

function startGame() {
  state.mode = els.mode.value;
  state.players = state.mode === 'party' ? Math.max(2, Math.min(6, Number(els.players.value))) : 1;
  state.rounds = Math.max(5, Math.min(20, Number(els.rounds.value)));
  state.difficulty = els.difficulty.value;
  state.currentRound = 0;
  state.order = Array.from({length: state.players}, (_, i) => i);
  state.guesses = Array.from({length: state.players}, () => 0);
  state.scores = Array.from({length: state.players}, () => 0);
  state.usedIndexes.clear();

  // build party guess inputs if needed
  if (state.players > 1) {
    els.partyInputs.innerHTML = '';
    for (let i = 0; i < state.players; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'row';
      wrap.innerHTML = \`
        <label>Player \${i+1} Guess ($)</label>
        <input data-player="\${i}" inputmode="decimal" type="number" step="0.01" min="0" placeholder="0.00">
      \`;
      els.partyInputs.appendChild(wrap);
    }
  }

  els.setup.hidden = true;
  els.summary.hidden = true;
  els.game.hidden = false;
  nextRound();
}

function pickItem() {
  if (state.usedIndexes.size === ITEMS.length) state.usedIndexes.clear();
  let idx;
  do { idx = Math.floor(Math.random() * ITEMS.length); } while (state.usedIndexes.has(idx));
  state.usedIndexes.add(idx);
  return ITEMS[idx];
}

function priceVariance(price) {
  // Difficulty adjusts the acceptable error band for scoring
  const pct = state.difficulty === 'easy' ? 0.20 : state.difficulty === 'normal' ? 0.12 : 0.07;
  return price * pct;
}

function renderBars() {
  els.scorebar.innerHTML = '';
  els.roundbar.innerHTML = '';
  state.scores.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'badge';
    div.textContent = state.players > 1 ? \`P\${i+1}: \${s} pts\` : \`Score: \${s} pts\`;
    els.scorebar.appendChild(div);
  });
  const rb = document.createElement('div');
  rb.className = 'badge';
  rb.textContent = \`Round \${state.currentRound} / \${state.rounds}\`;
  els.roundbar.appendChild(rb);
}

function nextRound() {
  if (state.currentRound >= state.rounds) {
    return endGame();
  }
  state.currentRound++;
  renderBars();

  state.currentItem = pickItem();
  els.itemName.textContent = state.currentItem.name;
  els.itemDesc.textContent = state.currentItem.desc;

  els.reveal.hidden = true;
  els.lockBtn.disabled = false;
  els.resultText.textContent = '';
  els.actual.textContent = '';
  if (state.players === 1) {
    els.guess.value = '';
  } else {
    els.partyInputs.querySelectorAll('input').forEach(inp => inp.value = '');
  }
}

function lockGuess() {
  // Collect guesses
  if (state.players === 1) {
    const val = Number(els.guess.value);
    state.guesses[0] = isFinite(val) ? val : 0;
  } else {
    els.partyInputs.querySelectorAll('input').forEach(inp => { const p = Number(inp.getAttribute('data-player')); const v = Number(inp.value); state.guesses[p] = isFinite(v) ? v : 0; });
  }

  const actual = state.currentItem.price;
  const band = priceVariance(actual);

  // Determine winners per classic rule: closest without going over.
  let winner = -1;
  let best = -Infinity;
  state.guesses.forEach((g, i) => {
    if (g <= actual && g > best) {
      best = g; winner = i;
    }
  });

  // Scoring:
  // - Winner gets 100 pts + bonus inversely proportional to error
  // - Exact within a tiny epsilon gets 200 pts
  // - Everyone busts (all over): nearest guess receives 25 pity pts 😉
  let text = '';
  if (winner >= 0) {
    const err = Math.abs(actual - state.guesses[winner]);
    const bonus = Math.max(0, Math.round(100 * (1 - (err / (band || 1)))));
    let pts = 100 + Math.min(100, bonus);
    if (Math.abs(err) < 0.01) pts = 200;
    state.scores[winner] += pts;
    text = state.players === 1
      ? (pts === 200 ? "Exact guess! 🎯 +200 pts" : \`You win the round! +\${pts} pts\`)
      : \`Player \${winner+1} wins! +\${pts} pts\`;
  } else {
    // All over actual price
    let nearestIdx = 0;
    let nearestErr = Infinity;
    state.guesses.forEach((g, i) => {
      const err = Math.abs(g - actual);
      if (err < nearestErr) { nearestErr = err; nearestIdx = i; }
    });
    state.scores[nearestIdx] += 25;
    text = state.players === 1 ? "Overbid! But you get 25 pity points. 😅" : \`Overbids all around! Player \${nearestIdx+1} gets 25 pity points.\`;
  }

  els.actual.textContent = `$${actual.toFixed(2)}`;
  els.resultText.innerHTML = text;
  els.reveal.hidden = false;
  els.lockBtn.disabled = true;
  renderBars();
}

function endGame() {
  els.game.hidden = true;
  els.summary.hidden = false;
  const maxScore = Math.max(...state.scores);
  const winners = state.scores.map((s,i)=>[s,i]).filter(([s])=>s===maxScore).map(([,i])=>i+1);
  const winText = state.players === 1
    ? \`Final Score: \${maxScore} pts\`
    : \`Winner\${winners.length>1?'s':''}: Player \${winners.join(', ')} with \${maxScore} pts\`;

  // Save high score for solo
  if (state.players === 1) {
    const hs = Number(localStorage.getItem('hs') || 0);
    if (maxScore > hs) localStorage.setItem('hs', String(maxScore));
  }

  const hsTxt = state.players === 1 ? \`Best Solo Score: \${localStorage.getItem('hs') || 0} pts\` : '';

  els.summaryBody.innerHTML = \`
    <p class="win">\${winText}</p>
    <p>\${hsTxt}</p>
    <ul>\${state.scores.map((s,i)=>\`<li>Player \${i+1}: \${s} pts</li>\`).join('')}</ul>
  \`;
}

// Small UX tweaks
document.addEventListener('input', (e) => {
  if (e.target === els.players && els.mode.value === 'party') {
    const n = Math.max(2, Math.min(6, Number(els.players.value)));
    els.players.value = String(n);
  }
});

