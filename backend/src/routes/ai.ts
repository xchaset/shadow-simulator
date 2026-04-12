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
 * 使用 Claude 分析建筑图片
 */
async function analyzeWithClaude(base64Image: string, apiKey: string): Promise<BuildingParams> {
  const prompt = `分析这张建筑物图片，提取以下信息并以 JSON 格式返回：

{
  "floors": 楼层数（整数，目测可见楼层），
  "width": 建筑宽度估算（米，基于常见窗户宽度1.5米推算），
  "depth": 建筑进深估算（米，如果看不到侧面则设为 width * 0.7），
  "floorHeight": 层高（米，一般住宅3米，办公3.5米），
  "roofType": "flat" | "gable" | "hip"（平顶/人字顶/四坡顶），
  "windowLayout": {
    "rows": 每层窗户行数,
    "cols": 每行窗户列数,
    "width": 单个窗户宽度（米）,
    "height": 单个窗户高度（米）
  },
  "material": {
    "wallColor": 墙体主色调（CSS 颜色，如 "#E8E8E8"）,
    "roofColor": 屋顶颜色（CSS 颜色）
  }
}

要求：
1. 只返回 JSON，不要其他文字
2. 数值要合理（楼层1-50，宽度10-100米）
3. 如果图片不清晰，给出保守估计
4. 颜色用十六进制格式`

  const imageData = base64Image.startsWith('data:')
    ? base64Image.split(',')[1]
    : base64Image

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageData,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Claude API error: ${JSON.stringify(error)}`)
  }

  const result = await response.json()
  const text = result.content[0].text

  // 提取 JSON（可能被包裹在 markdown 代码块中）
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Claude response')
  }

  return JSON.parse(jsonMatch[0])
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
  const text = result.choices[0].message.content

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from OpenAI response')
  }

  return JSON.parse(jsonMatch[0])
}

export default router
