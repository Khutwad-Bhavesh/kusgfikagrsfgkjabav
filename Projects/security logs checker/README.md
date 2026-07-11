<div align="center">
  <br />
  <h1>🛡️ SENTINEL SOC</h1>
  <p>
    <strong>AI-Powered Security Operations Platform</strong>
  </p>
  <br />
</div>

**Sentinel SOC** is a fully local, Next.js-based Security Operations Center application. It features a rule-based threat detection engine, a visually stunning incident dashboard, MITRE ATT&CK mapping, and automated AI-generated incident reports and shift briefings powered by your choice of **OpenAI (GPT)** or **Gemini**.

Designed for instant deployment and testing, Sentinel SOC runs seamlessly out-of-the-box using a local SQLite database—no external dependencies, no Docker containers, and no complex database setup required.

---

## ✨ Features

- **Stunning UI/UX**: An immersive black, blue, and purple interface featuring a dynamic particle vortex background and premium glassmorphism panels.
- **Universal Log Ingestion**: Upload any `.csv` or `.json` log file. The built-in normalizer intelligently maps varying field names (e.g., `src_ip`, `client_ip`) into a standardized schema automatically.
- **Instant Threat Detection**: A local rule-engine instantly flags suspicious patterns (Brute Force, Privilege Escalation, Port Scans) directly mapping them to MITRE ATT&CK techniques.
- **AI Triage & Briefings**: Generate deep-dive incident reports or executive shift briefings with a single click using OpenAI or Google Gemini.
- **Privacy First**: API keys are kept server-side only. Logs are processed and stored locally in a lightweight SQLite database.
- **Zero Configuration DB**: Runs on a local `database.sqlite` file. Just run `npm run dev` and you are ready to go.

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js 18.18+ (Node 20 LTS recommended)
- An API Key from [OpenAI](https://platform.openai.com/) or [Google AI Studio](https://aistudio.google.com/apikey).

### 2. Configure Environment

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit the file to include your preferred API keys:

```bash
DEFAULT_AI_PROVIDER=openai   # Options: openai | gemini

# OpenAI Settings
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o

# Gemini Settings
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

*(Note: You only need to provide the key for the provider you plan to use.)*

### 3. Install & Run

```bash
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

You will be greeted by the Sentinel SOC landing page. You can click **"Test with Sample Data"** to automatically seed the local SQLite database with a synthetic dataset of benign events and pre-built attack patterns.

---

## 🎯 How to Use

1. **Upload Logs**: Use the TopBar to upload your own `.csv` or `.json` file.
2. **Dashboard**: View high-level metrics, event volume timelines, and severity breakdowns. Generate a comprehensive **AI SOC Briefing** to summarize all recent activity.
3. **Incidents**: Filter triggered alerts by severity. Click any incident to view the raw logs, baseline MITRE ATT&CK mapping, and generate an in-depth **AI Incident Report**.
4. **Logs**: Perform full-text search and filtering across all ingested raw logs.

### Sample Data
Two ready-to-use test files are located in the `sample-logs/` directory:
- `sample_logs.csv` — Standard field names.
- `sample_logs.json` — Uses alternate field names (`time`, `src_ip`, `username`, `msg`) to demonstrate the auto-normalization engine.

---

## 🔍 Detection Engine

The local detection engine (`lib/detection.js`) runs heuristic rules against ingested logs. 

| Incident Type | Rule Trigger | Default Severity |
|---|---|---|
| **Brute Force Attack** | 5+ failed logins from one IP within 15 mins | High |
| **Account Compromise** | Brute force pattern immediately followed by a success | Critical |
| **Port Scan** | 8+ distinct ports targeted from one IP within 10 mins | Medium |
| **Privilege Escalation** | Keyword match (`sudo su`, `added to administrators...`) | Critical |
| **Malware Execution** | Keyword match (`powershell -enc`, `mimikatz...`) | Critical |
| **Off-Hours Access** | Privileged account login between 00:00–05:00 | Low |
| **Data Exfiltration** | Outbound transfer > 1 GB | High |

Each triggered incident maps to a corresponding MITRE ATT&CK technique, providing crucial context before the AI triage begins.

---

## 🛠️ Architecture

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Framer Motion (Animations)
- **Database**: SQLite (`better-sqlite3`) — Zero config, persistent storage.
- **AI Integration**: Server-side API routes interfacing securely with LLMs.

### Key Directories
- `/app` — Application routes and API endpoints.
- `/components` — React components (UI tokens, Dashboard, Logs View).
- `/lib` — Core logic (threat detection, AI abstractions, SQLite connector, log normalization).

---

## 📝 Notes & Limitations

- **Authentication**: This application is currently designed for local testing and demonstration. It does not feature built-in authentication. Do not expose this application directly to the public internet without adding a layer of security (e.g., NextAuth).
- **Ingestion**: Uploading a new log file currently replaces the existing database to keep the demonstration environment clean. To make ingestion additive, modify the pipeline in `lib/ingest.js`.
