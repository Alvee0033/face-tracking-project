"use client"

import { useEffect, useRef, useState } from "react"
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface MindMapNode {
  id: string
  label: string
  level: number
  parentId: string | null
  color: string
}

interface MindMapData {
  title: string
  nodes: MindMapNode[]
}

interface MindMapViewerProps {
  mindMap: MindMapData
  onClose: () => void
}

export function MindMapViewer({ mindMap, onClose }: MindMapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  useEffect(() => {
    drawMindMap()
  }, [mindMap, zoom, offset, hoveredNode, selectedNode])

  const drawMindMap = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply transformations
    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(zoom, zoom)

    const centerX = canvas.width / (2 * zoom) - offset.x / zoom
    const centerY = canvas.height / (2 * zoom) - offset.y / zoom

    // Calculate node positions with better spacing
    const nodePositions = new Map<string, { x: number; y: number; width: number; height: number }>()

    // Central node
    const centralNode = mindMap.nodes.find(n => n.level === 0 || n.parentId === null) || mindMap.nodes[0]
    if (centralNode) {
      nodePositions.set(centralNode.id, {
        x: centerX,
        y: centerY,
        width: 220,
        height: 70
      })
    }

    // Level 1 nodes (main branches) - increased radius for better spacing
    const level1Nodes = mindMap.nodes.filter(n => n.level === 1)
    const angleStep1 = (2 * Math.PI) / Math.max(level1Nodes.length, 4)
    const radius1 = 300 // Increased from 250

    level1Nodes.forEach((node, index) => {
      const angle = angleStep1 * index - Math.PI / 2
      const x = centerX + radius1 * Math.cos(angle)
      const y = centerY + radius1 * Math.sin(angle)
      nodePositions.set(node.id, { x, y, width: 190, height: 55 })
    })

    // Level 2 nodes (sub-branches) - better distribution
    mindMap.nodes.filter(n => n.level === 2).forEach(node => {
      const parent = nodePositions.get(node.parentId!)
      if (parent) {
        const siblings = mindMap.nodes.filter(n => n.parentId === node.parentId && n.level === 2)
        const siblingIndex = siblings.findIndex(s => s.id === node.id)
        const siblingCount = siblings.length

        const parentAngle = Math.atan2(parent.y - centerY, parent.x - centerX)

        // Wider spread angle based on sibling count
        const baseSpread = Math.PI / 3 // 60 degrees base
        const spreadAngle = Math.min(baseSpread + (siblingCount - 1) * 0.15, Math.PI * 0.8) // Max 144 degrees
        const startAngle = parentAngle - spreadAngle / 2
        const angleIncrement = siblingCount > 1 ? spreadAngle / (siblingCount - 1) : 0
        const angle = startAngle + angleIncrement * siblingIndex

        // Dynamic radius based on sibling count
        const radius2 = 180 + (siblingCount > 3 ? 20 : 0)
        const x = parent.x + radius2 * Math.cos(angle)
        const y = parent.y + radius2 * Math.sin(angle)

        nodePositions.set(node.id, { x, y, width: 160, height: 45 })
      }
    })

    // Level 3 nodes (if any) - even more spread
    mindMap.nodes.filter(n => n.level === 3).forEach(node => {
      const parent = nodePositions.get(node.parentId!)
      if (parent) {
        const siblings = mindMap.nodes.filter(n => n.parentId === node.parentId && n.level === 3)
        const siblingIndex = siblings.findIndex(s => s.id === node.id)
        const siblingCount = siblings.length

        const grandparent = mindMap.nodes.find(n => n.id === node.parentId)
        const grandparentPos = grandparent?.parentId ? nodePositions.get(grandparent.parentId) : null

        let parentAngle = Math.atan2(parent.y - centerY, parent.x - centerX)
        if (grandparentPos) {
          parentAngle = Math.atan2(parent.y - grandparentPos.y, parent.x - grandparentPos.x)
        }

        const spreadAngle = Math.PI / 2.5
        const startAngle = parentAngle - spreadAngle / 2
        const angleIncrement = siblingCount > 1 ? spreadAngle / (siblingCount - 1) : 0
        const angle = startAngle + angleIncrement * siblingIndex

        const radius3 = 130
        const x = parent.x + radius3 * Math.cos(angle)
        const y = parent.y + radius3 * Math.sin(angle)

        nodePositions.set(node.id, { x, y, width: 140, height: 40 })
      }
    })

    // Draw connections first (behind nodes)
    ctx.lineWidth = 2
    mindMap.nodes.forEach(node => {
      if (node.parentId) {
        const child = nodePositions.get(node.id)
        const parent = nodePositions.get(node.parentId)

        if (child && parent) {
          const isHighlighted = hoveredNode === node.id || hoveredNode === node.parentId ||
            selectedNode === node.id || selectedNode === node.parentId
          const isSelected = selectedNode === node.id || selectedNode === node.parentId

          ctx.strokeStyle = isHighlighted ? (isSelected ? '#0d9488' : '#14b8a6') : '#d0d0d0'
          ctx.lineWidth = isHighlighted ? (isSelected ? 5 : 4) : 2.5

          ctx.beginPath()
          ctx.moveTo(parent.x, parent.y)

          // Smooth curved line
          const midX = (parent.x + child.x) / 2
          const midY = (parent.y + child.y) / 2
          const controlOffset = 30
          const dx = child.x - parent.x
          const dy = child.y - parent.y
          const angle = Math.atan2(dy, dx)
          const perpAngle = angle + Math.PI / 2

          const controlX = midX + Math.cos(perpAngle) * controlOffset
          const controlY = midY + Math.sin(perpAngle) * controlOffset

          ctx.quadraticCurveTo(controlX, controlY, child.x, child.y)
          ctx.stroke()

          // Draw arrow at child end if highlighted
          if (isHighlighted) {
            const arrowSize = 8
            ctx.fillStyle = '#0d9488'
            ctx.beginPath()
            const endAngle = Math.atan2(child.y - controlY, child.x - controlX)
            ctx.moveTo(child.x, child.y)
            ctx.lineTo(
              child.x - arrowSize * Math.cos(endAngle - Math.PI / 6),
              child.y - arrowSize * Math.sin(endAngle - Math.PI / 6)
            )
            ctx.lineTo(
              child.x - arrowSize * Math.cos(endAngle + Math.PI / 6),
              child.y - arrowSize * Math.sin(endAngle + Math.PI / 6)
            )
            ctx.closePath()
            ctx.fill()
          }
        }
      }
    })

    // Draw nodes with improved styling
    ctx.font = 'bold 14px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Sort nodes by level to draw central node last (on top)
    const sortedNodes = [...mindMap.nodes].sort((a, b) => {
      if ((a.level === 0 || !a.parentId) && (b.level !== 0 && b.parentId)) return 1
      if ((b.level === 0 || !b.parentId) && (a.level !== 0 && a.parentId)) return -1
      return (b.level || 0) - (a.level || 0)
    })

    sortedNodes.forEach(node => {
      const pos = nodePositions.get(node.id)
      if (!pos) return

      const isHovered = hoveredNode === node.id
      const isSelected = selectedNode === node.id
      const isCentral = node.level === 0 || node.parentId === null
      const isConnected = (hoveredNode && mindMap.nodes.some(n =>
        (n.id === hoveredNode && n.parentId === node.id) ||
        (n.parentId === hoveredNode && n.id === node.id)
      )) || (selectedNode && mindMap.nodes.some(n =>
        (n.id === selectedNode && n.parentId === node.id) ||
        (n.parentId === selectedNode && n.id === node.id)
      ))

      // Enhanced shadow for depth
      if (isHovered || isCentral || isSelected) {
        ctx.shadowColor = isSelected ? 'rgba(13, 148, 136, 0.5)' :
          isHovered ? 'rgba(13, 148, 136, 0.4)' : 'rgba(0, 0, 0, 0.15)'
        ctx.shadowBlur = isSelected ? 30 : isHovered ? 25 : 15
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = isSelected ? 8 : isHovered ? 6 : 4
      }

      // Node background with gradient effect
      const gradient = ctx.createLinearGradient(
        pos.x - pos.width / 2,
        pos.y - pos.height / 2,
        pos.x + pos.width / 2,
        pos.y + pos.height / 2
      )

      if (isSelected) {
        gradient.addColorStop(0, node.color)
        gradient.addColorStop(1, node.color)
      } else if (isHovered) {
        gradient.addColorStop(0, node.color)
        gradient.addColorStop(1, node.color + 'cc')
      } else if (isConnected) {
        gradient.addColorStop(0, node.color + 'dd')
        gradient.addColorStop(1, node.color + 'aa')
      } else {
        gradient.addColorStop(0, node.color + 'dd')
        gradient.addColorStop(1, node.color + 'bb')
      }

      ctx.fillStyle = gradient

      const borderRadius = isCentral ? 35 : 20
      roundRect(ctx, pos.x - pos.width / 2, pos.y - pos.height / 2, pos.width, pos.height, borderRadius)
      ctx.fill()

      // Reset shadow
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      // Draw border with glow effect
      if (isSelected) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 4
        ctx.stroke()

        // Outer glow - stronger for selected
        ctx.strokeStyle = node.color + '60'
        ctx.lineWidth = 8
        ctx.stroke()
      } else if (isHovered || isConnected) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.stroke()

        // Outer glow
        ctx.strokeStyle = node.color + '40'
        ctx.lineWidth = 6
        ctx.stroke()
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Draw text with better wrapping
      ctx.fillStyle = '#ffffff'
      ctx.font = isCentral ? 'bold 17px Inter' : node.level === 1 ? 'bold 14px Inter' : '13px Inter'

      const words = node.label.split(' ')
      const lines: string[] = []
      let currentLine = ''
      const maxWidth = pos.width - 30

      words.forEach(word => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      })
      if (currentLine) lines.push(currentLine)

      // Limit to 3 lines max
      const displayLines = lines.slice(0, 3)
      if (lines.length > 3) {
        displayLines[2] = displayLines[2].substring(0, 15) + '...'
      }

      const lineHeight = isCentral ? 22 : node.level === 1 ? 19 : 17
      const totalHeight = displayLines.length * lineHeight
      let textY = pos.y - totalHeight / 2 + lineHeight / 2

      displayLines.forEach(line => {
        ctx.fillText(line, pos.x, textY)
        textY += lineHeight
      })

      // Draw level indicator for hovered nodes
      if (isHovered && !isCentral) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.font = '10px Inter'
        ctx.fillText(`Level ${node.level}`, pos.x, pos.y + pos.height / 2 - 8)
      }
    })

    ctx.restore()
  }

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (hoveredNode) {
      // Click on node - select it
      setSelectedNode(hoveredNode === selectedNode ? null : hoveredNode)
    } else {
      // Start dragging
      setIsDragging(true)
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    } else {
      // Check for node hover
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = (e.clientX - rect.left - offset.x) / zoom
      const mouseY = (e.clientY - rect.top - offset.y) / zoom

      let foundNode: string | null = null

      // Check each node for hover
      const centerX = canvas.width / (2 * zoom) - offset.x / zoom
      const centerY = canvas.height / (2 * zoom) - offset.y / zoom

      mindMap.nodes.forEach(node => {
        let x = centerX, y = centerY, width = 220, height = 70

        if (node.level === 1) {
          const level1Nodes = mindMap.nodes.filter(n => n.level === 1)
          const index = level1Nodes.findIndex(n => n.id === node.id)
          const angleStep = (2 * Math.PI) / Math.max(level1Nodes.length, 4)
          const angle = angleStep * index - Math.PI / 2
          const radius1 = 300
          x = centerX + radius1 * Math.cos(angle)
          y = centerY + radius1 * Math.sin(angle)
          width = 190
          height = 55
        } else if (node.level === 2 && node.parentId) {
          const parentNode = mindMap.nodes.find(n => n.id === node.parentId)
          if (parentNode && parentNode.level === 1) {
            const level1Nodes = mindMap.nodes.filter(n => n.level === 1)
            const parentIndex = level1Nodes.findIndex(n => n.id === parentNode.id)
            const angleStep = (2 * Math.PI) / Math.max(level1Nodes.length, 4)
            const parentAngle = angleStep * parentIndex - Math.PI / 2
            const radius1 = 300
            const parentX = centerX + radius1 * Math.cos(parentAngle)
            const parentY = centerY + radius1 * Math.sin(parentAngle)

            const siblings = mindMap.nodes.filter(n => n.parentId === node.parentId && n.level === 2)
            const siblingIndex = siblings.findIndex(s => s.id === node.id)
            const siblingCount = siblings.length

            const baseSpread = Math.PI / 3
            const spreadAngle = Math.min(baseSpread + (siblingCount - 1) * 0.15, Math.PI * 0.8)
            const startAngle = parentAngle - spreadAngle / 2
            const angleIncrement = siblingCount > 1 ? spreadAngle / (siblingCount - 1) : 0
            const angle = startAngle + angleIncrement * siblingIndex
            const radius2 = 180 + (siblingCount > 3 ? 20 : 0)

            x = parentX + radius2 * Math.cos(angle)
            y = parentY + radius2 * Math.sin(angle)
            width = 160
            height = 45
          }
        } else if (node.level === 3 && node.parentId) {
          const parentNode = mindMap.nodes.find(n => n.id === node.parentId)
          if (parentNode) {
            // Calculate level 2 parent position first
            let parentX = centerX, parentY = centerY
            if (parentNode.level === 2 && parentNode.parentId) {
              const grandparent = mindMap.nodes.find(n => n.id === parentNode.parentId)
              if (grandparent && grandparent.level === 1) {
                const level1Nodes = mindMap.nodes.filter(n => n.level === 1)
                const grandparentIndex = level1Nodes.findIndex(n => n.id === grandparent.id)
                const angleStep = (2 * Math.PI) / Math.max(level1Nodes.length, 4)
                const grandparentAngle = angleStep * grandparentIndex - Math.PI / 2
                const radius1 = 300
                const grandparentX = centerX + radius1 * Math.cos(grandparentAngle)
                const grandparentY = centerY + radius1 * Math.sin(grandparentAngle)

                const parentSiblings = mindMap.nodes.filter(n => n.parentId === parentNode.parentId && n.level === 2)
                const parentSiblingIndex = parentSiblings.findIndex(s => s.id === parentNode.id)
                const parentSiblingCount = parentSiblings.length

                const baseSpread = Math.PI / 3
                const spreadAngle = Math.min(baseSpread + (parentSiblingCount - 1) * 0.15, Math.PI * 0.8)
                const startAngle = grandparentAngle - spreadAngle / 2
                const angleIncrement = parentSiblingCount > 1 ? spreadAngle / (parentSiblingCount - 1) : 0
                const parentAngle = startAngle + angleIncrement * parentSiblingIndex
                const radius2 = 180 + (parentSiblingCount > 3 ? 20 : 0)

                parentX = grandparentX + radius2 * Math.cos(parentAngle)
                parentY = grandparentY + radius2 * Math.sin(parentAngle)
              }
            }

            const siblings = mindMap.nodes.filter(n => n.parentId === node.parentId && n.level === 3)
            const siblingIndex = siblings.findIndex(s => s.id === node.id)
            const siblingCount = siblings.length

            const parentAngle = Math.atan2(parentY - centerY, parentX - centerX)
            const spreadAngle = Math.PI / 2.5
            const startAngle = parentAngle - spreadAngle / 2
            const angleIncrement = siblingCount > 1 ? spreadAngle / (siblingCount - 1) : 0
            const angle = startAngle + angleIncrement * siblingIndex
            const radius3 = 130

            x = parentX + radius3 * Math.cos(angle)
            y = parentY + radius3 * Math.sin(angle)
            width = 140
            height = 40
          }
        }

        // Check if mouse is within node bounds
        if (mouseX >= x - width / 2 && mouseX <= x + width / 2 &&
          mouseY >= y - height / 2 && mouseY <= y + height / 2) {
          foundNode = node.id
        }
      })

      setHoveredNode(foundNode)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(prev => Math.max(0.3, Math.min(prev + delta, 3)))
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5))
  }

  const handleReset = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4" style={{ top: '64px' }}>
      <Card className="w-full h-full max-w-7xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{mindMap.title}</h2>
            <p className="text-sm text-gray-600">
              🖱️ Drag to pan • 🔍 Scroll/buttons to zoom • 👆 Click nodes to select • 🎯 Hover to preview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[4rem] text-center font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-2">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100"
        >
          <canvas
            ref={canvasRef}
            className={`w-full h-full ${isDragging ? 'cursor-grabbing' : hoveredNode ? 'cursor-pointer' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />

          {/* Hover tooltip */}
          {hoveredNode && (
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-[#0d9488]/20 animate-in fade-in slide-in-from-left-2 duration-200">
              <p className="text-sm font-medium text-gray-900">
                {mindMap.nodes.find(n => n.id === hoveredNode)?.label}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Level {mindMap.nodes.find(n => n.id === hoveredNode)?.level || 0} • Click to select
              </p>
            </div>
          )}

          {/* Selected node info */}
          {selectedNode && (
            <div className="absolute top-4 right-4 bg-[#0d9488]/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-xl border-2 border-white/30 max-w-xs animate-in fade-in slide-in-from-right-2 duration-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">
                    {mindMap.nodes.find(n => n.id === selectedNode)?.label}
                  </p>
                  <p className="text-xs text-white/80 mt-1">
                    Level {mindMap.nodes.find(n => n.id === selectedNode)?.level || 0}
                  </p>
                  {(() => {
                    const node = mindMap.nodes.find(n => n.id === selectedNode)
                    const children = mindMap.nodes.filter(n => n.parentId === selectedNode)
                    const parent = node?.parentId ? mindMap.nodes.find(n => n.id === node.parentId) : null

                    return (
                      <div className="mt-2 space-y-1">
                        {parent && (
                          <p className="text-xs text-white/70">
                            Parent: {parent.label}
                          </p>
                        )}
                        {children.length > 0 && (
                          <p className="text-xs text-white/70">
                            {children.length} sub-topic{children.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-white/80 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#0d9488' }}></div>
                <span className="text-gray-600">Main Topics</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#14b8a6' }}></div>
                <span className="text-gray-600">Subtopics</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#2dd4bf' }}></div>
                <span className="text-gray-600">Details</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {mindMap.nodes.length} nodes • Interactive visualization
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
