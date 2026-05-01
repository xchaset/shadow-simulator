import type { Request, Response, NextFunction } from 'express'

// ─── 校验规则类型定义 ────────────────────────────────────

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'uuid' | 'email' | 'url' | 'date'
  required?: boolean
  min?: number  // 字符串最小长度 / 数字最小值 / 数组最小长度
  max?: number  // 字符串最大长度 / 数字最大值 / 数组最大长度
  pattern?: RegExp  // 正则匹配（字符串）
  enum?: any[]  // 枚举值
  custom?: (value: any) => boolean | string  // 自定义校验函数，返回 true 或错误信息
  default?: any  // 默认值（当字段不存在且非 required 时）
  transform?: (value: any) => any  // 值转换函数
  items?: ValidationRule  // 数组元素校验规则
  properties?: Record<string, ValidationRule>  // 对象属性校验规则
}

export interface ValidationSchema {
  body?: Record<string, ValidationRule>
  query?: Record<string, ValidationRule>
  params?: Record<string, ValidationRule>
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

// ─── 内置校验器 ──────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_REGEX = /^https?:\/\/.+/

function validateValue(value: any, rule: ValidationRule, fieldName: string): ValidationError | null {
  console.log(`[validator] validateValue 开始: field=${fieldName}, type=${typeof value}, rule.type=${rule.type}`)
  
  // 处理 undefined/null
  if (value === undefined || value === null) {
    console.log(`[validator] validateValue: field=${fieldName} 是 ${value === undefined ? 'undefined' : 'null'}, required=${rule.required}`)
    if (rule.required) {
      return { field: fieldName, message: '字段不能为空' }
    }
    return null
  }

  // 类型校验
  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') {
        return { field: fieldName, message: '必须是字符串', value }
      }
      if (rule.min !== undefined && value.length < rule.min) {
        return { field: fieldName, message: `长度不能少于 ${rule.min} 个字符`, value }
      }
      if (rule.max !== undefined && value.length > rule.max) {
        return { field: fieldName, message: `长度不能超过 ${rule.max} 个字符`, value }
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        return { field: fieldName, message: '格式不正确', value }
      }
      break

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { field: fieldName, message: '必须是数字', value }
      }
      if (rule.min !== undefined && value < rule.min) {
        return { field: fieldName, message: `不能小于 ${rule.min}`, value }
      }
      if (rule.max !== undefined && value > rule.max) {
        return { field: fieldName, message: `不能大于 ${rule.max}`, value }
      }
      break

    case 'boolean':
      if (typeof value === 'number') {
        if (value === 0 || value === 1) {
          return null
        }
        return { field: fieldName, message: '必须是布尔值', value }
      }
      if (typeof value !== 'boolean') {
        return { field: fieldName, message: '必须是布尔值', value }
      }
      break

    case 'array':
      if (!Array.isArray(value)) {
        return { field: fieldName, message: '必须是数组', value }
      }
      if (rule.min !== undefined && value.length < rule.min) {
        return { field: fieldName, message: `数组长度不能少于 ${rule.min}`, value }
      }
      if (rule.max !== undefined && value.length > rule.max) {
        return { field: fieldName, message: `数组长度不能超过 ${rule.max}`, value }
      }
      if (rule.items) {
        for (let i = 0; i < value.length; i++) {
          const itemError = validateValue(value[i], rule.items, `${fieldName}[${i}]`)
          if (itemError) return itemError
        }
      }
      break

    case 'object':
      console.log(`[validator] validateValue object 类型校验: field=${fieldName}, typeof=${typeof value}, Array.isArray=${Array.isArray(value)}`)
      if (typeof value !== 'object' || Array.isArray(value)) {
        console.log(`[validator] validateValue object 校验失败: field=${fieldName}`)
        return { field: fieldName, message: '必须是对象', value }
      }
      if (rule.properties) {
        console.log(`[validator] validateValue object 有 properties 定义，开始校验子属性`)
        for (const [key, propRule] of Object.entries(rule.properties)) {
          const propError = validateValue(value[key], propRule, `${fieldName}.${key}`)
          if (propError) return propError
        }
      } else {
        console.log(`[validator] validateValue object 没有 properties 定义，跳过子属性校验`)
      }
      console.log(`[validator] validateValue object 校验通过: field=${fieldName}`)
      break

    case 'uuid':
      if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
        return { field: fieldName, message: '必须是有效的 UUID', value }
      }
      break

    case 'email':
      if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
        return { field: fieldName, message: '必须是有效的邮箱地址', value }
      }
      break

    case 'url':
      if (typeof value !== 'string' || !URL_REGEX.test(value)) {
        return { field: fieldName, message: '必须是有效的 URL', value }
      }
      break

    case 'date':
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        return { field: fieldName, message: '必须是有效的日期', value }
      }
      break
  }

  // 枚举校验
  if (rule.enum && !rule.enum.includes(value)) {
    return {
      field: fieldName,
      message: `必须是以下值之一: ${rule.enum.join(', ')}`,
      value,
    }
  }

  // 自定义校验
  if (rule.custom) {
    const result = rule.custom(value)
    if (result !== true) {
      return {
        field: fieldName,
        message: typeof result === 'string' ? result : '校验失败',
        value,
      }
    }
  }

  return null
}

// ─── 校验中间件工厂 ──────────────────────────────────────

export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('[validator] validate 中间件被调用')
    console.log('[validator] 请求路径:', req.method, req.path)
    
    // 安全地记录 req.body
    if (req.body && typeof req.body === 'object') {
      const bodyLog: any = { ...req.body }
      if (bodyLog.scene_data && Array.isArray(bodyLog.scene_data)) {
        bodyLog.scene_data = `[${bodyLog.scene_data.length} items]`
      }
      if (bodyLog.terrain_data && typeof bodyLog.terrain_data === 'object') {
        bodyLog.terrain_data = {
          resolution: bodyLog.terrain_data.resolution,
          heightsLength: bodyLog.terrain_data.heights?.length,
          maxHeight: bodyLog.terrain_data.maxHeight
        }
      } else if (bodyLog.terrain_data === null) {
        bodyLog.terrain_data = 'null'
      }
      console.log('[validator] req.body:', JSON.stringify(bodyLog, null, 2))
    } else {
      console.log('[validator] req.body:', req.body === undefined ? 'undefined' : JSON.stringify(req.body))
    }
    
    const errors: ValidationError[] = []

    // 校验 body
    if (schema.body) {
      console.log('[validator] 开始校验 body，schema.body 字段:', Object.keys(schema.body))
      for (const [field, rule] of Object.entries(schema.body)) {
        let value = req.body?.[field]

        // 应用默认值
        if ((value === undefined || value === null) && rule.default !== undefined && !rule.required) {
          req.body = req.body || {}
          req.body[field] = rule.default
          continue
        }

        // 类型转换：将数字 0/1 转换为布尔值（如果规则类型是 boolean）
        if (value !== undefined && value !== null && rule.type === 'boolean') {
          if (typeof value === 'number') {
            value = !!value
            req.body[field] = value
          }
        }

        // 应用转换函数
        if (value !== undefined && value !== null && rule.transform) {
          req.body[field] = rule.transform(value)
        }

        const error = validateValue(req.body?.[field], rule, field)
        if (error) errors.push(error)
      }
    }

    // 校验 query
    if (schema.query) {
      for (const [field, rule] of Object.entries(schema.query)) {
        let value = req.query?.[field]

        // query 参数默认是字符串，需要类型转换
        let transformedValue: any = value
        if (value !== undefined && typeof value === 'string') {
          if (rule.type === 'number') {
            transformedValue = Number(value)
          } else if (rule.type === 'boolean') {
            transformedValue = value === 'true' || value === '1'
          }
        }

        // 应用默认值
        if ((transformedValue === undefined || transformedValue === null) && rule.default !== undefined && !rule.required) {
          transformedValue = rule.default
        }

        // 应用转换函数
        if (transformedValue !== undefined && transformedValue !== null && rule.transform) {
          transformedValue = rule.transform(transformedValue)
        }

        const error = validateValue(transformedValue, rule, field)
        if (error) errors.push(error)
      }
    }

    // 校验 params
    if (schema.params) {
      for (const [field, rule] of Object.entries(schema.params)) {
        const value = req.params?.[field]

        // 应用转换函数
        if (value !== undefined && value !== null && rule.transform) {
          req.params[field] = rule.transform(value)
        }

        const error = validateValue(req.params?.[field], rule, field)
        if (error) errors.push(error)
      }
    }

    // 返回错误
    if (errors.length > 0) {
      res.status(400).json({
        error: '参数校验失败',
        details: errors,
      })
      return
    }

    next()
  }
}

// ─── 常用校验规则预设 ────────────────────────────────────

export const commonRules = {
  id: {
    type: 'uuid' as const,
    required: true,
  },
  name: {
    type: 'string' as const,
    required: true,
    min: 1,
    max: 100,
    transform: (v: string) => v.trim(),
  },
  description: {
    type: 'string' as const,
    required: false,
    max: 500,
    default: '',
  },
  sortOrder: {
    type: 'number' as const,
    required: false,
    min: 0,
    default: 0,
  },
  latitude: {
    type: 'number' as const,
    required: false,
    min: -90,
    max: 90,
    default: 39.9042,
  },
  longitude: {
    type: 'number' as const,
    required: false,
    min: -180,
    max: 180,
    default: 116.4074,
  },
  cityName: {
    type: 'string' as const,
    required: false,
    max: 50,
    default: '北京',
  },
  dateTime: {
    type: 'date' as const,
    required: false,
  },
  buildingArray: {
    type: 'array' as const,
    required: false,
    default: [],
  },
}
