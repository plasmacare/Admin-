import { useEffect, useRef, useState } from 'react'
import JsBarcode from 'jsbarcode'

/** Renders a Code128 barcode as an <img> (via an offscreen canvas) — using an <img> instead of a live <canvas> avoids any html2canvas quirks capturing canvas content. */
export default function Barcode({ value, height = 40 }) {
  const canvasRef = useRef(document.createElement('canvas'))
  const [src, setSrc] = useState('')

  useEffect(() => {
    try {
      JsBarcode(canvasRef.current, String(value), {
        format: 'CODE128',
        displayValue: false,
        height,
        margin: 0,
        width: 2,
      })
      setSrc(canvasRef.current.toDataURL('image/png'))
    } catch {
      setSrc('')
    }
  }, [value, height])

  if (!src) return null
  return <img src={src} alt="" className="lab-report__barcode-img" />
}
