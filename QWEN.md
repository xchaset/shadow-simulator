# Shadow Simulator

## Project Overview

Shadow Simulator is a **3D building shadow simulation platform** that enables users to:
- Create and manage building scenes with real-world geographic coordinates
- Simulate and visualize shadow effects based on location, date, and time
- Import custom 3D models (GLB/GLTF format) from tools like Blender
- Use AI (Claude/OpenAI) to analyze building photos and generate structural parameters

The project uses a **monorepo architecture** with separate backend and frontend components, plus a Python CLI tool for agent-based automation.

### Architecture

```
shadow-simulator/
├── backend/          # Node.js + Express REST API (TypeScript)
├── frontend/         # React + Three.js 3D visualization (TypeScript)
├── agent-harness/    # Python CLI wrapper for agent automation
└── docs/             # Documentation and plans
```

### Key Features

- **Directory/Model Management**: Organize scenes into directories (projects), each containing models with location data and building arrays
- **3D Rendering**: React Three Fiber + Three.js for real-time 3D shadow visualization
- **GLB Import**: Support for uploading and rendering custom GLB/GLTF 3D models with Draco compression
- **AI Analysis**: Integration with Anthropic Claude or OpenAI GPT-4o for building photo analysis
- **Sun Calculation**: SunCalc integration for accurate shadow simulation based on GPS coordinates and time

## Technologies

### Backend
- **Runtime**: Node.js with TypeScript (via `tsx`)
- **Framework**: Express.js v5
- **Database**: SQLite (via `better-sqlite3`)
- **File Upload**: Multer
- **AI Providers**: Anthropic Claude / OpenAI GPT-4o

### Frontend
- **Framework**: React 19 + Vite
- **3D Engine**: Three.js + React Three Fiber + @react-three/drei
- **UI Library**: Ant Design v6
- **State Management**: Zustand
- **Sun Position**: SunCalc
- **Testing**: Vitest + React Testing Library

### Agent Harness
- **Language**: Python 3.10+
- **Purpose**: CLI wrapper for programmatic API access

## Building and Running

### Backend

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env to set ANTHROPIC_API_KEY or OPENAI_API_KEY

# Development (watch mode)
npm run dev

# Production
npm start
```

Default port: `3002`

### Frontend

```bash
cd frontend
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Lint
npm run lint
```

### Agent CLI

```bash
cd agent-harness

# Set API URL (optional, defaults to http://localhost:3002)
export SHADOW_API_URL=http://localhost:3002

# Health check
python3 shadow-cli.py health

# See SOP for full command reference
```

## Project Structure

### Backend Routes

| Route | Purpose |
|-------|---------|
| `/api/health` | Health check endpoint |
| `/api/directories` | CRUD for project directories |
| `/api/models` | CRUD for scene models within directories |
| `/api/ai/analyze` | AI-powered building image analysis |
| `/api/upload/glb` | GLB file upload |
| `/api/uploads/glb/:filename` | GLB file download/access |

### Data Model

```
Directory (项目)
  └── Model (场景)
        ├── location (lat/lng/city)
        ├── date_time
        └── scene_data[] (建筑物数组)
              └── Building params (type, position, dimensions, material, glbUrl, glbScale...)
```

### Key Frontend Components

- `BuildingGroup.tsx` — Renders building collections, distinguishes GLB vs standard buildings
- `GlbBuildingMesh.tsx` — GLB model loading and rendering with GLTFLoader + DRACOLoader
- `GlbImporter.tsx` — File upload UI for GLB models
- `Toolbar/` — Application toolbar with import controls

## Development Conventions

- **TypeScript**: Both backend and frontend use TypeScript (~5.6.2)
- **ES Modules**: Both packages use `"type": "module"`
- **API Communication**: Frontend communicates with backend via REST calls (axios/fetch)
- **State Management**: Zustand stores for frontend state
- **File Uploads**: Stored in `backend/data/uploads/glb/`, excluded from git
- **Git Ignore**: `node_modules`, `dist`, `data/` directories are not tracked

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | Yes (or OPENAI_API_KEY) |
| `OPENAI_API_KEY` | OpenAI GPT-4o API key | Yes (or ANTHROPIC_API_KEY) |
| `PORT` | Backend server port (default: 3002) | No |
| `SHADOW_API_URL` | Override backend URL for CLI | No |

## File Size Limits

- GLB uploads: **50MB maximum**

## Documentation

- `docs/GLB_IMPORT.md` — GLB model import workflow and troubleshooting
- `agent-harness/SOP.md` — Complete CLI command reference and agent workflows
- `docs/plans/` — Future development plans
- `docs/superpowers/` — Capability documentation
