// Circall — webapp (no backend yet)
// -------------------------------------
// How this works, in plain terms:
// - There is NO sample family and NO pre-filled data. The app starts
//   empty. On first load you create your own circle, then add your
//   own members, help requests, chat, check-ins, money, and goals.
// - All data lives in your browser, in localStorage. That is why the
//   app is interactive, but each visitor sees their OWN empty circle.
// - Google login is NOT wired up here. See AUTH_CONFIG below.

// --- Google login: Firebase Authentication ---
// Firebase web config for project "a7---circall". This is the public
// web config (not a private key) — it is meant to live in client code.
// In Firebase Console, add your hosting domain to
// Authentication > Settings > Authorized domains, e.g.
// BarnesL5.github.io and localhost, or Google sign-in will be blocked.
const firebaseConfig = {
  apiKey: "AIzaSyCJHsJIk4jnIVr8HuxlckpCBqsT-VKlHVI",
  authDomain: "a7---circall.firebaseapp.com",
  projectId: "a7---circall",
  storageBucket: "a7---circall.firebasestorage.app",
  messagingSenderId: "249001053828",
  appId: "1:249001053828:web:94b4994aade0ce5b447cd1",
  measurementId: "G-TGN474ZGE6"
};
const AUTH_CONFIG = {
  authProvider: "firebase",
  enabled: true
};

let currentUser = null; // Firebase user, when signed in with Google

function initAuth() {
  try {
    if (typeof firebase === "undefined" || !firebase.apps || !firebase.apps.length) {
      if (typeof firebase !== "undefined") firebase.initializeApp(firebaseConfig);
      else return; // SDK did not load (offline / file://) — local profile still works
    }
    firebase.auth().onAuthStateChanged(function (user) {
      currentUser = user || null;
      updateAuthUI();
    });
  } catch (e) { /* stay on local profile if Firebase cannot start */ }
}

function updateAuthUI() {
  const btn = document.getElementById("googleBtn");
  const outBtn = document.getElementById("signOutBtn");
  const status = document.getElementById("authStatus");
  if (!btn) return;
  if (currentUser) {
    btn.hidden = true;
    if (outBtn) outBtn.hidden = false;
    if (status) status.textContent = "(signed in with Google as " + (currentUser.email || currentUser.displayName || "") + ")";
    const setupName = document.getElementById("setupYourName");
    if (setupName && !setupName.value && currentUser.displayName) setupName.value = currentUser.displayName;
    // Use the Google name for new chat/check-in posts if no local name was set.
    if (!state.you && currentUser.displayName) {
      state.you = currentUser.displayName;
      const who = document.getElementById("whoami");
      if (who) who.textContent = state.you;
    }
  } else {
    btn.hidden = false;
    if (outBtn) outBtn.hidden = true;
    if (status) status.textContent = "(local profile — sign in with Google to use your Google account)";
  }
}

function signInWithGoogle() {
  if (typeof firebase === "undefined" || !firebase.auth) {
    alert("Google sign-in could not load. Check your connection and try again on the hosted site (not a downloaded file).");
    return;
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).catch(function (err) {
    alert("Google sign-in failed: " + (err && err.message ? err.message : err) + "\nIf it says unauthorized domain, add this site's domain in Firebase Console > Authentication > Settings > Authorized domains.");
  });
}

function signOutGoogle() {
  if (typeof firebase !== "undefined" && firebase.auth) firebase.auth().signOut();
}

const STORAGE_KEY = "circall-webapp-v1";

// --- Empty first-run state. Nothing is seeded. ---
function emptyState() {
  return {
    circle: null, // { name, kind } once the user creates a circle
    you: "",
    members: [],
    availability: [],
    helpRequests: [],
    messages: [],
    checkins: [],
    stories: [],
    money: [],
    goals: [],
    nextId: 1
  };
}

// --- Load / save ---
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // If an old saved copy has sample data but no circle, start empty.
      if (parsed && parsed.circle) return parsed;
    }
  } catch (e) { /* if saved data is broken, fall back to empty */ }
  const fresh = emptyState();
  save(fresh);
  return fresh;
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = load();

// Small helper: keep user text safe when we put it on the page.
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function money(n) { return "$" + Number(n).toFixed(2); }

// --- Setup screen vs app screen ---
function showScreen() {
  const hasCircle = Boolean(state.circle);
  document.getElementById("setupScreen").hidden = hasCircle;
  document.getElementById("appScreen").hidden = !hasCircle;
  if (hasCircle) {
    document.getElementById("circleTitle").textContent = state.circle.name;
    document.getElementById("circleKind").textContent = "· " + state.circle.kind + " circle";
    document.getElementById("whoami").textContent = state.you;
    renderAll();
  }
}

document.getElementById("setupForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const circleName = document.getElementById("setupCircleName").value.trim();
  const kind = document.getElementById("setupKind").value;
  const yourName = document.getElementById("setupYourName").value.trim();
  if (!circleName || !yourName) return;

  state.circle = { name: circleName, kind: kind };
  state.you = yourName;
  // You are the first member. Family circles start as Adult;
  // group circles start as Leader.
  state.members.push({
    id: state.nextId++,
    name: yourName,
    role: kind === "Family" ? "Adult" : "Leader",
    you: true,
    sharing: { location: true, schedule: true, money: true }
  });
  save(state);
  showScreen();
});

// --- Render each tab (all empty until the user adds things) ---
function renderMembers() {
  const el = document.getElementById("members");
  el.innerHTML = state.members.length ? state.members.map(function (m) {
    return '<div class="card"><h3>' + esc(m.name) + (m.you ? " (you)" : "") +
      ' — ' + esc(m.role) + '</h3>' +
      '<div class="toggles">' +
      ["location", "schedule", "money"].map(function (key) {
        return '<label><input type="checkbox" data-member="' + m.id +
          '" data-share="' + key + '"' + (m.sharing[key] ? " checked" : "") +
          '> Share ' + key + '</label>';
      }).join("") +
      '</div></div>';
  }).join("") : "<p>No members yet — add your first member below.</p>";
}

function renderAvailability() {
  const el = document.getElementById("availability");
  el.innerHTML = state.availability.length ? state.availability.map(function (a) {
    return '<div class="card"><strong>' + esc(a.who) + '</strong> — ' + esc(a.when) +
      '<br>' + esc(a.note || "") + '</div>';
  }).join("") : "<p>No availability shared yet.</p>";
}

function unclaimedCount() {
  let n = 0;
  state.helpRequests.forEach(function (r) {
    r.parts.forEach(function (p) { if (!p.claimedBy && !p.done) n++; });
  });
  return n;
}

function renderHelp() {
  const badge = document.getElementById("helpBadge");
  const n = unclaimedCount();
  badge.textContent = n ? String(n) : "";
  const el = document.getElementById("helpBoard");
  el.innerHTML = state.helpRequests.length ? state.helpRequests.map(function (r) {
    return '<div class="card"><h3>' + esc(r.title) + '</h3>' +
      '<p class="small">For: ' + esc(r.who) + '</p>' +
      r.parts.map(function (p) {
        const status = p.done ? "Done ✓" : (p.claimedBy ? "Claimed by " + esc(p.claimedBy) : "Unclaimed");
        let btns = "";
        if (!p.claimedBy && !p.done) {
          btns = '<button type="button" class="small-btn" data-claim="' + p.id + '">Claim</button>';
        } else if (p.claimedBy && !p.done) {
          btns = '<button type="button" class="small-btn" data-done="' + p.id + '">Done</button> ' +
                 '<button type="button" class="small-btn secondary" data-release="' + p.id + '">Release</button>';
        }
        return '<div class="part' + (p.done ? " done" : "") + '"><span>' + esc(p.label) +
          ' — ' + status + '</span><span>' + btns + '</span></div>';
      }).join("") + '</div>';
  }).join("") : "<p>No help requests yet. Post one below.</p>";
}

function renderChat() {
  document.getElementById("chatLog").innerHTML = state.messages.length
    ? state.messages.map(function (m) {
        return "<p><strong>" + esc(m.who) + ":</strong> " + esc(m.text) + "</p>";
      }).join("")
    : "<p>No messages yet.</p>";
}

function renderCheckins() {
  document.getElementById("checkins").innerHTML = state.checkins.length
    ? state.checkins.map(function (c) {
        return '<div class="card"><strong>' + esc(c.who) + '</strong> is at ' + esc(c.where) +
          ' <span class="small">(' + esc(c.when) + ')</span></div>';
      }).join("")
    : "<p>No check-ins yet.</p>";
  document.getElementById("stories").innerHTML = state.stories.length
    ? state.stories.map(function (s) {
        return '<div class="card"><strong>' + esc(s.who) + '</strong><p>' + esc(s.text) + '</p></div>';
      }).join("")
    : "<p>No Stories yet.</p>";
}

function renderMoney() {
  const total = state.money.reduce(function (sum, m) { return sum + Number(m.amount); }, 0);
  const perPerson = state.members.length ? total / state.members.length : 0;
  document.getElementById("moneySummary").innerHTML =
    '<div class="card"><strong>Total spent: ' + money(total) + '</strong><br>' +
    'Even split (' + state.members.length + ' people): ' + money(perPerson) + ' each</div>';
  document.getElementById("moneyLog").innerHTML = state.money.length
    ? state.money.map(function (m) {
        return '<div class="card">' + esc(m.what) + ' — <strong>' + money(m.amount) +
          '</strong> <span class="small">paid by ' + esc(m.paidBy) + '</span></div>';
      }).join("")
    : "<p>No money entries yet.</p>";
}

function renderGoals() {
  document.getElementById("goals").innerHTML = state.goals.length
    ? state.goals.map(function (g) {
        const pct = Math.min(100, Math.round((g.current / g.target) * 100));
        return '<div class="card"><h3>' + esc(g.title) + '</h3>' +
          '<p>' + g.current + ' of ' + g.target + ' (' + pct + '%)</p>' +
          '<div class="progress"><div style="width:' + pct + '%"></div></div>' +
          '<p><button type="button" class="small-btn" data-goal-plus="' + g.id + '">+1 progress</button></p></div>';
      }).join("")
    : "<p>No goals yet.</p>";
}

function renderAll() {
  renderMembers();
  renderAvailability();
  renderHelp();
  renderChat();
  renderCheckins();
  renderMoney();
  renderGoals();
}

// --- Tabs ---
document.querySelectorAll(".tabs button").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".tabs button").forEach(function (b) { b.classList.remove("active"); });
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// --- Sharing toggles + help-board buttons (one listener for the whole page) ---
document.addEventListener("click", function (e) {
  const t = e.target;

  // Sharing toggle
  if (t.matches("[data-share]")) {
    const m = state.members.find(function (x) { return x.id === Number(t.dataset.member); });
    if (m) { m.sharing[t.dataset.share] = t.checked; save(state); }
    return;
  }
  // Find a help part by id, across all requests
  function findPart(id) {
    for (const r of state.helpRequests) {
      const p = r.parts.find(function (x) { return x.id === Number(id); });
      if (p) return p;
    }
    return null;
  }
  if (t.matches("[data-claim]")) {
    const p = findPart(t.dataset.claim);
    if (p) { p.claimedBy = state.you; save(state); renderHelp(); }
  }
  if (t.matches("[data-release]")) {
    const p = findPart(t.dataset.release);
    if (p) { p.claimedBy = null; save(state); renderHelp(); }
  }
  if (t.matches("[data-done]")) {
    const p = findPart(t.dataset.done);
    if (p) { p.done = true; save(state); renderHelp(); }
  }
  if (t.matches("[data-goal-plus]")) {
    const g = state.goals.find(function (x) { return x.id === Number(t.dataset.goalPlus); });
    if (g) { g.current += 1; save(state); renderGoals(); }
  }
});

// --- Forms ---
function onSubmit(id, fn) {
  document.getElementById(id).addEventListener("submit", function (e) {
    e.preventDefault();
    fn();
    save(state);
    renderAll();
    e.target.reset();
  });
}

onSubmit("inviteForm", function () {
  // No real invite is sent yet. The person joins this circle right away, on this device.
  state.members.push({
    id: state.nextId++,
    name: document.getElementById("inviteName").value.trim(),
    role: document.getElementById("inviteRole").value,
    sharing: { location: true, schedule: true, money: true }
  });
});

onSubmit("availForm", function () {
  state.availability.push({
    id: state.nextId++,
    who: document.getElementById("availWho").value.trim(),
    when: document.getElementById("availWhen").value.trim(),
    note: document.getElementById("availNote").value.trim()
  });
});

onSubmit("helpForm", function () {
  const parts = document.getElementById("helpParts").value
    .split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  state.helpRequests.push({
    id: state.nextId++,
    title: document.getElementById("helpTitle").value.trim(),
    who: document.getElementById("helpWho").value.trim(),
    parts: parts.map(function (label) {
      return { id: state.nextId++, label: label, claimedBy: null, done: false };
    })
  });
});

onSubmit("chatForm", function () {
  state.messages.push({
    id: state.nextId++,
    who: state.you,
    text: document.getElementById("chatInput").value.trim()
  });
});

onSubmit("checkinForm", function () {
  state.checkins.push({
    id: state.nextId++,
    who: state.you,
    where: document.getElementById("checkinWhere").value.trim(),
    when: "Just now"
  });
});

onSubmit("storyForm", function () {
  // Stories are text updates in this version. No photo/video upload yet.
  state.stories.push({
    id: state.nextId++,
    who: state.you,
    text: document.getElementById("storyInput").value.trim()
  });
});

onSubmit("moneyForm", function () {
  state.money.push({
    id: state.nextId++,
    what: document.getElementById("moneyWhat").value.trim(),
    amount: parseFloat(document.getElementById("moneyAmount").value) || 0,
    paidBy: document.getElementById("moneyWho").value.trim()
  });
});

onSubmit("goalForm", function () {
  state.goals.push({
    id: state.nextId++,
    title: document.getElementById("goalTitle").value.trim(),
    current: 0,
    target: parseInt(document.getElementById("goalTarget").value, 10) || 1
  });
});

// --- Delete circle and start over ---
document.getElementById("freshBtn").addEventListener("click", function () {
  if (confirm("Delete this circle and start over? This clears everything on this device.")) {
    state = emptyState();
    save(state);
    showScreen();
  }
});

// --- Google sign-in buttons ---
document.getElementById("googleBtn").addEventListener("click", signInWithGoogle);
document.getElementById("signOutBtn").addEventListener("click", signOutGoogle);
const setupGoogleBtn = document.getElementById("googleBtnSetup");
if (setupGoogleBtn) setupGoogleBtn.addEventListener("click", signInWithGoogle);

// First paint: setup screen if no circle yet, otherwise the app.
showScreen();
initAuth();
updateAuthUI();
