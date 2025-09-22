<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Grocery Price Is Right</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin:0; padding:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#fafafa; color:#111; }
    header { display:flex; align-items:center; gap:8px; padding:12px 16px; background:#fff; border-bottom:1px solid #eee; position:sticky; top:0; }
    h1 { margin:0; font-size:1.2rem; }
    main { max-width:740px; margin:0 auto; padding:16px; }
    section { background:#fff; border:1px solid #eee; border-radius:12px; padding:16px; margin-bottom:16px; }
    .row { display:grid; grid-template-columns:1fr 2fr; gap:12px; align-items:center; margin-bottom:12px; }
    label { font-weight:600; }
    input, select { width:100%; padding:10px 12px; border:1px solid #ddd; border-radius:10px; }
    button { cursor:pointer; border:1px solid #ddd; background:#f6f6f6; padding:10px 14px; border-radius:10px; font-weight:600; }
    button:hover { background:#efefef; }
    #scorebar, #roundbar { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:6px; }
    .badge { background:#f0f0ff; border:1px solid #e1e1ff; padding:6px 10px; border-radius:999px; }
    .item-text h2{ margin:0 0 4px 0; font-size:1.2rem; }
    @media (max-width:520px){ .row{ grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <header><h1>🛒 Grocery Price Is Right</h1></header>
  <main>
    <section id="setup">
      <h2>Setup</h2>
      <div class="row">
        <label>Game Mode</label>
        <select id="mode">
          <option value="solo">Solo</option>
          <option value="party">Party</option>
        </select>
      </div>
      <div class="row party-only" hidden>
        <label>Players (2–6)</label>
        <input id="players" type="number" min="2" max="6" value="3">
      </div>
      <div class="row">
        <label>Rounds (5–20)</label>
        <input id="rounds" type="number" min="5" max="20" value="7">
      </div>
      <div class="row">
        <label>Difficulty</label>
        <select id="difficulty">
          <option value="easy">Easy</option>
          <option value="normal" selected>Normal</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <button id="startBtn">Start Game ▶</button>
    </section>

    <section id="game" hidden>
      <div id="scorebar"></div>
      <div id="roundbar"></div>
      <div class="card">
        <div class="item">
          <div class="item-text">
            <h2 id="itemName"></h2>
            <p id="itemDesc"></p>
          </div>
        </div>

        <div id="guessArea">
          <div id="partyInputs" hidden></div>
          <div id="soloInput">
            <label>Your Guess ($)</label>
            <input id="guess" inputmode="decimal" type="number" step="0.01" min="0" placeholder="0.00">
          </div>
          <button id="lockBtn">Lock Guess 🔒</button>
        </div>

        <div id="reveal" hidden>
          <p>Actual Price: <strong id="actual"></strong></p>
          <p id="resultText"></p>
          <button id="nextBtn">Next Round ⏭</button>
        </div>
      </div>
    </section>

    <section id="summary" hidden>
      <h2>Game Summary</h2>
      <div id="summaryBody"></div>
      <button id="restartBtn">Play Again 🔁</button>
    </section>
  </main>
  <footer><small>Made with ❤️ — works offline, tracks high scores locally.</small></footer>

  <script>
    // Minimal working game logic (inline to avoid file path issues)
    const ITEMS=[{name:"GV Peanut Butter 16oz",desc:"Creamy, 16oz jar",price:2
