# Visual Inventory Tracking System
**NASA HUNCH Prototype**

## Overview
This web-based interface serves as the control panel for the **Jetson Nano Visual Inventory Tracking System**. It allows astronauts to view inventory status, manually scan items (simulating OCR), and sync data with the backend AI system.

## Key Features
*   **Dashboard:** Real-time view of medical inventory.
*   **Smart Scan:** Simulates Optical Character Recognition (OCR) for label reading.
*   **System Info:** Displays the operational cycle of the embedded system.
*   **AI Sync:** Exports inventory data to CSV format for the C++ backend.

## How to Run
1.  Open `index.html` in any modern web browser.
2.  Use the Dashboard to view items.
3.  Use the Scanner to add new items.
4.  Click "Sync with AI" to generate data files for the Jetson Nano.

## Technical Details
*   **Frontend:** HTML5, CSS3, Vanilla JavaScript.
*   **Backend Integration:** CSV Data Exchange.
*   **Target Hardware:** NVIDIA Jetson Nano.