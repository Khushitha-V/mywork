import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import SidebarLeft from '../components/SidebarLeft';
import RoomCanvas from '../components/RoomCanvas';
import RoomDimensionModal from '../components/RoomDimensionModal';
import PreviousRoomsModal from '../components/PreviousRoomsModal';
import { motion, AnimatePresence } from 'framer-motion';
import WallCanvas from '../components/WallCanvas';

const DEFAULT_DIMENSIONS = { length: 8, width: 8, height: 3 };
const DEFAULT_ROOM = 'others';

const Homepage = () => {
  const [showDimensionModal, setShowDimensionModal] = useState(false);
  const [showPreviousModal, setShowPreviousModal] = useState(false);
  const [roomDimensions, setRoomDimensions] = useState(DEFAULT_DIMENSIONS);
  const [selectedRoom, setSelectedRoom] = useState(DEFAULT_ROOM);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [images, setImages] = useState([]);
  const [wallColors, setWallColors] = useState({
    'North Wall': '#b0b0b0',
    'South Wall': '#b0b0b0',
    'East Wall': '#8a7b94',
    'West Wall': '#8a7b94',
  });
  const [wallpapers, setWallpapers] = useState({});
  const [is2DMode, setIs2DMode] = useState(false);
  const [editingWall, setEditingWall] = useState(null);
  const [wallCanvasData, setWallCanvasData] = useState({});
  const [selectedWall, setSelectedWall] = useState("");
  const [walls, setWalls] = useState({
    north: { frames: [], wallColor: '#b0b0b0', wallpaper: null },
    south: { frames: [], wallColor: '#b0b0b0', wallpaper: null },
    east:  { frames: [], wallColor: '#8a7b94', wallpaper: null },
    west:  { frames: [], wallColor: '#8a7b94', wallpaper: null },
  });
  const wallCanvasRef = useRef();

  // Helper function to convert wall name to key
  const getWallKey = (wallName) => {
    if (!wallName) return 'north';
    const name = wallName.toLowerCase();
    if (name.includes('north')) return 'north';
    if (name.includes('south')) return 'south';
    if (name.includes('east')) return 'east';
    if (name.includes('west')) return 'west';
    return 'north'; // default
  };

  const handleAddImages = (event) => {
    const files = Array.from(event.target.files);
    const newImages = files.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name,
      file
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const handleDeleteImage = (name) => {
    setImages(prev => prev.filter(img => img.name !== name));
  };

  const handleApplyWallColor = (wall, color) => {
    setWalls(prev => {
      const key = getWallKey(wall);
      return {
        ...prev,
        [key]: {
          ...prev[key],
          wallColor: color,
        },
      };
    });
  };

  const handleApplyWallWallpaper = (wall, url) => {
    setWalls(prev => {
      const key = getWallKey(wall);
      return {
        ...prev,
        [key]: {
          ...prev[key],
          wallpaper: url,
        },
      };
    });
  };

  const handleSetFrames = (wall, frames) => {
    setWalls(prev => {
      const key = getWallKey(wall);
      return {
        ...prev,
        [key]: {
          ...prev[key],
          frames,
        },
      };
    });
  };

  useEffect(() => {
    if (is2DMode && editingWall && wallCanvasData[editingWall]) {
      const canvas = document.getElementById('wall-2d-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const img = new window.Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = wallCanvasData[editingWall];
      }
    }
  }, [is2DMode, editingWall, wallCanvasData]);

  useEffect(() => {
    console.log('wallpapers state:', wallpapers);
  }, [wallpapers]);

  useEffect(() => {
    console.log('walls state:', walls);
  }, [walls]);

  return (
    <div className="gradient-bg min-h-screen font-sans">
      <Header
        onSetDimensions={() => setShowDimensionModal(true)}
        onViewPrevious={() => setShowPreviousModal(true)}
      />
      <div className="w-full min-h-[calc(100vh-100px)] px-1 md:px-2 pb-4 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        <SidebarLeft 
          onApplyWallColor={handleApplyWallColor} 
          onApplyWallWallpaper={handleApplyWallWallpaper}
          onEditWall2D={wall => { setEditingWall(wall); setIs2DMode(true); }}
          wallCanvasData={wallCanvasData}
          setWallCanvasData={setWallCanvasData}
          selectedWall={selectedWall}
          setSelectedWall={setSelectedWall}
          wallColors={wallColors}
          wallpapers={wallpapers}
          onRoomSelect={setSelectedRoom}
          onShowImagePopup={() => setShowImagePopup(true)}
          onSetDimensions={() => setShowDimensionModal(true)}
        />
        <div className="col-span-12 md:col-span-9 mt-4 md:mt-0">
          <AnimatePresence mode="wait">
            {is2DMode && editingWall ? (
              <motion.div
                key="2d"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="glass-effect rounded-2xl p-8 shadow-xl h-full flex flex-col items-center justify-center border-4 border-accent-blue bg-white"
                style={{ minHeight: 400 }}
              >
                <div className="text-3xl font-bold mb-10 text-text-primary">Customize your {editingWall}</div>
                <div className="w-full h-64 flex items-center justify-center">
                  <WallCanvas
                    ref={wallCanvasRef}
                    wallName={editingWall?.toLowerCase()}
                    frames={walls[getWallKey(editingWall)].frames}
                    setFrames={frames => handleSetFrames(editingWall, frames)}
                    wallColor={walls[getWallKey(editingWall)].wallColor}
                    wallpaper={walls[getWallKey(editingWall)].wallpaper}
                  />
                </div>
                <button
                  className="mt-8 px-6 py-3 rounded-xl bg-accent-purple text-white font-medium hover:bg-purple-600 transition-all shadow-lg"
                  onClick={() => {
                    // Export the 2D wall as an image and set as 3D wallpaper
                    if (editingWall && wallCanvasRef.current) {
                      const canvas = wallCanvasRef.current;
                      const dataUrl = canvas.toDataURL();
                      setWallpapers(prev => ({
                        ...prev,
                        [editingWall]: dataUrl
                      }));
                    }
                    setIs2DMode(false);
                    setSelectedWall("");
                    setEditingWall(null);
                  }}
                >
                  Back to 3D View
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="3d"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              >
                <RoomCanvas 
                  dimensions={roomDimensions} 
                  roomType={selectedRoom} 
                  wallColors={wallColors} 
                  wallpapers={wallpapers}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showImagePopup && (
        <div className="fixed top-8 right-8 z-50 bg-white rounded-xl shadow-2xl p-6 w-80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Manage Images</h3>
            <button onClick={() => setShowImagePopup(false)} className="text-gray-500 hover:text-gray-700">✖</button>
          </div>
          <input type="file" multiple accept="image/*" onChange={handleAddImages} className="mb-4" />
          <div className="grid grid-cols-3 gap-2 mb-2">
            {images.map(img => (
              <div key={img.name} className="relative group">
                <img 
                  src={img.url} 
                  alt={img.name} 
                  className="w-full h-20 object-cover rounded" 
                  draggable={true}
                  onDragStart={e => e.dataTransfer.setData('managed-image-url', img.url)}
                />
                <button
                  onClick={() => handleDeleteImage(img.name)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-80 group-hover:opacity-100"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {images.length === 0 && <div className="text-gray-400 text-sm text-center">No images added yet.</div>}
        </div>
      )}

      {showDimensionModal && (
        <RoomDimensionModal
          onClose={() => setShowDimensionModal(false)}
          onSave={dims => setRoomDimensions({
            length: Number(dims.length),
            width: Number(dims.width),
            height: Number(dims.height)
          })}
          initialValues={roomDimensions}
        />
      )}

      {showPreviousModal && (
        <PreviousRoomsModal onClose={() => setShowPreviousModal(false)} />
      )}
    </div>
  );
};

export default Homepage;
