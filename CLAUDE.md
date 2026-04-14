# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shadow Simulator is a 3D building shadow simulation platform with a monorepo architecture containing:
- **backend/**: Node.js + Express REST API (TypeScript)
- **frontend/**: React + Three.js 3D visualization (TypeScript)
- **agent-harness/**: Python CLI wrapper for agent automation
- **docs/**: Documentation and plans

## Common Commands

### Backend (Port 3002)
```bash
cd backend
npm install
npm run dev      # Development with hot reload (tsx watch)
npm start        # Production mode
```

Required: Create `.env` from `.env.example` and set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`.

### Frontend (Port 5173)
```bash
cd frontend
npm install
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
npm test         # Run all tests
```

To run a single test file:
```bash
npm test -- src/__tests__/setup.test.ts
```

### Agent CLI
```bash
cd agent-harness
export SHADOW_API_URL=http://localhost:3002  # Optional
python3 shadow-cli.py health
```

## Architecture

### Frontend Stack
- React 19 + Vite 6 + TypeScript ~5.6.2
- Three.js + React Three Fiber + @react-three/drei for 3D rendering
- Ant Design v6 for UI components
- Zustand for state management
- SunCalc for sun position calculations
- Vitest + React Testing Library + jsdom for testing

### Backend Stack
- Node.js + Express v5 + TypeScript ~5.6.2
- SQLite via better-sqlite3 (sync API)
- Multer for file uploads (50MB limit for GLB files)
- Validators in `middleware/validator.ts` with schema definitions in `schemas/`

### API Structure
- `/api/health` - Health check
- `/api/directories` - CRUD for project directories
- `/api/directories/:dirId/models` - List/create models in directory
- `/api/models/:id` - Get/update/delete/copy/move models
- `/api/ai/analyze-building` - AI-powered building image analysis
- `/api/upload/glb` - GLB file upload
- `/api/uploads/glb/:filename` - GLB file access

### Data Model
```typescript
// Directory (项目) -> Model (场景)
// Model contains: location (lat/lng/city), date_time, scene_data (Building[])
// Building has: type, params, position, rotation, color, optional glbUrl/glbScale
```

### Frontend Vite Proxy
Vite dev server proxies `/api` to `http://localhost:3002` (see `vite.config.ts`).

### Key Frontend Files
- `store/useStore.ts` - Zustand state (location, dateTime, buildings, directories, models)
- `types/index.ts` - TypeScript type definitions
- `utils/api.ts` - REST API client (directory, model, GLB upload APIs)
- `utils/sunCalc.ts` - Sun position calculations
- `components/Buildings/` - Building rendering (BuildingMesh, GlbBuildingMesh, BuildingGroup)
- `components/Toolbar/` - Import tools (GlbImporter, BuildingImporter)
- `components/Scene/` - 3D scene components (SceneCanvas, SunLight, Ground)

### Key Backend Files
- `src/index.ts` - Express server setup
- `src/db.ts` - SQLite database initialization
- `src/routes/` - Route handlers (directories, models, ai, uploads)
- `src/schemas/` - Zod-like validation schemas
- `src/middleware/validator.ts` - Validation middleware with `commonRules` presets

### Testing
- Frontend tests in `src/__tests__/` using Vitest
- Test setup in `test-setup.ts` imports `@testing-library/jest-dom`
- Test environment: jsdom (configured in vite.config.ts)

## File Locations

- **Uploads**: `backend/data/uploads/glb/` (excluded from git)
- **Database**: `backend/data/shadow.db` (excluded from git)
- **Frontend dist**: `frontend/dist/` (excluded from git)

## ES Modules

Both frontend and backend use `"type": "module"` in package.json. Use `.js` extensions for imports even in TypeScript files.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes* | Claude API for image analysis |
| `OPENAI_API_KEY` | Yes* | OpenAI API alternative |
| `PORT` | No | Backend port (default: 3002) |
| `SHADOW_API_URL` | No | Override for agent CLI |

*Only one AI key is required
