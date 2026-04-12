import { Router } from 'express'
import type { Request, Response } from 'express'

const router = Router()

interface BuildingAnalysisRequest {
  image: string // base64 encoded image
}

interface BuildingParams {
  floors: number
  width: number
  depth: number
  floorHeight: number
  roofType: 'flat' | 'gable' | 'hip'
  windowLayout: {
    rows: number
    cols: number
    width: number
    height: number
  }
  material: {
    wallColor: string
    roofColor: string
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

必须严格按照以下格式返回，不要添加任何其他文字、解释或 markdown 标记：

{"floors":5,"width":30,"depth":20,"floorHeight":3,"roofType":"flat","windowLayout":{"rows":1,"cols":5,"width":1.5,"height":1.8},"material":{"wallColor":"#E8E8E8","roofColor":"#808080"}}

字段说明：
- floors: 楼层数（整数，1-50）
- width: 建筑宽度（米，10-100）
- depth: 建筑进深（米，看不到侧面则设为 width×0.7）
- floorHeight: 层高（米，住宅3，办公3.5）
- roofType: "flat"（平顶）或 "gable"（人字顶）或 "hip"（四坡顶）
- windowLayout: 窗户布局
- material.wallColor: 墙体颜色（十六进制）
- material.roofColor: 屋顶颜色（十六进制）

直接返回 JSON，不要用代码块包裹。`

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
      ],
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    console.error('Claude API HTTP error:', response.status, errBody)
    throw new Error(`Claude API error (${response.status}): ${errBody.slice(0, 200)}`)
  }

  const result = await response.json()

  // 安全地提取文本
  const textBlock = result.content?.find((b: any) => b.type === 'text')
  const text = textBlock?.text ?? ''

  if (!text) {
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
