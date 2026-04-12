import { Select } from 'antd'
import { HOT_CITIES } from '../../utils/cities'
import { useStore } from '../../store/useStore'

export function CitySelector() {
  const location = useStore(s => s.location)
  const setLocation = useStore(s => s.setLocation)

  return (
    <Select
      value={location.cityName}
      onChange={(cityName) => {
        const city = HOT_CITIES.find(c => c.name === cityName)
        if (city) {
          setLocation({ lat: city.lat, lng: city.lng, cityName: city.name })
        }
      }}
      style={{ width: 120 }}
      size="small"
      options={HOT_CITIES.map(c => ({ value: c.name, label: `📍 ${c.name}` }))}
    />
  )
}
