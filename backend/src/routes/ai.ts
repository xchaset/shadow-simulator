import { Router } from 'express'
import type { Request, Response } from 'express'

const router = Router()

interface BuildingAnalysisRequest {
  image: string // base64 encoded image
}

interface BuildingParams {
  // 建筑形状类型
  shape: 'rectangular' | 'circular' | 'complex'
  
  // 简单矩形建筑（兼容旧版）
  floors?: number
  width?: number
  depth?: number
  floorHeight?: number
  roofType?: 'flat' | 'gable' | 'hip' | 'chinese-eave' | 'dome'
  
  // 圆形建筑参数
  radius?: number
  segments?: number // 圆形分段数，默认 32
  
  // 多层结构（每层可以不同尺寸，支持收分）
  levels?: Array<{
    height: number
    width?: number  // 矩形建筑
    depth?: number
    radius?: number // 圆形建筑
    roofType: 'flat' | 'gable' | 'hip' | 'chinese-eave' | 'dome'
    roofOverhang?: number // 飞檐出挑（米）
  }>
  
  // 窗户布局
  windowLayout?: {
    rows: number
    cols: number
    width: number
    height: number
  }
  
  // 材质
  material: {
    wallColor: string
    roofColor: string
    roofTexture?: 'tile' | 'metal' | 'concrete' // 琉璃瓦、金属、混凝土
  }
}

/**
 * POST /api/ai/analyze-building
 * 分析建筑物图片，返回结构化参数
 */
router.post('/analyze-building', async (req: Request, res: Response) => {
  try {
    const { image } = req.body as BuildingAnalysisRequest

    if (!image) {
      res.status(400).json({ error: 'Missing image data' })
      return
    }

    // 调用 LLM API 分析图片
    const params = await analyzeBuildingImage(image)

    res.json({
      success: true,
      params,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Building analysis error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Analysis failed',
    })
  }
})

/**
 * 调用 LLM API 分析建筑物图片
 */
async function analyzeBuildingImage(base64Image: string): Promise<BuildingParams> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY')
  }

  // 优先使用 Anthropic Claude（更好的视觉理解）
  if (process.env.ANTHROPIC_API_KEY) {
    return analyzeWithClaude(base64Image, process.env.ANTHROPIC_API_KEY)
  } else {
    return analyzeWithOpenAI(base64Image, process.env.OPENAI_API_KEY!)
  }
}

/**
 * 从 data URL 中提取 media type，fallback 为 image/jpeg
 */
function detectMediaType(base64Image: string): string {
  const match = base64Image.match(/^data:(image\/\w+);base64,/)
  return match ? match[1] : 'image/jpeg'
}

/**
 * 从 LLM 响应文本中提取 JSON
 */
function extractJSON(text: string): BuildingParams {
  // 0. 先尝试直接解析整段文本（prefill 模式下大概率直接就是 JSON）
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // 可能尾部有多余文字，继续后续策略
    }
  }

  // 1. 尝试匹配 markdown 代码块中的 JSON
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim())
  }

  // 2. 尝试匹配最外层的 { ... }
  //    使用贪婪匹配找到最后一个 }
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }

  throw new Error('No JSON found in response')
}

/**
 * 使用 Claude 分析建筑图片
 */
async function analyzeWithClaude(base64Image: string, apiKey: string): Promise<BuildingParams> {
  const prompt = `你是一个建筑分析专家。请分析这张建筑物图片，返回一个 JSON 对象。

根据建筑类型选择合适的 shape：
- "rectangular"：普通矩形建筑（住宅、办公楼、商场等）
- "circular"：圆形或近似圆形建筑（天坛、圆形塔楼、穹顶建筑等）
- "complex"：多层收分结构（塔、古建筑等，每层尺寸不同）

## 示例 1：普通矩形建筑
{"shape":"rectangular","floors":5,"width":30,"depth":20,"floorHeight":3,"roofType":"flat","windowLayout":{"rows":1,"cols":5,"width":1.5,"height":1.8},"material":{"wallColor":"#E8E8E8","roofColor":"#808080"}}

## 示例 2：圆形多层建筑（如天坛祈年殿）
{"shape":"circular","radius":16,"segments":48,"levels":[{"height":4,"radius":16,"roofType":"chinese-eave","roofOverhang":4},{"height":4,"radius":13,"roofType":"chinese-eave","roofOverhang":3.5},{"height":4,"radius":10,"roofType":"chinese-eave","roofOverhang":3},{"height":6,"radius":3,"roofType":"dome","roofOverhang":0}],"material":{"wallColor":"#C41E3A","roofColor":"#1A237E","roofTexture":"tile"}}

## 示例 3：矩形多层收分建筑（如中式塔楼）
{"shape":"complex","levels":[{"height":5,"width":20,"depth":20,"roofType":"chinese-eave","roofOverhang":3},{"height":4,"width":16,"depth":16,"roofType":"chinese-eave","roofOverhang":2.5},{"height":3,"width":12,"depth":12,"roofType":"chinese-eave","roofOverhang":2}],"material":{"wallColor":"#8B4513","roofColor":"#2E7D32","roofTexture":"tile"}}

字段说明：
- shape: 建筑形状类型
- floors/width/depth/floorHeight: 简单矩形建筑参数
- radius: 圆形建筑半径（米）
- segments: 圆形分段数（越大越圆滑，推荐 32-64）
- levels: 多层结构数组，从底层到顶层排列
  - height: 该层高度（米）
  - width/depth: 矩形层的宽和深
  - radius: 圆形层的半径
  - roofType: "flat"（平顶）| "gable"（人字顶）| "hip"（四坡顶）| "chinese-eave"（中式飞檐）| "dome"（穹顶）
  - roofOverhang: 屋檐出挑距离（米）
- material.wallColor: 墙体颜色（十六进制）
- material.roofColor: 屋顶颜色（十六进制）
- material.roofTexture: "tile"（琉璃瓦）| "metal"（金属）| "concrete"（混凝土）

重要：
- 仔细观察建筑的层数、形状、比例
- 圆形建筑必须用 circular + levels
- 多层收分建筑每层的尺寸应逐层递减
- 飞檐出挑要合理（通常 1-5 米）
- 直接返回 JSON，不要用代码块包裹`

  const mediaType = detectMediaType(base64Image)
  const imageData = base64Image.includes(',')
    ? base64Image.split(',')[1]
    : base64Image

  const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageData,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
        // Prefill: 强制 Claude 直接输出 JSON，不加任何前缀文字
        {
          role: 'assistant',
          content: '{',
        },
      ],
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    console.error('Claude API HTTP error:', response.status, errBody)
    throw new Error(`Claude API error (${response.status}): ${errBody.slice(0, 200)}`)
  }

  const result = await response.json()

  // 安全地提取文本，仅在 Claude 未重复 prefill 时拼回 '{'
  const textBlock = result.content?.find((b: any) => b.type === 'text')
  const rawText = textBlock?.text ?? ''
  const text = rawText.trimStart().startsWith('{') ? rawText : '{' + rawText

  if (!rawText) {
    console.error('Claude returned empty text. Full response:', JSON.stringify(result).slice(0, 500))
    throw new Error('Claude returned empty response')
  }

  console.log('Claude raw response:', text.slice(0, 300))

  try {
    return extractJSON(text)
  } catch (parseErr) {
    console.error('JSON parse failed. Raw text:', text)
    throw new Error(`Failed to parse building params from Claude response: ${(parseErr as Error).message}`)
  }
}

/**
 * 使用 OpenAI GPT-4V 分析建筑图片
 */
async function analyzeWithOpenAI(base64Image: string, apiKey: string): Promise<BuildingParams> {
  const prompt = `分析这张建筑物图片，提取以下信息并以 JSON 格式返回：

{
  "floors": 楼层数（整数），
  "width": 建筑宽度估算（米），
  "depth": 建筑进深估算（米），
  "floorHeight": 层高（米），
  "roofType": "flat" | "gable" | "hip",
  "windowLayout": {
    "rows": 每层窗户行数,
    "cols": 每行窗户列数,
    "width": 单个窗户宽度（米）,
    "height": 单个窗户高度（米）
  },
  "material": {
    "wallColor": 墙体主色调（CSS 十六进制）,
    "roofColor": 屋顶颜色（CSS 十六进制）
  }
}

只返回 JSON，不要其他文字。`

  const imageUrl = base64Image.startsWith('data:')
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`OpenAI API error: ${JSON.stringify(error)}`)
  }

  const result = await response.json()
  const text = result.choices?.[0]?.message?.content ?? ''

  if (!text) {
    console.error('OpenAI returned empty text. Full response:', JSON.stringify(result).slice(0, 500))
    throw new Error('OpenAI returned empty response')
  }

  console.log('OpenAI raw response:', text.slice(0, 300))

  try {
    return extractJSON(text)
  } catch (parseErr) {
    console.error('JSON parse failed. Raw text:', text)
    throw new Error(`Failed to parse building params from OpenAI response: ${(parseErr as Error).message}`)
  }
}

export default router
