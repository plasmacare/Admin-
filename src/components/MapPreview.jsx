import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

export default function MapPreview({ latitude, longitude }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (!mapRef.current || latitude == null || longitude == null) return
    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 16,
      zoomControl: false,
      dragging: true,
      scrollWheelZoom: false,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    L.marker([latitude, longitude]).addTo(map)
    mapInstance.current = map
    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [latitude, longitude])

  if (latitude == null || longitude == null) return null

  return (
    <div className="map-preview">
      <div ref={mapRef} className="map-preview__map" />
      <a
        className="map-preview__link"
        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
        target="_blank"
        rel="noreferrer"
      >
        Open in Google Maps
      </a>
    </div>
  )
}
