import React, { useRef, useEffect, useState, forwardRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as fabric from 'fabric';

const WALL_WIDTH = 600;
const WALL_HEIGHT = 300;
const MIN_FRAME_SIZE = 40;

const WallCanvas = forwardRef(({ wallName, frames, setFrames, wallColor, wallpaper, selectedFrameId, onSelectedFrameChange, lockOtherFrames }, ref) => {
  const canvasRef = useRef();
  const fabricCanvasRef = useRef();
  const [initialized, setInitialized] = useState(false);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || initialized) return;

    try {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: WALL_WIDTH,
        height: WALL_HEIGHT,
        preserveObjectStacking: true,
        selection: !lockOtherFrames,
      });

      fabricCanvasRef.current = canvas;

      // Set up event listeners
      canvas.on('selection:created', handleSelection);
      canvas.on('selection:cleared', handleSelectionCleared);
      canvas.on('object:modified', handleObjectModified);
      canvas.on('object:moving', handleObjectMoving);

      // Set up keyboard event listeners
      window.addEventListener('keydown', handleKeyDown);

      setInitialized(true);

      // Cleanup
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (canvas) {
          canvas.dispose();
        }
      };
    } catch (error) {
      console.error('Error initializing Fabric canvas:', error);
    }
  }, []);

  // Update background when wallColor or wallpaper changes
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

        try {
      if (wallpaper) {
        fabric.Image.fromURL(wallpaper, (img) => {
          img.scaleToWidth(WALL_WIDTH);
          img.scaleToHeight(WALL_HEIGHT);
          canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        }, { crossOrigin: 'anonymous' });
      } else {
        canvas.backgroundColor = wallColor || '#f3f4f6';
        canvas.renderAll();
      }
    } catch (error) {
      console.error('Error setting background:', error);
      canvas.backgroundColor = wallColor || '#f3f4f6';
      canvas.renderAll();
    }
  }, [wallColor, wallpaper]);

  // Update frames when they change
  useEffect(() => {
    if (!fabricCanvasRef.current || !initialized) return;

    const canvas = fabricCanvasRef.current;

    try {
      // Clear existing objects
      canvas.clear();

      // Add new frames
      frames.forEach(frame => {
        let fabricObject;

        if (frame.shape === 'rectangle' || frame.shape === 'square') {
          fabricObject = new fabric.Rect({
            left: frame.x,
            top: frame.y,
            width: frame.width,
            height: frame.height,
            fill: 'white',
            stroke: frame.shape === 'square' ? '#34d399' : '#60a5fa',
            strokeWidth: 4,
            id: frame.id,
          });
        } else if (frame.shape === 'circle' || frame.shape === 'oval') {
          fabricObject = new fabric.Ellipse({
            left: frame.x,
            top: frame.y,
            rx: frame.width / 2,
            ry: frame.height / 2,
            fill: 'white',
            stroke: frame.shape === 'circle' ? '#60a5fa' : '#a78bfa',
            strokeWidth: 4,
            id: frame.id,
          });
        } else if (frame.shape === 'sticker' && frame.image) {
          fabric.Image.fromURL(frame.image, (img) => {
            img.set({
              left: frame.x,
              top: frame.y,
              width: frame.width,
              height: frame.height,
              id: frame.id,
              hasControls: true,
              hasBorders: true,
              selectable: !lockOtherFrames || frame.id === selectedFrameId,
            });
            canvas.add(img);
            canvas.renderAll();
          }, { crossOrigin: 'anonymous' });
          return;
        }

        if (frame.image && fabricObject) {
          fabric.Image.fromURL(frame.image, (img) => {
            img.scaleToWidth(frame.width);
            img.scaleToHeight(frame.height);
            fabricObject.setPatternFill({
              source: img.getElement(),
              repeat: 'no-repeat'
            });
            canvas.renderAll();
          }, { crossOrigin: 'anonymous' });
        }

        if (fabricObject) {
          fabricObject.set({
            hasControls: true,
            hasBorders: true,
            lockUniScaling: frame.shape === 'square' || frame.shape === 'circle',
            minScaleLimit: MIN_FRAME_SIZE / frame.width,
            selectable: !lockOtherFrames || frame.id === selectedFrameId,
          });
          canvas.add(fabricObject);
        }
      });

      // Select the active frame if any
      if (selectedFrameId) {
        const obj = canvas.getObjects().find(o => o.id === selectedFrameId);
        if (obj) {
          canvas.setActiveObject(obj);
        }
      }

      canvas.renderAll();
    } catch (error) {
      console.error('Error updating frames:', error);
    }
  }, [frames, initialized, selectedFrameId, lockOtherFrames]);

  // Handle selection changes
  const handleSelection = (e) => {
    const selected = e.selected[0];
    if (selected && onSelectedFrameChange) {
      onSelectedFrameChange(selected.id);
    }
  };

  const handleSelectionCleared = () => {
    if (onSelectedFrameChange) {
      onSelectedFrameChange(null);
    }
  };

  // Handle object modifications (move, resize, etc.)
  const handleObjectModified = (e) => {
    const obj = e.target;
    if (!obj) return;

    const updatedFrames = frames.map(frame => {
      if (frame.id === obj.id) {
        return {
          ...frame,
          x: obj.left,
          y: obj.top,
          width: obj.getScaledWidth(),
          height: obj.getScaledHeight(),
        };
      }
      return frame;
    });

    setFrames(updatedFrames);
  };

  // Keep objects within canvas bounds while moving
  const handleObjectMoving = (e) => {
    const obj = e.target;
    const canvas = fabricCanvasRef.current;

    if (!obj || !canvas) return;

    // Calculate bounds
    const objWidth = obj.getScaledWidth();
    const objHeight = obj.getScaledHeight();

    // Adjust position to keep within bounds
    if (obj.left < 0) {
      obj.left = 0;
    }
    if (obj.top < 0) {
      obj.top = 0;
    }
    if (obj.left + objWidth > canvas.width) {
      obj.left = canvas.width - objWidth;
    }
    if (obj.top + objHeight > canvas.height) {
      obj.top = canvas.height - objHeight;
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();

    if ((e.key === 'Delete' || e.key === 'Backspace') && activeObject) {
      if (lockOtherFrames && activeObject.id !== selectedFrameId) return;

      if (window.confirm('Are you sure you want to delete this item?')) {
        canvas.remove(activeObject);
        setFrames(frames.filter(f => f.id !== activeObject.id));
        if (onSelectedFrameChange) {
          onSelectedFrameChange(null);
        }
      }
    }
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const rect = canvas._offset;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
      setFrames([...frames, newSticker]);
      if (onSelectedFrameChange) {
        onSelectedFrameChange(newSticker.id);
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
      shape,
    };

    setFrames([...frames, newFrame]);
    if (onSelectedFrameChange) {
      onSelectedFrameChange(newFrame.id);
    }
  };

  // Expose canvas to parent via ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(canvasRef.current);
      } else {
        ref.current = canvasRef.current;
      }
    }
  }, [ref]);

  return (
    <div className="relative flex flex-col items-center">
      <canvas
        ref={canvasRef}
        className="border-2 border-dashed border-blue-400 rounded-xl bg-white"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      />
    </div>
  );
});

export default WallCanvas; 