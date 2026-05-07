import { useState, useEffect, useRef, useCallback } from 'react'
import { Modal, InputNumber, Input, App, AutoComplete, Spin, Popover, Row, Col } from 'antd'
import { EnvironmentOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import { mapApi, type MapSearchItem } from '../../utils/api'
import AMapLoader from '@amap/amap-jsapi-loader'

interface Props {
  open: boolean
  onClose: () => void
}

interface SearchTip {
  name: string
  district: string
  location?: [number, number]
  address?: string
}

const getSearchErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message
    if (msg.includes('HTTP 503') || msg.includes('网络连接失败')) {
      return '网络连接失败，请检查网络后重试'
    }
    if (msg.includes('HTTP 400') || msg.includes('参数无效')) {
      return '搜索参数无效'
    }
    if (msg.includes('HTTP 404') || msg.includes('未找到')) {
      return '未找到相关地点'
    }
    if (msg.includes('HTTP 500') || msg.includes('未配置')) {
      return '地图服务暂时不可用，请稍后再试'
    }
    if (msg.includes('USERKEY')) {
      return '地图服务配置错误，请联系管理员'
    }
    return msg
  }
  return '搜索失败，请稍后再试'
}

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY

export function MapModal({ open, onClose }: Props) {
  const location = useStore(s => s.location)
  const setLocation = useStore(s => s.setLocation)
  const { message: antMessage } = App.useApp()

  const [lat, setLat] = useState(location.lat)
  const [lng, setLng] = useState(location.lng)
  const [cityName, setCityName] = useState(location.cityName)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [searchOptions, setSearchOptions] = useState<SearchTip[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<AMap.Map | null>(null)
  const markerRef = useRef<AMap.Marker | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const geocodeAbortControllerRef = useRef<AbortController | null>(null)

  const hasApiKey = !!(AMAP_KEY && AMAP_KEY !== 'your_amap_api_key_here')

  const loadMap = useCallback(async (centerLng: number, centerLat: number) => {
    if (!mapContainerRef.current) {
      console.warn('地图容器尚未准备好')
      return
    }

    if (mapRef.current) {
      console.log('地图已存在，跳过加载')
      return
    }

    if (!hasApiKey) {
      setMapError('未配置高德地图 API Key')
      return
    }

    try {
      console.log('开始加载高德地图...')

      let loadedAMap: any

      if ((AMapLoader as any).load) {
        loadedAMap = await (AMapLoader as any).load({
          key: AMAP_KEY,
          version: '2.0',
          plugins: [
            'AMap.Geolocation',
            'AMap.ToolBar',
            'AMap.Scale',
          ]
        })
      } else if (typeof AMapLoader === 'function') {
        loadedAMap = await (AMapLoader as any)({
          key: AMAP_KEY,
          version: '2.0',
          plugins: [
            'AMap.Geolocation',
            'AMap.ToolBar',
            'AMap.Scale',
          ]
        })
      } else if ((AMapLoader as any).default) {
        const defaultExport = (AMapLoader as any).default
        if (defaultExport.load) {
          loadedAMap = await defaultExport.load({
            key: AMAP_KEY,
            version: '2.0',
            plugins: [
              'AMap.Geolocation',
              'AMap.ToolBar',
              'AMap.Scale',
            ]
          })
        } else {
          loadedAMap = await defaultExport({
            key: AMAP_KEY,
            version: '2.0',
            plugins: [
              'AMap.Geolocation',
              'AMap.ToolBar',
              'AMap.Scale',
            ]
          })
        }
      } else {
        try {
          const dynamicModule = await import('@amap/amap-jsapi-loader')
          if ((dynamicModule as any).load) {
            loadedAMap = await (dynamicModule as any).load({
              key: AMAP_KEY,
              version: '2.0',
              plugins: [
                'AMap.Geolocation',
                'AMap.ToolBar',
                'AMap.Scale',
              ]
            })
          } else if ((dynamicModule as any).default) {
            const defaultExp = (dynamicModule as any).default
            if (defaultExp.load) {
              loadedAMap = await defaultExp.load({
                key: AMAP_KEY,
                version: '2.0',
                plugins: [
                  'AMap.Geolocation',
                  'AMap.ToolBar',
                  'AMap.Scale',
                ]
              })
            } else {
              loadedAMap = await defaultExp({
                key: AMAP_KEY,
                version: '2.0',
                plugins: [
                  'AMap.Geolocation',
                  'AMap.ToolBar',
                  'AMap.Scale',
                ]
              })
            }
          } else {
            throw new Error(`动态导入也无法识别格式`)
          }
        } catch (dynamicError) {
          console.error('动态导入失败:', dynamicError)
          throw new Error(`无法识别的 AMapLoader 格式: ${typeof AMapLoader}`)
        }
      }

      console.log('高德地图 SDK 加载成功')

      const AMapNS = loadedAMap || (window as any).AMap

      if (!AMapNS) {
        throw new Error('高德地图 SDK 加载失败，无法获取 AMap 命名空间')
      }

      const initialCenter = new AMapNS.LngLat(centerLng, centerLat)

      const map = new AMapNS.Map(mapContainerRef.current, {
        zoom: 13,
        center: initialCenter,
        resizeEnable: true,
        dragEnable: true,
        zoomEnable: true,
        scrollWheel: true,
        doubleClickZoom: false,
        keyboardEnable: true,
      })

      const toolbar = new AMapNS.ToolBar({
        position: 'LT',
        offset: [10, 10]
      })
      map.addControl(toolbar)

      const scale = new AMapNS.Scale({
        position: 'LB',
        offset: [10, 10]
      })
      map.addControl(scale)

      const geolocation = new AMapNS.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        zoomToAccuracy: true,
        showButton: true,
        showMarker: true,
        showCircle: true,
      })
      map.addControl(geolocation)

      const marker = new AMapNS.Marker({
        position: initialCenter,
        map: map,
        draggable: true,
        raiseOnDrag: true,
        cursor: 'move',
      })

      map.on('click', (e: any) => {
        const { lnglat } = e
        const newLng = lnglat.getLng()
        const newLat = lnglat.getLat()

        setLng(newLng)
        setLat(newLat)
        marker.setPosition(lnglat)

        getAddressFromCoordinate(newLng, newLat)
      })

      marker.on('dragend', (e: any) => {
        const { lnglat } = e
        const newLng = lnglat.getLng()
        const newLat = lnglat.getLat()

        setLng(newLng)
        setLat(newLat)

        getAddressFromCoordinate(newLng, newLat)
      })

      mapRef.current = map
      markerRef.current = marker
      setMapLoaded(true)
      console.log('地图加载完成')
    } catch (error) {
      console.error('高德地图加载失败:', error)
      setMapError(error instanceof Error ? error.message : '地图加载失败')
    }
  }, [hasApiKey])

  const getAddressFromCoordinate = useCallback(async (longitude: number, latitude: number) => {
    console.log('调用后端逆地理编码接口获取地址:', longitude, latitude)

    if (geocodeAbortControllerRef.current) {
      geocodeAbortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    geocodeAbortControllerRef.current = abortController

    try {
      const result = await mapApi.reverseGeocode(longitude, latitude, 1000)

      if (abortController.signal.aborted) {
        return
      }

      if (result.success && result.formatted_address) {
        const addr = result.addressComponent
        const district = [addr.province, addr.city, addr.district, addr.township, addr.street, addr.streetNumber]
          .filter(Boolean)
          .join('')

        console.log('获取到地址信息:', {
          formatted_address: result.formatted_address,
          district,
        })

        setCityName(result.formatted_address)
      } else {
        console.warn('逆地理编码未返回有效地址')
        setCityName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('逆地理编码API调用失败:', error)
      setCityName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
    } finally {
      if (geocodeAbortControllerRef.current === abortController) {
        geocodeAbortControllerRef.current = null
      }
    }
  }, [])

  const handleSearch = useCallback((value: string) => {
    setSearchError(null)

    if (!value || value.trim() === '') {
      setSearchOptions([])
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    const trimmedValue = value.trim()
    if (trimmedValue.length < 1) {
      setSearchOptions([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      console.log('开始搜索:', trimmedValue)
      setSearchLoading(true)

      try {
        const result = await mapApi.search(trimmedValue, undefined, 1, 10)

        if (result.success && result.items && result.items.length > 0) {
          const options: SearchTip[] = result.items.map((item: MapSearchItem) => ({
            name: item.name,
            district: item.district,
            location: item.location,
            address: item.address,
          }))

          console.log('解析后的搜索选项:', options)
          setSearchOptions(options)
          setSearchError(null)
        } else {
          console.log('未找到搜索结果')
          setSearchOptions([])
          setSearchError(null)
        }
      } catch (error) {
        const errorMsg = getSearchErrorMessage(error)
        console.warn('搜索失败:', errorMsg)
        setSearchOptions([])
        setSearchError(errorMsg)
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }, [])

  const handleSelectSearchResult = useCallback((value: string, option: any) => {
    const selectedOption = searchOptions.find(opt => opt.name === value)

    if (selectedOption && selectedOption.location && mapRef.current && markerRef.current) {
      const [newLng, newLat] = selectedOption.location

      setLng(newLng)
      setLat(newLat)

      const displayName = selectedOption.address
        ? `${selectedOption.name} (${selectedOption.address})`
        : `${selectedOption.name} (${selectedOption.district})`
      setCityName(displayName)

      const AMapNS = (window as any).AMap
      if (AMapNS) {
        const newPosition = new AMapNS.LngLat(newLng, newLat)
        markerRef.current.setPosition(newPosition)
        mapRef.current.setCenter(newPosition)
        mapRef.current.setZoom(15)
      }
    }
  }, [searchOptions])

  const handleCoordinateChange = useCallback((value: number | null, type: 'lat' | 'lng') => {
    if (value === null) return

    if (type === 'lat') {
      setLat(value)
    } else {
      setLng(value)
    }

    if (mapRef.current && markerRef.current) {
      const AMapNS = (window as any).AMap
      if (AMapNS) {
        const newPosition = new AMapNS.LngLat(
          type === 'lng' ? value : lng,
          type === 'lat' ? value : lat
        )
        markerRef.current.setPosition(newPosition)
        mapRef.current.setCenter(newPosition)
      }

      getAddressFromCoordinate(
        type === 'lng' ? value : lng,
        type === 'lat' ? value : lat
      )
    }
  }, [lng, lat, getAddressFromCoordinate])

  const handleConfirm = useCallback(() => {
    setLocation({ lat, lng, cityName: cityName || `${lat.toFixed(2)}, ${lng.toFixed(2)}` })
    antMessage.success(`已切换到 ${cityName || '自定义位置'}`)
    onClose()
  }, [lat, lng, cityName, setLocation, antMessage, onClose])

  const handleOpen = useCallback(() => {
    setLat(location.lat)
    setLng(location.lng)
    setCityName(location.cityName)
    setSearchOptions([])
    setSearchError(null)
    setMapError(null)
  }, [location])

  const handleClose = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }

    if (geocodeAbortControllerRef.current) {
      geocodeAbortControllerRef.current.abort()
      geocodeAbortControllerRef.current = null
    }

    if (mapRef.current) {
      mapRef.current.destroy()
      mapRef.current = null
      markerRef.current = null
      setMapLoaded(false)
      setMapError(null)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      handleClose()
      return
    }

    if (!hasApiKey) {
      return
    }

    const initMap = async () => {
      await new Promise(resolve => setTimeout(resolve, 100))

      if (mapContainerRef.current && !mapRef.current) {
        await loadMap(lng, lat)

        await new Promise(resolve => setTimeout(resolve, 500))
        if (mapRef.current) {
          try {
            const AMapNS = (window as any).AMap
            if (AMapNS) {
              const newPosition = new AMapNS.LngLat(lng, lat)
              mapRef.current.setCenter(newPosition)
              mapRef.current.setZoom(13)
            }
          } catch (e) {
            console.warn('地图重定位失败:', e)
          }
        }
      }
    }

    initMap()
  }, [open, hasApiKey, lng, lat, loadMap, handleClose])

  const helpContent = (
    <div style={{ maxWidth: 280, fontSize: 12 }}>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>使用提示：</div>
      <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
        <li>点击地图任意位置进行选点</li>
        <li>拖动标记可调整位置</li>
        <li>使用搜索框快速定位到具体地址</li>
        <li>地图控件支持缩放、定位等操作</li>
      </ul>
    </div>
  );

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <EnvironmentOutlined style={{ marginRight: 8 }} />
          <span>选择地点</span>
          {hasApiKey && (
            <Popover content={helpContent} title="" trigger="click" placement="bottom">
              <QuestionCircleOutlined
                style={{
                  marginLeft: 8,
                  color: '#1890ff',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              />
            </Popover>
          )}
        </div>
      }
      open={open}
      onCancel={() => {
        onClose()
      }}
      onOk={handleConfirm}
      okText="确定"
      cancelText="取消"
      afterOpenChange={(isOpen) => { if (isOpen) handleOpen() }}
      width={650}
      destroyOnHidden={true}
      styles={{
        body: {
          padding: '12px 16px',
          maxHeight: 'calc(100vh - 200px)',
          overflow: 'hidden'
        }
      }}
    >
      <div style={{ marginBottom: 12 }}>
        {hasApiKey ? (
          <AutoComplete
            options={searchOptions.map(opt => ({
              value: opt.name,
              label: (
                <div>
                  <div style={{ fontWeight: 500 }}>{opt.name}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {opt.address || opt.district}
                  </div>
                </div>
              )
            }))}
            onSearch={handleSearch}
            onSelect={handleSelectSearchResult}
            placeholder="搜索地址或地点..."
            notFoundContent={
              searchLoading ? (
                <Spin size="small" />
              ) : searchError ? (
                <div style={{ color: '#ff4d4f', fontSize: 12, padding: '8px 12px' }}>
                  {searchError}
                </div>
              ) : (
                '未找到相关地点'
              )
            }
          >
            <Input
              prefix={<EnvironmentOutlined style={{ color: '#999' }} />}
              allowClear
              size="middle"
            />
          </AutoComplete>
        ) : (
          <Input
            placeholder="搜索地址（需配置 VITE_AMAP_KEY）"
            prefix={<EnvironmentOutlined style={{ color: '#999' }} />}
            disabled
            size="middle"
          />
        )}
      </div>

      <div
        ref={mapContainerRef}
        style={{
          height: 280,
          background: '#f5f5f5',
          borderRadius: 8,
          marginBottom: 12,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {!hasApiKey && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: 12,
            border: '1px dashed #d9d9d9',
            borderRadius: 8
          }}>
            <div style={{ textAlign: 'center' }}>
              <EnvironmentOutlined style={{ fontSize: 28, marginBottom: 6 }} />
              <div>地图区域（配置 VITE_AMAP_KEY 后启用）</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                请在前端 .env 文件中配置高德地图 API Key
              </div>
            </div>
          </div>
        )}
        {hasApiKey && mapError && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff4d4f',
            fontSize: 12,
            border: '1px dashed #ff4d4f',
            borderRadius: 8,
            background: '#fff2f0'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 6 }}>地图加载失败: {mapError}</div>
              <div style={{ fontSize: 11 }}>
                请检查 API Key 是否正确配置
              </div>
            </div>
          </div>
        )}
        {hasApiKey && !mapError && !mapLoaded && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Spin size="large" />
          </div>
        )}
      </div>

      <Row gutter={[12, 8]} style={{ marginBottom: 0 }}>
        <Col xs={24} sm={24} md={8}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>名称</div>
          <Input
            size="small"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            placeholder="位置名称"
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>纬度</div>
          <InputNumber
            size="small"
            value={lat}
            min={-90}
            max={90}
            step={0.0001}
            precision={4}
            onChange={(v) => handleCoordinateChange(v, 'lat')}
            style={{ width: '100%' }}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>经度</div>
          <InputNumber
            size="small"
            value={lng}
            min={-180}
            max={180}
            step={0.0001}
            precision={4}
            onChange={(v) => handleCoordinateChange(v, 'lng')}
            style={{ width: '100%' }}
          />
        </Col>
      </Row>
    </Modal>
  )
}
