import type { ValidationSchema } from '../middleware/validator.js'
import { commonRules } from '../middleware/validator.js'

export const createDirectory: ValidationSchema = {
  body: {
    name: commonRules.name,
    description: commonRules.description,
    sort_order: commonRules.sortOrder,
  },
}

export const updateDirectory: ValidationSchema = {
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
    sort_order: {
      type: 'number',
      required: false,
      min: 0,
    },
  },
}

export const deleteDirectory: ValidationSchema = {
  params: {
    id: commonRules.id,
  },
}
