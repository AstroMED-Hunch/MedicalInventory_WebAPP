# AstroMed Inventory System
**NASA HUNCH 2025-2026 Prototype**

This is a web-based **Medical Inventory Information Extraction System** designed for long-duration spaceflight (Moon/Mars missions).

## Project Overview
Astronauts on deep space missions have limited time. Tracking medication usage manually is inefficient. This prototype provides an automated "Smart Scan" feature that extracts inventory data from unstructured label text.

### Key Features
1.  **Dashboard:** Real-time view of inventory with auto-alerting for Expired or Low Stock items.
2.  **Smart Scan (Extraction):** Simulates an OCR scanner. You can paste "raw text" (e.g., "Amoxicillin 500mg Qty: 30") and the system automatically fills the database fields.
3.  **Offline Capable:** The app uses `localStorage` to save data. It requires no internet connection, simulating operation during Deep Space Network blackouts.
4.  **Dark Mode UI:** Designed to reduce eye strain and power consumption on station displays.

---

## How to Run (Development)

This project uses **Vanilla JavaScript**, so it requires no complex installation.

1.  **Download** the code.
2.  **Open** the `index.html` file in any modern web browser (Chrome, Edge, Firefox).
3.  **Use** the app!

## File Structure
*   `index.html`: The main structure of the website.
*   `style.css`: The "Future Interface" design and colors.
*   `script.js`: The brain of the application (Database logic, Extraction logic, Search logic).

## [TODO: Technical Description / For Judges]
The "Smart Scan" feature uses **Regular Expressions (Regex)** to parse text patterns. This mimics how a backend AI server would process Optical Character Recognition (OCR) data. 

*   **Dates:** It looks for patterns like `YYYY-MM-DD` or `MM/YYYY`.
*   **Dosage:** It looks for numbers followed by medical units (mg, ml, g).
*   **Quantity:** It looks for keywords like "Qty", "Count", or "#".

---
*Created by [TODO: Team Name] for NASA HUNCH 2026*