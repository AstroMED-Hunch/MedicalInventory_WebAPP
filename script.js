// Visual Inventory Tracking System - NASA HUNCH
// Jetson Nano Prototype

// Authentication
// NOTE: Password is hardcoded for prototype demonstration only
// In production, this would authenticate against a database
const CORRECT_PASSWORD = "67"; // Simple password for prototype
let isAuthenticated = false;

// List of items
let inventory = [];

// When the app starts, check authentication
window.onload = function() {
    checkAuth();
    // If authenticated, initialize the app
    if (isAuthenticated) {
        initializeApp();
    }
    
    // Also attach event listener to login form as backup
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin(e);
        });
    }
};

// Check if user is already authenticated (from sessionStorage)
function checkAuth() {
    const authStatus = sessionStorage.getItem('astroMedAuth');
    if (authStatus === 'true') {
        isAuthenticated = true;
        showApp();
    } else {
        showLogin();
    }
}

// Show login page, hide app
function showLogin() {
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

// Show app, hide login
function showApp() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
}

// Handle login form submission
function handleLogin(event) {
    if (event) {
        event.preventDefault();
    }
    
    const passwordInput = document.getElementById('password-input');
    const errorMsg = document.getElementById('login-error');
    
    if (!passwordInput) {
        alert('Error: Password input field not found. Please refresh the page.');
        return;
    }
    
    const password = passwordInput.value;
    
    if (password === CORRECT_PASSWORD) {
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
    
    // Disable button
    btn.disabled = true;
    btn.style.opacity = "0.5";

    // Step 1: Init
    statusEl.innerText = "Initializing Camera...";
    statusEl.style.color = "#fff";

    setTimeout(() => {
        // Step 2: Scanning
        statusEl.innerText = "Scanning Face Pattern...";
        statusEl.style.color = "var(--highlight-cyan)";
        
        setTimeout(() => {
            // Step 3: Verify
            statusEl.innerText = "IDENTITY VERIFIED: COMMANDER";
            statusEl.style.color = "#26de81"; // Green
            
            setTimeout(() => {
                // Step 4: Login
                isAuthenticated = true;
                sessionStorage.setItem('astroMedAuth', 'true');
                showApp();
                initializeApp();
                
                // Reset UI for next time
                statusEl.innerText = "";
                btn.disabled = false;
                btn.style.opacity = "1";
            }, 1000);
            
        }, 1500);
        
    }, 1000);
}

// Logout function
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        isAuthenticated = false;
        sessionStorage.removeItem('astroMedAuth');
        showLogin();
        document.getElementById('password-input').value = '';
        document.getElementById('login-error').style.display = 'none';
    }
}

// Initialize the application after authentication
function initializeApp() {
    loadData();           // Load from LocalStorage
    renderTable();        // Draw the table
    updateStats();        // Update sidebar numbers
}

// --- CORE FUNCTIONS (DATABASE) ---

// Load from LocalStorage (Simulates a database in the browser)
function loadData() {
    const storedData = localStorage.getItem('astroMedInventory');
    
    if (storedData) {
        // If we have data saved, use it
        inventory = JSON.parse(storedData);
    } else {
        // [TODO: Initialize default data if storage is empty]
        inventory = [
            { id: 1, name: 'Ibuprofen', dosage: '200mg', qty: 150, expiry: '2027-05-15', lot: 'IB-99' },
            { id: 2, name: 'Epinephrine', dosage: '0.3mg', qty: 2, expiry: '2024-12-01', lot: 'EPI-1' },
            { id: 3, name: 'Bandages', dosage: 'N/A', qty: 50, expiry: '2030-01-01', lot: 'BND-5' }
        ];
        saveData(); // [TODO: Save initial data]
    }
}

// Save current state to LocalStorage
function saveData() {
    localStorage.setItem('astroMedInventory', JSON.stringify(inventory));
    updateStats();
}

// Scanner Logic
// Reads text to find data
function runExtraction() {
    const rawText = document.getElementById('raw-text-input').value;
    const btn = document.querySelector('.btn-action');
    const statusMsg = document.getElementById('scan-status');

    // Show loading
    btn.innerHTML = "Scanning...";
    btn.style.backgroundColor = "#999";
    
    setTimeout(() => {
        // Find patterns
        
        // Find Date (Looks for YYYY-MM-DD)
        // Explanation: \d{4} is 4 digits, \d{2} is 2 digits
        const dateMatch = rawText.match(/(\d{4}-\d{2}-\d{2})/);
        
        // Find Quantity (Looks for "Qty: 50" or "Count 50")
        const qtyMatch = rawText.match(/(?:Qty|Count|Quantity)[:\s]*(\d+)/i);
        
        // Find Dosage (Looks for number followed by mg/ml/g)
        const doseMatch = rawText.match(/(\d+(?:\.\d+)?)\s?(mg|ml|mcg|g)/i);

        // Find Name (Rough guess: takes the first line of text)
        let nameGuess = "";
        const lines = rawText.split('\n');
        if(lines.length > 0 && lines[0].trim() !== "") {
            nameGuess = lines[0].trim();
        }

        // 3. Fill the form fields automatically
        if (dateMatch) document.getElementById('field-date').value = dateMatch[0];
        if (qtyMatch) document.getElementById('field-qty').value = qtyMatch[1];
        if (doseMatch) document.getElementById('field-dosage').value = doseMatch[0];
        if (nameGuess) document.getElementById('field-name').value = nameGuess;

        // Reset Button
        btn.innerHTML = "Scan Text";
        btn.style.backgroundColor = ""; // Reset color
        statusMsg.innerText = "Scan complete.";
        statusMsg.style.color = "#26de81"; // Green
        
    }, 800); // 0.8 second delay to simulate computer thinking
}

// --- ADD ITEM LOGIC ---
function saveItem(event) {
    event.preventDefault(); // Prevents the page from refreshing

    // Create a new item object
    const newItem = {
        id: Date.now(), // Uses current time as a unique ID
        name: document.getElementById('field-name').value,
        dosage: document.getElementById('field-dosage').value,
        qty: parseInt(document.getElementById('field-qty').value),
        expiry: document.getElementById('field-date').value,
        lot: document.getElementById('field-lot').value
    };

    inventory.unshift(newItem); // Add to the top of the array
    saveData(); // Save to browser memory
    
    // Clear the form and go back to dashboard
    document.getElementById('add-item-form').reset();
    document.getElementById('raw-text-input').value = '';
    document.getElementById('scan-status').innerText = '';
    
    alert("Item saved.");
    showView('dashboard');
    renderTable();
}

// --- DELETE LOGIC ---
function deleteItem(id) {
    if(confirm("WARNING: Are you sure you want to remove this item?")) {
        // Keep everything EXCEPT the item with this ID
        inventory = inventory.filter(item => item.id !== id);
        saveData();
        renderTable();
    }
}

// --- SEARCH/FILTER LOGIC ---
function filterInventory() {
    const term = document.getElementById('search-bar').value.toLowerCase();
    renderTable(term); // Re-draw table with only matching items
}

// --- RENDER UI (Drawing the table) ---
function renderTable(searchTerm = "") {
    const tbody = document.getElementById('inventory-table-body');
    tbody.innerHTML = ''; // Clear current table

    inventory.forEach(item => {
        // If searching, skip items that don't match
        if (searchTerm && !item.name.toLowerCase().includes(searchTerm)) return;

        // Status Logic (The "Smart" Alert System)
        const today = new Date();
        const expDate = new Date(item.expiry);
        let statusLabel = 'OK';
        let statusClass = 'status-ok';

        // Check Expiry
        if (expDate < today) {
            statusLabel = 'EXPIRED';
            statusClass = 'status-crit';
        } 
        // Check Stock Levels
        else if (item.qty < 15) {
            statusLabel = 'LOW STOCK';
            statusClass = 'status-warn';
        }

        // Create the HTML row
        const row = `
            <tr>
                <td class="med-name">${item.name}</td>
                <td>${item.dosage}</td>
                <td style="font-family:'Space Mono'">${item.qty}</td>
                <td>${item.expiry}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button class="btn-delete" onclick="deleteItem(${item.id})">REMOVE</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// --- NAVIGATION (Switching Screens) ---
function showView(viewName) {
    // Only allow navigation if authenticated
    if (!isAuthenticated) {
        showLogin();
        return;
    }
    
    // Hide all sections inside the app container only (not login view)
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    }
    
    // Remove 'active' class from buttons
    document.querySelectorAll('.nav-buttons button').forEach(el => el.classList.remove('active'));

    // Show the requested section
    const viewElement = document.getElementById(viewName + '-view');
    if (viewElement) {
        viewElement.classList.remove('hidden');
        const btnElement = document.getElementById('btn-' + viewName);
        if (btnElement) {
            btnElement.classList.add('active');
        }
        
        // Load data when switching to specific views
        // (No specific data loading needed for current views)
    }
}

// Update the counters in the sidebar
function updateStats() {
    document.getElementById('total-count').innerText = inventory.length;
}

// --- HELPER FUNCTIONS ---
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// --- EXPORT TO CSV (Mission Report) ---
function exportCSV() {
    // Create the CSV content
    let csv = "Name,Dosage,Quantity,Expiry,Lot\n";
    inventory.forEach(item => {
        csv += `${item.name},${item.dosage},${item.qty},${item.expiry},${item.lot}\n`;
    });

    // Create a fake invisible link to download the file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Mission_Inventory_Report.csv';
    a.click();
}

// Ensure functions are globally accessible (for inline event handlers)
window.handleLogin = handleLogin;
window.logout = logout;
window.showView = showView;
window.deleteItem = deleteItem;
window.filterInventory = filterInventory;
window.runExtraction = runExtraction;
window.saveItem = saveItem;
window.exportCSV = exportCSV;
window.simulateFaceID = simulateFaceID;
// --- BACKEND INTEGRATION ---
function syncWithBackend() {
    if(confirm('Generate CSV files for C++ AI Backend?')) {
        // 1. Export Medications DB
        const medCSV = exportMedicationsToCSV(inventory);
        downloadCSV(medCSV, 'medications.csv');
        
        // 2. Export Usage Logs (Empty for now)
        const logCSV = exportLogsToCSV([]); 
        downloadCSV(logCSV, 'adherence_logs.csv');
        
        alert('Files generated. Please place them in the C++ application folder.');
    }
}

function exportMedicationsToCSV(data) {
    let csv = "Name,Dosage,Quantity,Expiry,Lot\n";
    data.forEach(item => {
        csv += `${item.name},${item.dosage},${item.qty},${item.expiry},${item.lot}\n`;
    });
    return csv;
}

function exportLogsToCSV(data) {
    let csv = "Timestamp,ItemName,QuantityRemoved,User,Location\n";
    // If we had logs, we would loop here
    return csv;
}

function downloadCSV(content, fileName) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
}

