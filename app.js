// Circall — webapp (Firestore for shared circles, localStorage fallback)
// ------------------------------------------------------------------------
// How this works, in plain terms:
// - There is NO sample family and NO pre-filled data. The app starts
//   empty. On first load you create your own circle, then add your
//   own members, help requests, chat, check-ins, money, and goals.
// - If you sign in with Google and create / join a SHARED circle, the
//   circle lives in Firestore (collection "circles", one document per
//   circle) and everyone who joins it sees the same thing, live.
// - If you are not signed in, or Firestore is not set up / not
//   reachable, the app falls back to saving only in this browser, in
//   localStorage. The header always says which mode you are in:
//   "Shared" or "On this device only".
// - Google login is Firebase Authentication. See AUTH_CONFIG below.

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

// --- Firestore (shared circles) ---
// db is null until Firebase starts and the Firestore SDK loads.
// sharedMode is true only when this browser is attached to a Firestore
// circle document. circleDocId is that document's id in "circles".
let db = null;
let sharedMode = false;
let circleDocId = null;
let circleUnsubscribe = null;
let applyingRemote = false; // true while applying a snapshot, so we don't echo it back
let saveTimer = null;

function initFirestore() {
  try {
    if (typeof firebase === "undefined" || !firebase.firestore) return null;
    db = firebase.firestore();
    return db;
  } catch (e) { db = null; return null; }
}

function initAuth() {
  try {
    if (typeof firebase === "undefined" || !firebase.apps || !firebase.apps.length) {
      if (typeof firebase !== "undefined") firebase.initializeApp(firebaseConfig);
      else return; // SDK did not load (offline / file://) — local profile still works
    }
    initFirestore();
    firebase.auth().onAuthStateChanged(function (user) {
      currentUser = user || null;
      updateAuthUI();
      // If we signed in and this browser already knew a shared circle
      // (from an earlier visit), re-attach to it so live updates resume.
      if (currentUser && !sharedMode) tryReattachShared();
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
// Which Firestore circle this browser is attached to, if any.
// Stored separately from the circle data so a sign-in on a later
// visit can re-attach to the same shared circle.
const SHARED_KEY = "circall-webapp-shared-v1";

// --- Empty first-run state. Nothing is seeded. ---
function emptyState() {
  return {
    circle: null, // { name, kind, id?, inviteCode?, ownerUid?, ownerName? } once created
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

// --- Shared-circle bookkeeping (which Firestore doc, if any) ---
function loadSharedMeta() {
  try {
    const raw = localStorage.getItem(SHARED_KEY);
    if (raw) { const p = JSON.parse(raw); if (p && p.docId) return p; }
  } catch (e) { /* ignore broken meta */ }
  return null;
}
function saveSharedMeta(meta) {
  try {
    if (meta) localStorage.setItem(SHARED_KEY, JSON.stringify(meta));
    else localStorage.removeItem(SHARED_KEY);
  } catch (e) { /* storage unavailable */ }
}

// Short 6-character invite code. Letters/digits only, skipping
// look-alikes (O, 0, I, 1) so it is easy to read out loud.
function makeInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// --- Load / save ---
// Local copy is ALWAYS saved, even for shared circles, so the app
// still opens (with the last seen data) if Firestore is unreachable.
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // If an old saved copy has sample data but no circle, start empty.
      if (parsed && parsed.circle) {
        // Remember a shared circle from an earlier visit, if there was one.
        const meta = loadSharedMeta();
        if (meta && parsed.circle.id === meta.docId) {
          circleDocId = meta.docId;
          sharedMode = false; // becomes true when we re-attach after sign-in
        }
        return parsed;
      }
    }
  } catch (e) { /* if saved data is broken, fall back to empty */ }
  const fresh = emptyState();
  saveLocal(fresh);
  return fresh;
}

function saveLocal(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { /* storage full/unavailable */ }
}

function save(s) {
  saveLocal(s);
  scheduleSharedSave();
}

// Debounced Firestore write, so typing / clicking does not fire a
// write on every single change. Skipped while applying a remote
// snapshot (see applyingRemote), and when not in shared mode.
function scheduleSharedSave() {
  if (!sharedMode || !db || !circleDocId || applyingRemote) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSharedNow, 400);
}

function saveSharedNow() {
  if (!sharedMode || !db || !circleDocId || applyingRemote) return;
  try {
    db.collection("circles").doc(circleDocId).set(toFirestoreDoc(state), { merge: true });
  } catch (e) { /* Firestore write failed — local copy is already saved */ }
}

// Convert the in-app state to a Firestore document. Same shape as
// local state, plus owner info and a server timestamp.
function toFirestoreDoc(s) {
  return {
    name: s.circle ? s.circle.name : "",
    kind: s.circle ? s.circle.kind : "",
    ownerUid: s.circle && s.circle.ownerUid ? s.circle.ownerUid : (currentUser ? currentUser.uid : null),
    ownerName: s.circle && s.circle.ownerName ? s.circle.ownerName : s.you,
    inviteCode: s.circle && s.circle.inviteCode ? s.circle.inviteCode : null,
    members: s.members || [],
    availability: s.availability || [],
    helpRequests: s.helpRequests || [],
    messages: s.messages || [],
    checkins: s.checkins || [],
    stories: s.stories || [],
    money: s.money || [],
    goals: s.goals || [],
    nextId: s.nextId || 1,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
}

// Convert a Firestore document back to in-app state.
function fromFirestoreDoc(docId, data) {
  const s = emptyState();
  s.circle = {
    name: data.name || "",
    kind: data.kind || "Family",
    id: docId,
    inviteCode: data.inviteCode || null,
    ownerUid: data.ownerUid || null,
    ownerName: data.ownerName || ""
  };
  s.members = Array.isArray(data.members) ? data.members : [];
  s.availability = Array.isArray(data.availability) ? data.availability : [];
  s.helpRequests = Array.isArray(data.helpRequests) ? data.helpRequests : [];
  s.messages = Array.isArray(data.messages) ? data.messages : [];
  s.checkins = Array.isArray(data.checkins) ? data.checkins : [];
  s.stories = Array.isArray(data.stories) ? data.stories : [];
  s.money = Array.isArray(data.money) ? data.money : [];
  s.goals = Array.isArray(data.goals) ? data.goals : [];
  s.nextId = data.nextId || 1;
  // "You" is whoever is signed in on this device; keep the local name
  // if we have one, otherwise use the Google display name.
  s.you = state.you || (currentUser && currentUser.displayName ? currentUser.displayName : "");
  return s;
}

// Attach live updates for one Firestore circle document. Two signed-in
// people in the same circle see each other's changes because onSnapshot
// fires whenever the document changes. Guard: while applying a remote
// snapshot we set applyingRemote, so the render does not trigger a
// save back to Firestore (no echo loop).
function attachSharedCircle(docId) {
  if (!db || !docId) return false;
  detachSharedListener();
  circleDocId = docId;
  sharedMode = true;
  circleUnsubscribe = db.collection("circles").doc(docId).onSnapshot(function (doc) {
    if (!doc.exists) return;
    applyingRemote = true;
    try {
      const incoming = fromFirestoreDoc(doc.id, doc.data());
      // Keep "you" from this device, not from the shared doc.
      incoming.you = state.you;
      state = incoming;
      saveLocal(state);
      showScreen();
    } finally {
      applyingRemote = false;
    }
  }, function () {
    // Listener failed (e.g. rules / offline) — stay on the local copy.
    sharedMode = false;
    updateModeUI();
  });
  saveSharedMeta({ docId: docId, inviteCode: state.circle && state.circle.inviteCode ? state.circle.inviteCode : null });
  updateModeUI();
  return true;
}

function detachSharedListener() {
  if (circleUnsubscribe) { try { circleUnsubscribe(); } catch (e) { /* ignore */ } circleUnsubscribe = null; }
}

function detachShared() {
  detachSharedListener();
  sharedMode = false;
  circleDocId = null;
  saveSharedMeta(null);
  updateModeUI();
}

// After sign-in, re-attach to the shared circle this browser knew.
function tryReattachShared() {
  if (!db || !currentUser || sharedMode) return;
  const meta = loadSharedMeta();
  if (!meta || !meta.docId) return;
  // Only re-attach if the local copy is that same circle.
  if (state.circle && state.circle.id === meta.docId) attachSharedCircle(meta.docId);
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
  updateModeUI();
}

// Header badge + invite code + note: always say which mode you are in.
function updateModeUI() {
  const badge = document.getElementById("modeBadge");
  const box = document.getElementById("inviteCodeBox");
  const codeEl = document.getElementById("inviteCodeText");
  const note = document.getElementById("modeNote");
  const shareBtn = document.getElementById("shareLocalBtn");
  const hint = document.getElementById("inviteHint");
  const isShared = sharedMode && state.circle && state.circle.inviteCode;
  if (badge) {
    badge.textContent = isShared ? "Shared" : "On this device only";
    badge.className = "mode-badge " + (isShared ? "mode-shared" : "mode-local");
  }
  if (box) box.hidden = !isShared;
  if (codeEl && isShared) codeEl.textContent = state.circle.inviteCode;
  if (note) {
    note.textContent = isShared
      ? "Shared circle — everyone who joins with the invite code sees the same circle, live."
      : "Saved in this browser only. Sign in with Google to share this circle.";
  }
  // "Share this circle" only makes sense when signed in and local-only.
  if (shareBtn) shareBtn.hidden = !(currentUser && state.circle && !isShared);
  if (hint) {
    hint.textContent = isShared
      ? "Share the invite code (above) with your people. They sign in with Google and join with that code."
      : "No real invite is sent yet — adding a member adds them to this circle right away, on this device.";
  }
}

document.getElementById("setupForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const circleName = document.getElementById("setupCircleName").value.trim();
  const kind = document.getElementById("setupKind").value;
  const yourName = document.getElementById("setupYourName").value.trim();
  if (!circleName || !yourName) return;

  // Local-only path: leave any shared circle behind.
  detachShared();
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

// --- Shared circles (Firestore) ---
// All three entry points need Firestore. If it is not available
// (SDK did not load, or the database was never created in the
// Firebase Console), they say so plainly and fall back to local.
function firestoreReady() {
  if (!db) {
    alert("Firestore is not ready. First create the database in Firebase Console > Build > Firestore Database > Create database (see README.md), then reload this page.");
    return false;
  }
  return true;
}

function readSetupFields() {
  return {
    circleName: document.getElementById("setupCircleName").value.trim(),
    kind: document.getElementById("setupKind").value,
    yourName: document.getElementById("setupYourName").value.trim()
  };
}

// (a) Create a shared circle. Uses the circle name / kind / your name
// from the setup form above. Requires Google sign-in first.
function createSharedCircle() {
  const msg = document.getElementById("sharedMsg");
  if (!currentUser) {
    if (msg) msg.textContent = "Please sign in with Google first, then tap “Create a shared circle” again.";
    signInWithGoogle();
    return;
  }
  if (!firestoreReady()) return;
  const fields = readSetupFields();
  if (!fields.circleName || !fields.yourName) {
    if (msg) msg.textContent = "Fill in the circle name and your name above first.";
    return;
  }
  const inviteCode = makeInviteCode();
  const ref = db.collection("circles").doc(); // auto id
  state = emptyState();
  state.circle = {
    name: fields.circleName,
    kind: fields.kind,
    id: ref.id,
    inviteCode: inviteCode,
    ownerUid: currentUser.uid,
    ownerName: fields.yourName
  };
  state.you = fields.yourName;
  state.members.push({
    id: state.nextId++,
    name: fields.yourName,
    role: fields.kind === "Family" ? "Adult" : "Leader",
    you: true,
    uid: currentUser.uid,
    sharing: { location: true, schedule: true, money: true }
  });
  // Write first, then attach the listener (so our own write does not
  // look like a remote change arriving out of nowhere).
  ref.set(toFirestoreDoc(state)).then(function () {
    circleDocId = ref.id;
    sharedMode = true;
    attachSharedCircle(ref.id);
    save(state);
    showScreen();
    if (msg) msg.textContent = "Shared circle created. Invite code: " + inviteCode + " — share it with your people.";
  }).catch(function (err) {
    if (msg) msg.textContent = "Could not create the shared circle: " + (err && err.message ? err.message : err);
  });
}

// (b) Join a shared circle with an invite code.
function joinSharedCircle(code, yourName) {
  const msg = document.getElementById("joinMsg");
  if (!currentUser) {
    if (msg) msg.textContent = "Please sign in with Google first, then tap “Join a shared circle” again.";
    signInWithGoogle();
    return Promise.resolve(false);
  }
  if (!firestoreReady()) return Promise.resolve(false);
  const clean = String(code || "").trim().toUpperCase();
  if (!clean || !yourName) {
    if (msg) msg.textContent = "Enter an invite code and your name.";
    return Promise.resolve(false);
  }
  return db.collection("circles").where("inviteCode", "==", clean).limit(1).get().then(function (snap) {
    if (snap.empty) {
      if (msg) msg.textContent = "No shared circle found with that invite code. Check the code and try again.";
      return false;
    }
    const doc = snap.docs[0];
    const data = doc.data();
    state = fromFirestoreDoc(doc.id, data);
    state.you = yourName;
    // Add yourself as a member if you are not in there already.
    const already = state.members.some(function (m) {
      return (m.uid && currentUser && m.uid === currentUser.uid) ||
        (m.name && m.name.toLowerCase() === yourName.toLowerCase());
    });
    if (!already) {
      state.members.push({
        id: state.nextId++,
        name: yourName,
        role: state.circle.kind === "Family" ? "Adult" : "Leader",
        you: true,
        uid: currentUser.uid,
        sharing: { location: true, schedule: true, money: true }
      });
    } else {
      state.members.forEach(function (m) {
        if ((m.uid && m.uid === currentUser.uid) || m.name.toLowerCase() === yourName.toLowerCase()) m.you = true;
      });
    }
    circleDocId = doc.id;
    sharedMode = true;
    attachSharedCircle(doc.id);
    save(state);
    showScreen();
    if (msg) msg.textContent = "Joined “" + state.circle.name + "”.";
    return true;
  }).catch(function (err) {
    if (msg) msg.textContent = "Could not join: " + (err && err.message ? err.message : err);
    return false;
  });
}

// Move the current local-only circle up to Firestore, then switch
// this browser to shared mode. The local data becomes the shared data.
function shareLocalCircle() {
  if (!currentUser) { signInWithGoogle(); return; }
  if (!firestoreReady()) return;
  if (!state.circle) return;
  if (sharedMode) return; // already shared
  const inviteCode = makeInviteCode();
  const ref = db.collection("circles").doc();
  state.circle.id = ref.id;
  state.circle.inviteCode = inviteCode;
  state.circle.ownerUid = currentUser.uid;
  state.circle.ownerName = state.you;
  state.members.forEach(function (m) { if (m.you && !m.uid) m.uid = currentUser.uid; });
  ref.set(toFirestoreDoc(state)).then(function () {
    circleDocId = ref.id;
    sharedMode = true;
    attachSharedCircle(ref.id);
    save(state);
    showScreen();
    alert("This circle is now shared. Invite code: " + inviteCode + " — share it with your people.");
  }).catch(function (err) {
    alert("Could not share this circle: " + (err && err.message ? err.message : err));
  });
}

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
    // Leaves a shared circle behind in Firestore (other members keep
    // it) — this only leaves it on this device and clears the local copy.
    detachShared();
    state = emptyState();
    save(state);
    showScreen();
  }
});

// --- Shared-circle buttons ---
document.getElementById("createSharedBtn").addEventListener("click", createSharedCircle);
document.getElementById("joinForm").addEventListener("submit", function (e) {
  e.preventDefault();
  joinSharedCircle(
    document.getElementById("joinCode").value,
    document.getElementById("joinName").value.trim()
  );
});
document.getElementById("shareLocalBtn").addEventListener("click", shareLocalCircle);
document.getElementById("copyInviteBtn").addEventListener("click", function () {
  const code = state.circle && state.circle.inviteCode ? state.circle.inviteCode : "";
  if (!code) return;
  function done() { document.getElementById("copyInviteBtn").textContent = "Copied!"; setTimeout(function () { document.getElementById("copyInviteBtn").textContent = "Copy invite code"; }, 1500); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(done, function () { prompt("Copy this invite code:", code); });
  } else {
    prompt("Copy this invite code:", code);
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
