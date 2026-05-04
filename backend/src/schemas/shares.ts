import type { ValidationSchema } from '../middleware/validator.js'
import { commonRules } from '../middleware/validator.js'

export const createShare: ValidationSchema = {
  body: {
    model_id: {
      type: 'uuid',
      required: false,
    },
    name: {
      type: 'string',
      required: true,
      min: 1,
      max: 100,
      transform: (v: string) => v.trim(),
    },
    description: {
      type: 'string',
      required: false,
      max: 500,
      default: '',
    },
    location_lat: commonRules.latitude,
    location_lng: commonRules.longitude,
    city_name: commonRules.cityName,
    date_time: commonRules.dateTime,
    scene_data: commonRules.buildingArray,
    canvas_size: {
      type: 'number',
      required: false,
      min: 100,
      max: 10000,
      default: 2000,
    },
    show_grid: {
      type: 'boolean',
      required: false,
      default: true,
    },
    grid_divisions: {
      type: 'number',
      required: false,
      min: 10,
      max: 500,
      default: 200,
    },
    terrain_data: {
      type: 'object',
      required: false,
    },
    lake_data: {
      type: 'object',
      required: false,
    },
    expires_in_hours: {
      type: 'number',
      required: false,
      min: 1,
      max: 8760,
    },
  },
}

export const getShare: ValidationSchema = {
  params: {
    token: {
      type: 'string',
      required: true,
      min: 8,
      max: 32,
    },
  },
}

export const getShareByModel: ValidationSchema = {
  params: {
    modelId: commonRules.id,
  },
}
