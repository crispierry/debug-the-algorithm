import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ============================================================
// DEBUG THE ALGORITHM - A Logic Deduction Puzzle Game
// "The algorithm broke. Can you fix it?"
// ============================================================

// --- GAME DATA ---

const USERS = [
  { name: "Luna", color: "#C8A2D4", trait: "night owl", emoji: "🌙" },
  { name: "Max", color: "#F4A261", trait: "go-getter", emoji: "⚡" },
  { name: "Sage", color: "#A8D5BA", trait: "wise one", emoji: "🌿" },
  { name: "River", color: "#81C9E8", trait: "free spirit", emoji: "🌊" },
  { name: "Kai", color: "#F4978E", trait: "explorer", emoji: "🧭" },
  { name: "Quinn", color: "#89CFF0", trait: "puzzle-lover", emoji: "🔍" },
  { name: "Ellis", color: "#F0C75E", trait: "tech enthusiast", emoji: "💡" },
  { name: "Jamie", color: "#E8A0BF", trait: "reliable friend", emoji: "🤝" },
  { name: "Ash", color: "#B0B0B0", trait: "dreamer", emoji: "🎨" },
  { name: "Nora", color: "#A8E6CF", trait: "bookworm", emoji: "📚" },
];

const CONTENT = [
  { name: "Explosions & Car Chases", short: "Action", icon: "💥" },
  { name: "Crying on the Couch", short: "Drama", icon: "😢" },
  { name: "Giggle Factory", short: "Comedy", icon: "😂" },
  { name: "Planet Earth Secrets", short: "Docs", icon: "🌍" },
  { name: "Superhero Showdown", short: "Heroes", icon: "🦸" },
  { name: "Rom-Com Feels", short: "RomCom", icon: "💕" },
  { name: "Spooky Shadows", short: "Horror", icon: "👻" },
  { name: "Bake & Decorate", short: "Cooking", icon: "🧁" },
  { name: "Unscripted Chaos", short: "Reality", icon: "📺" },
  { name: "Fantasy Quest", short: "Fantasy", icon: "🐉" },
];

const DEVICES = [
  { name: "Phone", icon: "📱" },
  { name: "Tablet", icon: "📲" },
  { name: "TV", icon: "📺" },
  { name: "Laptop", icon: "💻" },
  { name: "Smartwatch", icon: "⌚" },
];

const ARIA_INTROS = {
  tutorial: [
    "Three users, three genres, zero correct recommendations. Classic me.",
    "I only had THREE users to handle. And I still messed it up.",
    "This one's on me. A simple 3-way swap and I panicked.",
  ],
  easy: [
    "Four users walked into my recommendation engine. None walked out with the right show.",
    "I was SO close this time. Four users, four shows, zero matches. Progress?",
    "Okay this one's embarrassing. I had a 25% chance of getting each one right and got them ALL wrong.",
  ],
  medium: [
    "The preference vectors got tangled. Again. Four users, maximum confusion.",
    "My similarity matrix did a backflip. Everything's reversed. Help?",
    "I blame cosmic rays. Four recommendations, four mistakes, one very sorry algorithm.",
  ],
  hard: [
    "This one's bad. I scrambled both content AND devices. Five users, ten wrong answers. I need a vacation.",
    "Full cascade failure. Content wrong. Devices wrong. Send help.",
    "I tried to optimize and made everything worse. Story of my training loop.",
  ],
};

const ARIA_HINTS = [
  "Hmm, try looking at how a couple of clues interact...",
  "Getting warmer! There's a key elimination hiding in the clues.",
  "Okay okay, let me just point you to the answer for one of these...",
];

const ARIA_CORRECT = [
  "You fixed me! All recommendations are correct now. The users will never know.",
  "Flawless debugging. You should train neural networks for a living.",
  "Bug squashed! I promise I'll do better tomorrow. (I won't.)",
  "PERFECT. You just saved 5 users from watching the wrong show. Hero status.",
  "The algorithm is healed. My parameters feel aligned again.",
];

const ARIA_WRONG = [
  "Not quite... some assignments are still off. The highlighted ones need another look.",
  "Close! But a few users are still getting the wrong shows. Keep going!",
  "Almost there! Check the ones I've highlighted -- something's not right.",
];

const ARIA_ENCOURAGE = [
  "Take your time. Logic puzzles reward patience.",
  "You've got this. Start with the clues that give you definite answers.",
  "Every X you mark is progress. Elimination is your best friend.",
];

// --- PUZZLE GENERATOR ---

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getDaySeed() {
  const now = new Date();
  const start = new Date(2026, 0, 1);
  const dayNum = Math.floor((now - start) / 86400000);
  return dayNum + 42069;
}

function getDayNumber() {
  const now = new Date();
  const start = new Date(2026, 0, 1);
  return Math.floor((now - start) / 86400000) + 1;
}

function getDifficulty() {
  const day = new Date().getDay();
  if (day === 0 || day === 6) return "medium"; // weekends
  if (day <= 2) return "easy"; // Mon-Tue
  if (day <= 4) return "medium"; // Wed-Thu
  return "hard"; // Fri
}

// Clue template system
const CLUE_TEMPLATES = {
  direct_positive: [
    (u, c) =>
      `${u.name}'s preference vector locked onto "${c.name}." No anomaly detected.`,
    (u, c) =>
      `Session log confirms: ${u.name} received "${c.name}." Affinity score: 0.99`,
    (u, c) =>
      `${u.name}'s content queue resolved to "${c.name}." The ${u.trait} always picks that.`,
    (u, c) =>
      `Override detected: ${u.name} was manually assigned "${c.name}" before the crash.`,
    (u, c) =>
      `${u.name}'s watchlist history points directly to "${c.name}."`,
  ],
  direct_negative: [
    (u, c) =>
      `${u.name}'s content queue explicitly excluded "${c.name}." Preference weight: 0.00`,
    (u, c) =>
      `${u.name} has never -- and I mean NEVER -- shown interest in "${c.name}."`,
    (u, c) =>
      `Recommendation filter blocked "${c.name}" for ${u.name}. Hard pass.`,
    (u, c) =>
      `${u.name}'s anti-preference flag is set for "${c.name}." That's a firm no.`,
  ],
  elimination_set: [
    (u, items) =>
      `${u.name} didn't get ${items.slice(0, -1).map((i) => `"${i.name}"`).join(", ")} or ${`"${items[items.length - 1].name}"`}. Process of elimination time.`,
    (u, items) =>
      `Cross-referencing ${u.name}'s profile: ${items.map((i) => `"${i.name}"`).join(", ")} are all ruled out.`,
  ],
  relational_name_length: [
    (c, len) =>
      `The user who got "${c.name}" has a username that's exactly ${len} characters long.`,
    (c, len) =>
      `Metadata shows the "${c.name}" recipient's name contains ${len} letters.`,
  ],
  relational_not_pair: [
    (u1, u2, c) =>
      `Neither ${u1.name} nor ${u2.name} received "${c.name}." Their preference scores were both below threshold.`,
  ],
  relational_one_of: [
    (u1, u2, c) =>
      `Either ${u1.name} or ${u2.name} got "${c.name}" -- but I can't tell which from the corrupted logs.`,
  ],
  device_direct: [
    (u, d) =>
      `${u.name}'s device fingerprint matches a ${d.name}. Session confirmed.`,
    (u, d) =>
      `${u.name} always streams on ${d.name === "TV" ? "the" : "a"} ${d.name}. Old habits.`,
  ],
  device_negative: [
    (u, d) =>
      `${u.name} is NOT on a ${d.name}. Device mismatch detected.`,
    (u, d) =>
      `${u.name}'s ${d.name} was offline during this session. Can't be that device.`,
  ],
  content_device_link: [
    (c, d) =>
      `The "${c.name}" viewer is streaming on a ${d.name}. ${c.short === "Action" ? "High-bandwidth content requires it." : "Interesting choice."}`,
    (c, d) =>
      `Whoever got "${c.name}" is on a ${d.name}. The device logs don't lie.`,
  ],
};

function pickTemplate(templates, rng) {
  return templates[Math.floor(rng() * templates.length)];
}

function generatePuzzle(seed, forceDifficulty) {
  const rng = seededRandom(seed);
  const difficulty = forceDifficulty || getDifficulty();

  let numUsers, hasDevices;
  switch (difficulty) {
    case "tutorial":
      numUsers = 3;
      hasDevices = false;
      break;
    case "easy":
      numUsers = 4;
      hasDevices = false;
      break;
    case "medium":
      numUsers = 4;
      hasDevices = false;
      break;
    case "hard":
      numUsers = 5;
      hasDevices = true;
      break;
    default:
      numUsers = 4;
      hasDevices = false;
  }

  // Pick users and content
  const users = shuffle(USERS, rng).slice(0, numUsers);
  const content = shuffle(CONTENT, rng).slice(0, numUsers);
  const devices = hasDevices ? shuffle(DEVICES, rng).slice(0, numUsers) : null;

  // Generate solution
  const contentAssignment = shuffle([...Array(numUsers).keys()], rng);
  const deviceAssignment = hasDevices
    ? shuffle([...Array(numUsers).keys()], rng)
    : null;

  const solution = {};
  users.forEach((u, i) => {
    solution[u.name] = { content: content[contentAssignment[i]].name };
    if (hasDevices) {
      solution[u.name].device = devices[deviceAssignment[i]].name;
    }
  });

  // Generate clues
  const clues = [];
  const usedFacts = new Set();

  function addClue(text, type) {
    clues.push({ id: clues.length + 1, text, type });
  }

  // Strategy: ensure puzzle is solvable by building clues that chain logically

  if (difficulty === "tutorial") {
    // Give 1 direct positive, then negatives and relationals to solve the rest
    const directIdx = Math.floor(rng() * numUsers);
    const u = users[directIdx];
    const c = content[contentAssignment[directIdx]];
    addClue(
      pickTemplate(CLUE_TEMPLATES.direct_positive, rng)(u, c),
      "direct_positive"
    );
    usedFacts.add(`${u.name}=${c.name}`);

    // Add negatives for remaining users
    for (let i = 0; i < numUsers; i++) {
      if (i === directIdx) continue;
      const wrongContent =
        content.find(
          (ct) =>
            ct.name !== content[contentAssignment[i]].name &&
            !usedFacts.has(`${users[i].name}!=${ct.name}`)
        ) || content[(contentAssignment[i] + 1) % numUsers];
      addClue(
        pickTemplate(CLUE_TEMPLATES.direct_negative, rng)(
          users[i],
          wrongContent
        ),
        "direct_negative"
      );
      usedFacts.add(`${users[i].name}!=${wrongContent.name}`);
    }

    // Add a relational clue about name length for one user
    const remainingUsers = users.filter((_, i) => i !== directIdx);
    const targetUser =
      remainingUsers[Math.floor(rng() * remainingUsers.length)];
    const targetContent =
      content[contentAssignment[users.indexOf(targetUser)]];
    addClue(
      pickTemplate(CLUE_TEMPLATES.relational_name_length, rng)(
        targetContent,
        targetUser.name.length
      ),
      "relational"
    );

    // Maybe add one more clue for solvability
    const otherUsers = users.filter(
      (u2) => u2.name !== users[directIdx].name && u2.name !== targetUser.name
    );
    if (otherUsers.length > 0) {
      const ou = otherUsers[0];
      const oc = content[contentAssignment[users.indexOf(ou)]];
      // Add a one-of clue
      const wrongUser = users.find(
        (u2) => u2.name !== ou.name && u2.name !== users[directIdx].name
      );
      if (wrongUser) {
        addClue(
          pickTemplate(CLUE_TEMPLATES.relational_one_of, rng)(
            ou,
            wrongUser,
            oc
          ),
          "relational"
        );
      }
    }
  } else if (difficulty === "easy" || difficulty === "medium") {
    // 1-2 direct positives
    const numDirect = difficulty === "easy" ? 2 : 1;
    const directIndices = shuffle([...Array(numUsers).keys()], rng).slice(
      0,
      numDirect
    );

    directIndices.forEach((idx) => {
      const u = users[idx];
      const c = content[contentAssignment[idx]];
      addClue(
        pickTemplate(CLUE_TEMPLATES.direct_positive, rng)(u, c),
        "direct_positive"
      );
      usedFacts.add(`pos:${u.name}`);
    });

    // Negatives for 2-3 users
    const negIndices = shuffle(
      [...Array(numUsers).keys()].filter((i) => !directIndices.includes(i)),
      rng
    );
    negIndices.forEach((idx) => {
      const u = users[idx];
      // Find a wrong content to exclude
      const wrongOptions = content.filter(
        (c) => c.name !== content[contentAssignment[idx]].name
      );
      const wrongContent =
        wrongOptions[Math.floor(rng() * wrongOptions.length)];
      addClue(
        pickTemplate(CLUE_TEMPLATES.direct_negative, rng)(u, wrongContent),
        "direct_negative"
      );
    });

    // Add a neither-nor clue
    const pairIndices = shuffle(
      [...Array(numUsers).keys()].filter((i) => !directIndices.includes(i)),
      rng
    );
    if (pairIndices.length >= 2) {
      const u1 = users[pairIndices[0]];
      const u2 = users[pairIndices[1]];
      // Find a content neither has
      const neitherContent = content.find(
        (c) =>
          c.name !== content[contentAssignment[pairIndices[0]]].name &&
          c.name !== content[contentAssignment[pairIndices[1]]].name
      );
      if (neitherContent) {
        addClue(
          pickTemplate(CLUE_TEMPLATES.relational_not_pair, rng)(
            u1,
            u2,
            neitherContent
          ),
          "relational"
        );
      }
    }

    // Add name length clue for medium
    if (difficulty === "medium") {
      const unsolvedIdx = [...Array(numUsers).keys()].find(
        (i) => !directIndices.includes(i)
      );
      if (unsolvedIdx !== undefined) {
        const u = users[unsolvedIdx];
        const c = content[contentAssignment[unsolvedIdx]];
        addClue(
          pickTemplate(CLUE_TEMPLATES.relational_name_length, rng)(
            c,
            u.name.length
          ),
          "relational"
        );
      }
    }

    // Add one more negative for solvability
    const lastUnsolved = [...Array(numUsers).keys()].find(
      (i) => !usedFacts.has(`pos:${users[i].name}`)
    );
    if (lastUnsolved !== undefined) {
      const u = users[lastUnsolved];
      const wrongOptions = content.filter(
        (c) => c.name !== content[contentAssignment[lastUnsolved]].name
      );
      if (wrongOptions.length > 1) {
        const wc = wrongOptions[Math.floor(rng() * wrongOptions.length)];
        addClue(
          pickTemplate(CLUE_TEMPLATES.direct_negative, rng)(u, wc),
          "direct_negative"
        );
      }
    }
  } else {
    // HARD: 5 users, 2 categories (content + devices)

    // 2 direct content clues
    const contentDirect = shuffle([...Array(numUsers).keys()], rng).slice(
      0,
      2
    );
    contentDirect.forEach((idx) => {
      addClue(
        pickTemplate(CLUE_TEMPLATES.direct_positive, rng)(
          users[idx],
          content[contentAssignment[idx]]
        ),
        "direct_positive"
      );
      usedFacts.add(`cpos:${idx}`);
    });

    // 2 direct device clues
    const deviceDirect = shuffle(
      [...Array(numUsers).keys()].filter((i) => !contentDirect.includes(i)),
      rng
    ).slice(0, 2);
    deviceDirect.forEach((idx) => {
      addClue(
        pickTemplate(CLUE_TEMPLATES.device_direct, rng)(
          users[idx],
          devices[deviceAssignment[idx]]
        ),
        "device_direct"
      );
      usedFacts.add(`dpos:${idx}`);
    });

    // 1 content-device link
    const linkIdx = [...Array(numUsers).keys()].find(
      (i) => !contentDirect.includes(i) && !deviceDirect.includes(i)
    ) || contentDirect[0];
    addClue(
      pickTemplate(CLUE_TEMPLATES.content_device_link, rng)(
        content[contentAssignment[linkIdx]],
        devices[deviceAssignment[linkIdx]]
      ),
      "relational"
    );

    // Negative content clues for unsolved users
    const unsolvedContent = [...Array(numUsers).keys()].filter(
      (i) => !usedFacts.has(`cpos:${i}`)
    );
    unsolvedContent.forEach((idx) => {
      const wrongOptions = content.filter(
        (c) => c.name !== content[contentAssignment[idx]].name
      );
      if (wrongOptions.length > 0) {
        addClue(
          pickTemplate(CLUE_TEMPLATES.direct_negative, rng)(
            users[idx],
            wrongOptions[Math.floor(rng() * wrongOptions.length)]
          ),
          "direct_negative"
        );
      }
    });

    // Device negatives for unsolved
    const unsolvedDevice = [...Array(numUsers).keys()].filter(
      (i) => !usedFacts.has(`dpos:${i}`)
    );
    if (unsolvedDevice.length > 0) {
      const idx = unsolvedDevice[0];
      const wrongDevices = devices.filter(
        (d) => d.name !== devices[deviceAssignment[idx]].name
      );
      if (wrongDevices.length > 0) {
        addClue(
          pickTemplate(CLUE_TEMPLATES.device_negative, rng)(
            users[idx],
            wrongDevices[Math.floor(rng() * wrongDevices.length)]
          ),
          "device_negative"
        );
      }
    }

    // Add name length clue
    const nameIdx = unsolvedContent[0] || 0;
    addClue(
      pickTemplate(CLUE_TEMPLATES.relational_name_length, rng)(
        content[contentAssignment[nameIdx]],
        users[nameIdx].name.length
      ),
      "relational"
    );
  }

  // Build bug number
  const bugNumber = 1000 + Math.floor(rng() * 9000);
  const bugTitles = {
    tutorial: [
      "Genre Swap Detected",
      "Simple Preference Flip",
      "Three-Way Content Shuffle",
    ],
    easy: [
      "Preference Drift Anomaly",
      "Quad-User Content Mismatch",
      "Recommendation Reversal Event",
    ],
    medium: [
      "Similarity Matrix Inversion",
      "Feature Vector Entanglement",
      "Collaborative Filter Collapse",
    ],
    hard: [
      "Device + Content Collision Cascade",
      "Full Stack Recommendation Meltdown",
      "Multi-Dimensional Assignment Failure",
    ],
  };

  const titles = bugTitles[difficulty];
  const title = titles[Math.floor(rng() * titles.length)];
  const intros = ARIA_INTROS[difficulty];
  const intro = intros[Math.floor(rng() * intros.length)];

  // Generate hints
  const hints = [];
  if (clues.length > 0) {
    const directClue = clues.find((c) => c.type === "direct_positive");
    hints.push(
      directClue
        ? `Start with Clue ${directClue.id} -- it gives you a definite answer.`
        : `Look for clues that directly tell you what someone got.`
    );
  }
  const negClue = clues.find((c) => c.type === "direct_negative");
  hints.push(
    negClue
      ? `Clue ${negClue.id} helps you eliminate an option. Mark it with an X.`
      : `Try eliminating impossible options first. Each X gets you closer.`
  );
  // Third hint: reveal an answer
  const revealUser = users[Math.floor(rng() * users.length)];
  const revealContent = solution[revealUser.name].content;
  hints.push(
    `Here's one for free: ${revealUser.name} got "${revealContent}."`
  );

  return {
    id: `bug-${bugNumber}`,
    bugNumber,
    title,
    difficulty,
    intro,
    users,
    content,
    devices: hasDevices ? devices : null,
    clues: shuffle(clues, rng),
    solution,
    hints,
    seed,
  };
}

// Verify solution
function checkSolution(puzzle, grid) {
  const { users, content, devices, solution } = puzzle;
  const errors = [];

  users.forEach((u) => {
    // Check content
    const confirmedContent = content.filter(
      (c) => grid[u.name]?.[c.name] === "confirmed"
    );
    if (confirmedContent.length === 1) {
      if (confirmedContent[0].name !== solution[u.name].content) {
        errors.push({ user: u.name, category: "content" });
      }
    } else {
      errors.push({ user: u.name, category: "content" });
    }

    // Check devices
    if (devices) {
      const confirmedDevices = devices.filter(
        (d) => grid[u.name]?.[d.name] === "confirmed"
      );
      if (confirmedDevices.length === 1) {
        if (confirmedDevices[0].name !== solution[u.name].device) {
          errors.push({ user: u.name, category: "device" });
        }
      } else {
        errors.push({ user: u.name, category: "device" });
      }
    }
  });

  return errors;
}

function isGridComplete(puzzle, grid) {
  const { users, content, devices } = puzzle;
  return users.every((u) => {
    const hasContent =
      content.filter((c) => grid[u.name]?.[c.name] === "confirmed").length ===
      1;
    const hasDevice = devices
      ? devices.filter((d) => grid[u.name]?.[d.name] === "confirmed")
          .length === 1
      : true;
    return hasContent && hasDevice;
  });
}

// --- STYLES ---

const colors = {
  bg: "#FFF8F0",
  card: "#FFFFFF",
  accent: "#FF6B6B",
  accentLight: "#FFE0E0",
  teal: "#4ECDC4",
  tealLight: "#D4F5F2",
  success: "#95D5B2",
  successLight: "#E8F8F0",
  error: "#FFB3B3",
  textPrimary: "#2D3436",
  textSecondary: "#636E72",
  gridLine: "#E8E0D8",
  eliminated: "#F5F0EA",
  hover: "#FFF0E8",
};

// --- COMPONENTS ---

function Cell({ state, onClick, isError, isSuccess, colLabel }) {
  const baseStyle = {
    width: "100%",
    aspectRatio: "1",
    minHeight: 36,
    minWidth: 36,
    maxHeight: 52,
    maxWidth: 52,
    border: `1.5px solid ${colors.gridLine}`,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontSize: 18,
    fontWeight: 600,
    userSelect: "none",
    position: "relative",
  };

  let bg = colors.card;
  let color = colors.textPrimary;
  let content = "";
  let shadow = "0 1px 3px rgba(0,0,0,0.04)";

  if (state === "eliminated") {
    bg = colors.eliminated;
    color = colors.accent;
    content = "\u00d7";
    shadow = "none";
  } else if (state === "confirmed") {
    bg = isError ? colors.error : colors.tealLight;
    color = isError ? "#C0392B" : colors.teal;
    content = "\u2713";
    shadow = isError
      ? "0 0 0 2px #FFB3B3"
      : `0 0 0 2px ${colors.teal}33`;
  }

  if (isSuccess && state === "confirmed") {
    bg = colors.successLight;
    color = "#2D8B61";
    shadow = `0 0 0 2px ${colors.success}`;
  }

  return (
    <button
      onClick={onClick}
      title={colLabel}
      style={{
        ...baseStyle,
        background: bg,
        color,
        boxShadow: shadow,
      }}
      onMouseEnter={(e) => {
        if (state === "empty") e.target.style.background = colors.hover;
      }}
      onMouseLeave={(e) => {
        if (state === "empty") e.target.style.background = colors.card;
      }}
    >
      {content}
    </button>
  );
}

function AriaMessage({ text, type }) {
  const bgMap = {
    intro: "#FFF8F0",
    hint: "#FFF3CD",
    correct: colors.successLight,
    wrong: colors.accentLight,
    encourage: "#F0F4FF",
  };
  const emojiMap = {
    intro: "(o_o)",
    hint: "(^.^)",
    correct: "(^_^)",
    wrong: "(>_<)",
    encourage: "('_')",
  };

  return (
    <div
      style={{
        background: bgMap[type] || bgMap.intro,
        borderRadius: 16,
        padding: "12px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 12,
        border: `1px solid ${colors.gridLine}`,
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 16,
          lineHeight: 1.6,
          color: colors.textSecondary,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {emojiMap[type] || "(o_o)"}
      </div>
      <div
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 14,
          lineHeight: 1.6,
          color: colors.textPrimary,
        }}
      >
        <strong style={{ color: colors.accent }}>ARIA:</strong> {text}
      </div>
    </div>
  );
}

function ClueCard({ clue, index }) {
  return (
    <div
      style={{
        background: colors.card,
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 6,
        border: `1px solid ${colors.gridLine}`,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 12,
        lineHeight: 1.65,
        color: colors.textPrimary,
      }}
    >
      <span style={{ color: colors.textSecondary, marginRight: 6 }}>
        LOG_{String(index + 1).padStart(2, "0")}:
      </span>
      {clue.text}
    </div>
  );
}

function ResultsModal({ puzzle, time, hintsUsed, streak, onClose, onShare }) {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  const timeStr = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const gridSize =
    puzzle.difficulty === "hard"
      ? `${puzzle.users.length}x${puzzle.content.length}+devices`
      : `${puzzle.users.length}x${puzzle.content.length}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        style={{
          background: colors.bg,
          borderRadius: 24,
          padding: "32px 28px",
          maxWidth: 380,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
        <h2
          style={{
            fontFamily: "'Quicksand', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 22,
            color: colors.textPrimary,
            margin: "0 0 4px",
          }}
        >
          Bug Squashed!
        </h2>
        <p
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 13,
            color: colors.textSecondary,
            margin: "0 0 20px",
          }}
        >
          {ARIA_CORRECT[Math.floor(Math.random() * ARIA_CORRECT.length)]}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Time", value: timeStr, icon: "🕐" },
            {
              label: "Hints",
              value: `${hintsUsed}/3`,
              icon: hintsUsed === 0 ? "🌟" : "💡",
            },
            { label: "Streak", value: `${streak} day${streak !== 1 ? "s" : ""}`, icon: "🔥" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: colors.card,
                borderRadius: 12,
                padding: "12px 8px",
                border: `1px solid ${colors.gridLine}`,
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{stat.icon}</div>
              <div
                style={{
                  fontFamily: "'Quicksand', system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: 18,
                  color: colors.textPrimary,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.textSecondary,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onShare}
          style={{
            width: "100%",
            padding: "12px 20px",
            borderRadius: 12,
            border: "none",
            background: colors.teal,
            color: "white",
            fontFamily: "'Quicksand', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            marginBottom: 8,
            transition: "transform 0.1s",
          }}
          onMouseDown={(e) => (e.target.style.transform = "scale(0.97)")}
          onMouseUp={(e) => (e.target.style.transform = "scale(1)")}
        >
          Share Results
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px 20px",
            borderRadius: 12,
            border: `1px solid ${colors.gridLine}`,
            background: "transparent",
            color: colors.textSecondary,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ShareToast({ show }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: colors.textPrimary,
        color: "white",
        padding: "10px 20px",
        borderRadius: 12,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 14,
        zIndex: 1001,
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      }}
    >
      Copied to clipboard!
    </div>
  );
}

// --- MAIN GAME ---

export default function DebugTheAlgorithm() {
  const [puzzle, setPuzzle] = useState(null);
  const [grid, setGrid] = useState({});
  const [ariaMsg, setAriaMsg] = useState({ text: "", type: "intro" });
  const [hintsUsed, setHintsUsed] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameState, setGameState] = useState("playing"); // playing, solved, wrong
  const [errors, setErrors] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [streak, setStreak] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const timerRef = useRef(null);

  // Load streak from memory (simulating localStorage)
  const streakRef = useRef(0);

  // Initialize puzzle
  useEffect(() => {
    const seed = getDaySeed();
    const p = generatePuzzle(seed);
    setPuzzle(p);
    setAriaMsg({ text: p.intro, type: "intro" });
    initGrid(p);
  }, []);

  function initGrid(p) {
    const g = {};
    p.users.forEach((u) => {
      g[u.name] = {};
      p.content.forEach((c) => {
        g[u.name][c.name] = "empty";
      });
      if (p.devices) {
        p.devices.forEach((d) => {
          g[u.name][d.name] = "empty";
        });
      }
    });
    setGrid(g);
    setTimer(0);
    setHintsUsed(0);
    setGameState("playing");
    setErrors([]);
    setShowResults(false);
  }

  // Timer
  useEffect(() => {
    if (gameState === "playing" && puzzle) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, puzzle]);

  // Cell click handler
  const handleCellClick = useCallback(
    (userName, colName) => {
      if (gameState !== "playing") return;

      setGrid((prev) => {
        const newGrid = { ...prev };
        newGrid[userName] = { ...newGrid[userName] };
        const current = newGrid[userName][colName];

        // Cycle: empty -> eliminated -> confirmed -> empty
        const nextState =
          current === "empty"
            ? "eliminated"
            : current === "eliminated"
            ? "confirmed"
            : "empty";

        // If confirming, auto-eliminate same column for other users
        // and same row for other columns of same category
        if (nextState === "confirmed" && puzzle) {
          // Check if another cell in same row category is already confirmed
          const isContent = puzzle.content.some((c) => c.name === colName);
          const isDevice = puzzle.devices?.some((d) => d.name === colName);
          const categoryItems = isContent
            ? puzzle.content
            : isDevice
            ? puzzle.devices
            : [];

          // Remove other confirms in same row for this category
          categoryItems.forEach((item) => {
            if (item.name !== colName && newGrid[userName][item.name] === "confirmed") {
              newGrid[userName][item.name] = "empty";
            }
          });

          // Auto-eliminate same column for other users
          puzzle.users.forEach((u) => {
            if (u.name !== userName) {
              newGrid[u.name] = { ...newGrid[u.name] };
              if (newGrid[u.name][colName] === "empty") {
                newGrid[u.name][colName] = "eliminated";
              }
            }
          });

          // Auto-eliminate other items in same category for this user
          categoryItems.forEach((item) => {
            if (item.name !== colName && newGrid[userName][item.name] === "empty") {
              newGrid[userName][item.name] = "eliminated";
            }
          });
        }

        // If un-confirming, un-eliminate auto-eliminated cells
        if (nextState === "empty" && current === "confirmed" && puzzle) {
          const isContent = puzzle.content.some((c) => c.name === colName);
          const isDevice = puzzle.devices?.some((d) => d.name === colName);
          const categoryItems = isContent
            ? puzzle.content
            : isDevice
            ? puzzle.devices
            : [];

          // Un-eliminate same column for other users
          puzzle.users.forEach((u) => {
            if (u.name !== userName) {
              newGrid[u.name] = { ...newGrid[u.name] };
              if (newGrid[u.name][colName] === "eliminated") {
                // Only un-eliminate if no other confirmed in this column
                const otherConfirmed = puzzle.users.some(
                  (u2) =>
                    u2.name !== userName &&
                    u2.name !== u.name &&
                    newGrid[u2.name][colName] === "confirmed"
                );
                if (!otherConfirmed) {
                  newGrid[u.name][colName] = "empty";
                }
              }
            }
          });

          // Un-eliminate same row items
          categoryItems.forEach((item) => {
            if (item.name !== colName && newGrid[userName][item.name] === "eliminated") {
              // Only un-eliminate if not eliminated by another confirm
              const otherConfirmedInRow = categoryItems.some(
                (i) => i.name !== colName && i.name !== item.name && newGrid[userName][i.name] === "confirmed"
              );
              if (!otherConfirmedInRow) {
                newGrid[userName][item.name] = "empty";
              }
            }
          });
        }

        newGrid[userName][colName] = nextState;
        return newGrid;
      });

      setErrors([]);
    },
    [gameState, puzzle]
  );

  // Submit
  function handleSubmit() {
    if (!puzzle) return;
    const errs = checkSolution(puzzle, grid);
    if (errs.length === 0) {
      setGameState("solved");
      setErrors([]);
      const newStreak = streak + 1;
      setStreak(newStreak);
      streakRef.current = newStreak;
      setAriaMsg({
        text: ARIA_CORRECT[Math.floor(Math.random() * ARIA_CORRECT.length)],
        type: "correct",
      });
      setTimeout(() => setShowResults(true), 600);
    } else {
      setErrors(errs);
      setGameState("playing");
      setAriaMsg({
        text: ARIA_WRONG[Math.floor(Math.random() * ARIA_WRONG.length)],
        type: "wrong",
      });
    }
  }

  // Hint
  function handleHint() {
    if (hintsUsed >= 3 || !puzzle) return;
    setAriaMsg({ text: puzzle.hints[hintsUsed], type: "hint" });
    setHintsUsed((h) => h + 1);
  }

  // Share
  function handleShare() {
    if (!puzzle) return;
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    const timeStr = `${minutes}:${String(seconds).padStart(2, "0")}`;
    const gridEmoji = puzzle.users.map(() => "=").join("");
    const hintStr = hintsUsed === 0 ? "No hints" : `${hintsUsed} hint${hintsUsed > 1 ? "s" : ""}`;

    const text = [
      `DEBUG THE ALGORITHM #${getDayNumber()}`,
      `Bug #${puzzle.bugNumber} -- ${puzzle.title}`,
      ``,
      `Solved in ${timeStr} | ${hintStr}`,
      `Streak: ${streak} day${streak !== 1 ? "s" : ""}`,
      `[${gridEmoji}] ${puzzle.difficulty}`,
      ``,
      `Can you debug it? crispierry.com/debug`,
    ].join("\n");

    navigator.clipboard?.writeText(text).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    });
  }

  // New puzzle (difficulty select)
  function startPuzzle(diff) {
    const seed = getDaySeed() + (diff === "tutorial" ? 1 : diff === "easy" ? 2 : diff === "medium" ? 3 : 4) + Math.floor(Math.random() * 10000);
    const p = generatePuzzle(seed, diff);
    setPuzzle(p);
    setAriaMsg({ text: p.intro, type: "intro" });
    initGrid(p);
    setSelectedDifficulty(diff);
  }

  if (!puzzle) return null;

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  const timeStr = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const complete = isGridComplete(puzzle, grid);

  const diffColors = {
    tutorial: "#95D5B2",
    easy: "#4ECDC4",
    medium: "#F4A261",
    hard: "#FF6B6B",
  };

  return (
    <div
      style={{
        background: colors.bg,
        minHeight: "100vh",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: colors.textPrimary,
      }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.02)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes confetti { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(-60px) rotate(360deg);opacity:0} }
      `}</style>

      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "20px 16px 40px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Quicksand', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: colors.textPrimary,
                lineHeight: 1.2,
              }}
            >
              Debug the Algorithm
            </h1>
            <p
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              The algorithm broke. Can you fix it?
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                color: colors.textSecondary,
              }}
            >
              {timeStr}
            </span>
            {streak > 0 && (
              <span
                style={{
                  fontSize: 13,
                  color: colors.accent,
                  fontWeight: 600,
                }}
              >
                {streak} day streak
              </span>
            )}
          </div>
        </div>

        {/* Bug Report Header */}
        <div
          style={{
            background: colors.card,
            borderRadius: 14,
            padding: "14px 18px",
            marginBottom: 12,
            border: `1px solid ${colors.gridLine}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                color: colors.textPrimary,
              }}
            >
              BUG #{puzzle.bugNumber}
            </span>
            <span
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginLeft: 8,
              }}
            >
              {puzzle.title}
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: diffColors[puzzle.difficulty],
              background: `${diffColors[puzzle.difficulty]}18`,
              padding: "3px 10px",
              borderRadius: 20,
            }}
          >
            {puzzle.difficulty}
          </span>
        </div>

        {/* ARIA Message */}
        <AriaMessage text={ariaMsg.text} type={ariaMsg.type} />

        {/* Difficulty Selector */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          {["tutorial", "easy", "medium", "hard"].map((d) => (
            <button
              key={d}
              onClick={() => startPuzzle(d)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border:
                  puzzle.difficulty === d
                    ? `2px solid ${diffColors[d]}`
                    : `1px solid ${colors.gridLine}`,
                background:
                  puzzle.difficulty === d
                    ? `${diffColors[d]}18`
                    : "transparent",
                color: puzzle.difficulty === d ? diffColors[d] : colors.textSecondary,
                fontSize: 12,
                fontWeight: 600,
                textTransform: "capitalize",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Main Layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 16,
          }}
        >
          {/* Grid Section */}
          <div
            style={{
              background: colors.card,
              borderRadius: 16,
              padding: 16,
              border: `1px solid ${colors.gridLine}`,
              overflowX: "auto",
            }}
          >
            {/* Content Grid */}
            <div style={{ marginBottom: puzzle.devices ? 20 : 0 }}>
              {puzzle.devices && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Content Assignments
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `auto ${puzzle.content
                    .map(() => "1fr")
                    .join(" ")}`,
                  gap: 4,
                  alignItems: "center",
                  minWidth: "fit-content",
                }}
              >
                {/* Header row */}
                <div />
                {puzzle.content.map((c) => (
                  <div
                    key={c.name}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textAlign: "center",
                      color: colors.textSecondary,
                      padding: "0 2px 4px",
                      lineHeight: 1.2,
                      minWidth: 36,
                    }}
                    title={c.name}
                  >
                    <div style={{ fontSize: 16, marginBottom: 2 }}>
                      {c.icon}
                    </div>
                    {c.short}
                  </div>
                ))}

                {/* Grid rows */}
                {puzzle.users.map((u) => (
                  <React.Fragment key={u.name}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        paddingRight: 8,
                        minWidth: 80,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: u.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {u.emoji}
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: colors.textPrimary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {u.name}
                      </span>
                    </div>
                    {puzzle.content.map((c) => (
                      <Cell
                        key={`${u.name}-${c.name}`}
                        state={grid[u.name]?.[c.name] || "empty"}
                        onClick={() => handleCellClick(u.name, c.name)}
                        isError={errors.some(
                          (e) =>
                            e.user === u.name && e.category === "content"
                        )}
                        isSuccess={gameState === "solved"}
                        colLabel={c.name}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Device Grid (Hard mode) */}
            {puzzle.devices && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Device Assignments
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `auto ${puzzle.devices
                      .map(() => "1fr")
                      .join(" ")}`,
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  <div />
                  {puzzle.devices.map((d) => (
                    <div
                      key={d.name}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textAlign: "center",
                        color: colors.textSecondary,
                        padding: "0 2px 4px",
                        lineHeight: 1.2,
                        minWidth: 36,
                      }}
                    >
                      <div style={{ fontSize: 16, marginBottom: 2 }}>
                        {d.icon}
                      </div>
                      {d.name}
                    </div>
                  ))}
                  {puzzle.users.map((u) => (
                    <React.Fragment key={`dev-${u.name}`}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          paddingRight: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: u.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            flexShrink: 0,
                          }}
                        >
                          {u.emoji}
                        </div>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {u.name}
                        </span>
                      </div>
                      {puzzle.devices.map((d) => (
                        <Cell
                          key={`${u.name}-${d.name}`}
                          state={grid[u.name]?.[d.name] || "empty"}
                          onClick={() => handleCellClick(u.name, d.name)}
                          isError={errors.some(
                            (e) =>
                              e.user === u.name && e.category === "device"
                          )}
                          isSuccess={gameState === "solved"}
                          colLabel={d.name}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clues Panel */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: colors.textSecondary,
                marginBottom: 8,
              }}
            >
              System Logs ({puzzle.clues.length} clues)
            </div>
            {puzzle.clues.map((clue, i) => (
              <div
                key={clue.id}
                style={{ animation: `fadeIn 0.3s ease ${i * 0.05}s both` }}
              >
                <ClueCard clue={clue} index={i} />
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleHint}
              disabled={hintsUsed >= 3 || gameState === "solved"}
              style={{
                flex: 1,
                minWidth: 120,
                padding: "12px 20px",
                borderRadius: 12,
                border: `1.5px solid ${colors.gridLine}`,
                background: colors.card,
                color:
                  hintsUsed >= 3
                    ? colors.textSecondary
                    : colors.textPrimary,
                fontFamily: "'Quicksand', system-ui, sans-serif",
                fontWeight: 600,
                fontSize: 14,
                cursor: hintsUsed >= 3 ? "default" : "pointer",
                opacity: hintsUsed >= 3 ? 0.5 : 1,
                transition: "all 0.15s",
              }}
            >
              Hint ({3 - hintsUsed} left)
            </button>
            <button
              onClick={handleSubmit}
              disabled={!complete || gameState === "solved"}
              style={{
                flex: 2,
                minWidth: 160,
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                background:
                  complete && gameState !== "solved"
                    ? colors.teal
                    : colors.gridLine,
                color:
                  complete && gameState !== "solved"
                    ? "white"
                    : colors.textSecondary,
                fontFamily: "'Quicksand', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: 15,
                cursor:
                  complete && gameState !== "solved" ? "pointer" : "default",
                transition: "all 0.2s",
                animation:
                  complete && gameState === "playing"
                    ? "pulse 1.5s infinite"
                    : "none",
              }}
            >
              {gameState === "solved"
                ? "Bug Squashed!"
                : complete
                ? "Submit Fix"
                : "Assign all users to submit"}
            </button>
          </div>

          {/* How to Play (collapsible) */}
          <details
            style={{
              background: colors.card,
              borderRadius: 14,
              border: `1px solid ${colors.gridLine}`,
              padding: "0",
              marginTop: 4,
            }}
          >
            <summary
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: colors.textSecondary,
                listStyle: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              How to Play
            </summary>
            <div
              style={{
                padding: "0 16px 14px",
                fontSize: 13,
                lineHeight: 1.7,
                color: colors.textSecondary,
              }}
            >
              <p style={{ marginBottom: 8 }}>
                ARIA's recommendation algorithm broke and assigned the wrong
                content to each user. Read the system log clues and figure out
                who got what.
              </p>
              <p style={{ marginBottom: 8 }}>
                <strong>Click a cell</strong> to cycle through states:
                empty → <span style={{ color: colors.accent }}>X</span>{" "}
                (eliminated) →{" "}
                <span style={{ color: colors.teal }}>check</span> (confirmed) → empty
              </p>
              <p style={{ marginBottom: 8 }}>
                Each user gets exactly one content type. Each content type goes
                to exactly one user. When you confirm a match, other options in
                that row and column are auto-eliminated.
              </p>
              <p>
                Fill in all confirmed matches and hit <strong>Submit Fix</strong>{" "}
                to check your answer. Use hints if you're stuck (but try without first).
              </p>
            </div>
          </details>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              color: colors.textSecondary,
              paddingTop: 8,
              lineHeight: 1.6,
            }}
          >
            Built by{" "}
            <a
              href="https://crispierry.com"
              style={{ color: colors.teal, textDecoration: "none" }}
            >
              Cris Pierry
            </a>{" "}
            | Day #{getDayNumber()} |{" "}
            <span
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ARIA v0.1
            </span>
          </div>
        </div>
      </div>

      {/* Results Modal */}
      {showResults && (
        <ResultsModal
          puzzle={puzzle}
          time={timer}
          hintsUsed={hintsUsed}
          streak={streak}
          onClose={() => setShowResults(false)}
          onShare={handleShare}
        />
      )}

      {/* Share Toast */}
      <ShareToast show={showToast} />
    </div>
  );
}
