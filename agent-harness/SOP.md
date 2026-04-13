# Shadow Simulator CLI — Agent SOP

## Overview

`shadow-cli` wraps the Shadow Simulator REST API into a structured CLI. All output is JSON. Exit code 0 = success, 1 = error.

## Prerequisites

- Python 3.10+
- Shadow Simulator backend running (default: `http://localhost:3002`)
- Set `SHADOW_API_URL` env var to override base URL

## Quick Start

```bash
# Check backend is alive
python3 shadow-cli.py health

# Override API URL
python3 shadow-cli.py --api-url http://192.168.1.100:3002 health
```

## Command Reference

### Health
| Command | Description |
|---------|-------------|
| `health` | Check API health status |

### Directories (项目目录)
| Command | Description |
|---------|-------------|
| `dir-list` | List all directories with model counts |
| `dir-create <name> [-d desc] [--sort-order N]` | Create a directory |
| `dir-update <id> [-n name] [-d desc] [--sort-order N]` | Update a directory |
| `dir-delete <id>` | Delete a directory (cascades to models) |
| `dir-copy <id>` | Copy a directory with all its models |

### Models (场景模型)
| Command | Description |
|---------|-------------|
| `model-list <dir_id>` | List models in a directory |
| `model-get <id>` | Get model details with scene_data |
| `model-create <dir_id> <name> [options]` | Create a model |
| `model-update <id> [options]` | Update a model |
| `model-delete <id>` | Delete a model |
| `model-copy <id> [--target-dir DIR_ID]` | Copy a model |
| `model-move <id> <target_dir>` | Move model to another directory |

Model options: `--lat`, `--lng`, `--city`, `--date-time`, `--scene-data '[]'`, `--sort-order`

### Uploads (GLB 文件)
| Command | Description |
|---------|-------------|
| `upload-glb <file>` | Upload a GLB/GLTF 3D model file (max 50MB) |
| `upload-delete <filename>` | Delete an uploaded file |

### AI Analysis (AI 建筑分析)
| Command | Description |
|---------|-------------|
| `ai-analyze <image>` | Analyze building photo → structured params |

## Typical Agent Workflows

### 1. Create a new project with scene
```bash
# Create directory
python3 shadow-cli.py dir-create "北京CBD" -d "北京中央商务区日照分析"

# Create model with location
python3 shadow-cli.py model-create <dir_id> "国贸三期" \
  --lat 39.9087 --lng 116.4605 --city "北京" \
  --scene-data '[{"type":"box","x":0,"z":0,"width":60,"depth":40,"height":330}]'
```

### 2. AI-assisted building creation
```bash
# Analyze a building photo
python3 shadow-cli.py ai-analyze building_photo.jpg
# Returns structured BuildingParams JSON

# Use returned params to create/update model scene_data
```

### 3. Batch operations
```bash
# List all directories
python3 shadow-cli.py dir-list

# List models in a directory
python3 shadow-cli.py model-list <dir_id>

# Copy entire project
python3 shadow-cli.py dir-copy <dir_id>
```

## Error Handling

Errors output to stderr as JSON:
```json
{"status": "error", "code": 404, "error": "模型不存在"}
```

## State Model

```
Directory (项目)
  └── Model (场景)
        ├── location (lat/lng/city)
        ├── date_time
        └── scene_data[] (建筑物数组)
              └── Building params (type, position, dimensions, material...)
```

Directories contain models. Models contain scene data (array of buildings). Buildings can be created manually or via AI image analysis.
