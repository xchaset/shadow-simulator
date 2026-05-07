import { Router } from 'express'
import type { Request, Response } from 'express'

const router = Router()

const AMAP_WEB_SERVICE_KEY = process.env.AMAP_WEB_SERVICE_KEY

interface AmapSearchResult {
  status: string
  info: string
  infocode: string
  count: string
  suggestion?: {
    keywords?: string[]
    cities?: string[]
  }
  pois?: Array<{
    id: string
    name: string
    type: string
    typecode: string
    biz_type: string
    address: string
    location: string
    tel: string
    postcode: string
    website: string
    email: string
    pcode: string
    pname: string
    citycode: string
    cityname: string
    adcode: string
    adname: string
    importance: string
    shopid: string
    shopinfo: string
    poiweight: string
    navi_poiid: string
    gridcode: string
    distance: string
    tag: string
    etype: string
    timestamp: string
    photos?: Array<{
      title: string
      url: string
    }>
  }>
}

interface AmapGeocodeResult {
  status: string
  info: string
  infocode: string
  count: string
  geocodes?: Array<{
    formatted_address: string
    country: string
    province: string
    citycode: string
    city: string
    district: string
    adcode: string
    township: string
    towncode: string
    neighborhood: {
      name: string
      type: string
    }
    building: {
      name: string
      type: string
    }
    streetNumber: {
      street: string
      number: string
      location: string
      direction: string
      distance: string
    }
    level: string
    location: string
  }>
}

interface AmapRegeocodeResult {
  status: string
  info: string
  infocode: string
  regeocode?: {
    formatted_address: string
    addressComponent: {
      country: string
      province: string
      city: string
      citycode: string
      district: string
      adcode: string
      township: string
      towncode: string
      streetNumber: {
        street: string
        number: string
        location: string
        direction: string
        distance: string
      }
      neighborhood: {
        name: string
        type: string
      }
      building: {
        name: string
        type: string
      }
      businessAreas: Array<{
        location: string
        name: string
        id: string
      }>
      seaArea: string
      roadIntersection: string
      road: string
      poiRegions: Array<{
        directionDesc: string
        name: string
        type: string
        location: string
        distance: string
      }>
      street: string
      aois: Array<{
        adcode: string
        location: string
        name: string
        area: string
        id: string
        type: string
      }>
    }
    road?: Array<{
      id: string
      name: string
      distance: string
      direction: string
      location: string
    }>
    roadinter?: Array<{
      direction: string
      distance: string
      location: string
      first_id: string
      first_name: string
      second_id: string
      second_name: string
    }>
    aois?: Array<{
      aoi: string
      id: string
      name: string
      location: string
      area: string
      type: string
    }>
    pois?: Array<{
      id: string
      name: string
      type: string
      tel: string
      direction: string
      distance: string
      location: string
      address: string
      poiweight: string
      businessarea: string
    }>
  }
}

interface SearchResultItem {
  name: string
  district: string
  location: [number, number]
  address?: string
  type?: string
}

interface GeocodeResult {
  success: boolean
  formatted_address: string
  location: [number, number]
  province: string
  city: string
  district: string
}

interface RegeocodeResult {
  success: boolean
  formatted_address: string
  addressComponent: {
    province: string
    city: string
    district: string
    township: string
    street: string
    streetNumber: string
  }
}

function checkApiKeyConfigured(): boolean {
  return !!(AMAP_WEB_SERVICE_KEY && AMAP_WEB_SERVICE_KEY !== 'your_amap_web_service_key_here')
}

function createErrorResponse(error: string, details?: string): { success: boolean; error: string; details?: string } {
  return { success: false, error, details }
}

function parseLocation(location: string): [number, number] {
  const [lng, lat] = location.split(',').map(Number)
  return [lng, lat]
}

router.get('/search', async (req: Request, res: Response) => {
  try {
    const { keyword, city, page = '1', offset = '10' } = req.query as {
      keyword?: string
      city?: string
      page?: string
      offset?: string
    }

    if (!keyword || keyword.trim() === '') {
      res.status(400).json(createErrorResponse('缺少搜索关键词', '请提供 keyword 参数'))
      return
    }

    if (!checkApiKeyConfigured()) {
      res.status(500).json(createErrorResponse('地图服务未配置', '请在后端配置 AMAP_WEB_SERVICE_KEY'))
      return
    }

    const params = new URLSearchParams({
      key: AMAP_WEB_SERVICE_KEY!,
      keywords: keyword.trim(),
      types: '',
      page: page,
      offset: offset,
      extensions: 'base',
    })

    if (city) {
      params.append('city', city)
      params.append('citylimit', 'true')
    }

    const response = await fetch(
      `https://restapi.amap.com/v3/place/text?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('高德地图搜索API HTTP error:', response.status, errText)
      throw new Error(`地图服务请求失败: HTTP ${response.status}`)
    }

    const result = (await response.json()) as AmapSearchResult

    if (result.status !== '1') {
      console.error('高德地图搜索API错误:', result.info, result.infocode)
      const errorMsg = getAmapErrorMessage(result.infocode || result.info)
      res.status(400).json(createErrorResponse(errorMsg, `infocode: ${result.infocode}`))
      return
    }

    const items: SearchResultItem[] = []
    if (result.pois && Array.isArray(result.pois)) {
      for (const poi of result.pois) {
        if (poi.location) {
          items.push({
            name: poi.name || '未知地点',
            district: [poi.pname, poi.cityname, poi.adname].filter(Boolean).join(''),
            location: parseLocation(poi.location),
            address: poi.address || undefined,
            type: poi.type || undefined,
          })
        }
      }
    }

    res.json({
      success: true,
      count: result.count || '0',
      items,
      suggestion: result.suggestion,
    })
  } catch (error) {
    console.error('地图搜索API错误:', error)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      res.status(503).json(createErrorResponse('网络连接失败', '无法连接到地图服务'))
    } else {
      res.status(500).json(createErrorResponse('搜索失败', error instanceof Error ? error.message : '未知错误'))
    }
  }
})

router.get('/geocode', async (req: Request, res: Response) => {
  try {
    const { address, city } = req.query as {
      address?: string
      city?: string
    }

    if (!address || address.trim() === '') {
      res.status(400).json(createErrorResponse('缺少地址参数', '请提供 address 参数'))
      return
    }

    if (!checkApiKeyConfigured()) {
      res.status(500).json(createErrorResponse('地图服务未配置', '请在后端配置 AMAP_WEB_SERVICE_KEY'))
      return
    }

    const params = new URLSearchParams({
      key: AMAP_WEB_SERVICE_KEY!,
      address: address.trim(),
    })

    if (city) {
      params.append('city', city)
    }

    const response = await fetch(
      `https://restapi.amap.com/v3/geocode/geo?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`地图服务请求失败: HTTP ${response.status}`)
    }

    const result = (await response.json()) as AmapGeocodeResult

    if (result.status !== '1') {
      const errorMsg = getAmapErrorMessage(result.infocode || result.info)
      res.status(400).json(createErrorResponse(errorMsg, `infocode: ${result.infocode}`))
      return
    }

    if (!result.geocodes || result.geocodes.length === 0) {
      res.status(404).json(createErrorResponse('未找到地址', '无法解析该地址'))
      return
    }

    const geocode = result.geocodes[0]

    const resultData: GeocodeResult = {
      success: true,
      formatted_address: geocode.formatted_address,
      location: parseLocation(geocode.location),
      province: geocode.province,
      city: geocode.city,
      district: geocode.district,
    }

    res.json(resultData)
  } catch (error) {
    console.error('地理编码API错误:', error)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      res.status(503).json(createErrorResponse('网络连接失败', '无法连接到地图服务'))
    } else {
      res.status(500).json(createErrorResponse('地理编码失败', error instanceof Error ? error.message : '未知错误'))
    }
  }
})

router.get('/reverse-geocode', async (req: Request, res: Response) => {
  try {
    const { lng, lat, radius = '1000', extensions = 'base' } = req.query as {
      lng?: string
      lat?: string
      radius?: string
      extensions?: string
    }

    if (!lng || !lat) {
      res.status(400).json(createErrorResponse('缺少坐标参数', '请提供 lng 和 lat 参数'))
      return
    }

    const lngNum = Number(lng)
    const latNum = Number(lat)

    if (isNaN(lngNum) || isNaN(latNum) || lngNum < -180 || lngNum > 180 || latNum < -90 || latNum > 90) {
      res.status(400).json(createErrorResponse('坐标参数无效', '请提供有效的经纬度坐标'))
      return
    }

    if (!checkApiKeyConfigured()) {
      res.status(500).json(createErrorResponse('地图服务未配置', '请在后端配置 AMAP_WEB_SERVICE_KEY'))
      return
    }

    const params = new URLSearchParams({
      key: AMAP_WEB_SERVICE_KEY!,
      location: `${lngNum},${latNum}`,
      radius: radius,
      extensions: extensions,
    })

    const response = await fetch(
      `https://restapi.amap.com/v3/geocode/regeo?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`地图服务请求失败: HTTP ${response.status}`)
    }

    const result = (await response.json()) as AmapRegeocodeResult

    if (result.status !== '1') {
      const errorMsg = getAmapErrorMessage(result.infocode || result.info)
      res.status(400).json(createErrorResponse(errorMsg, `infocode: ${result.infocode}`))
      return
    }

    if (!result.regeocode) {
      res.status(404).json(createErrorResponse('未找到地址信息', '无法解析该坐标的地址'))
      return
    }

    const regeocode = result.regeocode
    const addrComp = regeocode.addressComponent || {}

    const resultData: RegeocodeResult = {
      success: true,
      formatted_address: regeocode.formatted_address,
      addressComponent: {
        province: addrComp.province || '',
        city: addrComp.city || '',
        district: addrComp.district || '',
        township: addrComp.township || '',
        street: addrComp.street || '',
        streetNumber: addrComp.streetNumber?.number || '',
      },
    }

    res.json(resultData)
  } catch (error) {
    console.error('逆地理编码API错误:', error)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      res.status(503).json(createErrorResponse('网络连接失败', '无法连接到地图服务'))
    } else {
      res.status(500).json(createErrorResponse('逆地理编码失败', error instanceof Error ? error.message : '未知错误'))
    }
  }
})

function getAmapErrorMessage(infocode: string): string {
  const errorMessages: Record<string, string> = {
    '10000': '请求正常',
    '10001': '开发者密钥不正确',
    '10002': '请求来源非法',
    '10003': '请求密钥过期',
    '10004': '请求IP不在白名单中',
    '10005': '请求域名不在白名单中',
    '10006': '用户key被删除或禁用',
    '10007': '用户账号被冻结',
    '10008': '用户账号未激活',
    '10009': '请求key权限不足',
    '10010': '账号余额不足',
    '10011': '请求过于频繁',
    '10012': '服务不可用',
    '10013': '请求参数非法',
    '10014': '用户请求非法',
    '10015': '请求内容不合法',
    '10016': '账号被拉黑',
    '10017': '请求服务被关闭',
    '10018': '请求QPS超过限制',
    '10019': '请求时间无效',
    '10020': '请求IP超出白名单限制',
    '10021': '请求域名超出白名单限制',
    '10022': '请求无效',
    '10023': '账号无权限',
    '10024': '请求超出配额',
    '10025': '请求并发数超限',
    '10026': '请求格式错误',
    '10027': '请求方法错误',
    '10028': '请求版本错误',
    '10029': '请求数据格式错误',
    '10030': '请求数据长度超限',
    '10031': '请求数据校验失败',
    '10032': '请求数据解密失败',
    '10033': '请求数据签名失败',
    '10034': '请求数据时间戳无效',
    '10035': '请求数据重复',
    '10036': '请求数据缺失',
    '10037': '请求数据类型错误',
    '10038': '请求数据范围错误',
    '10039': '请求数据格式错误',
    '10040': '请求数据转换失败',
    '10041': '请求数据验证失败',
    '10042': '请求数据解析失败',
    '10043': '请求数据编码失败',
    '10044': '请求数据解码失败',
    '10045': '请求数据压缩失败',
    '10046': '请求数据解压失败',
    '10047': '请求数据加密失败',
    '10048': '请求数据解密失败',
    '10049': '请求数据签名验证失败',
    '10050': '请求数据时间戳验证失败',
    '30000': '用户请求非法',
    '30001': '请求参数错误',
    '30002': '请求参数缺失',
    '30003': '请求参数值无效',
    '32000': 'API权限不足',
    '32001': 'API配额不足',
    '32002': 'API调用频率超限',
    '32003': 'API服务不可用',
    '32004': 'API服务维护中',
    '32005': 'API服务已下线',
    '32006': 'API服务未开通',
    '32007': 'API服务已暂停',
    '32008': 'API服务已过期',
    '32009': 'API服务权限不足',
    '32010': 'API服务配额不足',
    '32011': 'API服务调用频率超限',
    '32012': 'API服务不可用',
    '32013': 'API服务维护中',
    '32014': 'API服务已下线',
    '32015': 'API服务未开通',
    '32016': 'API服务已暂停',
    '32017': 'API服务已过期',
    '32018': 'API服务权限不足',
    '32019': 'API服务配额不足',
    '32020': 'API服务调用频率超限',
    '60000': '地图服务内部错误',
    '60001': '地图服务不可用',
    '60002': '地图服务超时',
    '60003': '地图服务返回错误',
    '60004': '地图服务数据不存在',
    '60005': '地图服务参数错误',
    '60006': '地图服务权限不足',
    '60007': '地图服务配额不足',
    '60008': '地图服务调用频率超限',
    '60009': '地图服务维护中',
    '60010': '地图服务已下线',
    '60011': '地图服务未开通',
    '60012': '地图服务已暂停',
    '60013': '地图服务已过期',
    '60014': '地图服务权限不足',
    '60015': '地图服务配额不足',
    '60016': '地图服务调用频率超限',
    '60017': '地图服务不可用',
    '60018': '地图服务维护中',
    '60019': '地图服务已下线',
    '60020': '地图服务未开通',
    'USERKEY_PLAT_NOMATCH': 'API Key平台不匹配，请使用Web服务API Key',
    'INVALID_USER_KEY': 'API Key无效，请检查配置',
    'DAILY_QUERY_OVER_LIMIT': '每日查询次数已达上限',
    'ACCESS_TOO_FREQUENT': '请求过于频繁，请稍后再试',
    'USER_DAILY_QUERY_OVER_LIMIT': '用户每日查询次数已达上限',
    'USER_ABNORMAL': '用户状态异常',
    'USER_REQUIRE_PAY': '该功能需要付费开通',
  }

  return errorMessages[infocode] || `地图服务错误: ${infocode}`
}

export default router
