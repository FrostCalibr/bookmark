// ═══════════════════════════════════════════════════════
//  REDIRECTS — app.js
//  Cloud sync via Firebase Firestore
//
//  ⚙️  SETUP:
//  1. Go to console.firebase.google.com → New project
//  2. Add Web app → copy firebaseConfig below
//  3. Firestore Database → Create → Test mode
//  4. Replace the firebaseConfig object below with yours
// ═══════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// ── 🔧 PASTE YOUR FIREBASE CONFIG HERE ──────────────────
const firebaseConfig = {

  apiKey: "AIzaSyCAugqjSIb7aTzI0AGjwt2tJZxWpP05oMI",

  authDomain: "bookmark-b6fe9.firebaseapp.com",

  projectId: "bookmark-b6fe9",

  storageBucket: "bookmark-b6fe9.firebasestorage.app",

  messagingSenderId: "349146218114",

  appId: "1:349146218114:web:08b207f4c8074a79437e9b",

  measurementId: "G-KDT7XBBG2X"

};


// ────────────────────────────────────────────────────────

const DOC_PATH = { collection: "redirects", document: "data" };

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Constants ────────────────────────────────────────────

const COLORS = [
  '#6c63ff','#a855f7','#1fd18a','#f5c842',
  '#f05a5a','#38bdf8','#fb923c','#f472b6',
  '#a3e635','#64748b'
];

const EMOJIS = [
  '🔗','🌐','📌','⭐','🚀','💡','🛠️','📁',
  '🎯','🧪','📝','🔍','🎮','🎵','📚','🏠',
  '💼','🔐','📊','🤖','🌙','☕','🎨','🧩',
  '⚡','🔥','💎','🌿','🦊','🐉','🌸','🏆',
  '📡','🗺️','🧠','💻','📱','🖥️','🖱️','⌨️',
  '🌍','🏔️','🌊','🌴','🎭','🎬','📷','🎤',
  '🛡️','⚙️','🔧','🔨','🪄','🎲','♟️','🎯',
  '📬','📦','🗂️','🗃️','🔑','🧲','💬','📣'
];

// ── State ────────────────────────────────────────────────

let state = {
  groups: [],
  bookmarks: [],
  currentView: 'all',
  selectedColor: COLORS[0],
  iconMode: 'favicon',
  selectedEmoji: '🔗',
};

let _saveTimeout = null;

// ── Firestore ────────────────────────────────────────────

async function cloudLoad() {
  setSyncStatus('syncing');
  try {
    const ref  = doc(db, DOC_PATH.collection, DOC_PATH.document);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (data.groups)    state.groups    = data.groups;
      if (data.bookmarks) state.bookmarks = data.bookmarks;
    } else {
      seedDefaults();
    }
    setSyncStatus('synced');

    // Listen for real-time updates (multi-device sync)
    onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.groups)    state.groups    = data.groups;
      if (data.bookmarks) state.bookmarks = data.bookmarks;
      renderAll();
      setSyncStatus('synced');
    });

  } catch (e) {
    console.error('Firestore load error:', e);
    setSyncStatus('error');
    // Fall back to localStorage if Firestore fails
    const saved = localStorage.getItem('redirects_fallback');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.groups)    state.groups    = data.groups;
        if (data.bookmarks) state.bookmarks = data.bookmarks;
      } catch (_) {}
    } else {
      seedDefaults();
    }
  }
  renderAll();
}

// Debounced save — batches rapid changes into one write
function cloudSave() {
  setSyncStatus('syncing');
  clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(async () => {
    try {
      const ref = doc(db, DOC_PATH.collection, DOC_PATH.document);
      await setDoc(ref, {
        groups:    state.groups,
        bookmarks: state.bookmarks,
        updatedAt: new Date().toISOString()
      });
      // Also mirror to localStorage as offline fallback
      localStorage.setItem('redirects_fallback', JSON.stringify({
        groups: state.groups, bookmarks: state.bookmarks
      }));
      setSyncStatus('synced');
    } catch (e) {
      console.error('Firestore save error:', e);
      setSyncStatus('error');
    }
  }, 600);
}

function seedDefaults() {
  const g1 = { id: uid(), name: 'General',   color: '#6c63ff' };
  const g2 = { id: uid(), name: 'Dev Tools',  color: '#1fd18a' };
  state.groups    = [g1, g2];
  state.bookmarks = [
    { id: uid(), name: 'GitHub',    url: 'https://github.com',            groupId: g2.id, iconMode: 'favicon', emoji: '', hint: 'Code hosting & version control' },
    { id: uid(), name: 'MDN Docs',  url: 'https://developer.mozilla.org', groupId: g2.id, iconMode: 'favicon', emoji: '', hint: 'Web API reference' },
    { id: uid(), name: 'Arch Wiki', url: 'https://wiki.archlinux.org',    groupId: g2.id, iconMode: 'emoji',   emoji: '🐉', hint: 'Everything Arch Linux' },
    { id: uid(), name: 'YouTube',   url: 'https://youtube.com',           groupId: g1.id, iconMode: 'emoji',   emoji: '🎬', hint: '' },
  ];
  cloudSave();
}

function setSyncStatus(status) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  el.className = 'sync-status ' + status;
  const labels = { syncing: 'saving…', synced: 'synced', error: 'offline' };
  el.querySelector('.sync-label').textContent = labels[status] ?? status;
}

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// ── Render ───────────────────────────────────────────────

function setView(v) {
  state.currentView = v;
  document.querySelectorAll('.group-nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById('nav-' + v);
  if (navEl) navEl.classList.add('active');
  renderAll();
}

function renderAll() {
  renderSidebar();
  renderMain();
  updateCounts();
}

function renderSidebar() {
  const cont = document.getElementById('sidebar-groups');
  cont.innerHTML = '';
  state.groups.forEach(g => {
    const count = state.bookmarks.filter(b => b.groupId === g.id).length;
    const el = document.createElement('button');
    el.className = 'group-nav-item' + (state.currentView === g.id ? ' active' : '');
    el.id = 'nav-' + g.id;
    el.onclick = () => setView(g.id);
    el.innerHTML = `
      <span class="group-dot" style="background:${g.color}"></span>
      ${esc(g.name)}
      <span class="group-count">${count}</span>`;
    cont.appendChild(el);
  });
}

function getQ() { return document.getElementById('search-input').value.toLowerCase(); }

function getFilteredBookmarks(groupId) {
  const q = getQ();
  return state.bookmarks.filter(b => {
    const inGroup = groupId ? b.groupId === groupId : true;
    const matchQ  = !q || b.name.toLowerCase().includes(q)
                       || b.url.toLowerCase().includes(q)
                       || (b.hint || '').toLowerCase().includes(q);
    return inGroup && matchQ;
  });
}

function renderMain() {
  const main = document.getElementById('main-area');
  const v    = state.currentView;

  if (v === 'all') {
    if (!state.groups.length) {
      main.innerHTML = `<div class="empty"><div class="empty-icon">⊙</div><div class="empty-text">No groups yet — create one to start.</div></div>`;
      return;
    }
    let html = `<div class="all-groups-title"><span>All Bookmarks</span></div>`;
    let any  = false;
    state.groups.forEach((g, i) => {
      const bms = getFilteredBookmarks(g.id);
      if (bms.length === 0 && getQ()) return;
      any = true;
      html += renderGroupSection(g, bms, i);
    });
    if (!any) html += `<div class="empty"><div class="empty-icon">⊘</div><div class="empty-text">no results found</div></div>`;
    main.innerHTML = html;
  } else {
    const g = state.groups.find(x => x.id === v);
    if (!g) { setView('all'); return; }
    main.innerHTML = renderGroupSection(g, getFilteredBookmarks(g.id), 0);
  }
  attachCardEvents();
}

function renderGroupSection(g, bms, i) {
  const cards = bms.length
    ? bms.map((b, ci) => renderCard(b, ci)).join('')
    : `<div class="empty"><div class="empty-icon" style="font-size:1.4rem">⊘</div><div class="empty-text">no bookmarks yet</div></div>`;
  return `
    <div class="group-section" style="animation-delay:${i * 0.04}s" data-gid="${g.id}">
      <div class="group-header">
        <span class="group-dot" style="background:${g.color}"></span>
        <span class="group-title">${esc(g.name)}</span>
        <span class="count-badge">${bms.length}</span>
        <div class="group-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="openAddToGroup('${g.id}')">+ Add</button>
          <button class="btn btn-danger" onclick="deleteGroup('${g.id}')">Delete</button>
        </div>
      </div>
      <div class="cards-grid">${cards}</div>
    </div>`;
}

function renderCard(b, ci) {
  const domain = getDomain(b.url);
  let iconHtml;
  if (b.iconMode === 'emoji' && b.emoji) {
    iconHtml = b.emoji;
  } else if (domain) {
    iconHtml = `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" onerror="this.parentNode.innerHTML='🔗'">`;
  } else {
    iconHtml = '🔗';
  }
  const hintHtml = b.hint ? `<div class="card-hint">${esc(b.hint)}</div>` : '';
  return `
    <div class="bookmark-card" data-bid="${b.id}" style="animation-delay:${ci * 0.03}s">
      <div class="card-actions">
        <div class="card-action-btn open-btn" onclick="openBM('${b.id}')" title="Open">↗</div>
        <div class="card-action-btn edit-btn" onclick="openEditModal('${b.id}')" title="Edit">✎</div>
        <div class="card-action-btn del-btn"  onclick="deleteBM('${b.id}')"  title="Delete">✕</div>
      </div>
      <div class="card-top">
        <div class="card-icon-wrap">${iconHtml}</div>
        <span class="card-name">${esc(b.name)}</span>
      </div>
      <span class="card-url">${esc(b.url)}</span>
      ${hintHtml}
    </div>`;
}

function attachCardEvents() {
  document.querySelectorAll('.bookmark-card').forEach(card => {
    card.addEventListener('click', function(e) {
      if (e.target.closest('.card-action-btn')) return;
      const b = state.bookmarks.find(x => x.id === this.dataset.bid);
      if (b) window.open(b.url, '_blank', 'noopener');
    });
  });
}

function updateCounts() {
  const total = state.bookmarks.length;
  document.getElementById('total-count').textContent = total + ' link' + (total !== 1 ? 's' : '');
  document.getElementById('count-all').textContent   = total;
}

// ── Actions ──────────────────────────────────────────────

function openBM(id) {
  const b = state.bookmarks.find(x => x.id === id);
  if (b) window.open(b.url, '_blank', 'noopener');
}

function deleteBM(id) {
  state.bookmarks = state.bookmarks.filter(x => x.id !== id);
  cloudSave(); renderAll(); toast('Bookmark removed');
}

function deleteGroup(id) {
  if (state.bookmarks.some(b => b.groupId === id)) {
    if (!confirm('Delete group and all its bookmarks?')) return;
    state.bookmarks = state.bookmarks.filter(b => b.groupId !== id);
  }
  state.groups = state.groups.filter(g => g.id !== id);
  if (state.currentView === id) state.currentView = 'all';
  cloudSave(); renderAll(); toast('Group deleted');
}

function openAddToGroup(groupId) {
  resetBookmarkForm();
  populateGroupSelect('bm-group');
  document.getElementById('bm-group').value = groupId;
  document.getElementById('modal-bookmark').classList.add('open');
  setTimeout(() => document.getElementById('bm-name').focus(), 60);
}

// ── Icon Picker ───────────────────────────────────────────

let _iconPickerTarget = 'add';

function initIconPicker(target) {
  _iconPickerTarget = target;
  const prefix = target === 'add' ? 'bm' : 'edit';
  renderIconPicker(prefix);
}

function renderIconPicker(prefix) {
  const tabsEl = document.getElementById(prefix + '-icon-tabs');
  tabsEl.innerHTML = `
    <button class="icon-tab ${state.iconMode==='favicon'?'active':''}" onclick="switchIconTab('${prefix}','favicon')">🌐 Website Icon</button>
    <button class="icon-tab ${state.iconMode==='emoji'?'active':''}"   onclick="switchIconTab('${prefix}','emoji')">😀 Emoji</button>`;

  const urlVal = document.getElementById(prefix === 'bm' ? 'bm-url' : 'edit-url').value.trim();
  const domain = getDomain(urlVal);

  const fPane = document.getElementById(prefix + '-icon-favicon-pane');
  fPane.className = 'icon-pane' + (state.iconMode === 'favicon' ? ' active' : '');
  fPane.innerHTML = `
    <div class="icon-preview-row">
      <div class="favicon-preview-img" id="${prefix}-fav-preview">
        ${domain ? `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" onerror="this.parentNode.innerHTML='🌐'">` : '🌐'}
      </div>
      <span class="favicon-info">${domain ? 'Auto-fetched from <b>' + esc(domain) + '</b>' : 'Enter a URL above — icon loads automatically'}</span>
    </div>`;

  const ePane = document.getElementById(prefix + '-icon-emoji-pane');
  ePane.className = 'icon-pane' + (state.iconMode === 'emoji' ? ' active' : '');
  ePane.innerHTML = `
    <div class="icon-preview-row">
      <div class="icon-preview">${state.selectedEmoji}</div>
      <span class="icon-preview-label">Selected: ${state.selectedEmoji}</span>
    </div>
    <div class="emoji-grid">
      ${EMOJIS.map(e => `<button class="emoji-btn${e===state.selectedEmoji?' selected':''}" onclick="pickEmoji('${prefix}','${e}')">${e}</button>`).join('')}
    </div>`;
}

function switchIconTab(prefix, mode) {
  state.iconMode = mode;
  renderIconPicker(prefix);
}

function pickEmoji(prefix, emoji) {
  state.selectedEmoji = emoji;
  renderIconPicker(prefix);
}

function refreshFaviconPreview(prefix) {
  const urlVal = document.getElementById(prefix === 'bm' ? 'bm-url' : 'edit-url').value.trim();
  const domain = getDomain(urlVal);
  const prev   = document.getElementById(prefix + '-fav-preview');
  if (!prev) return;
  prev.innerHTML = domain
    ? `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" onerror="this.parentNode.innerHTML='🌐'">`
    : '🌐';
}

// ── Modals ────────────────────────────────────────────────

function openModal(type) {
  if (type === 'bookmark') {
    resetBookmarkForm();
    populateGroupSelect('bm-group');
    state.iconMode     = 'favicon';
    state.selectedEmoji = '🔗';
    initIconPicker('add');
  }
  if (type === 'group') {
    buildSwatches('grp');
    document.getElementById('grp-name').value = '';
  }
  document.getElementById('modal-' + type).classList.add('open');
  setTimeout(() => { const inp = document.querySelector(`#modal-${type} input`); if (inp) inp.focus(); }, 60);
}

function closeModal(type) {
  document.getElementById('modal-' + type).classList.remove('open');
}

function resetBookmarkForm() {
  ['bm-name','bm-url','bm-hint'].forEach(id => document.getElementById(id).value = '');
}

function populateGroupSelect(selectId) {
  document.getElementById(selectId).innerHTML =
    state.groups.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('');
}

function buildSwatches(prefix) {
  document.getElementById(prefix + '-color-swatches').innerHTML =
    COLORS.map(c =>
      `<div class="color-swatch${c===state.selectedColor?' selected':''}" style="background:${c}" onclick="selectColor('${prefix}','${c}')"></div>`
    ).join('');
}

function selectColor(prefix, c) {
  state.selectedColor = c;
  buildSwatches(prefix);
}

function saveGroup() {
  const name = document.getElementById('grp-name').value.trim();
  if (!name) { shake('grp-name'); return; }
  state.groups.push({ id: uid(), name, color: state.selectedColor });
  cloudSave(); closeModal('group'); renderAll();
  toast('Group created ✓');
}

function saveBookmark() {
  const name = document.getElementById('bm-name').value.trim();
  let   url  = document.getElementById('bm-url').value.trim();
  const hint = document.getElementById('bm-hint').value.trim();
  const groupId = document.getElementById('bm-group').value;
  if (!name) { shake('bm-name'); return; }
  if (!url)  { shake('bm-url');  return; }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  state.bookmarks.push({
    id: uid(), name, url, hint, groupId,
    iconMode: state.iconMode,
    emoji:    state.iconMode === 'emoji' ? state.selectedEmoji : ''
  });
  cloudSave(); closeModal('bookmark'); renderAll();
  toast('Bookmark saved ✓');
}

function openEditModal(id) {
  const b = state.bookmarks.find(x => x.id === id);
  if (!b) return;
  document.getElementById('edit-id').value   = b.id;
  document.getElementById('edit-name').value = b.name;
  document.getElementById('edit-url').value  = b.url;
  document.getElementById('edit-hint').value = b.hint || '';
  populateGroupSelect('edit-group');
  document.getElementById('edit-group').value = b.groupId;
  state.iconMode      = b.iconMode || 'favicon';
  state.selectedEmoji = b.emoji    || '🔗';
  initIconPicker('edit');
  document.getElementById('modal-edit').classList.add('open');
}

function updateBookmark() {
  const id = document.getElementById('edit-id').value;
  const b  = state.bookmarks.find(x => x.id === id);
  if (!b) return;
  let url = document.getElementById('edit-url').value.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  b.name     = document.getElementById('edit-name').value.trim() || b.name;
  b.url      = url;
  b.hint     = document.getElementById('edit-hint').value.trim();
  b.groupId  = document.getElementById('edit-group').value;
  b.iconMode = state.iconMode;
  b.emoji    = state.iconMode === 'emoji' ? state.selectedEmoji : '';
  cloudSave(); closeModal('edit'); renderAll();
  toast('Bookmark updated ✓');
}

// ── Export / Import ───────────────────────────────────────

function exportData() {
  const json = JSON.stringify({ groups: state.groups, bookmarks: state.bookmarks }, null, 2);
  const a = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(new Blob([json], { type: 'application/json' })),
    download: 'redirects-backup.json'
  });
  a.click();
  toast('Exported ✓');
}

function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.groups)    state.groups    = data.groups;
      if (data.bookmarks) state.bookmarks = data.bookmarks;
      cloudSave(); renderAll(); toast('Imported ✓');
    } catch (_) { toast('❌ Invalid JSON'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ── Utils ─────────────────────────────────────────────────

function getDomain(url) {
  try { return new URL(url.startsWith('http') ? url : 'https://' + url).hostname; }
  catch (_) { return ''; }
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function shake(id) {
  const el = document.getElementById(id);
  el.style.borderColor = 'var(--red)';
  el.animate([
    {transform:'translateX(-4px)'},{transform:'translateX(4px)'},
    {transform:'translateX(-4px)'},{transform:'translateX(0)'}
  ], {duration: 240});
  setTimeout(() => el.style.borderColor = '', 900);
}

// ── Global events ─────────────────────────────────────────

document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', function(e) {
    if (e.target === this) closeModal(this.id.replace('modal-', ''));
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.overlay.open').forEach(ov => ov.classList.remove('open'));
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); document.getElementById('search-input').focus(); }
});

// ── Boot ──────────────────────────────────────────────────
cloudLoad();

// Expose to global scope (needed for inline onclick handlers with type="module")
Object.assign(window, {
  setView, renderAll, openModal, closeModal,
  openAddToGroup, openEditModal, openBM, deleteBM, deleteGroup,
  saveGroup, saveBookmark, updateBookmark,
  switchIconTab, pickEmoji, refreshFaviconPreview,
  selectColor, buildSwatches,
  exportData, importData
});
