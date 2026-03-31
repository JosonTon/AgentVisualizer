# AgentVisualizer

A real-time 3D visualization tool that renders AI coding agent activity as a cyberpunk cityscape. Watch Claude Code (or other AI agents) work on your codebase — files become glowing wireframe buildings, tool calls light up as FUI callout markers, and agent movements trace arc trails across the city.

**Zero cost. Zero tokens. Purely local.**

The tool reads Claude Code's local JSONL session logs (`~/.claude/`) — no API calls, no subscriptions required.

> This entire project — backend, frontend, 3D rendering, FUI effects, and this README — was built by [Claude Code](https://claude.ai/claude-code) (claude-opus-4-6). The human provided the vision and feedback; Claude wrote every line of code.

## Features

- **3D Code City** — Files map to buildings via squarified treemap layout. Height = file size, color = directory-based spectrum subdivision
- **Real-time Agent Tracking** — Watch agents read, write, edit, and search files with FUI-style callout markers and tool-colored indicators
- **Multi-Agent / Multi-Session** — Each agent and subagent gets an independent marker with collision avoidance physics. Session badges distinguish concurrent Claude Code instances
- **Transition Trails** — Animated bezier arc trails with flowing particles show agent movement between files
- **Special Zones** — Plan file operations visualized on a dedicated platform; Bash/system commands on a stylized PC model
- **Dynamic City** — Buildings appear and grow as agents create and modify files
- **Agent Lifecycle** — Markers auto-fade when agents stop working (30s timeout)
- **Cyberpunk Aesthetic** — Matrix rain particles, holographic grid, bloom post-processing, Orbitron font, scan-line effects

## Quick Start

```bash
# Clone and install
git clone https://github.com/JosonTon/AgentVisualizer.git
cd AgentVisualizer
npm install

# Start (launches backend + frontend dev server)
npm run dev
```

Or on Windows, double-click `start.bat`.

Open `http://localhost:5173`, enter a repo path that has Claude Code session history, and watch.

## How It Works

```
~/.claude/projects/ (JSONL logs)
        |
        v
  [Node.js Server]  -- chokidar watches for new JSONL lines
        |
        v
  [WebSocket Push]   -- real-time AgentEvent stream
        |
        v
  [React + Three.js] -- 3D city rendering + FUI markers
```

1. **Backend** scans `~/.claude/projects/<encoded-repo-path>/` for session JSONL files
2. **chokidar** watches for file changes, reads only new lines (byte offset tracking)
3. **JSONL parser** extracts `tool_use` entries (Read, Write, Edit, Bash, Glob, Grep...) into `AgentEvent` objects
4. **WebSocket** pushes events to the browser in real-time
5. **React Three Fiber** renders the 3D city with buildings, agent markers, and trails

## Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D Rendering | React Three Fiber + drei + postprocessing |
| Frontend | React 19 + TypeScript + Zustand |
| Backend | Express + WebSocket (ws) + chokidar |
| Build | Vite (frontend) + tsx (backend) |

## Data Source

AgentVisualizer reads Claude Code's local session logs:

- **Session metadata**: `~/.claude/sessions/<pid>.json`
- **JSONL logs**: `~/.claude/projects/<encoded-path>/<sessionId>.jsonl`
- **Subagent logs**: `~/.claude/projects/<path>/<sessionId>/subagents/agent-*.jsonl`

Path encoding: `D:\Projects\MyApp` -> `D--Projects-MyApp`

No data is sent anywhere — everything stays local.

## Project Structure

```
AgentVisualizer/
├── server/                  # Node.js backend
│   ├── index.ts             # Express + WebSocket server (port 3888)
│   ├── routes/              # REST API (repo tree, sessions, history)
│   └── services/            # JSONL parsing, file watching, session discovery
├── src/                     # React frontend (Vite)
│   ├── components/
│   │   ├── city/            # 3D scene (buildings, markers, trails, zones)
│   │   ├── dashboard/       # Side panel (agent list, event log)
│   │   ├── playback/        # Timeline controls
│   │   └── repo/            # Repo selector
│   ├── stores/              # Zustand state (repo, agents, playback)
│   ├── hooks/               # WebSocket connection, playback logic
│   └── lib/                 # Layout algorithm, colors, API client
├── shared/                  # Shared TypeScript types
└── start.bat                # Windows launcher
```

## API

```
GET  /api/repo/tree?path=<repo>     # File tree scan
GET  /api/sessions?repoPath=<repo>  # Claude sessions for this repo
GET  /api/history?repoPath=<repo>   # Recorded history events
POST /api/watch                     # Start watching repo JSONL files
POST /api/watch/stop                # Stop watching

WebSocket ws://localhost:3888/ws    # Real-time event stream
```

## Requirements

- Node.js 18+
- Claude Code CLI (for generating the JSONL logs to visualize)

## License

[MIT](LICENSE)
