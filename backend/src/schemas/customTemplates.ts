import type { ValidationSchema } from '../middleware/validator.js'
import { commonRules } from '../middleware/validator.js'

export const listCustomTemplates: ValidationSchema = {
  query: {
    category: {
      type: 'string',
      required: false,
    },
  },
}

export const getCustomTemplate: ValidationSchema = {
  params: {
    id: commonRules.id,
  },
}

export const createCustomTemplate: ValidationSchema = {
  body: {
    name: commonRules.name,
    description: commonRules.description,
    category: {
      type: 'string',
      required: false,
      max: 50,
      default: '自定义模板',
    },
    icon: {
      type: 'string',
      required: false,
      max: 50,
      default: 'custom',
    },
    source_model_ids: {
      type: 'array',
      required: false,
      items: commonRules.id,
      default: [],
    },
    buildings: {
      type: 'array',
      required: true,
      min: 1,
    },
    sort_order: commonRules.sortOrder,
  },
}

export const updateCustomTemplate: ValidationSchema = {
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
    category: {
      type: 'string',
      required: false,
      max: 50,
    },
    icon: {
      type: 'string',
      required: false,
      max: 50,
    },
    buildings: {
      type: 'array',
      required: false,
      min: 1,
    },
    sort_order: {
      type: 'number',
      required: false,
      min: 0,
    },
  },
}

export const deleteCustomTemplate: ValidationSchema = {
  params: {
    id: commonRules.id,
  },
}
