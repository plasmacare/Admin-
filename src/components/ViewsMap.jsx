import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function ViewsMap({ cities }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (!mapRef.current) return
    const points = cities.filter((c) => c.lat != null && c.lng != null)
    if (points.length === 0) return

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const maxViews = Math.max(...points.map((p) => p.views))
    points.forEach((p) => {
      const radius = 8 + (p.views / maxViews) * 22
      L.circleMarker([p.lat, p.lng], {
        radius,
        color: '#C0152F',
        weight: 1,
        fillColor: '#C0152F',
        fillOpacity: 0.35,
      })
        .addTo(map)
        .bindPopup(`<strong>${p.city}${p.region ? `, ${p.region}` : ''}</strong><br/>${p.views} views`)
    })

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 })

    mapInstance.current = map
    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [cities])

  return <div ref={mapRef} className="views-map" />
}
