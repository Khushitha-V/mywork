import React, { useRef, useEffect, useState, forwardRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

const WALL_WIDTH = 600;
const WALL_HEIGHT = 300;
const MIN_FRAME_SIZE = 40;
const RESIZE_HANDLE_SIZE = 12;

const WallCanvas = forwardRef(({ wallName, frames, setFrames, wallColor, wallpaper, selectedFrameId, onSelectedFrameChange, lockOtherFrames }, ref) => {
  const canvasRef = useRef();
  const [draggedOverFrameId, setDraggedOverFrameId] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [hoveredFrameId, setHoveredFrameId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Ensure frames is always an array
  const safeFrames = Array.isArray(frames) ? frames : [];

  // Expose the canvas to parent via ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(canvasRef.current);
      } else {
        ref.current = canvasRef.current;
      }
    }
  }, [ref]);

  // Draw wall background and frames
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, WALL_WIDTH, WALL_HEIGHT);
    
    // Draw background
    if (wallpaper) {
      const img = new window.Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, WALL_WIDTH, WALL_HEIGHT);
        drawFrames(ctx);
      };
      img.onerror = () => {
        drawFallbackBackground(ctx);
        drawFrames(ctx);
      };
      img.src = wallpaper;
    } else if (wallColor) {
      ctx.fillStyle = wallColor;
      ctx.fillRect(0, 0, WALL_WIDTH, WALL_HEIGHT);
      drawFrames(ctx);
    } else {
      drawFallbackBackground(ctx);
      drawFrames(ctx);
    }

    function drawFallbackBackground(ctx) {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, WALL_WIDTH, WALL_HEIGHT);
    }

    function drawFrames(ctx) {
      if (!safeFrames || !Array.isArray(safeFrames)) return;
      
      safeFrames.forEach(frame => {
        // Save context for each frame
        ctx.save();
        
        // Highlight if being dragged over
        if (frame.id === draggedOverFrameId) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 6;
          ctx.strokeRect(frame.x - 3, frame.y - 3, frame.width + 6, frame.height + 6);
        }
        
        // Highlight if selected
        if (frame.id === selectedFrameId) {
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 4;
          ctx.strokeRect(frame.x - 2, frame.y - 2, frame.width + 4, frame.height + 4);
        }
        
        // Draw frame based on shape
        if (frame.shape === 'sticker') {
          drawSticker(ctx, frame);
        } else if (frame.shape === 'circle' || frame.shape === 'oval') {
          drawEllipseFrame(ctx, frame);
        } else {
          drawRectangularFrame(ctx, frame);
        }
        
        ctx.restore();
      });
    }

    function drawSticker(ctx, frame) {
      if (frame.image) {
        const img = new window.Image();
        img.onload = () => {
          ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height);
        };
        img.onerror = () => {
          // Draw placeholder for broken sticker
          ctx.fillStyle = '#e5e7eb';
          ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
          ctx.fillStyle = '#6b7280';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Sticker', frame.x + frame.width/2, frame.y + frame.height/2);
        };
        img.src = frame.image;
      }
    }

    function drawEllipseFrame(ctx, frame) {
      ctx.beginPath();
      ctx.ellipse(
        frame.x + frame.width / 2, 
        frame.y + frame.height / 2, 
        frame.width / 2, 
        frame.height / 2, 
        0, 0, 2 * Math.PI
      );
      ctx.clip();
      
      if (frame.image) {
        const img = new window.Image();
        img.onload = () => {
          ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height);
        };
        img.src = frame.image;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      
      // Draw border
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = frame.shape === 'circle' ? '#60a5fa' : '#a78bfa';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(
        frame.x + frame.width / 2, 
        frame.y + frame.height / 2, 
        frame.width / 2, 
        frame.height / 2, 
        0, 0, 2 * Math.PI
      );
      ctx.stroke();
    }

    function drawRectangularFrame(ctx, frame) {
      if (frame.image) {
        const img = new window.Image();
        img.onload = () => {
          ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height);
        };
        img.src = frame.image;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
      }
      
      // Draw border
      const borderColor = frame.shape === 'square' ? '#34d399' : '#60a5fa';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);
    }
  }, [wallColor, wallpaper, safeFrames, draggedOverFrameId, selectedFrameId]);

  function getFrameAt(x, y) {
    if (!safeFrames || !Array.isArray(safeFrames)) return null;
    // Check from top to bottom (last drawn = on top)
    for (let i = safeFrames.length - 1; i >= 0; i--) {
      const frame = safeFrames[i];
      if (x >= frame.x && x <= frame.x + frame.width && 
          y >= frame.y && y <= frame.y + frame.height) {
        return frame;
      }
    }
    return null;
  }

  function getResizeHandleAt(x, y, frameId) {
    if (!safeFrames || !Array.isArray(safeFrames)) return null;
    
    const frame = safeFrames.find(f => f.id === frameId);
    if (!frame) return null;
    
    const handleSize = RESIZE_HANDLE_SIZE;
    const handles = [
      // Corners
      { x: frame.x + frame.width - handleSize, y: frame.y + frame.height - handleSize, type: 'corner', corner: 'se', cursor: 'se-resize' },
      { x: frame.x, y: frame.y, type: 'corner', corner: 'nw', cursor: 'nw-resize' },
      { x: frame.x + frame.width - handleSize, y: frame.y, type: 'corner', corner: 'ne', cursor: 'ne-resize' },
      { x: frame.x, y: frame.y + frame.height - handleSize, type: 'corner', corner: 'sw', cursor: 'sw-resize' },
      // Edges
      { x: frame.x + frame.width / 2 - handleSize / 2, y: frame.y, type: 'edge', edge: 'n', cursor: 'n-resize' },
      { x: frame.x + frame.width / 2 - handleSize / 2, y: frame.y + frame.height - handleSize, type: 'edge', edge: 's', cursor: 's-resize' },
      { x: frame.x, y: frame.y + frame.height / 2 - handleSize / 2, type: 'edge', edge: 'w', cursor: 'w-resize' },
      { x: frame.x + frame.width - handleSize, y: frame.y + frame.height / 2 - handleSize / 2, type: 'edge', edge: 'e', cursor: 'e-resize' },
    ];
    
    for (const handle of handles) {
      if (x >= handle.x && x <= handle.x + handleSize && 
          y >= handle.y && y <= handle.y + handleSize) {
        return { frame, handle };
      }
    }
    return null;
  }

  const handleMouseDown = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(false);
    
    // Check resize handle first (only for selected frame)
    if (selectedFrameId) {
      const resizeInfo = getResizeHandleAt(x, y, selectedFrameId);
      if (resizeInfo) {
        setDragState({
          type: 'resize',
          frameId: resizeInfo.frame.id,
          startX: x,
          startY: y,
          origW: resizeInfo.frame.width,
          origH: resizeInfo.frame.height,
          origX: resizeInfo.frame.x,
          origY: resizeInfo.frame.y,
          handle: resizeInfo.handle
        });
        return;
      }
    }
    
    // Check if clicking on any frame
    const clickedFrame = getFrameAt(x, y);
    
    // If lockOtherFrames is true, only allow selecting the selected frame
    if (lockOtherFrames && clickedFrame && clickedFrame.id !== selectedFrameId) {
      return;
    }
    
    if (clickedFrame) {
      // Select the frame
      if (onSelectedFrameChange) {
        onSelectedFrameChange(clickedFrame.id);
      }
      
      // Start moving the frame
      setDragState({
        type: 'move',
        frameId: clickedFrame.id,
        offsetX: x - clickedFrame.x,
        offsetY: y - clickedFrame.y,
        startX: x,
        startY: y
        startX: x,
        startY: y
      });
      return;
    }
    
    // If not clicking on any frame, deselect
    if (onSelectedFrameChange) {
      onSelectedFrameChange(null);
    }
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update cursor and hovered frame
    if (!dragState) {
      if (selectedFrameId) {
        const resizeInfo = getResizeHandleAt(x, y, selectedFrameId);
        if (resizeInfo) {
          canvasRef.current.style.cursor = resizeInfo.handle.cursor;
          setHoveredFrameId(null);
          return;
        }
      }
      
      const frame = getFrameAt(x, y);
      if (frame) {
        canvasRef.current.style.cursor = 'move';
        setHoveredFrameId(frame.id);
      } else {
        canvasRef.current.style.cursor = 'default';
        setHoveredFrameId(null);
      }
      return;
    }
    
    // Check if we've moved enough to consider it a drag
    if (!isDragging && dragState) {
      const deltaX = Math.abs(x - dragState.startX);
      const deltaY = Math.abs(y - dragState.startY);
      if (deltaX > 3 || deltaY > 3) {
        setIsDragging(true);
      }
    }
    
    if (!isDragging) return;
    
    setFrames(prevFrames => {
      const currentFrames = Array.isArray(prevFrames) ? prevFrames : [];
      
      return currentFrames.map(f => {
        if (f.id !== dragState.frameId) return f;
        
        if (dragState.type === 'move') {
          // Calculate new position
          let newX = Math.max(0, Math.min(x - dragState.offsetX, WALL_WIDTH - f.width));
          let newY = Math.max(0, Math.min(y - dragState.offsetY, WALL_HEIGHT - f.height));
          
          return { ...f, x: newX, y: newY };
        } else if (dragState.type === 'resize') {
          const handle = dragState.handle;
          let newX = dragState.origX;
          let newY = dragState.origY;
          let newW = dragState.origW;
          let newH = dragState.origH;
          const dx = x - dragState.startX;
          const dy = y - dragState.startY;
          
          // Handle resize based on corner/edge
          if (handle.type === 'corner') {
            switch (handle.corner) {
              case 'nw':
                newX = dragState.origX + dx;
                newY = dragState.origY + dy;
                newW = dragState.origW - dx;
                newH = dragState.origH - dy;
                break;
              case 'ne':
                newY = dragState.origY + dy;
                newW = dragState.origW + dx;
                newH = dragState.origH - dy;
                break;
              case 'sw':
                newX = dragState.origX + dx;
                newW = dragState.origW - dx;
                newH = dragState.origH + dy;
                break;
              case 'se':
                newW = dragState.origW + dx;
                newH = dragState.origH + dy;
                break;
            }
          } else if (handle.type === 'edge') {
            switch (handle.edge) {
              case 'n':
                newY = dragState.origY + dy;
                newH = dragState.origH - dy;
                break;
              case 's':
                newH = dragState.origH + dy;
                break;
              case 'w':
                newX = dragState.origX + dx;
                newW = dragState.origW - dx;
                break;
              case 'e':
                newW = dragState.origW + dx;
                break;
            }
          }
          
          // Enforce minimum size
          newW = Math.max(MIN_FRAME_SIZE, newW);
          newH = Math.max(MIN_FRAME_SIZE, newH);
          
          // Clamp position so frame stays in canvas
          newX = Math.max(0, Math.min(newX, WALL_WIDTH - newW));
          newY = Math.max(0, Math.min(newY, WALL_HEIGHT - newH));
          
          return { ...f, x: newX, y: newY, width: newW, height: newH };
        }
        return f;
      });
    });
  };

  const handleMouseUp = (e) => {
    setDragState(null);
    setIsDragging(false);
    
    // Reset cursor
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  };

  const handleMouseLeave = (e) => {
    setHoveredFrameId(null);
    setDragState(null);
    setIsDragging(false);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  };

  // Drag and drop support for frames and images
  const handleDrop = (e) => {
    e.preventDefault();
    setDraggedOverFrameId(null);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const currentFrames = Array.isArray(frames) ? frames : [];
    
    // Check for sticker image drop
    const stickerImageUrl = e.dataTransfer.getData('sticker-image-url');
    if (stickerImageUrl) {
      const newSticker = {
        id: uuidv4(),
        x: Math.max(0, Math.min(x - 60, WALL_WIDTH - 120)),
        y: Math.max(0, Math.min(y - 60, WALL_HEIGHT - 120)),
        width: 120,
        height: 120,
        image: stickerImageUrl,
        shape: 'sticker',
      };
      setFrames([...currentFrames, newSticker]);
      if (onSelectedFrameChange) {
        onSelectedFrameChange(newSticker.id);
      }
      return;
    }
    
    // Check for managed image drop
    const managedImageUrl = e.dataTransfer.getData('managed-image-url');
    if (managedImageUrl) {
      const frame = getFrameAt(x, y);
      if (frame && frame.shape !== 'sticker') {
        setFrames(currentFrames.map(f => f.id === frame.id ? { ...f, image: managedImageUrl } : f));
      }
      return;
    }
    
    // Handle frame drop
    const frameType = e.dataTransfer.getData('frameType');
    if (!frameType) return;
    
    let shape = 'rectangle';
    let width = 120, height = 120;
    
    if (frameType === 'square') {
      shape = 'square'; width = 100; height = 100;
    } else if (frameType === 'circle') {
      shape = 'circle'; width = 100; height = 100;
    } else if (frameType === 'oval') {
      shape = 'oval'; width = 140; height = 80;
    } else if (frameType === 'rectangle') {
      shape = 'rectangle'; width = 140; height = 90;
    }
    
    const newFrame = {
      id: uuidv4(),
      x: Math.max(0, Math.min(x - width / 2, WALL_WIDTH - width)),
      y: Math.max(0, Math.min(y - height / 2, WALL_HEIGHT - height)),
      width,
      height,
      image: null,
      style: frameType,
      shape,
    };
    
    setFrames([...currentFrames, newFrame]);
    if (onSelectedFrameChange) {
      onSelectedFrameChange(newFrame.id);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const managedImageUrl = e.dataTransfer.getData('managed-image-url');
    if (managedImageUrl) {
      const frame = getFrameAt(x, y);
      setDraggedOverFrameId(frame ? frame.id : null);
    } else {
      setDraggedOverFrameId(null);
    }
  };

  const handleDragLeave = (e) => {
    setDraggedOverFrameId(null);
  };

  const handleDeleteFrame = (frameId) => {
    const currentFrames = Array.isArray(frames) ? frames : [];
    setFrames(currentFrames.filter(f => f.id !== frameId));
    if (selectedFrameId === frameId && onSelectedFrameChange) {
      onSelectedFrameChange(null);
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={WALL_WIDTH}
        height={WALL_HEIGHT}
        className="border-2 border-dashed border-blue-400 rounded-xl bg-white"
        style={{ 
          width: WALL_WIDTH, 
          height: WALL_HEIGHT, 
          cursor: dragState ? 'grabbing' : 'default' 
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Resize handles for selected frame */}
      {selectedFrameId && (() => {
        const frame = safeFrames.find(f => f.id === selectedFrameId);
        if (!frame) return null;
        
        const handleSize = RESIZE_HANDLE_SIZE;
        const handles = [
          { x: frame.x + frame.width - handleSize, y: frame.y + frame.height - handleSize, cursor: 'se-resize' },
          { x: frame.x, y: frame.y, cursor: 'nw-resize' },
          { x: frame.x + frame.width - handleSize, y: frame.y, cursor: 'ne-resize' },
          { x: frame.x, y: frame.y + frame.height - handleSize, cursor: 'sw-resize' },
          { x: frame.x + frame.width / 2 - handleSize / 2, y: frame.y, cursor: 'n-resize' },
          { x: frame.x + frame.width / 2 - handleSize / 2, y: frame.y + frame.height - handleSize, cursor: 's-resize' },
          { x: frame.x, y: frame.y + frame.height / 2 - handleSize / 2, cursor: 'w-resize' },
          { x: frame.x + frame.width - handleSize, y: frame.y + frame.height / 2 - handleSize / 2, cursor: 'e-resize' },
        ];
        
        return (
          <div className="absolute pointer-events-none" style={{ left: 0, top: 0 }}>
            {handles.map((handle, index) => (
              <div
                key={index}
                className="absolute bg-blue-500 border-2 border-white rounded-sm pointer-events-auto"
                style={{
                  left: `${handle.x}px`,
                  top: `${handle.y}px`,
                  width: `${handleSize}px`,
                  height: `${handleSize}px`,
                  cursor: handle.cursor,
                  zIndex: 10
                }}
              />
            ))}
          </div>
        );
      })()}
      
      {/* Delete button for hovered/selected frames */}
      {(hoveredFrameId || selectedFrameId) && (() => {
        const frameId = hoveredFrameId || selectedFrameId;
        const frame = safeFrames.find(f => f.id === frameId);
        if (!frame) return null;
        
        return (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${frame.x + frame.width - 12}px`,
              top: `${frame.y - 12}px`,
              zIndex: 20
            }}
          >
            <button
              className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg pointer-events-auto transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to delete this item?')) {
                  handleDeleteFrame(frameId);
                }
              }}
              title="Delete"
            >
              ×
            </button>
          </div>
        );
      })()}
    </div>
  );
});

export default WallCanvas;