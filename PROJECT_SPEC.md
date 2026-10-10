# Waypoint Autopilot — Specification & Architecture

## 1. Product Overview

**Waypoint Autopilot** is a mobile-first, installable web application (PWA) that guides a person through an ordered sequence of real-world geographic waypoints. 

Unlike conventional augmented reality games or vehicle navigation systems, Waypoint Autopilot is built specifically for pedestrian exploration of urban neighborhoods, historical quarters, and municipal parks. It is designed to **encourage users to put their phones in their pockets** while walking, relying on distinct audio/haptic cues and glanceable high-contrast waypoint instructions.

### Core Philosophy
1. **Eyes Up, Phone Away**: Walking navigation should enhance real-world spatial awareness, not demand continuous screen time or camera interaction.
2. **Deterministic Safety & Geometry First**: Pathfinding, obstacle avoidance, and waypoint progression are governed strictly by deterministic spatial algorithms and OpenStreetMap pedestrian topology—never hallucinated by generative models.
3. **Local-First & Private by Default**: All mission histories, GPS traces, and cached map tiles reside in the browser's local IndexedDB. No remote tracking, analytics, or user accounts.
4. **Open-Weight & Offline Capable**: Optional AI narrative enrichment is powered by local open-weight models (via Ollama) during mission planning. Core navigation never requires a live network connection or active LLM inference while walking.

---

## 2. Technical Stack

| Component | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 14+ (App Router) | React Server & Client Components, routing, optimization |
| **Language** | TypeScript 5.x (Strict) | End-to-end type safety across spatial and state logic |
| **Styling** | Tailwind CSS | Mobile-first, high-contrast, accessible outdoor palette |
| **Icons** | Lucide React | Lightweight, consistent navigation and status iconography |
| **Mapping Engine** | Leaflet & React-Leaflet | Open-source interactive map with OpenStreetMap tiles |
| **Local Storage** | IndexedDB (`idb` / native wrapper) | Offline persistence for missions, active state, and tile cache |
| **Location Tracking**| Browser Geolocation API | Foreground GPS monitoring, watchPosition with accuracy filtering |
| **AI Layer** | Ollama (Local Open-Weight) | Pre-departure mission narration with strict deterministic fallback |
| **Testing** | Vitest & Testing Library | Unit, integration, and spatial geometry verification |
| **Linting** | ESLint | Code quality, accessibility, and Next.js best practices |

*Note: The system is packaged as a single TypeScript application. No Python backend or proprietary external cloud APIs are required.*

---

## 3. Product Behaviour & Lifecycle

### 3.1 Mission Setup & Configuration
The user defines their walking session parameters:
- **Starting Point**: Current GPS coordinates or a selected map anchor.
- **Exploration Style**:
  - `Greenway & Nature`: Prioritizes public parks, tree-lined paths, and waterfront promenades.
  - `Architectural & Heritage`: Prioritizes historic landmarks, civic squares, and public art.
  - `Urban Discovery`: Prioritizes pedestrianized alleys, community gardens, and neighborhood focal points.
  - `Quiet Paths`: Prioritizes low-traffic residential corridors and pedestrian lanes.
- **Target Walking Duration**: (e.g., 20, 35, 50, 75 minutes).
- **Maximum Walking Radius**: (e.g., 500m to 2.5km from start).

### 3.2 Route Generation Engine (Deterministic)
1. **Candidate Discovery**: Queries OpenStreetMap Overpass / pre-indexed points of interest matching the selected exploration style within the radius.
2. **Path Geometry**: Constructs an ordered sequence of waypoints connected by validated pedestrian pathways (sidewalks, footways, crosswalks, park paths).
3. **Leg Validation**: Ensures no private property, impassable obstacles, or high-speed roads lacking pedestrian infrastructure are included.
4. **Waypoint Model**:
   - `id`: Unique identifier (UUID).
   - `order`: 1-based sequential index.
   - `name`: Clear landmark or intersection label.
   - `coordinates`: `{ latitude: number, longitude: number }`.
   - `arrivalRadiusMeters`: Target proximity threshold (default: 15–20m, dynamically adjusted for GPS accuracy).
   - `instruction`: Terse, glanceable direction (e.g., "Enter the garden gate and follow the stone path north").
   - `poiDetails`: Cultural, architectural, or environmental notes.
   - `nextLeg`: Encoded polyline geometry and distance to subsequent waypoint.

### 3.3 Waypoint Progression & Navigation State Machine
```
[DRAFT / SETUP] 
       │ (Generate Route)
       ▼
[PREPARED & CACHED] ──(User starts mission)──► [ACTIVE: EN ROUTE TO WP N]
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
           [GPS Arrival Detected]                                         [Manual Confirmation]
         (Distance ≤ Threshold &                                      (Fallback for degraded GPS)
          Accuracy ≤ Max Tolerance)                                                  │
                       │                                                             │
                       └──────────────────────────────┬──────────────────────────────┘
                                                      │
                                                      ▼
                                            [WAYPOINT N REACHED]
                                          (Audio/Haptic Alert Triggered)
                                                      │
                                    ┌─────────────────┴─────────────────┐
                             (Has More WPs)                       (Final WP)
                                    │                                   │
                                    ▼                                   ▼
                         [ACTIVE: EN ROUTE WP N+1]                 [COMPLETED]
```

- **Arrival Detection**: Computes Haversine distance between foreground GPS position and current waypoint. If `distance <= max(waypoint.arrivalRadiusMeters, currentPosition.accuracy)` and GPS accuracy is acceptable, triggers arrival.
- **Manual Override**: If GPS signal degrades (e.g., urban canyons), the user can manually tap "Confirm Arrival" to advance without waiting for satellite lock.
- **Mission Controls**: User can `Pause`, `Resume`, `Cancel`, or `Complete` a mission at any moment.

---

## 4. AI Architecture & Provider Interface

### 4.1 Role of Open-Weight AI
AI is strictly limited to **pre-departure mission enrichment** (e.g., generating engaging historical vignettes, contextual scavenger clues, or atmospheric commentary for waypoints).
- **Hard Rule**: AI output never determines path geometry, coordinate locations, or road crossings.
- **Model Standard**: Local open-weight models running via Ollama (e.g., `llama3.2`, `mistral`, `phi3`).

### 4.2 Local vs. Hosted Deployment Decision
- **Local Dev / Self-Hosted**: Next.js server running on the user's machine can directly query `http://localhost:11434/api/generate`.
- **Hosted Web Deployment**: A public cloud web server cannot reach `localhost:11434` on the user's laptop. Furthermore, an Ollama port must never be exposed unauthenticated to the public internet.
- **Provider Pattern (`AIProvider`)**:
  - `OllamaProvider`: Connects to a local or configured Ollama instance when available.
  - `DeterministicFallbackProvider`: Built-in rule-based curation engine with curated templates, historical metadata presets, and algorithmic waypoint descriptions that works 100% offline with zero external dependencies.
  - If Ollama is unavailable or fails health check, the UI displays an informative status banner and smoothly falls back to the deterministic provider without error or fake success claims.

---

## 5. Safety, Privacy, and Outdoor Design Principles

### 5.1 Safety Guarantees
- **Pedestrian Routing Only**: Strict filtering of OpenStreetMap tags (`highway=footway`, `highway=pedestrian`, `highway=path`, `foot=yes`). Motorways and industrial rights-of-way are barred.
- **No Private Property**: Automatic exclusion of gated communities, private lands (`access=private`), and restricted areas.
- **Road Crossing Safety**: The UI actively reminds users: *"Keep your head up when crossing streets. Waypoint Autopilot will chime upon arrival."*
- **No Misleading Safety Claims**: The app does not claim to know live surface conditions (ice, mud, construction) or real-time personal safety factors.
- **GPS Uncertainty**: Visual GPS accuracy ring and status badge (Good < 10m, Moderate 10-25m, Weak > 25m).

### 5.2 Privacy Architecture
- **Zero Remote Telemetry**: Location coordinates are processed exclusively in browser memory and IndexedDB.
- **No Authentication / Account Required**: Zero sign-ups, cookies, tracking pixels, or advertising SDKs.
- **Local History Erasure**: One-tap button in Settings to purge all local mission logs and cached data.

### 5.3 Outdoor UX & Visual Design System
- **High Contrast**: Legible in direct sunlight with deep slate backgrounds, crisp neutral typography, and distinct amber/emerald status accents.
- **Large Tap Targets**: All primary actions (Start, Pause, Confirm Arrival, Next) feature a minimum 48px touch target for one-handed thumb usage.
- **Haptic & Audio Signals**: Distinct vibration patterns on waypoint arrival and leg completion.

---

## 6. Scope & Non-Goals

### MVP Scope (Urban & Park Exploration)
- Single-user pedestrian discovery walks within cities, towns, and public parks.
- Deterministic waypoint generation based on distance and theme.
- Interactive map overview with route preview.
- Turn-by-turn waypoint cues with arrival confirmation.
- IndexedDB offline caching and local mission review.

### Non-Goals (Out of Scope for MVP)
- Wilderness backcountry trail navigation or topographic contour mapping.
- Fitness/athletic pacing, heart-rate tracking, or calorie burning metrics.
- Multiplayer, social feeds, or shared leaderboards.
- Live camera AR overlays or continuous screen-on games.
- Turn-by-turn voice driving directions for motor vehicles.
- Emergency SOS or search-and-rescue dispatch.

---

## 7. Implementation Roadmap by Phase

1. **Phase 1 — Project specification and foundation** *(Current)*
   - Formal specification (`PROJECT_SPEC.md`), setup documentation (`README.md`), configuration schema (`.env.example`).
   - Clean Next.js App Router scaffold with TypeScript, Tailwind CSS, and icon set.
   - Core application shell, mobile-first responsive layout, and navigation header/bottom-bar.
   - Comprehensive unit test harness and lint setup.

2. **Phase 2 — Core Spatial Models & Deterministic Route Engine**
   - GeoJSON and Waypoint TypeScript data contracts.
   - OpenStreetMap Overpass parser and geometric path builder.
   - Waypoint clustering, radius constraints, and sequence optimizer.

3. **Phase 3 — Interactive Map & Geographic Visualization**
   - Leaflet map component with OpenStreetMap tiles and proper attribution.
   - Custom high-visibility SVG markers for waypoints, start/end nodes, and current location.
   - Route polyline rendering and bounding box auto-fit.

4. **Phase 4 — AI Provider Abstraction & Mission Narration**
   - `AIProvider` interface with `OllamaProvider` and `DeterministicFallbackProvider`.
   - Health check diagnostics and transparent fallback alerting.
   - Contextual waypoint storytelling and theme-aligned instructions.

5. **Phase 5 — Geolocation Engine, Proximity Detection & Feedback**
   - Real-time Geolocation tracking hook with accuracy filter and kalman/sliding-window smoothing.
   - Waypoint arrival detection state machine.
   - Web Audio synthesizer chimes and Vibration API haptic triggers.

6. **Phase 6 — IndexedDB Offline Storage & Mission Caching**
   - IndexedDB schema for missions, waypoints, active progress, and offline tile bounds.
   - Pre-departure offline bundle download and integrity validation.
   - PWA manifest and service worker configuration.

7. **Phase 7 — Mission Lifecycle Experience, Polish & Validation**
   - Complete end-to-end mission flow: Setup -> Preparation -> Active Navigation -> Summary.
   - Sunlight-mode high-contrast UI, battery conservation heuristics.
   - End-to-end testing, error boundary resilience, and release verification.
