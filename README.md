# Waypoint Autopilot

**Waypoint Autopilot** is a mobile-first, installable web application (PWA) that guides a person through an ordered sequence of real-world geographic waypoints for pedestrian exploration of cities and parks.

It is designed around an **"Eyes Up, Phone Away"** philosophy: alerting walkers with distinct audio and glanceable waypoint cues upon arrival so they can keep their phones in their pockets.

---

## Technical Stack & Architecture

- **Frontend & App Framework**: Next.js 14 (App Router), React 18, TypeScript (strict).
- **Styling & Design System**: Tailwind CSS with outdoor-optimized high-contrast palettes and 48px+ touch targets.
- **Mapping & Geometry**: Leaflet and React-Leaflet with OpenStreetMap tiles and pedestrian topology.
- **Navigation State Machine**: Pure TypeScript finite state machine with noisy GPS filters, arrival dwell confirmation, and route deviation detection.
- **Local Persistence & Privacy**: Local storage & IndexedDB for mission storage, waypoint logs, and offline tile caching. Zero remote tracking or telemetry.
- **Open-Weight AI Narrative Layer**: Local open-weight models via Ollama (`qwen2.5:1.5b`, `llama3.2:3b`) for optional pre-departure mission briefs and observation prompts, with a 100% deterministic rule-based offline fallback.
- **Testing & Quality**: Vitest, React Testing Library, ESLint.

---

## Open-Weight AI Integration & Setup

Waypoint Autopilot integrates local open-weight AI for **pre-departure mission enrichment only** (thematic briefs, titles, and eyes-up observation prompts). It **never delegates pathfinding, coordinates, or navigation safety to the language model**.

### Recommended Model: Qwen 2.5 (1.5B Instruct)
- **Model Tag**: `qwen2.5:1.5b`
- **License**: **Apache 2.0** (Open-source, permissive).
- **Resource Footprint**: ~1.2 GB RAM / VRAM. Runs fast on standard consumer laptops and CPUs without dedicated GPUs.
- **Alternative Supported Models**: `qwen2.5:3b`, `llama3.2:3b`, `mistral:7b`.

### Local Ollama Setup
1. Download and install [Ollama](https://ollama.com/).
2. Start the local Ollama background server:
   ```bash
   ollama serve
   ```
3. Pull the lightweight instruction model:
   ```bash
   ollama pull qwen2.5:1.5b
   ```
4. Verify the service is running at `http://127.0.0.1:11434`.

### Hosted Deployment vs. Local Inference
- **Local Development**: The app connects directly to `http://127.0.0.1:11434`.
- **Hosted Cloud Deployments**: A remote public web server cannot access a user's laptop localhost. When Ollama is unreachable, Waypoint Autopilot automatically activates its internal `DeterministicFallbackAIProvider` to generate rich themes and observation cues 100% offline with zero external network calls.
- **Security Guarantee**: Never expose an unauthenticated Ollama endpoint to the public internet.

---

## Getting Started

### 1. Prerequisites
- Node.js 18.17+ or 20+
- npm 9+
- Optional: Local Ollama instance for AI mission enrichment

### 2. Installation
```bash
git clone <repository-url>
cd waypoint
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser (or open in responsive mobile emulation mode).

### 5. Running Tests & Code Quality
```bash
# Run unit and component tests
npm test

# Run TypeScript typechecks
npm run typecheck

# Run ESLint
npm run lint

# Build production bundle
npm run build
```

---

## Project Structure

```
waypoint/
├── PROJECT_SPEC.md         # Persistent specification and roadmap
├── README.md               # Setup and architectural overview
├── .env.example            # Documented environment template
├── vitest.config.ts        # Vitest testing configuration
├── tailwind.config.ts      # Outdoor color palette & typography
├── tsconfig.json           # Strict TypeScript configuration
├── src/
│   ├── app/                # Next.js App Router pages and layout
│   │   ├── layout.tsx      # Root layout with header and bottom nav
│   │   ├── page.tsx        # Mission Setup / Exploration dashboard
│   │   ├── missions/       # Saved offline missions & history
│   │   └── settings/       # Sensor tolerance, storage, and AI config
│   ├── components/
│   │   ├── common/         # Button, Card, Badge, StatusBanner
│   │   ├── map/            # LeafletMap, MapContainer
│   │   ├── navigation/     # AppHeader, AppBottomNav, ActiveNavigationPanel
│   │   └── route/          # LocationSelector, RoutePreviewCard
│   ├── hooks/              # useNavigationAutopilot
│   ├── lib/                # geo.ts, geo-track.ts
│   ├── services/           # geocoding, poi, routing, scoring, route-generator
│   │   ├── ai/             # ollama-provider, deterministic-provider, ai-service
│   │   └── navigation/     # navigation-state-machine
│   ├── test/               # Vitest setup, fixtures, and automated test suites
│   └── types/              # geo.ts, navigation.ts, ai.ts
```

---

## License
MIT
