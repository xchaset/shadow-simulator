import { useStore } from '../store/useStore'

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      location: { lat: 39.9042, lng: 116.4074, cityName: '北京' },
      dateTime: new Date(2026, 3, 11, 14, 0, 0),
      buildings: [],
      selectedBuildingId: null,
      playback: { playing: false, speed: 1 },
    })
  })

  it('should have default location as Beijing', () => {
    const state = useStore.getState()
    expect(state.location.cityName).toBe('北京')
  })

  it('should set location', () => {
    useStore.getState().setLocation({ lat: 31.23, lng: 121.47, cityName: '上海' })
    expect(useStore.getState().location.cityName).toBe('上海')
  })

  it('should set dateTime', () => {
    const newDate = new Date(2026, 6, 1, 10, 0, 0)
    useStore.getState().setDateTime(newDate)
    expect(useStore.getState().dateTime).toBe(newDate)
  })

  it('should add building', () => {
    const b = {
      id: 'test-1',
      name: 'Test Building',
      type: 'box' as const,
      params: { width: 20, depth: 15, height: 50 },
      position: [0, 0] as [number, number],
      rotation: 0,
      color: '#888',
    }
    useStore.getState().addBuilding(b)
    expect(useStore.getState().buildings).toHaveLength(1)
    expect(useStore.getState().buildings[0].id).toBe('test-1')
  })

  it('should update building', () => {
    const b = {
      id: 'test-1',
      name: 'Test',
      type: 'box' as const,
      params: { width: 20, depth: 15, height: 50 },
      position: [0, 0] as [number, number],
      rotation: 0,
      color: '#888',
    }
    useStore.getState().addBuilding(b)
    useStore.getState().updateBuilding('test-1', { rotation: 45 })
    expect(useStore.getState().buildings[0].rotation).toBe(45)
  })

  it('should remove building', () => {
    const b = {
      id: 'test-1',
      name: 'Test',
      type: 'box' as const,
      params: { width: 20, depth: 15, height: 50 },
      position: [0, 0] as [number, number],
      rotation: 0,
      color: '#888',
    }
    useStore.getState().addBuilding(b)
    useStore.getState().removeBuilding('test-1')
    expect(useStore.getState().buildings).toHaveLength(0)
  })

  it('should deselect when selected building is removed', () => {
    const b = {
      id: 'test-1',
      name: 'Test',
      type: 'box' as const,
      params: { width: 20, depth: 15, height: 50 },
      position: [0, 0] as [number, number],
      rotation: 0,
      color: '#888',
    }
    useStore.getState().addBuilding(b)
    useStore.getState().selectBuilding('test-1')
    useStore.getState().removeBuilding('test-1')
    expect(useStore.getState().selectedBuildingId).toBeNull()
  })

  it('should set playback', () => {
    useStore.getState().setPlayback({ playing: true, speed: 5 })
    const s = useStore.getState().playback
    expect(s.playing).toBe(true)
    expect(s.speed).toBe(5)
  })
})
