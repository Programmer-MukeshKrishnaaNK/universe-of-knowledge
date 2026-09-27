# The Universe of Knowledge

An explorable 3D universe of mathematics and science. Concepts are points of light; relationships are the currents between them. Click anything and you travel there: the camera flies, the neighbourhood rearranges into prerequisites, related ideas and next steps, and a quiet glance tells you where the idea sits — what it builds on, connects to and leads to — before you choose to read.

> Explore anything. Understand everything. Go as deep as you want.

## Run it

```bash
npm install
npm run dev          # http://localhost:5250  (UI + guide API in one process)
```

Production:

```bash
npm run build
npm start            # http://localhost:8787  (serves dist/ + the guide API)
                     # (the guide API is not mounted by `vite preview`)
```

Other scripts: `npm run typecheck`, `npm run check:data` (validates every reference, paper and inline link in the dataset).

## Using it

| Action | How |
| --- | --- |
| Look around | drag (orbit), right-drag / shift-drag (pan), scroll or pinch (zoom toward the cursor) |
| Travel | click any light, any linked term in a text, or a search result |
| Search | `/` or ⌘K; results *fly* you there along a highlighted route |
| Keyboard | `←` `→` look around the current neighbourhood, `Enter` travel, `Esc` back, `H` overview, `M` your map |
| Read | arrival shows a glance; **Read** (or scroll) opens the full explanation |
| Depth | Simple → Detailed → Technical while reading; the depth meter on the left shows how far into a region you are |
| Your map | mark topics Learning / Understood / Review / Later; prerequisites you know stop being recommended. Rings on nodes and warm threads along travelled connections are always faintly visible — **Your map** brings them forward |
| Outline | a list view of every topic (also the automatic fallback when WebGL is unavailable, or with `?outline`) |
| Share | the URL hash is the location, e.g. `/#/entanglement` |
| Calm motion | follows `prefers-reduced-motion`; `?motion=reduced` forces it |

## Architecture

```
src/
  data/          The knowledge model — schema, topics (per domain), papers
  graph/         Normalised graph (typed arrays), layout, search, recommendations
  engine/        Framework-free simulation: World (node/edge state), CameraRig, director, ripples
  scene/         React Three Fiber components — one draw call per system, all GLSL in shaders.ts
  ui/            DOM layer — search, panel, journey, controls, outline, rich text
  store/         Zustand stores — exploration intent, personal knowledge (persisted)
  ai/            Browser client for the guide (talks only to our own backend)
server/
  api.ts         /api/health, /api/explain (SSE), validation, rate limit, graceful fallback
  ai/            Provider abstraction + grounded prompt construction
  index.ts       Production static + API server
```

**Separation of concerns.** Intent lives in the store (`travelTo`, `back`, `setHover`). The *director* is the only thing that turns intent into choreography: it computes a destination, asks the `World` to rearrange and re-emphasise, and hands the `CameraRig` a flight. Scene components never decide anything — they upload typed arrays the engine already filled.

**Regions.** Every domain has its own formation and behaviour so regions are recognisable without labels: a mathematics lattice with a wave passing through it, a physics dipole field with streaming energy, a rotating astronomy spiral, computing circuit traces with fast signals, chemistry electron shells, and so on (`scene/formations.ts`). Faint nebula veils, distant clusters and camera-relative motes give foreground / midground / background depth.

**Rendering.** Nodes are a single instanced draw call of camera-facing quads whose fragment shader draws a lit core, halo, orbital rings, focus/hover rings and the personal-knowledge layer. Edges are one `LineSegments` of sampled quadratic Béziers with flow pulses (prerequisite → dependent). Dust and stars are two `Points` draws. Labels are SDF text with per-frame LOD, constant screen size and greedy screen-space de-cluttering. Post: mipmap bloom, ACES tone mapping, vignette, grain. A performance monitor sheds resolution first and effects second.

**Motion.** Positions use critically damped springs; emphasis uses frame-rate-independent exponential damping. The camera orbit rig has real angular, zoom and pan inertia and zooms toward the cursor. Flights are authored curves (arcing Bézier for a hop, Catmull–Rom through waypoints for search routes) eased with a quintic smootherstep, with the gaze leading the body. Long journeys begin with a brief anticipation, the camera banks gently through turns, arrivals lean into the direction of travel and settle with a little momentum. Connections draw themselves outward from whatever woke them; dependencies flow, sideways relations breathe. Search journeys climb the hierarchy, cross between regions and descend, narrating the regions they pass. `prefers-reduced-motion` switches to short, straight, calm transitions and disables ambient motion.

**Scale.** All per-node and per-edge state is in typed arrays indexed by integer id and shared directly with the GPU; only changed buffers are uploaded. The full simulation costs ~0.2 ms/frame at today's size. To grow to very large graphs: move layout relaxation to a worker with a Barnes–Hut octree, stream regions of the dataset on demand (the `allTopics` array is the only place that assumes everything is local), and move label candidates to a spatial index.

## The knowledge model

`src/data/schema.ts` defines `Topic`, `Relationship`, `Paper` and `UserKnowledge`. Topics are authored per domain for readability and normalised into a relationship list (`contains`, `prerequisite`, `related`, `bridge`) by `graph/buildGraph.ts`. Rich text supports `[[topic-id|label]]` (a doorway into the universe) and `$…$` / `$$…$$` math.

This first release charts **99 topics** focused on mathematics and physics — from algebra and calculus to Bell's theorem, decoherence and quantum computing — with bridges into astronomy, computer science, chemistry, and lightly-charted regions (biology, earth science, neuroscience, engineering) shown honestly as *uncharted*.

**Research.** 106 real publications, each with authors, year, venue, DOI and/or arXiv id where these could be stated confidently, a plain-language summary written for this project (not the abstract), why it matters, and the background it assumes. Papers without an identifier link to a scholarly search for the exact title.

## The AI guide

The structured graph is the foundation; the AI is a guide within it. The browser calls our backend; the backend chooses a provider from environment variables and never exposes keys.

```bash
cp .env.example .env
# AI_PROVIDER=openrouter + OPENROUTER_API_KEY=…   (free models available)
# or AI_PROVIDER=openai-compatible + AI_BASE_URL=… (OpenAI, Groq, Together, local Ollama…)
```

With no provider configured the guide runs **offline**, answering from the curated topic data, so every mode works out of the box. If a live provider fails mid-request the answer falls back to the offline guide.

Prompts are grounded: the topic card is the source of truth, the model may only link to topic ids in the current neighbourhood (unknown ids render as plain text client-side), and it is told never to invent papers or statistics. Modes: explain simply, analogy, explain like I'm 15, the mathematics, go deeper, "I don't understand this" (which always starts from *Let's take one step back*), "what should I learn next?" (phrased from the graph's own recommendations), explain a cited research paper (grounded only in its recorded details), and free questions.

## Accessibility

Keyboard navigation of the graph, an Outline view, a live region announcing travel, reduced-motion support, semantic panel structure, sufficient contrast, and a complete non-WebGL fallback.
