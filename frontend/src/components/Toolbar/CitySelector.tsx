import { useState, useEffect, useRef } from 'react'
import { Select, Input, InputNumber, Space, Popover, Button } from 'antd'
import {
  EnvironmentOutlined,
  GlobalOutlined,
  DownOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import { HOT_CITIES } from '../../utils/cities'
import { useStore } from '../../store/useStore'

type LocationMode = 'city' | 'coordinate'

const STORAGE_KEY = 'shadow-simulator-location-mode'

function getStoredMode(): LocationMode | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'city' || stored === 'coordinate') {
      return stored
    }
    return null
  } catch {
    return null
  }
}

function setStoredMode(mode: LocationMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {}
}

export function CitySelector() {
  const location = useStore(s => s.location)
  const setLocation = useStore(s => s.setLocation)

  const [popoverOpen, setPopoverOpen] = useState(false)

  const getInitialMode = (): LocationMode => {
    const stored = getStoredMode()
    if (stored) return stored
    const isHotCity = HOT_CITIES.some(
      c => c.lat === location.lat && c.lng === location.lng
    )
    return isHotCity ? 'city' : 'coordinate'
  }

  const [mode, setMode] = useState<LocationMode>(getInitialMode)
  const [selectedCity, setSelectedCity] = useState(location.cityName)
  const [lat, setLat] = useState(location.lat)
  const [lng, setLng] = useState(location.lng)
  const [cityName, setCityName] = useState(location.cityName)

  const isFromConfirm = useRef(false)

  useEffect(() => {
    if (isFromConfirm.current) {
      isFromConfirm.current = false
      return
    }

    const stored = getStoredMode()
    if (stored) {
      setMode(stored)
    } else {
      const isHotCity = HOT_CITIES.some(
        c => c.lat === location.lat && c.lng === location.lng
      )
      setMode(isHotCity ? 'city' : 'coordinate')
    }
    setSelectedCity(location.cityName)
    setLat(location.lat)
    setLng(location.lng)
    setCityName(location.cityName)
  }, [location])

  const handleModeChange = (newMode: LocationMode) => {
    setMode(newMode)
    setStoredMode(newMode)
  }

  const handleOpen = () => {
    const stored = getStoredMode()
    if (stored) {
      setMode(stored)
    } else {
      const isHotCity = HOT_CITIES.some(
        c => c.lat === location.lat && c.lng === location.lng
      )
      setMode(isHotCity ? 'city' : 'coordinate')
    }
    setSelectedCity(location.cityName)
    setLat(location.lat)
    setLng(location.lng)
    setCityName(location.cityName)
  }

  const handleConfirm = () => {
    isFromConfirm.current = true
    setStoredMode(mode)

    if (mode === 'city') {
      const city = HOT_CITIES.find(c => c.name === selectedCity)
      if (city) {
        setLocation({
          lat: city.lat,
          lng: city.lng,
          cityName: city.name,
        })
      }
    } else {
      setLocation({
        lat,
        lng,
        cityName: cityName || `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
      })
    }
    setPopoverOpen(false)
  }

  const handleCitySelect = (value: string) => {
    setSelectedCity(value)
    if (value === '__coordinate__') {
      handleModeChange('coordinate')
      setLat(location.lat)
      setLng(location.lng)
      setCityName(location.cityName)
    } else {
      handleModeChange('city')
    }
  }

  const popoverContent = (
    <div style={{ padding: 8, minWidth: 340 }}>
      <div style={{ marginBottom: 12 }}>
        <Space size="small">
          <Button
            type={mode === 'city' ? 'primary' : 'default'}
            size="small"
            icon={<EnvironmentOutlined />}
            onClick={() => handleModeChange('city')}
          >
            选择城市
          </Button>
          <Button
            type={mode === 'coordinate' ? 'primary' : 'default'}
            size="small"
            icon={<GlobalOutlined />}
            onClick={() => {
              handleModeChange('coordinate')
              setLat(lat)
              setLng(lng)
              setCityName(cityName)
            }}
          >
            经纬度
          </Button>
        </Space>
      </div>

      {mode === 'city' ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
            选择城市
          </div>
          <Select
            value={selectedCity}
            onChange={handleCitySelect}
            style={{ width: '100%' }}
            size="small"
            options={[
              ...HOT_CITIES.map(c => ({ value: c.name, label: c.name })),
              {
                value: '__coordinate__',
                label: (
                  <span style={{ color: '#1677ff' }}>
                    <GlobalOutlined style={{ marginRight: 4 }} />
                    输入经纬度...
                  </span>
                ),
              },
            ]}
            filterOption={(input, option) => {
              if (option?.value === '__coordinate__') return true
              return (option?.label as string)
                ?.toLowerCase()
                .includes(input.toLowerCase())
            }}
          />
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              地点名称
            </div>
            <Input
              size="small"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="可自定义地点名称（选填）"
              prefix={<EnvironmentOutlined />}
            />
          </div>

          <Space size="middle" style={{ marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                纬度
              </div>
              <InputNumber
                size="small"
                value={lat}
                min={-90}
                max={90}
                step={0.0001}
                onChange={(v) => v !== null && setLat(v)}
                style={{ width: 150 }}
                placeholder="-90 ~ 90"
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                经度
              </div>
              <InputNumber
                size="small"
                value={lng}
                min={-180}
                max={180}
                step={0.0001}
                onChange={(v) => v !== null && setLng(v)}
                style={{ width: 150 }}
                placeholder="-180 ~ 180"
              />
            </div>
          </Space>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button size="small" onClick={() => setPopoverOpen(false)}>
          取消
        </Button>
        <Button
          type="primary"
          size="small"
          icon={<CheckOutlined />}
          onClick={handleConfirm}
        >
          确定
        </Button>
      </div>
    </div>
  )

  const isHotCity = HOT_CITIES.some(
    c => c.lat === location.lat && c.lng === location.lng
  )

  return (
    <Popover
      content={popoverContent}
      title={
        <span style={{ fontWeight: 600 }}>
          <EnvironmentOutlined /> 选择地点
        </span>
      }
      open={popoverOpen}
      onOpenChange={(open) => {
        if (open) handleOpen()
        setPopoverOpen(open)
      }}
      trigger={['click']}
      placement="bottom"
    >
      {isHotCity ? (
        <Select
          value={location.cityName}
          style={{ width: 140 }}
          size="small"
          suffixIcon={<DownOutlined />}
          open={false}
          options={HOT_CITIES.map(c => ({ value: c.name, label: c.name }))}
        />
      ) : (
        <Button
          size="small"
          style={{
            height: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <GlobalOutlined />
          <span
            style={{
              maxWidth: 100,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {location.cityName || `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`}
          </span>
          <DownOutlined style={{ fontSize: 10 }} />
        </Button>
      )}
    </Popover>
  )
}
