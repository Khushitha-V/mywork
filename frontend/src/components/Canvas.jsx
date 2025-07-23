import React from "react";
import { Rnd } from "react-rnd";

const Canvas = ({ elements, setElements, wallpaper, wallColor }) => {
  // Ensure elements is always an array
  const safeElements = Array.isArray(elements) ? elements : [];
  // Debug log for state changes
  React.useEffect(() => {
    console.log('Canvas elements updated:', safeElements);
  }, [safeElements]);
  // Compute background style
  const backgroundStyle = wallpaper
    ? { backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: wallColor || '#fafafa' }
    : { background: wallColor || '#fafafa' };
  // Ref to track last resize time
  const lastResizeRef = React.useRef(0);
  return (
    <main>
      <div className="design-canvas" style={backgroundStyle}>
        {safeElements.map((el) => (
          <Rnd
            key={el.id}
            position={{ x: el.x, y: el.y }}
            size={{ width: el.width, height: el.height }}
            bounds="parent"
            minWidth={100}
            minHeight={100}
            dragHandleClassName="drag-handle"
            onDragStop={(e, d) => {
              setElements((prev) => {
                const updated = prev.map((item) => {
                  if (item.id === el.id) {
                    const x = Number(d.x);
                    const y = Number(d.y);
                    const safeX = isNaN(x) ? item.x : x;
                    const safeY = isNaN(y) ? item.y : y;
                    console.log('Dragging', { id: el.id, x: safeX, y: safeY });
                    return { ...item, x: safeX, y: safeY };
                  }
                  return item;
                });
                console.log('After drag, elements:', updated);
                return updated;
              });
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
              lastResizeRef.current = Date.now();
              setElements((prev) => {
                const updated = prev.map((item) => {
                  if (item.id === el.id) {
                    const width = Number(ref.style.width);
                    const height = Number(ref.style.height);
                    const x = Number(position.x);
                    const y = Number(position.y);
                    let safeWidth = isNaN(width) ? item.width : width;
                    let safeHeight = isNaN(height) ? item.height : height;
                    const safeX = isNaN(x) ? item.x : x;
                    const safeY = isNaN(y) ? item.y : y;
                    // Minimum size check
                    if (safeWidth < 20) {
                      console.warn('Width too small, reverting to previous value', { width, safeWidth, prev: item.width });
                      safeWidth = item.width;
                    }
                    if (safeHeight < 20) {
                      console.warn('Height too small, reverting to previous value', { height, safeHeight, prev: item.height });
                      safeHeight = item.height;
                    }
                    console.log('Resizing', { id: el.id, width: safeWidth, height: safeHeight, x: safeX, y: safeY });
                    return {
                      ...item,
                      width: safeWidth,
                      height: safeHeight,
                      x: safeX,
                      y: safeY,
                    };
                  }
                  return item;
                });
                console.log('After resize, elements:', updated);
                return updated;
              });
            }}
          >
            <div className="design-element drag-handle" style={{ position: 'relative', width: '100%', height: '100%' }}>
              {/* Delete button */}
              <button
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  zIndex: 10,
                  background: 'rgba(255,255,255,0.8)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: '#d00',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                }}
                title="Delete"
                aria-label="Delete element"
                onClick={(e) => {
                  e.stopPropagation();
                  // Prevent accidental delete if clicked within 300ms of resize
                  if (Date.now() - lastResizeRef.current < 300) {
                    console.warn('Delete ignored: too soon after resize');
                    return;
                  }
                  setElements((prev) => {
                    const updated = prev.filter(item => item.id !== el.id);
                    console.log('After delete, elements:', updated);
                    return updated;
                  });
                }}
              >
                ×
              </button>
              <img
                src={el.content}
                className="element-img"
                alt=""
                style={el.type === "sticker" ? { background: "none" } : {}}
              />
            </div>
          </Rnd>
        ))}
      </div>
    </main>
  );
};

export default Canvas; 