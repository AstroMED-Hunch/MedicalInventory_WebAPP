// AstroMed - Visual Inventory Tracking System
// NASA HUNCH | PCTI STEM - Team Lakind

const CORRECT_PASSWORD = "67";
let isAuthenticated = false;

// Live shelf data from backend
let shelfData = [];
// Live audit logs from backend
let auditLogs = [];
let logRenderToken = 0;

// Backend base URL — persisted in localStorage
function getBackendUrl() {
    return localStorage.getItem('astroMedBackendUrl') || '';
}

window.onload = function () {
    checkAuth();
    if (isAuthenticated) {
        initializeApp();
    }
};

// --- AUTHENTICATION ---

function checkAuth() {
    if (sessionStorage.getItem('astroMedAuth') === 'true') {
        isAuthenticated = true;
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

function showApp() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
}

function handleLogin(event) {
    if (event) event.preventDefault();
    const passwordInput = document.getElementById('password-input');
    const errorMsg = document.getElementById('login-error');
    if (!passwordInput) return;

    if (passwordInput.value === CORRECT_PASSWORD) {
        isAuthenticated = true;
        sessionStorage.setItem('astroMedAuth', 'true');
        showApp();
        initializeApp();
    } else {
        if (errorMsg) {
            errorMsg.textContent = "Invalid password. Access denied.";
            errorMsg.style.display = 'block';
        }
        passwordInput.value = '';
    }
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        isAuthenticated = false;
        sessionStorage.removeItem('astroMedAuth');
        showLogin();
        document.getElementById('password-input').value = '';
        document.getElementById('login-error').style.display = 'none';
    }
}

// --- INIT ---

function initializeApp() {
    loadSettingsUI();
    refreshData();
}

// --- SETTINGS ---

function loadSettingsUI() {
    const url = getBackendUrl();
    if (url) {
        try {
            const u = new URL(url);
            document.getElementById('setting-host').value = u.hostname;
            document.getElementById('setting-port').value = u.port;
        } catch (_) {}
        document.getElementById('current-backend-url').textContent = url;
    }
}

function saveSettings() {
    const host = document.getElementById('setting-host').value.trim();
    const port = document.getElementById('setting-port').value.trim();
    const statusEl = document.getElementById('settings-status');

    if (!host || !port) {
        statusEl.textContent = 'Please enter both host and port.';
        statusEl.style.color = 'var(--alert-red)';
        return;
    }

    const url = `http://${host}:${port}`;
    localStorage.setItem('astroMedBackendUrl', url);
    document.getElementById('current-backend-url').textContent = url;
    statusEl.textContent = 'Saved. Connecting...';
    statusEl.style.color = 'var(--highlight-cyan)';

    refreshData().then(() => {
        const health = document.getElementById('health-status').textContent;
        if (health === 'ONLINE') {
            statusEl.textContent = '✓ Connected successfully.';
            statusEl.style.color = 'var(--safe-green)';
        } else {
            statusEl.textContent = '✗ Could not reach backend. Check host/port.';
            statusEl.style.color = 'var(--alert-red)';
        }
    });
}

// --- BACKEND FETCH ---

async function fetchSystemHealth() {
    const base = getBackendUrl();
    const healthEl = document.getElementById('health-status');
    const cardHealth = document.getElementById('card-health');

    if (!base) {
        setHealthOffline('Not configured');
        return false;
    }

    try {
        const res = await fetch(`${base}/systemHealth`, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.status === 'ok') {
            healthEl.textContent = 'ONLINE';
            healthEl.className = 'status-online';
            if (cardHealth) { cardHealth.textContent = 'OK'; cardHealth.style.color = 'var(--safe-green)'; }
            return true;
        } else {
            throw new Error('Bad status');
        }
    } catch (err) {
        setHealthOffline('Unreachable');
        return false;
    }
}

function setHealthOffline(reason) {
    const healthEl = document.getElementById('health-status');
    const cardHealth = document.getElementById('card-health');
    if (healthEl) { healthEl.textContent = 'OFFLINE'; healthEl.className = 'status-offline'; }
    if (cardHealth) { cardHealth.textContent = reason; cardHealth.style.color = 'var(--alert-red)'; }
}

async function fetchShelves() {
    const base = getBackendUrl();
    if (!base) {
        showError('Backend not configured. Go to Settings and enter the host and port.');
        return;
    }

    try {
        const res = await fetch(`${base}/getShelves`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
        const json = await res.json();
        shelfData = json.shelves || [];
        hideError();
        renderShelfTable();
        updateStats();
    } catch (err) {
        shelfData = [];
        showError(`Failed to fetch shelf data: ${err.message}. Is the backend running at ${base}?`);
        renderShelfTable();
        updateStats();
    }
}

async function fetchAuditLogs() {
    const base = getBackendUrl();
    if (!base) return;

    try {
        const res = await fetch(`${base}/getAuditLog`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
        const json = await res.json();
        auditLogs = json.entries || [];
        renderLogs();
    } catch (err) {
        auditLogs = [];
        console.error("Failed to fetch logs:", err);
        renderLogs(true);
    }
}

function renderLogs(error = false) {
    const list = document.getElementById('audit-log-list');
    if (!list) return;

    // Invalidate any in-flight typing run when logs are re-rendered.
    logRenderToken += 1;
    const token = logRenderToken;

    list.innerHTML = '';
    if (error) {
        list.innerHTML = `<li class="log-entry error-msg">Failed to load logs.</li>`;
        return;
    }
    
    if (auditLogs.length === 0) {
        list.innerHTML = `<li class="log-entry table-msg">No entries found.</li>`;
        return;
    }

    // Create empty rows first to avoid layout jump while text is typed.
    auditLogs.forEach((entry, index) => {
        const li = document.createElement('li');
        li.className = 'log-entry terminal-type';
        li.id = `log-entry-${index}`;
        list.appendChild(li);
    });

    typeOutLogs(0, token);
}

function typeOutLogs(index, token) {
    if (token !== logRenderToken) return;
    if (index >= auditLogs.length) return;

    const li = document.getElementById(`log-entry-${index}`);
    if (!li) return;

    const text = String(auditLogs[index] ?? '');
    let charIndex = 0;

    li.classList.add('typing-active');

    const typeInterval = setInterval(() => {
        if (token !== logRenderToken) {
            clearInterval(typeInterval);
            return;
        }

        if (charIndex < text.length) {
            li.textContent += text.charAt(charIndex);
            charIndex += 1;
        } else {
            clearInterval(typeInterval);
            li.classList.remove('typing-active');
            typeOutLogs(index + 1, token);
        }
    }, 10);
}


// --- REFRESH ---

async function refreshData() {
    const btn = document.getElementById('btn-refresh');
    if (btn) { btn.textContent = '⟳ Refreshing...'; btn.disabled = true; }

    await fetchSystemHealth();
    await Promise.all([fetchShelves(), fetchAuditLogs()]);

    if (btn) { btn.innerHTML = '&#8635; Refresh'; btn.disabled = false; }
}

// --- ERROR BANNER ---

function showError(msg) {
    const banner = document.getElementById('error-banner');
    const text = document.getElementById('error-banner-text');
    if (banner && text) {
        text.textContent = '⚠ ' + msg;
        banner.classList.remove('hidden');
    }
}

function hideError() {
    const banner = document.getElementById('error-banner');
    if (banner) banner.classList.add('hidden');
}

// --- RENDER TABLE ---

function renderShelfTable(searchTerm = '') {
    const tbody = document.getElementById('inventory-table-body');
    tbody.innerHTML = '';

    const filtered = shelfData.filter(shelf => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
            shelf.tag?.toLowerCase().includes(q) ||
            String(shelf.box_id).includes(q) ||
            shelf.box_pretty_name?.toLowerCase().includes(q) ||
            shelf.registrant?.toLowerCase().includes(q)
        );
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-msg">${
            shelfData.length === 0
                ? 'No shelf data received. Check backend connection in Settings.'
                : 'No results match your search.'
        }</td></tr>`;
        return;
    }

    filtered.forEach(shelf => {
        const occupied = shelf.box_id !== -1 && shelf.box_id !== null && shelf.box_id !== undefined;
        const statusLabel = occupied ? 'OCCUPIED' : 'EMPTY';
        const statusClass = occupied ? 'status-ok' : 'status-warn';
        const boxIdDisplay = occupied ? String(shelf.box_id) : '—';
        const boxNameDisplay = (occupied && shelf.box_pretty_name) ? shelf.box_pretty_name : '—';
        const registrantDisplay = (occupied && shelf.registrant) ? shelf.registrant : '—';

        const row = document.createElement('tr');

        const tagCell = document.createElement('td');
        tagCell.className = 'med-name';
        tagCell.textContent = shelf.tag ?? '—';

        const boxIdCell = document.createElement('td');
        boxIdCell.style.fontFamily = "'Space Mono'";
        boxIdCell.textContent = boxIdDisplay;

        const boxNameCell = document.createElement('td');
        boxNameCell.textContent = boxNameDisplay;

        const registrantCell = document.createElement('td');
        registrantCell.textContent = registrantDisplay;

        const statusCell = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${statusClass}`;
        statusBadge.textContent = statusLabel;
        statusCell.appendChild(statusBadge);

        const actionCell = document.createElement('td');
        if (occupied) {
            const clearButton = document.createElement('button');
            clearButton.type = 'button';
            clearButton.className = 'btn-delete';
            clearButton.textContent = 'CLEAR';
            clearButton.addEventListener('click', () => clearShelf(String(shelf.tag ?? '')));
            actionCell.appendChild(clearButton);
        } else {
            actionCell.textContent = '—';
        }

        row.appendChild(tagCell);
        row.appendChild(boxIdCell);
        row.appendChild(boxNameCell);
        row.appendChild(registrantCell);
        row.appendChild(statusCell);
        row.appendChild(actionCell);
        tbody.appendChild(row);
    });
}

function filterShelves() {
    renderShelfTable(document.getElementById('search-bar').value.toLowerCase());
}

// --- STATS ---

function updateStats() {
    const total = shelfData.length;
    const occupied = shelfData.filter(s => s.box_id !== -1 && s.box_id !== null && s.box_id !== undefined).length;
    const empty = total - occupied;

    const formatStat = (value) => Number.isFinite(value) ? String(value) : '—';

    document.getElementById('total-shelves').textContent = formatStat(total);
    document.getElementById('boxes-on-shelves').textContent = formatStat(occupied);
    document.getElementById('card-total-shelves').textContent = formatStat(total);
    document.getElementById('card-occupied').textContent = formatStat(occupied);
    document.getElementById('card-empty').textContent = formatStat(empty);
}

// --- CLEAR SHELF ---

async function clearShelf(shelfTag) {
    if (!confirm(`Clear shelf "${shelfTag}"?\nThis will remove the box record from this shelf.`)) return;

    const base = getBackendUrl();
    if (!base) {
        showError('Backend not configured. Go to Settings and enter the host and port.');
        return;
    }

    try {
        const res = await fetch(`${base}/clearShelf?shelf_id=${encodeURIComponent(shelfTag)}`, {
            method: 'DELETE',
            signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
        const json = await res.json();
        if (json.status !== 'ok') throw new Error('Unexpected response from server.');
        hideError();
        await fetchShelves(); // refresh table after clearing
    } catch (err) {
        showError(`Failed to clear shelf "${shelfTag}": ${err.message}`);
    }
}

// --- NAVIGATION ---

function showView(viewName) {
    if (!isAuthenticated) { showLogin(); return; }

    document.getElementById('app-container')
        .querySelectorAll('.view-section')
        .forEach(el => el.classList.add('hidden'));

    document.querySelectorAll('.nav-buttons button')
        .forEach(el => el.classList.remove('active'));

    const view = document.getElementById(viewName + '-view');
    if (view) {
        view.classList.remove('hidden');
        document.getElementById('btn-' + viewName)?.classList.add('active');
    }
}

// Global exports for inline HTML event handlers
window.handleLogin     = handleLogin;
window.logout          = logout;
window.showView        = showView;
window.filterShelves   = filterShelves;
window.refreshData     = refreshData;
window.saveSettings    = saveSettings;
window.clearShelf      = clearShelf;
