// AIMS - Visual Inventory Tracking System

// To generate a new hash, run this in the browser console:
//   hashPassword("your_password").then(console.log)
const CORRECT_HASH = "49d180ecf56132819571bf39d9b7b342522a2ac6d23c1418d3338251bfe469c8";
let isAuthenticated = false;

let shelfData = [];
let auditLogs = [];
let currentReport = '';

let socket = null;

function getBackendUrl() {
    return localStorage.getItem('astroMedBackendUrl') || '';
}

// -1 is the C++ backend's sentinel value for an empty shelf slot
function isOccupied(shelf) {
    return shelf.box_id !== -1 && shelf.box_id !== null && shelf.box_id !== undefined;
}

document.addEventListener('DOMContentLoaded', () => {
    initRippleButtons();
    checkAuth();
    if (isAuthenticated) {
        initializeApp();
    }
});

// sessionStorage clears when the tab closes; localStorage persists across sessions
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

async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function handleLogin(event) {
    if (event) event.preventDefault();
    const passwordInput = document.getElementById('password-input');
    const errorMsg = document.getElementById('login-error');
    if (!passwordInput) return;

    const inputHash = await hashPassword(passwordInput.value);
    if (inputHash === CORRECT_HASH) {
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

function initializeApp() {
    loadSettingsUI();
    connectWebSocket(getBackendUrl());
}

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

async function saveSettings() {
    const host = document.getElementById('setting-host').value.trim();
    const port = document.getElementById('setting-port').value.trim();
    const statusEl = document.getElementById('settings-status');

    if (!host || !port) {
        statusEl.textContent = 'Please enter both host and port.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const url = `ws://${host}:${port}`;
    localStorage.setItem('astroMedBackendUrl', url);
    document.getElementById('current-backend-url').textContent = url;
    statusEl.textContent = 'Saved. Connecting via WebSocket...';
    statusEl.style.color = 'var(--accent)';

    try {
        await runBackendConnectScan();
        connectWebSocket(url); 
        showView('dashboard');
    } catch (err) {
        statusEl.textContent = '✗ Connection scan failed.';
        statusEl.style.color = 'var(--danger)';
    }
}

function runBackendConnectScan() {
    return new Promise((resolve, reject) => {
        try {
            const existing = document.getElementById('backend-scan-overlay');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'backend-scan-overlay';
            overlay.className = 'backend-scan-overlay';

            const panel = document.createElement('div');
            panel.className = 'backend-scan-panel';

            const title = document.createElement('div');
            title.className = 'backend-scan-title';
            title.textContent = 'ESTABLISHING BACKEND CONNECTION... SCANNING';

            const track = document.createElement('div');
            track.className = 'backend-scan-track';
            const bar = document.createElement('div');
            bar.className = 'backend-scan-bar';
            track.appendChild(bar);

            panel.appendChild(title);
            panel.appendChild(track);
            overlay.appendChild(panel);
            document.body.appendChild(overlay);

            window.setTimeout(() => {
                overlay.remove();
                resolve();
            }, 1900);
        } catch (err) {
            reject(err);
        }
    });
}

function connectWebSocket(url) {
    if (socket) {
        socket.close(); // Close existing connection if reconnecting
    }

    socket = new WebSocket(url);

    const healthEl = document.getElementById('health-status');
    const cardHealth = document.getElementById('card-health');

    socket.onopen = () => {
        if (healthEl) { healthEl.textContent = 'ONLINE'; healthEl.className = 'status-online'; }
        if (cardHealth) { cardHealth.textContent = 'OK'; cardHealth.style.color = 'var(--accent)'; }
        hideError();
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // The C++ backend broadcasts "shelf_info" as an object. 
            // If your UI expects an array, we map the object values.
            if (data.shelf_info) {
                // Check if it's an object or an array, and normalize it for renderShelfTable
                shelfData = Array.isArray(data.shelf_info) ? data.shelf_info : Object.values(data.shelf_info);
                renderShelfTable(document.getElementById('search-bar').value.toLowerCase());
                updateStats();
            }

            // Note: If C++ starts broadcasting logs in the future, handle them here.
        } catch (err) {
            console.error("Failed to parse WebSocket message:", err);
        }
    };

    socket.onclose = () => {
        setHealthOffline('Disconnected');
    };

    socket.onerror = (error) => {
        setHealthOffline('Socket Error');
        console.error("WebSocket Error:", error);
    };
}

function setHealthOffline(reason) {
    const healthEl = document.getElementById('health-status');
    const cardHealth = document.getElementById('card-health');
    if (healthEl) { healthEl.textContent = 'OFFLINE'; healthEl.className = 'status-offline'; }
    if (cardHealth) { cardHealth.textContent = reason; cardHealth.style.color = 'var(--danger)'; }
}


function renderLogs(error = false) {
    const list = document.getElementById('audit-log-list');
    if (!list) return;

    list.innerHTML = '';
    if (error) {
        list.innerHTML = `<li class="log-entry error-msg">Failed to load logs.</li>`;
        return;
    }

    if (auditLogs.length === 0) {
        list.innerHTML = `<li class="log-entry table-msg">No entries found.</li>`;
        return;
    }

    auditLogs.forEach(entry => {
        const li = document.createElement('li');
        li.className = 'log-entry';
        li.textContent = entry;
        list.appendChild(li);
    });
}

async function refreshData() {
    const btn = document.getElementById('btn-refresh');
    if (btn) { btn.textContent = '⟳ Refreshing...'; btn.disabled = true; }

    await fetchSystemHealth();
    await Promise.all([fetchShelves(), fetchAuditLogs()]);

    if (btn) { btn.innerHTML = '&#8635; Refresh'; btn.disabled = false; }
}

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
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.className = 'table-msg';
        td.textContent = shelfData.length === 0
            ? 'No shelf data received. Check backend connection in Settings.'
            : 'No results match your search.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    filtered.forEach((shelf, index) => {
        const occupied = isOccupied(shelf);
        const shelfTag = String(shelf.tag ?? `shelf-${index + 1}`);
        const detailId = `detail-${shelfTag}`.replace(/[^a-zA-Z0-9_-]/g, '-');

        const mainRow = document.createElement('tr');
        mainRow.className = 'shelf-row';

        const tagTd = document.createElement('td');
        tagTd.className = 'med-name';
        const indicator = document.createElement('span');
        indicator.className = 'expand-indicator';
        indicator.textContent = '[+]';
        tagTd.appendChild(indicator);
        tagTd.appendChild(document.createTextNode(shelfTag));
        mainRow.appendChild(tagTd);

        const idTd = document.createElement('td');
        idTd.textContent = occupied ? String(shelf.box_id) : '—';
        mainRow.appendChild(idTd);

        const nameTd = document.createElement('td');
        nameTd.textContent = (occupied && shelf.box_pretty_name) ? shelf.box_pretty_name : '—';
        mainRow.appendChild(nameTd);

        const regTd = document.createElement('td');
        regTd.textContent = (occupied && shelf.registrant) ? shelf.registrant : '—';
        mainRow.appendChild(regTd);

        const statusTd = document.createElement('td');
        statusTd.style.color = occupied ? 'var(--accent)' : 'var(--accent-dim)';
        statusTd.style.fontFamily = "'Space Mono', monospace";
        statusTd.textContent = occupied ? 'OCCUPIED' : 'STANDBY';
        mainRow.appendChild(statusTd);

        const actionTd = document.createElement('td');
        if (occupied) {
            const btn = document.createElement('button');
            btn.className = 'btn-delete';
            btn.type = 'button';
            btn.textContent = 'CLEAR';
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                clearShelf(shelfTag);
            });
            actionTd.appendChild(btn);
        } else {
            actionTd.textContent = '—';
        }
        mainRow.appendChild(actionTd);

        const detailRow = document.createElement('tr');
        detailRow.className = 'shelf-detail-row';
        detailRow.id = detailId;

        const detailTd = document.createElement('td');
        detailTd.colSpan = 6;
        detailTd.style.padding = '0';

        const detailGrid = document.createElement('div');
        detailGrid.className = 'detail-grid';

        [
            { label: 'CONTENTS:', value: shelf.box_pretty_name || shelf.contents || 'N/A' },
            { label: 'LAST SCANNED:', value: shelf.last_scan_time || '--:--:--' },
            { label: 'SYS NOTES:', value: shelf.notes || 'NOMINAL' },
        ].forEach(({ label, value }) => {
            const block = document.createElement('div');
            block.className = 'detail-data-block';
            block.textContent = label;
            const span = document.createElement('span');
            span.textContent = value;
            block.appendChild(span);
            detailGrid.appendChild(block);
        });

        detailTd.appendChild(detailGrid);
        detailRow.appendChild(detailTd);

        mainRow.addEventListener('click', () => {
            const isOpen = detailRow.classList.toggle('is-open');
            indicator.textContent = isOpen ? '[–]' : '[+]';
        });

        tbody.appendChild(mainRow);
        tbody.appendChild(detailRow);
    });
}

function filterShelves() {
    renderShelfTable(document.getElementById('search-bar').value.toLowerCase());
}

function updateStats() {
    const total = shelfData.length;
    const occupied = shelfData.filter(isOccupied).length;
    const empty = total - occupied;

    const fmt = v => Number.isFinite(v) ? String(v) : '—';

    document.getElementById('total-shelves').textContent = fmt(total);
    document.getElementById('boxes-on-shelves').textContent = fmt(occupied);
    document.getElementById('card-total-shelves').textContent = fmt(total);
    document.getElementById('card-occupied').textContent = fmt(occupied);
    document.getElementById('card-empty').textContent = fmt(empty);
}

async function clearShelf(shelfTag) {
    if (!confirm(`Clear shelf "${shelfTag}"?\nThis will remove the box record from this shelf.`)) return;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        showError('WebSocket is not connected. Cannot send command.');
        return;
    }

    try {
    
        const payload = {
            event: "clear_shelf", 
            shelf_id: shelfTag
        };
        
        socket.send(JSON.stringify(payload));
        


    } catch (err) {
        showError(`Failed to clear shelf "${shelfTag}": ${err.message}`);
    }
}

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

function initRippleButtons() {
    document.querySelectorAll('.btn-ripple').forEach(btn => {
        const ripple = btn.querySelector('.ripple-span');
        if (!ripple) return;

        function placeRipple(e) {
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) * 2;
            ripple.style.width  = `${size}px`;
            ripple.style.height = `${size}px`;
            ripple.style.left   = `${e.clientX - rect.left - size / 2}px`;
            ripple.style.top    = `${e.clientY - rect.top  - size / 2}px`;
        }

        btn.addEventListener('mouseenter', e => {
            placeRipple(e);
            ripple.style.animation = 'none';
            ripple.offsetWidth;
            ripple.style.animation = 'ripple-enter 0.45s ease forwards';
        });

        btn.addEventListener('mousemove', placeRipple);

        btn.addEventListener('mouseleave', () => {
            ripple.style.animation = 'none';
            ripple.offsetWidth;
            ripple.style.animation = 'ripple-leave 0.35s ease forwards';
        });
    });
}

function generateReport() {
    if (!shelfData.length) {
        showError('No shelf data available. Refresh first.');
        return;
    }

    const total    = shelfData.length;
    const occupied = shelfData.filter(isOccupied).length;
    const empty    = total - occupied;
    const ts       = new Date().toISOString();
    const line     = '─'.repeat(56);

    let r = `AIMS INVENTORY REPORT\n`;
    r += `Generated : ${ts}\n`;
    r += `${line}\n\n`;
    r += `SUMMARY\n`;
    r += `  Total Shelves : ${total}\n`;
    r += `  Occupied      : ${occupied}\n`;
    r += `  Empty         : ${empty}\n\n`;
    r += `SHELF DETAIL\n${line}\n`;

    shelfData.forEach(shelf => {
        const occ = isOccupied(shelf);
        r += `\n[${shelf.tag ?? 'N/A'}]\n`;
        r += `  Status    : ${occ ? 'OCCUPIED' : 'STANDBY'}\n`;
        if (occ) {
            r += `  Box ID    : ${shelf.box_id}\n`;
            if (shelf.box_pretty_name) r += `  Name      : ${shelf.box_pretty_name}\n`;
            if (shelf.registrant)      r += `  Registrant: ${shelf.registrant}\n`;
            if (shelf.last_scan_time)  r += `  Last Scan : ${shelf.last_scan_time}\n`;
            if (shelf.notes)           r += `  Notes     : ${shelf.notes}\n`;
        }
    });

    r += `\n${line}\nEND OF REPORT\n`;
    currentReport = r;

    const outputEl    = document.getElementById('report-output');
    const contentEl   = document.getElementById('report-content');
    const timestampEl = document.getElementById('report-timestamp');
    if (contentEl)   contentEl.textContent   = r;
    if (timestampEl) timestampEl.textContent = ts;
    if (outputEl)    outputEl.classList.remove('hidden');
}

function downloadReport() {
    if (!currentReport) generateReport();
    if (!currentReport) return;

    const blob = new Blob([currentReport], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `aims-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Exposed for inline HTML event handlers
window.handleLogin     = handleLogin;
window.logout          = logout;
window.showView        = showView;
window.filterShelves   = filterShelves;
window.refreshData     = refreshData;
window.saveSettings    = saveSettings;
window.clearShelf      = clearShelf;
window.generateReport  = generateReport;
window.downloadReport  = downloadReport;
