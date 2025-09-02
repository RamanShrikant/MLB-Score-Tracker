// popup/popup.js

/**
 * Fetch today’s schedule (with linescore) and render it.
 */
function fetchAndRender() {
  // 1) Build local “YYYY-MM-DD” string
  const d   = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const today = `${yyyy}-${mm}-${dd}`;

  // 2) MLB schedule endpoint with live linescore
  const scheduleUrl =
    'https://statsapi.mlb.com/api/v1/schedule'
    + `?sportId=1&date=${today}&hydrate=linescore,status`;

  // 3) Fetch & render
  fetch(scheduleUrl)
    .then(res => res.json())
    .then(renderGames)
    .catch(err => {
      console.error('Fetch error:', err);
      document.getElementById('games-list')
              .textContent = '⚠️ Unable to load games.';
    });
}

// 4) On popup open: initial fetch + auto-refresh every 60s
document.addEventListener('DOMContentLoaded', () => {
  fetchAndRender();
  const intervalId = setInterval(fetchAndRender, 60000);
  window.addEventListener('unload', () => clearInterval(intervalId));
});

/**
 * Render the games into the #games-list grid.
 */
function renderGames(data) {
  const container = document.getElementById('games-list');
  container.innerHTML = '';

  // 1) Compute "today" in Eastern Time, formatted YYYY-MM-DD
  const todayET = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/New_York'
  }); 
  // 2) Pick the one matching block from the API
  const dateEntry = data.dates.find(d => d.date === todayET);
  const games     = dateEntry?.games || [];


  if (!games.length) {
    container.textContent = 'No games today.';
    return; 
  }

  games.forEach(game => {
    const awayTeam  = game.teams.away.team;
    const homeTeam  = game.teams.home.team;

    // Score fallback: schedule → linescore → 0
    const awayScore =
      game.teams.away.score 
        ?? game.linescore?.teams.away.runs 
        ?? 0;
    const homeScore =
      game.teams.home.score 
        ?? game.linescore?.teams.home.runs 
        ?? 0;

    // Format start time (h:mm AM/PM local)
    const dt   = new Date(game.gameDate);
    let hrs    = dt.getHours() % 12 || 12;
    let mins   = String(dt.getMinutes()).padStart(2, '0');
    const ampm = dt.getHours() >= 12 ? 'PM' : 'AM';
    const startTime = `${hrs}:${mins} ${ampm}`;

    // Determine primary/secondary text based on state
    const state = game.status.abstractGameState;
    let primaryText, secondaryText;
    if (state === 'Preview') {
    primaryText   = startTime;
    secondaryText = '';
     } else {
    primaryText   = `${awayScore} – ${homeScore}`;
    secondaryText = (state === 'Final') ? 'Final' : state;
     }

    // Inning & outs detail for in-progress games
    let detailText = '';
    if (state === 'In Progress' && game.linescore) {
      const ls = game.linescore;
      detailText = `${ls.inningState} ${ls.currentInning} · ${ls.outs} out${ls.outs !== 1 ? 's' : ''}`;
    }
    // right after detailText…
// 1) Build today’s date in a human-readable form (e.g. “June 30, 2025”)
const humanDate = new Date(game.gameDate).toLocaleDateString('en-US', {
  timeZone: 'America/New_York',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});

// 2) Include that date in the query
const boxScoreUrl =
  'https://www.google.com/search?q=' +
  encodeURIComponent(
    `${awayTeam.name} vs ${homeTeam.name} box score ${humanDate}`
  );


    // Team logos
    const logoAway = `https://www.mlbstatic.com/team-logos/${awayTeam.id}.svg`;
    const logoHome = `https://www.mlbstatic.com/team-logos/${homeTeam.id}.svg`;

    // Build the box
    const box = document.createElement('div');
box.className = 'rounded-2xl bg-white p-4 border-2 border-black ring-2 ring-black shadow-sm transition hover:-translate-y-1 hover:shadow-md';
box.style.border = '2px solid #000';
box.innerHTML = `
<div class="grid items-center"
     style="grid-template-columns: 80px 1fr 80px; column-gap: 20px;">
  <!-- Away -->
  <div class="text-center"> 
    <img src="${logoAway}" alt="${awayTeam.name}" style="width:55px;height:55px;">
    <p style="font-size:10px; line-height:1.1; margin-top:4px; word-break:break-word;">
      ${awayTeam.name}
    </p>
  </div>

  <!-- Middle -->
  <div class="text-center">
    <p style="font-size:20px; font-weight:700;">${primaryText}</p>
    <p style="font-size:10px;">${secondaryText}</p>
    ${detailText ? `<p style="font-size:10px;">${detailText}</p>` : ''}
    <p>
      <a href="${boxScoreUrl}" target="_blank"
         style="font-size:10px; color:#2563eb; text-decoration:underline;">
        View Box Score
      </a>
    </p>
  </div>

  <!-- Home -->
  <div class="text-center">
    <img src="${logoHome}" alt="${homeTeam.name}" style="width:55px;height:55px;">
    <p style="font-size:10px; line-height:1.1; margin-top:4px; word-break:break-word;">
      ${homeTeam.name}
    </p>
  </div>
</div>

    `;  
    container.appendChild(box);
  });
}
