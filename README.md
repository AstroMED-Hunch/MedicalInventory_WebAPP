# AstroMed — Visual Inventory Tracking System
**NASA HUNCH | PCTI STEM — Team Lakind**

## Overview
A browser-based interface for the Jetson Nano Visual Inventory Tracking System. Allows crew to monitor medical supply status, scan item labels using OCR pattern matching, and export inventory data to the C++ AI backend.

## Features
- **Login** — Password authentication with a simulated biometric (Face Recognition) placeholder
- **Dashboard** — Live medical inventory table with EXPIRED and LOW STOCK status alerts, search, and CSV export
- **Smart Scan (OCR)** — Paste label text to auto-extract medication name, dosage, quantity, and expiry date via regex
- **About** — Team information and system architecture overview

## How to Run
Open `index.html` in any modern browser. No installation required.

Default password: `67`

## Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Storage:** Browser localStorage (JSON)
- **Backend Sync:** CSV export → C++ AI backend on Jetson Nano
- **Target Hardware:** NVIDIA Jetson Nano
