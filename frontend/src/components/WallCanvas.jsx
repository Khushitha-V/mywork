import React, { useRef, useEffect, useState, forwardRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Frame from './Frame';

const WALL_WIDTH = 600;
const WALL_HEIGHT = 300;
const MIN_FRAME_SIZE = 40;
const RESIZE_HANDLE_SIZE = 14;

const WallCanvas = forwardRef(({ wallName, frames, setFrames, wallColor, wallpaper }, ref) => {
  const canvasRef = useRef();
  const [draggedOverFrameId, setDraggedOverFrameId] = useState(null);
  const [dragState, setDragState] = useState(null); // { type: 'move'|'resize', frameId, offsetX, offsetY, origW, origH }
  const [lastClickTime, setLastClickTime] = useState(0);
  const [selectedFrameId, setSelectedFrameId] = useState(null);

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
    // Draw background
    ctx.clearRect(0, 0, WALL_WIDTH, WALL_HEIGHT);
    if (wallpaper) {
      const img = new window.Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, WALL_WIDTH, WALL_HEIGHT);
        drawFrames(ctx);
      };
      img.src = wallpaper;
    } else if (wallColor) {
      ctx.fillStyle = wallColor;
      ctx.fillRect(0, 0, WALL_WIDTH, WALL_HEIGHT);
      drawFrames(ctx);
    } else {
      ctx.fillStyle = '#f3f4f6'; // fallback gray
      ctx.fillRect(0, 0, WALL_WIDTH, WALL_HEIGHT);
      drawFrames(ctx);
    }
    // eslint-disable-next-line
    function drawFrames(ctx) {
      // Add null check for frames
      if (!safeFrames || !Array.isArray(safeFrames)) {
        return;
      }
      
      safeFrames.forEach(frame => {
        if (frame.shape === 'sticker') {
          if (frame.image) {
            const img = new window.Image();
            img.src = frame.image;
            // Draw image and border immediately if cached
            if (img.complete) {
              ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height);
              if (frame.id === selectedFrameId) {
                ctx.save();
                ctx.strokeStyle = '#6366f1';
                ctx.lineWidth = 4;
                ctx.strokeRect(frame.x - 2, frame.y - 2, frame.width + 4, frame.height + 4);
                ctx.restore();
              }
            } else {
              img.onload = () => {
                ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height);
                if (frame.id === selectedFrameId) {
                  ctx.save();
                  ctx.strokeStyle = '#6366f1';
                  ctx.lineWidth = 4;
                  ctx.strokeRect(frame.x - 2, frame.y - 2, frame.width + 4, frame.height + 4);
                  ctx.restore();
                }
              };
            }
          } else if (frame.id === selectedFrameId) {
            // If no image, still show selection border
            ctx.save();
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 4;
            ctx.strokeRect(frame.x - 2, frame.y - 2, frame.width + 4, frame.height + 4);
            ctx.restore();
          }
          return; // Skip the rest of the frame drawing logic for stickers
        }
        // Highlight if being dragged over
        if (frame.id === draggedOverFrameId) {
          ctx.save();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 6;
          ctx.strokeRect(frame.x - 3, frame.y - 3, frame.width + 6, frame.height + 6);
          ctx.restore();
        }
        // Highlight if selected
        if (frame.id === selectedFrameId) {
          ctx.save();
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 4;
          ctx.strokeRect(frame.x - 2, frame.y - 2, frame.width + 4, frame.height + 4);
          ctx.restore();
        }
        
        // Draw the frame shape
        if (frame.shape === 'circle' || frame.shape === 'oval') {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(frame.x + frame.width / 2, frame.y + frame.height / 2, frame.width / 2, frame.height / 2, 0, 0, 2 * Math.PI);
          ctx.clip();
          if (frame.image) {
            const img = new window.Image();
            img.src = frame.image;
            const imgAspect = img.width / img.height;
            const frameAspect = frame.width / frame.height;
            let sx = 0, sy = 0, sw = img.width, sh = img.height;
            if (imgAspect > frameAspect) {
              sw = img.height * frameAspect;
              sx = (img.width - sw) / 2;
            } else {
              sh = img.width / frameAspect;
              sy = (img.height - sh) / 2;
            }
            const drawEllipseImage = () => {
              ctx.drawImage(img, sx, sy, sw, sh, frame.x, frame.y, frame.width, frame.height);
            };
            if (img.complete) {
              drawEllipseImage();
            } else {
              img.onload = drawEllipseImage;
            }
          } else {
            ctx.fillStyle = '#fff';
            ctx.fill();
          }
          ctx.restore();
          // Draw border
          ctx.save();
          ctx.strokeStyle = frame.shape === 'circle' ? '#60a5fa' : '#a78bfa';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(frame.x + frame.width / 2, frame.y + frame.height / 2, frame.width / 2, frame.height / 2, 0, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.restore();
        } else if (frame.shape === 'square') {
          ctx.save();
          if (frame.image) {
            const img = new window.Image();
            img.onload = () => {
              ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height);
            };
            img.src = frame.image;
          } else {
            ctx.fillStyle = '#fff';
            ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
          }
          ctx.restore();
          // Draw border
          ctx.save();
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 4;
          ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);
          ctx.restore();
        } else { // rectangle or fallback
          ctx.save();
          if (frame.image) {
            const img = new window.Image();
            img.onload = () => {
              ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height);
            };
            img.src = frame.image;
          } else {
            ctx.fillStyle = '#fff';
            ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
          }
          ctx.restore();
          // Draw border
          ctx.save();
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 4;
          ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);
          ctx.restore();
        }
        
        // Draw resize handles only for selected frame
        if (frame.id === selectedFrameId) {
          drawResizeHandles(ctx, frame);
        }
      });
    }
    
    function drawResizeHandles(ctx, frame) {
      const handleSize = RESIZE_HANDLE_SIZE;
      const handles = [
        // Corners
        { x: frame.x, y: frame.y, cursor: 'nw-resize' }, // Top-left
        { x: frame.x + frame.width - handleSize, y: frame.y, cursor: 'ne-resize' }, // Top-right
        { x: frame.x, y: frame.y + frame.height - handleSize, cursor: 'sw-resize' }, // Bottom-left
        { x: frame.x + frame.width - handleSize, y: frame.y + frame.height - handleSize, cursor: 'se-resize' }, // Bottom-right
        // Edges
        { x: frame.x + frame.width / 2 - handleSize / 2, y: frame.y, cursor: 'n-resize' }, // Top
        { x: frame.x + frame.width / 2 - handleSize / 2, y: frame.y + frame.height - handleSize, cursor: 's-resize' }, // Bottom
        { x: frame.x, y: frame.y + frame.height / 2 - handleSize / 2, cursor: 'w-resize' }, // Left
        { x: frame.x + frame.width - handleSize, y: frame.y + frame.height / 2 - handleSize / 2, cursor: 'e-resize' }, // Right
      ];
      
      handles.forEach(handle => {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(handle.x, handle.y, handleSize, handleSize);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    }
  }, [wallColor, wallpaper, safeFrames, draggedOverFrameId, selectedFrameId]);

  function getFrameAt(x, y) {
    if (!safeFrames || !Array.isArray(safeFrames)) return null;
    return safeFrames.find(f => x >= f.x && x <= f.x + f.width && y >= f.y && y <= f.y + f.height);
  }

  function getResizeHandleAt(x, y, onlyFrameId = null) {
    if (!safeFrames || !Array.isArray(safeFrames)) return null;
    
    for (const frame of safeFrames) {
      if (onlyFrameId && frame.id !== onlyFrameId) continue;
      
      const handleSize = RESIZE_HANDLE_SIZE;
      const handles = [
        // Corners
        { x: frame.x, y: frame.y, type: 'corner', corner: 'nw', cursor: 'nw-resize' },
        { x: frame.x + frame.width - handleSize, y: frame.y, type: 'corner', corner: 'ne', cursor: 'ne-resize' },
        { x: frame.x, y: frame.y + frame.height - handleSize, type: 'corner', corner: 'sw', cursor: 'sw-resize' },
        { x: frame.x + frame.width - handleSize, y: frame.y + frame.height - handleSize, type: 'corner', corner: 'se', cursor: 'se-resize' },
        // Edges
        { x: frame.x + frame.width / 2 - handleSize / 2, y: frame.y, type: 'edge', edge: 'n', cursor: 'n-resize' },
        { x: frame.x + frame.width / 2 - handleSize / 2, y: frame.y + frame.height - handleSize, type: 'edge', edge: 's', cursor: 's-resize' },
        { x: frame.x, y: frame.y + frame.height / 2 - handleSize / 2, type: 'edge', edge: 'w', cursor: 'w-resize' },
        { x: frame.x + frame.width - handleSize, y: frame.y + frame.height / 2 - handleSize / 2, type: 'edge', edge: 'e', cursor: 'e-resize' },
      ];
      
      for (const handle of handles) {
        if (x >= handle.x && x <= handle.x + handleSize && y >= handle.y && y <= handle.y + handleSize) {
          return { frame, handle };
        }
      }
    }
    return null;
  }

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('Mouse down at:', x, y);
    console.log('Safe frames:', safeFrames);
    console.log('Current drag state:', dragState);
    
    // Check resize handle first (only for selected frame)
    let resizeInfo = null;
    if (selectedFrameId) {
      resizeInfo = getResizeHandleAt(x, y, selectedFrameId);
    }
    if (resizeInfo) {
      console.log('Resize handle clicked');
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
    
    // Check if clicking on any frame (selected or not)
    const clickedFrame = getFrameAt(x, y);
    console.log('Clicked frame:', clickedFrame);
    
    if (clickedFrame) {
      console.log('Frame clicked, starting movement');
      // Select the frame
      setSelectedFrameId(clickedFrame.id);
      
      // Start moving the frame immediately
      const newDragState = {
        type: 'move',
        frameId: clickedFrame.id,
        offsetX: x - clickedFrame.x,
        offsetY: y - clickedFrame.y,
        origW: clickedFrame.width,
        origH: clickedFrame.height
      };
      console.log('Setting drag state:', newDragState);
      setDragState(newDragState);
      return;
    }
    
    // If not clicking on any frame, deselect
    setSelectedFrameId(null);
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update cursor
    if (!dragState) {
      const resizeInfo = getResizeHandleAt(x, y);
      if (resizeInfo) {
        canvasRef.current.style.cursor = resizeInfo.handle.cursor;
      } else if (getFrameAt(x, y)) {
        canvasRef.current.style.cursor = 'grab';
      } else {
        canvasRef.current.style.cursor = 'default';
      }
      return;
    }
    
    console.log('Mouse move with drag state:', dragState);
    console.log('Mouse position:', x, y);
    
    setFrames(prevFrames => {
      const currentFrames = Array.isArray(prevFrames) ? prevFrames : [];
      console.log('Current frames before update:', currentFrames);
      
      return currentFrames.map(f => {
        if (f.id !== dragState.frameId) return f;
        
        if (dragState.type === 'move') {
          // Clamp to wall
          let newX = Math.max(0, Math.min(x - dragState.offsetX, WALL_WIDTH - f.width));
          let newY = Math.max(0, Math.min(y - dragState.offsetY, WALL_HEIGHT - f.height));
          console.log('Moving frame to:', newX, newY);
          console.log('Frame being moved:', f);
          return { ...f, x: newX, y: newY };
        } else if (dragState.type === 'resize') {
          const handle = dragState.handle;
          let newX = dragState.origX;
          let newY = dragState.origY;
          let newW = dragState.origW;
          let newH = dragState.origH;
          const dx = x - dragState.startX;
          const dy = y - dragState.startY;
          // Corners
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
          console.log('Resizing:', { newX, newY, newW, newH });
          return { ...f, x: newX, y: newY, width: newW, height: newH };
        }
        return f;
      });
    });
  };

  const handleMouseUp = (e) => {
    setDragState(null);
    // Reset cursor
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
    
    // Ensure frames is an array
    const currentFrames = Array.isArray(frames) ? frames : [];
    
    // Check for sticker image drop
    const stickerImageUrl = e.dataTransfer.getData('sticker-image-url');
    if (stickerImageUrl) {
      setFrames([
        ...currentFrames,
        {
          id: Date.now() + Math.random(),
          x: Math.max(0, Math.min(x - 60, WALL_WIDTH - 120)),
          y: Math.max(0, Math.min(y - 60, WALL_HEIGHT - 120)),
          width: 120,
          height: 120,
          image: stickerImageUrl,
          shape: 'sticker',
        },
      ]);
      return;
    }
    // Check for managed image drop
    const managedImageUrl = e.dataTransfer.getData('managed-image-url');
    if (managedImageUrl) {
      const frame = getFrameAt(x, y);
      if (frame && frame.shape !== 'sticker') { // Only allow replacing if not a sticker
        setFrames(currentFrames.map(f => f.id === frame.id ? { ...f, image: managedImageUrl } : f));
      }
      return;
    }
    // Otherwise, handle frame drop as before
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
    setFrames([
      ...currentFrames,
      {
        id: Date.now() + Math.random(),
        x: Math.max(0, Math.min(x - width / 2, WALL_WIDTH - width)),
        y: Math.max(0, Math.min(y - height / 2, WALL_HEIGHT - height)),
        width,
        height,
        image: null,
        style: frameType,
        shape,
      },
    ]);
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

  // Add image frame
  const handleAddFrame = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const currentFrames = Array.isArray(frames) ? frames : [];
    setFrames([
      ...currentFrames,
      {
        id: Date.now() + Math.random(),
        x: 50,
        y: 50,
        width: 120,
        height: 120,
        image: url,
      },
    ]);
    e.target.value = '';
  };

  const handleUpdateFrame = (id, newProps) => {
    const currentFrames = Array.isArray(frames) ? frames : [];
    setFrames(currentFrames.map(f => f.id === id ? { ...f, ...newProps } : f));
  };

  let lastDeleteTime = 0;

  const handleDeleteFrame = (id) => {
    const now = Date.now();
    if (now - lastDeleteTime < 500) {
      // Ignore rapid repeated delete attempts
      return;
    }
    lastDeleteTime = now;
    console.log('handleDeleteFrame called for id:', id);
    const currentFrames = Array.isArray(frames) ? frames : [];
    setFrames(currentFrames.filter(f => f.id !== id));
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
        onMouseLeave={handleMouseUp}
      />
      {/* Delete button is only shown on hover of the selected frame/sticker. Deletion is only possible via this button. Double-click/tap does NOT delete. */}
      {Array.isArray(safeFrames) && selectedFrameId && (() => {
        const frame = safeFrames.find(f => f.id === selectedFrameId);
        if (!frame) return null;
        return (
          <div
            className="frame-container"
            style={{
              position: 'absolute',
              left: `${frame.x}px`,
              top: `${frame.y}px`,
              width: `${frame.width}px`,
              height: `${frame.height}px`,
              pointerEvents: 'none',
            }}
            onDoubleClick={e => e.stopPropagation()} // Prevent double-click from bubbling
          >
            <button
              className="delete-btn-on-hover"
              style={{
                position: 'absolute',
                right: '-8px',
                top: '-8px',
                width: '24px',
                height: '24px',
                background: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                border: 'none',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                zIndex: 20,
                pointerEvents: 'auto',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                cursor: 'pointer'
              }}
              title="Delete frame"
              onClick={e => {
                e.stopPropagation();
                handleDeleteFrame(frame.id);
              }}
              onDoubleClick={e => e.stopPropagation()} // Prevent double-click from bubbling
            >
              ×
            </button>
          </div>
        );
      })()}
      <style>{`
        .frame-container:hover .delete-btn-on-hover { 
          display: flex !important; 
        }
      `}</style>
    </div>
  );
});

export default WallCanvas; 