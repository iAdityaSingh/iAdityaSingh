// .github/scripts/update-starred.js
// Fetches repos iAdityaSingh has starred, filters to only his own repos,
// builds a markdown table, and writes it into README.md between the
// <!--START_SECTION:starred--> / <!--END_SECTION:starred--> markers.

const fs = require('fs');

const USERNAME = 'iAdityaSingh';
const README_PATH = 'README.md';
const START_MARKER = '<!--START_SECTION:starred-->';
const END_MARKER = '<!--END_SECTION:starred-->';

// Optional: map a repo name to an emoji + one-line description + stack tags,
// since GitHub repo descriptions are often empty or too generic for the table.
// Falls back to the repo's own GitHub description if no override is set here.
const OVERRIDES = {
  'IdentityGraph':          { emoji: '🕸️', desc: 'mapping identity/access relationships', stack: '`Python` `IAM`' },
  'Phishguard-intel':       { emoji: '🎣', desc: 'phishing intel + threat detection', stack: '`Python` `Cybersecurity`' },
  'SecureDOT-Antivirus':    { emoji: '🛡️', desc: 'hash-based antivirus, scans + nukes threats', stack: '`Python` `Cybersecurity`' },
  'Vehicle-Rental-App':     { emoji: '⛓️', desc: 'vehicle rental, but make it blockchain', stack: '`Solidity` `Web3`' },
  'Token-VICIOUS':          { emoji: '🪙', desc: 'custom token smart contract', stack: '`Solidity`' },
  'Personal-Portfolio':     { emoji: '🌐', desc: 'the site with the terminal + 3D scene', stack: '`JS` `Three.js`' },
};

async function fetchStarred() {
  const results = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/users/${USERNAME}/starred?per_page=100&page=${page}`,
      {
        headers: {
          'User-Agent': USERNAME,
          'Accept': 'application/vnd.github+json',
          ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
      }
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    results.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return results;
}

function buildRow(repo) {
  const override = OVERRIDES[repo.name];
  const emoji = override?.emoji || '📦';
  const desc = override?.desc || (repo.description ? repo.description.toLowerCase() : 'no description yet');
  const stack = override?.stack || (repo.language ? `\`${repo.language}\`` : '');
  return `| ${emoji} [**${repo.name}**](${repo.html_url}) | ${desc} | ${stack} |`;
}

async function main() {
  const starred = await fetchStarred();
  const ownRepos = starred.filter(r => r.owner.login.toLowerCase() === USERNAME.toLowerCase());

  if (ownRepos.length === 0) {
    console.log('No starred own-repos found — leaving README untouched.');
    return;
  }

  const rows = ownRepos.map(buildRow).join('\n');
  const table = `| repo | what it does | stack |\n|---|---|---|\n${rows}`;

  const readme = fs.readFileSync(README_PATH, 'utf8');
  const startIdx = readme.indexOf(START_MARKER);
  const endIdx = readme.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Markers not found in README.md — did you remove <!--START_SECTION:starred--> or the END one?');
  }

  const before = readme.slice(0, startIdx + START_MARKER.length);
  const after = readme.slice(endIdx);
  const updated = `${before}\n${table}\n${after}`;

  fs.writeFileSync(README_PATH, updated);
  console.log(`Updated Ship Log with ${ownRepos.length} starred repo(s).`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
