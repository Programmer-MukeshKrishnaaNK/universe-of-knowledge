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

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript across `src/`, `server/`, `scripts/` |
| `npm test` | Unit tests (graph, traversal, search, layout, spatial index, validation, quality modes, guide access, music) |
| `npm run check:data` | Validates the curated dataset and prints its content hash |
| `npm run ingest -- <file.json>` | Validates an external dataset and writes a versioned, region-split build (see *Ingestion*) |

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
  data/          Curated knowledge — schema, topics (per domain), papers
  knowledge/     The knowledge engine (framework-free)
    graph.ts       Indexed graph: integer ids, typed relationship arrays, adjacency + indexes
    relations.ts   Relationship registry (type, traversal cost, rank, family)
    traverse.ts    Shortest / meaningful paths, journey routes, learning paths, bridges
    explore.ts     Discovery: candidates within two hops, each with a reason
    search.ts      Prefix + fuzzy (trigram) search index
    spatial.ts     Uniform spatial hash for positions
    layout.ts      Deterministic per-region layout (worker above 700 concepts)
    universe.ts    Manifest → regions: streaming, layout, indexes, extent
    guide.ts       Read-only knowledge access for the AI guide
    validate.ts    Dataset validation + content hash
    sources/       Where knowledge comes from (bundled curated data, static ingested builds)
  engine/        World (node/edge state), EdgeField (budgeted edges), CameraRig, director, quality modes
  scene/         React Three Fiber — one draw call per system, all GLSL in shaders.ts
  audio/         The soundtrack: synthesis toolkit, compositions, engine, app wiring
  ui/            DOM layer — search, glance/panel, journey, controls, music, quality, outline
  store/         Zustand stores — exploration, personal knowledge, settings, music (persisted)
  dev/           Development-only synthetic datasets (never part of a production build)
server/          Production static server + guide API
scripts/         check-data, ingest
tests/           node:test suites
```

**Separation of concerns.** Intent lives in the store (`travelTo`, `back`, `setHover`). The *director* is the only thing that turns intent into choreography: it computes a route, asks the universe to load any region the route needs, asks the `World` to rearrange and re-emphasise, and hands the `CameraRig` a flight. Scene components never decide anything — they upload typed arrays the engine already filled.

**Regions.** Every domain has its own formation and behaviour so regions are recognisable without labels: a mathematics lattice with a wave passing through it, a physics dipole field with streaming energy, a rotating astronomy spiral, computing circuit traces with fast signals, chemistry electron shells, and so on (`scene/formations.ts`). Faint nebula veils, distant clusters and camera-relative motes give foreground / midground / background depth.

**Motion.** Positions use critically damped springs; emphasis uses frame-rate-independent exponential damping. The camera orbit rig has real angular, zoom and pan inertia and zooms toward the cursor. Flights are authored curves eased with a quintic smootherstep, with the gaze leading the body; long journeys wind up, bank through turns and settle. Search journeys climb the hierarchy, cross between regions and descend. `prefers-reduced-motion` switches to short, calm transitions.

## The knowledge engine

**Graph.** Concepts are integer-indexed; relationships are first-class and typed — `contains`, `prerequisite`, `related`, `bridge`, `application`, `historical`, `derived_from`, `uses` — stored in growable typed arrays with a source, target, type, strength and a cross-domain flag. Adjacency lists and indexes (children, dependents, by domain, by region, by tag, typed) make every neighbourhood query proportional to the answer, not the graph. Relationships to concepts that haven't loaded yet wait and resolve when their region arrives. Each concept carries provenance (source, version, how it was added).

**Traversal.** `meaningfulPath` is a Dijkstra search weighted by what each relationship *means* (a prerequisite is a natural step; an association is a longer one; crossing a domain costs a little extra), so routes read like explanations. Journeys use the hierarchy (up, across, down) for orientation; learning paths list unknown prerequisites in a cycle-safe order.

**Discovery.** `discover()` scores everything within two hops by relevance, novelty, readiness (how many prerequisites you already understand), difficulty fit and — deliberately — the surprise of crossing into another field, and returns each candidate with its reason: *deeper*, *bridge*, *related*, *unexplored*, *prerequisite*, *nearby*. The glance card shows one of these as a quiet “Wander” line (e.g. *Probability — via Entropy, where Physics meets Mathematics*).

**Search** is a sorted token list with binary-search prefix lookup plus a trigram index for typos, ranked by title/alias/tag match and importance. **Space** is indexed by a uniform spatial hash used for edge selection, hover picking and nearby discovery.

**Streaming.** A source provides a *manifest* (domains, counts, anchors) and then *regions* on demand. The universe lays each region out deterministically (the same data always produces the same universe), inserts it into the graph, search and spatial indexes, and ignites it in the renderer. The first view loads up to 6,000 concepts; the rest stream in behind it, and a journey into an unloaded region loads it before the camera arrives — nothing teleports.

## Rendering at scale

- **Nodes**: one instanced draw call; per-node birth times let regions ignite as they arrive. Level-of-detail in the shader (minimum point size, density-aware brightness, distance fog scaled to the universe's extent), off-screen culling.
- **Edges**: drawn from a *budget*. Each quality mode has a fixed number of slots; the `EdgeField` fills them by relevance (focus, hover and route, then first-hop neighbours, then the neighbourhood around where you are looking, then the strongest bridges). Curves are computed on the GPU from node-position textures, so moving thousands of nodes costs one texture upload.
- **Labels**: a pooled set of SDF texts with screen-space de-cluttering.
- **Hover**: a screen-space picking grid rebuilt only when the view changes.

### Performance modes

| Mode | Resolution | Anti-aliasing | Bloom | Edges drawn | Labels | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Low | 1× | — | off | 1,200 | 22 | Hierarchical compression: galaxies → regions → clusters (soft cluster glows) → important concepts |
| Medium | 1.25× | — | half | 3,500 | 38 | The universe directly, lighter effects |
| High | 1.75× | 4× MSAA | full | 9,000 | 60 | Denser detail |
| Max | 2× | 4× MSAA | full | 20,000 | 84 | Everything, for large datasets on strong GPUs |
| Auto | — | — | — | — | — | Recommends a mode from coarse device signals and early frame times; you can always override it, and your choice is remembered |

### Measured performance

Chromium (Playwright) on an Apple M1, 1440×900, High mode, dev server. *First view* includes the intro reveal; *all loaded* is when every concept is in the graph. Frame times are rAF intervals over 4–5 s windows.

| Dataset | Concepts / relationships | First view | All loaded | Overview | Journey | Focused | Search / query | JS heap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Curated | 99 / 344 | 1.3 s | 0.4 s | 60 fps · p95 17.3 ms | 60 · 16.8 | 60 · 16.7 | 0.02 ms | 82 MB |
| Synthetic 1k | 1,000 / 2,263 | 1.6 s | 0.8 s | 60 · 16.8 | 60 · 16.8 | 60 · 16.8 | 0.03 ms | 93 MB |
| Synthetic 10k | 10,000 / 25,928 | 2.2 s | 1.6 s | 60 · 17.3 | 60 · 17.6 | 60 · 17.6 | 0.13 ms | 95 MB |
| Synthetic 25k | 25,000 / 66,063 | 1.9 s | 3.4 s | 60 · 16.8 | 60 · 17.5 | 60 · 17.5 | 0.24 ms | 118 MB |
| Synthetic 50k | 50,000 / 133,479 | 1.7 s | 4.3 s | 59.8 · 17.6 | 60 · 17.5 | 60 · 17.6 | 0.37 ms | 152 MB |

At 50k every mode held ~60 fps (p95 17.6–18.3 ms) in overview, mid-distance and orbit. The production build of the curated universe measured 60 fps · p95 16.8 ms in overview, journey and focus. These numbers are one machine; slower GPUs should use Low or Medium (Auto does this).

**Stress testing** (development only): `npm run dev`, then open `/?stress=1000` (also 10000, 25000, 50000). The synthetic concepts are generated in the browser, are clearly labelled as synthetic, and are excluded from production builds — `?stress` does nothing there.

## The knowledge model

`src/data/schema.ts` defines `Topic`, `Relationship`, `Paper`, `Provenance` and `UserKnowledge`. Topics are authored per domain for readability; `prerequisites`, `related`, `deeper` and typed `relations` become first-class relationships in the graph. Rich text supports `[[topic-id|label]]` (a doorway into the universe) and `$…$` / `$$…$$` math.

This release charts **99 curated topics** focused on mathematics and physics — from algebra and calculus to Bell's theorem, decoherence and quantum computing — with bridges into astronomy, computer science, chemistry, and lightly-charted regions (biology, earth science, neuroscience, engineering) shown honestly as *uncharted*. The curated dataset is versioned (`1.0.0`) and identified by a content hash, shown in the help panel and reported by `/api/health`.

**Research.** 106 real publications, each with authors, year, venue, DOI and/or arXiv id where these could be stated confidently, a plain-language summary written for this project (not the abstract), why it matters, and the background it assumes. Papers without an identifier link to a scholarly search for the exact title.

## Ingestion

Growing the universe is a pipeline, not an edit:

```bash
npm run ingest -- docs/examples/example-dataset.json
```

A dataset (`uok.dataset/1`, see `src/knowledge/ingest/format.ts` and the example) declares its sources and version. Ingestion validates it against itself and the curated universe — duplicate ids, missing references, invalid domains and levels, orphans, invalid prerequisites, prerequisite cycles, self and duplicate relationships, possible duplicate names, broken inline links, malformed math, unknown papers — refuses to write anything with errors, stamps provenance only from the sources the dataset declares, and writes a region-split build (`.datasets/<id>/<version>/manifest.json` + `regions/*.json`) with a changelog against the previous version. `StaticSource` serves such a build to the app.

AI-generated text never becomes graph data on its own: the guide reads the graph through a read-only interface, and only a validated dataset can add knowledge.

## Soundtrack

Three original pieces, composed for this universe and performed live in the browser with the Web Audio API — no downloads, no licensing questions:

| Track | Mood | Music |
| --- | --- | --- |
| **Origin** | entering the universe — spacious, calm | D Lydian pads, open-fifth drone, scattered glass-bell “stars” |
| **Deep Space** | going deeper — darker, intellectual | A Aeolian, low bells, cosmic wind, rare distant signals |
| **Frontier** | discovering something new — gentle momentum | E major at 84 BPM, soft pulse, arpeggio with a dotted-eighth echo, a rising motif |
| **Off** | silence | |

The music is generative (a written progression with seeded ornaments), so it never loops audibly. Tracks crossfade over 3.5 s and are level-matched (measured within ±0.1 dB RMS offline). Your track, volume and mute are remembered. Audio starts only after your first interaction (browser autoplay policy). The universe never changes your track — while travelling it only opens the tone slightly. Any audio failure is contained; the universe keeps working.

To use recorded audio instead, put the file in `public/audio/` and set `src` on the track in `src/audio/engine.ts` (`TRACKS`). If the file fails to load, the composed version plays.

## The AI guide

The structured graph is the foundation; the AI is a guide within it. The browser calls our backend; the backend chooses a provider from environment variables and never exposes keys.

```bash
cp .env.example .env
# AI_PROVIDER=openrouter + OPENROUTER_API_KEY=…   (free models available)
# or AI_PROVIDER=openai-compatible + AI_BASE_URL=… (OpenAI, Groq, Together, local Ollama…)
```

With no provider configured the guide runs **offline**, answering from the curated topic data, so every mode works out of the box. If a live provider fails mid-request the answer falls back to the offline guide.

The guide can *read* the graph — topic data, prerequisites, related and deeper ideas, routes, learning paths, bridges and discovery candidates — through `knowledge/guide.ts`, which returns detached plain data (also available at `GET /api/knowledge/:id?to=:id`). It cannot modify the graph.

Prompts are grounded: the topic card is the source of truth, the model may only link to topic ids in the current neighbourhood (unknown ids render as plain text client-side), and it is told never to invent papers or statistics. Modes: explain simply, analogy, explain like I'm 15, the mathematics, go deeper, "I don't understand this" (which always starts from *Let's take one step back*), "what should I learn next?" (phrased from the graph's own recommendations, discovery candidates and bridges), explain a cited research paper (grounded only in its recorded details), and free questions.

## Accessibility

Keyboard navigation of the graph, an Outline view, labelled glyph controls on small screens, a live region announcing travel, reduced-motion support, semantic panel structure, sufficient contrast, and a complete non-WebGL fallback.
