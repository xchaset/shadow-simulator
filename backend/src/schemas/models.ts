import type { ValidationSchema } from '../middleware/validator.js'
import { commonRules } from '../middleware/validator.js'

export const listModels: ValidationSchema = {
  params: {
    dirId: commonRules.id,
  },
}

export const createModel: ValidationSchema = {
  params: {
    dirId: commonRules.id,
  },
  body: {
    name: commonRules.name,
    description: commonRules.description,
    location_lat: commonRules.latitude,
    location_lng: commonRules.longitude,
    city_name: commonRules.cityName,
    date_time: commonRules.dateTime,
    scene_data: commonRules.buildingArray,
    sort_order: commonRules.sortOrder,
  },
}

export const getModel: ValidationSchema = {
  params: {
    id: commonRules.id,
  },
}

export const updateModel: ValidationSchema = {
  params: {
    id: commonRules.id,
  },
  body: {
    name: {
      type: 'string',
      required: false,
      min: 1,
      max: 100,
      transform: (v: string) => v.trim(),
    },
    description: {
      type: 'string',
      required: false,
      max: 500,
    },
    location_lat: {
      type: 'number',
      required: false,
      min: -90,
      max: 90,
    },
    location_lng: {
      type: 'number',
      required: false,
      min: -180,
      max: 180,
    },
    city_name: {
      type: 'string',
      required: false,
      max: 50,
    },
    date_time: {
      type: 'date',
      required: false,
    },
    scene_data: {
      type: 'array',
      required: false,
    },
    sort_order: {
      type: 'number',
      required: false,
      min: 0,
    },
  },
}

export const deleteModel: ValidationSchema = {
  params: {
    id: commonRules.id,
  },
}
