# Waypoint Autopilot

**Waypoint Autopilot** is a mobile-first, installable web application (PWA) that guides a person through an ordered sequence of real-world geographic waypoints for pedestrian exploration of cities and parks.

It is designed around an **"Eyes Up, Phone Away"** philosophy: alerting walkers with distinct audio and haptic cues upon reaching waypoints so they can keep their phones in their pockets.

---

## Technical Stack & Architecture

- **Frontend & App Framework**: Next.js 14 (App Router), React 18, TypeScript (strict).
- **Styling & Design System**: Tailwind CSS with outdoor-optimized high-contrast palettes and 48px+ touch targets.
- **Mapping & Geometry**: Leaflet and React-Leaflet with OpenStreetMap tiles and pedestrian topology.
- **Local Persistence & Privacy**: IndexedDB for mission storage, waypoint logs, and offline tile caching. Zero remote tracking or telemetry.
- **AI Narrative Layer**: Local open-weight models via Ollama (`llama3.2`, `mistral`) for optional pre-departure storytelling, with a 100% deterministic rule-based offline fallback.
- **Testing & Quality**: Vitest, React Testing Library, ESLint.

---

## Getting Started

### 1. Prerequisites
- Node.js 18.17+ or 20+
- npm 9+
- Optional: Local [Ollama](https://ollama.com/) instance for open-weight AI storytelling

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
│   │   └── navigation/     # AppHeader, AppBottomNav
│   └── test/               # Vitest setup and automated test suites
```

---

## Architectural & Deployment Notes

- **Deterministic Routing**: Route pathfinding, safety filters, and waypoint triggers are completely independent of AI models and operate deterministically on OpenStreetMap vector data.
- **Hosted Deployments vs. Local Inference**: A hosted web deployment cannot access `localhost:11434` on a user's machine. Waypoint Autopilot utilizes a pluggable `AIProvider` pattern that automatically falls back to an internal deterministic template engine when Ollama is unreachable.
- **Privacy Assurance**: No location history, GPS traces, or user data ever leave the device.

---

## License
MIT
