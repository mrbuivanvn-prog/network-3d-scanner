import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { hashToPos } from './utils/hashToPos';

/**
 * Network2D — Professional 2D Canvas Network View
 * Chạy được trên mọi máy (không cần WebGL/GPU).
 *
 * Tính năng:
 *  - Vòng tròn có 3 lớp (viền, fill, glow) cho mỗi node
 *  - Highlight khi hover/click node (bao gồm các đường liên quan)
 *  - Label nền mờ dễ đọc
 *  - Lưới nền rất nhẹ
 *  - Pan (keo chuot) + zoom (cuon chuot)
 *  - Pan vuốt (touch) + zoom (pinch)
 *  - Không dùng react-three-fiber hay Three.js ở đây
 */
export default function Network2D({ devices = [] }) {
  const canvasRef = useRef(null)
  const offscreenRef = useRef(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1.0)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)

  // ── Demo nodes (khong co du lieu thi hien node demo) ───────────────────────
  const demoDevices = useMemo(() => [
    { ip: '10.0.0.1',   host: 'router-gw',    status: 'Online' },
    { ip: '10.0.0.12',  host: 'laptop-john',   status: 'Online' },
    { ip: '10.0.0.55',  host: 'tv-lounge',     status: 'Offline' },
    { ip: '10.0.0.90',  host: 'nas-storage',   status: 'Online' },
    { ip: '10.0.0.25',  host: 'printer',       status: 'Offline' },
    { ip: '10.0.0.77',  host: 'camera-01',     status: 'Online' },
  ], [])

  const nodes = useMemo(() => {
    const data = (devices && devices.length > 0) ? devices : demoDevices
    return data.map(d => {
      const p = hashToPos(d.ip || d.host || String(Math.random()), 4.2)
      return { x: p[0], y: p[2], ...d }
    })
  }, [devices, demoDevices])

  // ── Connections: nearest-neighbor per node (max 4 per node) ─────────────────
  const edges = useMemo(() => {
    const out = []
    const maxPerNode = 4
    for (let i = 0; i < nodes.length; i++) {
      const dists = []
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        dists.push([j, dx * dx + dy * dy])
      }
      dists.sort((a, b) => a[1] - b[1])
      for (let k = 0; k < Math.min(dists.length, maxPerNode); k++) {
        const j = dists[k][0]
        if (i < j) out.push([nodes[i], nodes[j]])
      }
    }
    return out
  }, [nodes])

  // ── Determine highlighted set ───────────────────────────────────────────────
  function relatedSet(node) {
    if (!node) return null
    const s = new Set([node])
    for (const [a, b] of edges) {
      if (a === node) s.add(b)
      if (b === node) s.add(a)
    }
    return s
  }

  // ── Single draw function ────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    // background
    ctx.fillStyle = '#0a0e1a'
    ctx.fillRect(0, 0, w, h)

    // ── Grid ────────────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(30, 42, 74, 0.35)'
    ctx.lineWidth = 1
    const gs = Math.round(48 * zoom)
    if (gs > 0) {
      let ox = ((pan.x % gs) + gs) % gs
      let oy = ((pan.y % gs) + gs) % gs
      ctx.beginPath()
      for (let x = ox; x < w; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, h) }
      for (let y = oy; y < h; y += gs) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
      ctx.stroke()
    }

    const hl = hovered || selected
    const related = hl ? relatedSet(hl) : null

    // ── Edges ───────────────────────────────────────────────────────────────
    ctx.lineWidth = 1
    for (const [a, b] of edges) {
      const isRelated = related ? (related.has(a) && related.has(b)) : true
      const ax = w/2 + a.x * 72 * zoom + pan.x
      const ay = h/2 + a.y * 72 * zoom + pan.y
      const bx = w/2 + b.x * 72 * zoom + pan.x
      const by = h/2 + b.y * 72 * zoom + pan.y
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.strokeStyle = isRelated ? '#00d4ff' : 'rgba(0,212,255,0.15)'
      ctx.globalAlpha = isRelated ? 0.70 : 0.18
      ctx.lineWidth = isRelated ? 1.8 : 1.0
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.lineWidth = 1

    // ── Nodes ───────────────────────────────────────────────────────────────
    for (const nd of nodes) {
      const sx = w/2 + nd.x * 72 * zoom + pan.x
      const sy = h/2 + nd.y * 72 * zoom + pan.y
      const online = nd.status === 'Online'
      const color  = online ? '#10b981' : '#ef4444'
      const isHL   = related ? related.has(nd) : true

      const r  = 9  * zoom
      const rf = 21 * zoom   // glow radius

      // glow ring (only when highlighted)
      if (isHL && hl) {
        const gr = ctx.createRadialGradient(sx, sy, r * 0.8, sx, sy, rf)
        gr.addColorStop(0, color + '33')
        gr.addColorStop(1, 'transparent')
        ctx.fillStyle = gr
        ctx.beginPath(); ctx.arc(sx, sy, rf, 0, Math.PI*2); ctx.fill()
      }

      // main circle
      ctx.fillStyle = color
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill()

      // white border
      ctx.strokeStyle = isHL ? '#ffffff' : 'rgba(255,255,255,0.85)'
      ctx.lineWidth = isHL ? 2.2 : 1.4
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.stroke()

      // inner highlight ring
      ctx.strokeStyle = 'rgba(255,255,255,0.38)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(sx, sy, r * 0.62, 0, Math.PI*2); ctx.stroke()

      // ── Label ─────────────────────────────────────────────────────────────
      const lbl = nd.host || nd.ip || ''
      if (lbl) {
        ctx.font = `${Math.round(12.5 * zoom)}px 'Nunito', system-ui, sans-serif`
        const tw = ctx.measureText(lbl).width
        const padX = 7 * zoom
        const padY = 3 * zoom
        const lh  = Math.round(15 * zoom)
        const lx  = sx - (tw + padX * 2) / 2
        const ly  = sy + 22 * zoom

        // pill background
        ctx.fillStyle = 'rgba(15,23,42,0.80)'
        ctx.beginPath()
        ctx.roundRect(lx, ly - lh/2, tw + padX * 2, lh, Math.round(6 * zoom))
        ctx.fill()

        // pill border
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(lx, ly - lh/2, tw + padX * 2, lh, Math.round(6 * zoom))
        ctx.stroke()

        // text
        ctx.fillStyle = isHL ? '#f1f5f9' : '#cbd5e1'
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(lbl, sx, ly)
      }
    }

    ctx.globalAlpha = 1
  }, [nodes, edges, pan, zoom, hovered, selected])

  // ── Resize observer ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let raf

    const updateSize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      // cancel pending draw
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        canvas.width  = parent.clientWidth
        canvas.height = parent.clientHeight
        draw()
        raf = null
      })
    }

    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(canvas.parentElement)
    window.addEventListener('resize', updateSize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateSize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [draw])

  // ── Redraw khi data / state doi ─────────────────────────────────────────────
  useEffect(() => { draw() }, [draw])

  // ── helpers ────────────────────────────────────────────────────────────────
  function getNodeAt(cx, cy) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = cx - rect.left
    const my = cy - rect.top
    const r  = 18 * zoom   // hit-area radius
    for (const nd of nodes) {
      const sx = canvas.width/2  + nd.x * 72 * zoom + pan.x
      const sy = canvas.height/2 + nd.y * 72 * zoom + pan.y
      if ((mx-sx)**2 + (my-sy)**2 < r*r) return nd
    }
    return null
  }

  // ── Mouse events ───────────────────────────────────────────────────────────
  const onMouseMove = (e) => {
    const node = getNodeAt(e.clientX, e.clientY)
    setHovered(node)
    if (dragging && dragStart) {
      setPan(p => ({ x: p.x + e.clientX - dragStart.x, y: p.y + e.clientY - dragStart.y }))
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const onMouseDown = (e) => {
    const node = getNodeAt(e.clientX, e.clientY)
    if (node) {
      setSelected(selected === node ? null : node)
    } else {
      setSelected(null)
      setDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const onMouseUp = () => { setDragging(false); setDragStart(null) }
  const onMouseLeave = () => { setDragging(false); setDragStart(null); setHovered(null) }
  const onWheel = (e) => {
    e.preventDefault()
    const f = e.deltaY < 0 ? 1.10 : 0.90
    setZoom(z => Math.max(0.25, Math.min(6, z * f)))
  }

  // ── Touch events ───────────────────────────────────────────────────────────
  const onTStart = (e) => {
    if (e.touches.length === 1) {
      setDragging(true)
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    }
  }
  const onTMove = (e) => {
    if (e.touches.length === 1 && dragging && dragStart) {
      const dx = e.touches[0].clientX - dragStart.x
      const dy = e.touches[0].clientY - dragStart.y
      setPan(p => ({ x: p.x + dx, y: p.y + dy }))
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    }
  }
  const onTEnd = () => { setDragging(false); setDragStart(null) }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: hovered ? 'pointer' : dragging ? 'grabbing' : 'grab',
      }}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onWheel={onWheel}
      onTouchStart={onTStart}
      onTouchMove={onTMove}
      onTouchEnd={onTEnd}
    />
  )
}
