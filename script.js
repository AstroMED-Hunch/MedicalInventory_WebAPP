// AstroMed - Visual Inventory Tracking System
// NASA HUNCH | PCTI STEM - Team Lakind

const CORRECT_PASSWORD = "67";
let isAuthenticated = false;
let inventory = [];

window.onload = function() {
    checkAuth();
    if (isAuthenticated) {
        initializeApp();
    }
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin(e);
        });
    }
};

// --- AUTHENTICATION ---

function checkAuth() {
    const authStatus = sessionStorage.getItem('astroMedAuth');
    if (authStatus === 'true') {
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

    if (!passwordInput) {
        alert('Error: Password input not found. Please refresh.');
        return;
    }

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

// --- FACE ID SIMULATION ---

function simulateFaceID() {
    const statusEl = document.getElementById('face-id-status');
    const btn = document.querySelector('#login-view .btn-outline');

    btn.disabled = true;
    btn.style.opacity = "0.5";
    statusEl.innerText = "Initializing Camera...";
    statusEl.style.color = "#fff";

    setTimeout(() => {
        statusEl.innerText = "Scanning Face Pattern...";
        statusEl.style.color = "var(--highlight-cyan)";

        setTimeout(() => {
            statusEl.innerText = "IDENTITY VERIFIED: COMMANDER";
            statusEl.style.color = "var(--safe-green)";

            setTimeout(() => {
                isAuthenticated = true;
                sessionStorage.setItem('astroMedAuth', 'true');
                showApp();
                initializeApp();
                statusEl.innerText = "";
                btn.disabled = false;
                btn.style.opacity = "1";
            }, 1000);

        }, 1500);

    }, 1000);
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
    loadData();
    renderTable();
    updateStats();
}

// --- DATA (localStorage) ---

function loadData() {
    const storedData = localStorage.getItem('astroMedInventory');
    if (storedData) {
        inventory = JSON.parse(storedData);
    } else {
        inventory = [
            { id: 1, name: 'Ibuprofen',   dosage: '200mg', qty: 150, expiry: '2027-05-15', lot: 'IB-99'  },
            { id: 2, name: 'Epinephrine', dosage: '0.3mg', qty: 2,   expiry: '2024-12-01', lot: 'EPI-1'  },
            { id: 3, name: 'Bandages',    dosage: 'N/A',   qty: 50,  expiry: '2030-01-01', lot: 'BND-5'  }
        ];
        saveData();
    }
}

function saveData() {
    localStorage.setItem('astroMedInventory', JSON.stringify(inventory));
    updateStats();
}

// --- SMART SCAN (OCR) ---

function runExtraction() {
    const rawText = document.getElementById('raw-text-input').value;
    const btn = document.querySelector('.btn-action');
    const statusMsg = document.getElementById('scan-status');

    btn.innerHTML = "Scanning...";
    btn.style.backgroundColor = "#999";

    setTimeout(() => {
        // Regex patterns: date YYYY-MM-DD, quantity keyword, dosage unit, first line as name
        const dateMatch = rawText.match(/(\d{4}-\d{2}-\d{2})/);
        const qtyMatch  = rawText.match(/(?:Qty|Count|Quantity)[:\s]*(\d+)/i);
        const doseMatch = rawText.match(/(\d+(?:\.\d+)?)\s?(mg|ml|mcg|g)/i);
        const nameGuess = rawText.split('\n')[0]?.trim() || "";

        if (dateMatch) document.getElementById('field-date').value    = dateMatch[0];
        if (qtyMatch)  document.getElementById('field-qty').value     = qtyMatch[1];
        if (doseMatch) document.getElementById('field-dosage').value  = doseMatch[0];
        if (nameGuess) document.getElementById('field-name').value    = nameGuess;

        btn.innerHTML = "Scan Text";
        btn.style.backgroundColor = "";
        statusMsg.innerText = "Scan complete.";
        statusMsg.style.color = "var(--safe-green)";

    }, 800);
}

// --- CRUD ---

function saveItem(event) {
    event.preventDefault();

    const newItem = {
        id:     Date.now(),
        name:   document.getElementById('field-name').value,
        dosage: document.getElementById('field-dosage').value,
        qty:    parseInt(document.getElementById('field-qty').value),
        expiry: document.getElementById('field-date').value,
        lot:    document.getElementById('field-lot').value
    };

    inventory.unshift(newItem);
    saveData();

    document.getElementById('add-item-form').reset();
    document.getElementById('raw-text-input').value = '';
    document.getElementById('scan-status').innerText = '';

    alert("Item saved.");
    showView('dashboard');
    renderTable();
}

function deleteItem(id) {
    if (confirm("WARNING: Are you sure you want to remove this item?")) {
        inventory = inventory.filter(item => item.id !== id);
        saveData();
        renderTable();
    }
}

function filterInventory() {
    renderTable(document.getElementById('search-bar').value.toLowerCase());
}

// --- RENDER TABLE ---

function renderTable(searchTerm = "") {
    const tbody = document.getElementById('inventory-table-body');
    tbody.innerHTML = '';

    inventory.forEach(item => {
        if (searchTerm && !item.name.toLowerCase().includes(searchTerm)) return;

        const today   = new Date();
        const expDate = new Date(item.expiry);
        let statusLabel = 'OK';
        let statusClass = 'status-ok';

        if (expDate < today) {
            statusLabel = 'EXPIRED';
            statusClass = 'status-crit';
        } else if (item.qty < 15) {
            statusLabel = 'LOW STOCK';
            statusClass = 'status-warn';
        }

        tbody.innerHTML += `
            <tr>
                <td class="med-name">${item.name}</td>
                <td>${item.dosage}</td>
                <td style="font-family:'Space Mono'">${item.qty}</td>
                <td>${item.expiry}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td><button class="btn-delete" onclick="deleteItem(${item.id})">REMOVE</button></td>
            </tr>
        `;
    });
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

function updateStats() {
    document.getElementById('total-count').innerText = inventory.length;
}

// --- EXPORT ---

function exportCSV() {
    let csv = "Name,Dosage,Quantity,Expiry,Lot\n";
    inventory.forEach(item => {
        csv += `${item.name},${item.dosage},${item.qty},${item.expiry},${item.lot}\n`;
    });
    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
        download: 'Mission_Inventory_Report.csv'
    });
    a.click();
}

// --- BACKEND SYNC ---

function syncWithBackend() {
    if (confirm('Generate CSV file for C++ AI Backend?')) {
        let csv = "Name,Dosage,Quantity,Expiry,Lot\n";
        inventory.forEach(item => {
            csv += `${item.name},${item.dosage},${item.qty},${item.expiry},${item.lot}\n`;
        });
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: 'medications.csv' });
        a.click();
        URL.revokeObjectURL(url);
        alert('File generated. Place it in the C++ application folder.');
    }
}

// Global exports for inline HTML event handlers
window.handleLogin    = handleLogin;
window.logout         = logout;
window.showView       = showView;
window.deleteItem     = deleteItem;
window.filterInventory = filterInventory;
window.runExtraction  = runExtraction;
window.saveItem       = saveItem;
window.exportCSV      = exportCSV;
window.simulateFaceID = simulateFaceID;
window.syncWithBackend = syncWithBackend;
