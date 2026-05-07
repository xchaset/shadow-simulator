declare namespace AMap {
  interface MapOptions {
    zoom?: number
    center?: [number, number] | LngLat
    zooms?: [number, number]
    lang?: string
    mapStyle?: string
    viewMode?: '2D' | '3D'
    pitch?: number
    rotation?: number
    resizeEnable?: boolean
    dragEnable?: boolean
    zoomEnable?: boolean
    doubleClickZoom?: boolean
    keyboardEnable?: boolean
    jogEnable?: boolean
    animateEnable?: boolean
    touchZoom?: boolean
    touchZoomCenter?: number
    scrollWheel?: boolean
  }

  class Map {
    constructor(container: string | HTMLElement, options?: MapOptions)
    destroy(): void
    setZoom(zoom: number): void
    getZoom(): number
    setCenter(center: [number, number] | LngLat): void
    getCenter(): LngLat
    setZoomAndCenter(zoom: number, center: [number, number] | LngLat): void
    panTo(center: [number, number] | LngLat): void
    setFitView(overlays?: Overlay[], immediately?: boolean, avoid?: [number, number, number, number], maxZoom?: number): void
    getBounds(): Bounds
    addControl(control: Control): void
    removeControl(control: Control): void
    on(event: string, callback: (e: any) => void): void
    off(event: string, callback: (e: any) => void): void
    clearMap(): void
    getContainer(): HTMLElement
  }

  class LngLat {
    constructor(lng: number, lat: number)
    getLng(): number
    getLat(): number
    equals(other: LngLat): boolean
    offset(dx: number, dy: number): LngLat
    distance(other: LngLat): number
    toArray(): [number, number]
    toString(): string
  }

  class Pixel {
    constructor(x: number, y: number)
    getX(): number
    getY(): number
    equals(other: Pixel): boolean
    toString(): string
  }

  class Bounds {
    constructor(southWest: LngLat, northEast: LngLat)
    getSouthWest(): LngLat
    getNorthEast(): LngLat
    getCenter(): LngLat
    contains(point: LngLat): boolean
    intersects(other: Bounds): boolean
    toString(): string
  }

  class Marker {
    constructor(options?: MarkerOptions)
    setMap(map: Map | null): void
    getMap(): Map | null
    setPosition(position: LngLat): void
    getPosition(): LngLat
    setOffset(offset: Pixel): void
    getOffset(): Pixel
    setIcon(icon: string | Icon): void
    getIcon(): string | Icon
    setTitle(title: string): void
    getTitle(): string
    setDraggable(draggable: boolean): void
    getDraggable(): boolean
    setClickable(clickable: boolean): void
    getClickable(): boolean
    show(): void
    hide(): void
    on(event: string, callback: (e: any) => void): void
    off(event: string, callback: (e: any) => void): void
  }

  interface MarkerOptions {
    position?: LngLat | [number, number]
    offset?: Pixel
    icon?: string | Icon
    title?: string
    draggable?: boolean
    clickable?: boolean
    map?: Map
    zIndex?: number
    extData?: any
    cursor?: string
    raiseOnDrag?: boolean
    animation?: 'AMAP_ANIMATION_DROP' | 'AMAP_ANIMATION_BOUNCE'
    autoRotation?: boolean
    angle?: number
  }

  class Icon {
    constructor(options: IconOptions)
    getImageSize(): [number, number]
    getImageOffset(): Pixel
    getImage(): string
  }

  interface IconOptions {
    image?: string
    size?: [number, number]
    imageSize?: [number, number]
    imageOffset?: [number, number]
  }

  class Control {
    constructor(options?: ControlOptions)
    show(): void
    hide(): void
    setMap(map: Map | null): void
    getMap(): Map | null
  }

  interface ControlOptions {
    position?: string
    offset?: [number, number]
  }

  class ToolBar extends Control {
    constructor(options?: ToolBarOptions)
  }

  interface ToolBarOptions extends ControlOptions {
    ruler?: boolean
    noIpLocate?: boolean
    noZoom?: boolean
    autoPosition?: boolean
    direction?: boolean
    locate?: boolean
  }

  class Scale extends Control {
    constructor(options?: ControlOptions)
  }

  class Geolocation extends Control {
    constructor(options?: GeolocationOptions)
    getCurrentPosition(callback: (status: string, result: GeolocationResult | GeolocationError) => void): void
    watchPosition(callback: (status: string, result: GeolocationResult | GeolocationError) => void): string
    clearWatch(watchId: string): void
  }

  interface GeolocationOptions extends ControlOptions {
    enableHighAccuracy?: boolean
    timeout?: number
    maximumAge?: number
    convert?: boolean
    showButton?: boolean
    showCircle?: boolean
    showMarker?: boolean
    panToLocation?: boolean
    zoomToAccuracy?: boolean
    useNative?: boolean
  }

  interface GeolocationResult {
    position: LngLat
    accuracy: number
    location_type: string
    message: string
    isConverted: boolean
    info: string
  }

  interface GeolocationError {
    info: string
    message: string
  }

  class Geocoder {
    constructor(options?: GeocoderOptions)
    getAddress(location: LngLat | [number, number], callback: (status: string, result: GeocoderResult) => void): void
    getLocation(address: string, callback: (status: string, result: GeocoderResult) => void): void
  }

  interface GeocoderOptions {
    city?: string
    radius?: number
    extensions?: 'base' | 'all'
  }

  interface GeocoderResult {
    geocodes?: Geocode[]
    regeocode?: Regeocode
    info: string
  }

  interface Geocode {
    formattedAddress: string
    location: LngLat
    level: string
    addressComponent: AddressComponent
  }

  interface Regeocode {
    formattedAddress: string
    addressComponent: AddressComponent
    pois?: Poi[]
    roads?: Road[]
    roadinters?: RoadInter[]
  }

  interface AddressComponent {
    province: string
    city: string
    district: string
    township: string
    street: string
    streetNumber: string
    neighborhood: string
    building: string
    citycode: string
    adcode: string
  }

  interface Poi {
    id: string
    name: string
    type: string
    location: LngLat
    address: string
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
  }

  interface Road {
    id: string
    name: string
    direction: string
    location: LngLat
    width: number
  }

  interface RoadInter {
    id: string
    location: LngLat
    first_id: string
    first_name: string
    second_id: string
    second_name: string
  }

  class PlaceSearch {
    constructor(options?: PlaceSearchOptions)
    search(keyword: string, callback: (status: string, result: PlaceSearchResult) => void): void
    searchNearBy(keyword: string, center: LngLat | [number, number], radius: number, callback: (status: string, result: PlaceSearchResult) => void): void
    searchInBounds(keyword: string, bounds: Bounds, callback: (status: string, result: PlaceSearchResult) => void): void
    getPageIndex(): number
    setPageIndex(pageIndex: number): void
    getPageSize(): number
    setPageSize(pageSize: number): void
  }

  interface PlaceSearchOptions {
    city?: string
    citylimit?: boolean
    pageSize?: number
    pageIndex?: number
    extensions?: 'base' | 'all'
    type?: string
  }

  interface PlaceSearchResult {
    info: string
    poiList: {
      pois: Poi[]
      count: number
      pageIndex: number
      pageSize: number
    }
    keywordList?: string[]
    cityList?: any[]
  }

  class AutoComplete {
    constructor(options?: AutoCompleteOptions)
    search(keyword: string, callback: (status: string, result: AutoCompleteResult) => void): void
  }

  interface AutoCompleteOptions {
    city?: string
    citylimit?: boolean
    input?: string | HTMLInputElement
    output?: string | HTMLElement
    datatype?: 'all' | 'poi' | 'bus' | 'busline'
  }

  interface AutoCompleteResult {
    info: string
    tips: Tip[]
    keywordList?: string[]
    cityList?: any[]
  }

  interface Tip {
    id: string
    name: string
    district: string
    adcode: string
    location: LngLat
  }

  interface Overlay {
    setMap(map: Map | null): void
    getMap(): Map | null
    show(): void
    hide(): void
  }
}

declare module '@amap/amap-jsapi-loader' {
  interface LoaderOptions {
    key: string
    version?: string
    plugins?: string[]
    AMapUI?: {
      version?: string
      plugins?: string[]
    }
    Loca?: {
      version?: string
    }
    serviceHost?: string
    secure?: boolean
  }

  function load(options: LoaderOptions): Promise<typeof AMap>

  export = load
}
