# Podonly 🦶🩺

> **Modern Electronic Health Records (EHR) & Practice Management Software for Podiatrists**  
> *Prontuário Eletrônico e Gestão Clínica Especializada para Podologia*

[![CI](https://github.com/gerolamo-coys/PatientForm-Manager--PODONLY-/actions/workflows/ci.yml/badge.svg)](https://github.com/gerolamo-coys/PatientForm-Manager--PODONLY-/actions/workflows/ci.yml)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-blue.svg)](#license)
[![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey.svg)](#requirements)

🌐 **Languages:** [English](README.md) | [Português (Brasil)](README_PT.md)

---

## 🌟 Overview

**Podonly** is a high-performance desktop application crafted specifically for podiatry clinics and practitioners. It combines an intuitive digital patient chart, interactive visual foot mapping, Google Calendar synchronization, automated WhatsApp appointment reminders, and clinic financial management into a single, secure desktop experience.

---

## 🚀 Key Features

### 📋 1. Electronic Health Records & Clinical Anamnesis
- **Comprehensive Patient Profiles:** Full patient records including medical history, surgical background, continuous medications, allergies, shoe habits, and systemic health conditions (e.g., Diabetes, Hypertension).
- **Consultation Evolution:** Document chief complaints, dermatological pathologies, performed procedures, and clinical home care prescriptions.

### 🎨 2. Interactive Visual Foot Map Canvas
- **Dynamic Graphical Assessment:** Podiatrists can draw directly onto 2D/3D foot models (plantar and dorsal views for both left and right feet).
- **Color-Coded Diagnostic Tools:** Mark pressure points, calluses, plantar warts, fissures, onychocryptosis, and fungal infections with configurable brush thickness and colors.
- **Session History:** Historical foot drawings are stored alongside each consultation for visual progress tracking.

### 📅 3. Smart Calendar & Google Calendar Integration
- **Interactive Schedule:** Daily, weekly, and monthly views with drag-and-drop appointment scheduling.
- **Bi-directional Google Sync:** Atomic synchronization with Google Calendar events using SQLite transactions and secure OAuth 2.0 with CSRF state verification.

### 💬 4. WhatsApp Web Integration
- **QR Code Pairing:** Connect directly through WhatsApp Web session management.
- **Automated Appointment Reminders:** 1-click personalized appointment reminders with phone number normalization (DDI + DDD + 9-digit validation).

### 💰 5. Financial Flow Management
- **Cash Flow Tracking:** Instant logging of income and expense transactions categorized with auto-complete suggestions.
- **Monthly Summaries:** Real-time metrics for total revenue, operational expenses, and net profit directly on the main dashboard.

### 🔒 6. Enterprise-Grade Local Security & Offline First
- **Encrypted Local Storage:** Sensitive OAuth credentials and tokens are encrypted at rest using Electron's native `safeStorage` (Windows DPAPI / macOS Keychain).
- **High-Performance SQLite:** Local embedded SQLite database operating in WAL (Write-Ahead Logging) mode for instant response times and offline resilience.
- **Electron Hardening:** Complete renderer isolation (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, strict CSP, and `will-navigate` boundary guards).
- **Directory Traversal Protection:** Image uploads and deletions are confined strictly within the authorized sandbox directory.

---

## 🛠️ Architecture & Tech Stack

- **Desktop Runtime:** [Electron](https://www.electronjs.org/) + [Electron-Vite](https://electron-vite.org/)
- **Frontend Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Routing:** [React Router 7](https://reactrouter.com/)
- **Database:** [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (Embedded SQLite with WAL Mode)
- **Styling:** Modern CSS with glassmorphism, responsive panels, and CSS custom properties
- **APIs & Integrations:** Google Calendar API v3, WhatsApp Web.js, Supabase REST

---

## 💻 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20.x or higher recommended)
- [npm](https://www.npmjs.com/) (v10.x or higher)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/gerolamo-coys/PatientForm-Manager--PODONLY-.git
   cd PatientForm-Manager--PODONLY-
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start in Development Mode:**
   ```bash
   npm run dev
   ```

---

## 📦 Building for Production

To build a standalone Windows installer (`.exe`):

```bash
# Type check and build Windows executable
npm run build:win
```

The compiled binaries will be output to the `dist/` directory.

---

## 🛡️ Security & Privacy

For details on how medical data, patient records, and credentials are protected locally and in accordance with data protection regulations, please see:
- [SECURITY.md](SECURITY.md) — Security policies and vulnerability disclosures.
- [PRIVACY.md](PRIVACY.md) — Patient data privacy, retention, and local storage standards.

---

## 📄 License

Proprietary software. All rights reserved. Developed for Podonly clinics and licensed practitioners.
