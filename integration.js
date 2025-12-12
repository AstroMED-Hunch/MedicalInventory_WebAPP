/**
 * INTEGRATION MODULE
 * Connects the Web UI to the C++ MedicineAI Backend
 * Based on: external_repo_hunch_medical/src/modules/medical_ai/MedicineAI.cpp
 */

// Enum mapping from C++ MedicineAI.hpp
const MedicationForm = {
    TABLET: 0,
    CAPSULE: 1,
    LIQUID: 2,
    INJECTION: 3,
    TOPICAL: 4,
    INHALER: 5,
    OTHER: 6
};

/**
 * Converts the Web UI Inventory to the C++ Backend CSV format
 * C++ Format: id,name,dose_mg,form,manufacturer,notes,expiration_date
 */
function exportMedicationsToCSV(inventory) {
    let csvContent = "id,name,dose_mg,form,manufacturer,notes,expiration_date\n";

    inventory.forEach(item => {
        // 1. Parse Dosage (e.g., "200mg" -> 200.0)
        let doseVal = parseFloat(item.dosage) || 0;
        
        // 2. Guess Form based on unit
        let form = MedicationForm.TABLET; // Default
        if (item.dosage.toLowerCase().includes('ml')) form = MedicationForm.LIQUID;
        if (item.dosage.toLowerCase().includes('g') && !item.dosage.toLowerCase().includes('mg')) form = MedicationForm.TOPICAL;

        // 3. Convert Date to Unix Timestamp (C++ uses int64_t timestamp)
        let expiryTimestamp = new Date(item.expiry).getTime() / 1000; // Seconds

        // 4. Map fields
        // Web UI doesn't have manufacturer/notes, so we leave them empty or use defaults
        let row = [
            item.id,                        // id
            item.name,                      // name
            doseVal,                        // dose_mg
            form,                           // form
            "NASA_HUNCH_SUPPLY",            // manufacturer (placeholder)
            `Lot: ${item.lot}`,             // notes (we put Lot info here)
            expiryTimestamp                 // expiration_date
        ].join(",");

        csvContent += row + "\n";
    });

    return csvContent;
}

/**
 * Converts Usage Logs to C++ Backend CSV format
 * C++ Format: timestamp,user_id,medication_id,dose_taken,is_return,notes
 */
function exportLogsToCSV(logs) {
    let csvContent = "timestamp,user_id,medication_id,dose_taken,is_return,notes\n";

    logs.forEach(log => {
        let row = [
            log.timestamp,
            log.userId || "ASTRONAUT_1",
            log.medId,
            log.amount,
            log.isReturn ? 1 : 0,
            log.notes || ""
        ].join(",");
        csvContent += row + "\n";
    });

    return csvContent;
}

/**
 * Triggers a download of the CSV file
 */
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}
