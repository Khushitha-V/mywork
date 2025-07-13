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

const Homepage = ({ user, onLogout }) => {
  const [showDimensionModal, setShowDimensionModal] = useState(false);
  const [showPreviousModal, setShowPreviousModal] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(null);
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
  const [showRoomPopup, setShowRoomPopup] = useState(false);
  const wallCanvasRef = useRef();
  const [selectedFrameId, setSelectedFrameId] = useState(null);
  const [lockOtherFrames, setLockOtherFrames] = useState(false);
  // Add a function to resize the selected frame in the current wall
  const resizeSelectedFrame = (newSize) => {
    if (!editingWall || !selectedFrameId) return;
    
    setWalls(prev => {
      const key = getWallKey(editingWall);
      return {
        ...prev,
        [key]: {
          ...prev[key],
          frames: (Array.isArray(prev[key].frames) ? prev[key].frames : []).map(f => {
            if (f.id !== selectedFrameId) return f;
            
            // For square or circle, keep width=height
            if (f.shape === 'square' || f.shape === 'circle') {
              return { ...f, width: newSize, height: newSize };
            }
            
            // For stickers, maintain aspect ratio
            if (f.shape === 'sticker') {
              const aspect = f.aspectRatio || (f.width / f.height) || 1;
              return { ...f, width: newSize, height: Math.round(newSize / aspect) };
            }
            
            // For rectangle/oval, preserve aspect ratio
            const aspect = f.aspectRatio || (f.width / f.height) || 1.4; // Default rectangle ratio
            return { ...f, width: newSize, height: Math.round(newSize / aspect) };
          })
        }
      };
    });
  };

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
          frames: (Array.isArray(frames) ? frames : []).map(f => {
            if (f.aspectRatio === undefined && f.width && f.height) {
              return { ...f, aspectRatio: f.width / f.height };
            }
            return f;
          })
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

  const saveCurrentRoom = async (roomName) => {
    try {
      const roomData = {
        name: roomName || `Room ${new Date().toLocaleString()}`,
        roomType: selectedRoom,
        dimensions: roomDimensions,
        wallColors: wallColors,
        wallpapers: wallpapers,
        wallCanvasData: wallCanvasData
      };

      const url = currentRoomId 
        ? `http://localhost:5000/api/rooms/${currentRoomId}`
        : 'http://localhost:5000/api/rooms';
      
      const method = currentRoomId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(roomData),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentRoomId(data.room.id);
        alert(currentRoomId ? 'Room updated successfully!' : 'Room saved successfully!');
      } else {
        alert(data.error || 'Failed to save room');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  const loadRoom = (room) => {
    setRoomDimensions(room.dimensions);
    setSelectedRoom(room.room_type || room.roomType);
    setWallColors(room.wall_colors || room.wallColors);
    setWallpapers(room.wallpapers || {});
    setWallCanvasData(room.wall_canvas_data || room.wallCanvasData || {});
    setCurrentRoomId(room.id);

    // Update walls state based on loaded room
    const newWalls = { ...walls };
    Object.keys(newWalls).forEach(wallKey => {
      const wallName = wallKey.charAt(0).toUpperCase() + wallKey.slice(1) + ' Wall';
      if (room.wall_colors && room.wall_colors[wallName]) {
        newWalls[wallKey].wallColor = room.wall_colors[wallName];
      }
      if (room.wallpapers && room.wallpapers[wallName]) {
        newWalls[wallKey].wallpaper = room.wallpapers[wallName];
      }
    });
    setWalls(newWalls);
  };

  const createNewRoom = () => {
    setCurrentRoomId(null);
    setRoomDimensions(DEFAULT_DIMENSIONS);
    setSelectedRoom(null); // Set to null to force room selection
    setShowRoomPopup(true); // Open the room selection popup
    setWallColors({
      'North Wall': '#ffffff',
      'South Wall': '#ffffff',
      'East Wall': '#ffffff',
      'West Wall': '#ffffff',
    });
    setWallpapers({});
    setWallCanvasData({});
    setWalls({
      north: { frames: [], wallColor: '#ffffff', wallpaper: null },
      south: { frames: [], wallColor: '#ffffff', wallpaper: null },
      east:  { frames: [], wallColor: '#ffffff', wallpaper: null },
      west:  { frames: [], wallColor: '#ffffff', wallpaper: null },
    });
  };

  // Only clear the current room, do not change selectedRoom or showRoomPopup
  const resetCurrentRoom = () => {
    setWallColors({
      'North Wall': '#ffffff',
      'South Wall': '#ffffff',
      'East Wall': '#ffffff',
      'West Wall': '#ffffff',
    });
    setWallpapers({});
    setWallCanvasData({});
    setWalls({
      north: { frames: [], wallColor: '#ffffff', wallpaper: null },
      south: { frames: [], wallColor: '#ffffff', wallpaper: null },
      east:  { frames: [], wallColor: '#ffffff', wallpaper: null },
      west:  { frames: [], wallColor: '#ffffff', wallpaper: null },
    });
  };

  // Add a handler to select room and close popup
  const handleRoomSelect = (roomType) => {
    setSelectedRoom(roomType);
    setShowRoomPopup(false);
  };

  // Helper: Check if a wall is edited
  const isWallEdited = (wallName) => {
    const wallKey = getWallKey(wallName);
    const wall = walls[wallKey];
    // Default colors for your app (adjust if needed)
    const defaultColors = ['#b0b0b0', '#8a7b94', '#ffffff'];
    const hasCustomColor = wall.wallColor && !defaultColors.includes(wall.wallColor.toLowerCase());
    const hasWallpaper = !!wall.wallpaper;
    const hasFrames = Array.isArray(wall.frames) && wall.frames.length > 0;
    return hasCustomColor || hasWallpaper || hasFrames;
  };

  // Function to download all designed walls (only edited walls)
  const downloadAllWalls = () => {
    const wallNames = ['North Wall', 'South Wall', 'East Wall', 'West Wall'];
    const editedWalls = wallNames.filter(isWallEdited);
    if (editedWalls.length === 0) {
      alert('No walls have been designed yet!');
      return;
    }
    // Calculate grid size
    const cols = Math.min(2, editedWalls.length);
    const rows = Math.ceil(editedWalls.length / cols);
    const wallWidth = 600;
    const wallHeight = 300;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = wallWidth * cols;
    canvas.height = wallHeight * rows;
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Function to draw a single wall
    const drawWall = (wallName, x, y) => {
      return new Promise((resolve) => {
        const wallKey = getWallKey(wallName);
        const wall = walls[wallKey];
        if (wall.wallpaper) {
          const img = new window.Image();
          img.onload = () => {
            ctx.drawImage(img, x, y, wallWidth, wallHeight);
            drawFrames(wallName, x, y).then(resolve);
          };
          img.src = wall.wallpaper;
        } else if (wall.wallColor) {
          ctx.fillStyle = wall.wallColor;
          ctx.fillRect(x, y, wallWidth, wallHeight);
          drawFrames(wallName, x, y).then(resolve);
        } else {
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(x, y, wallWidth, wallHeight);
          drawFrames(wallName, x, y).then(resolve);
        }
      });
    };
    // Function to draw frames on a wall
    const drawFrames = (wallName, offsetX, offsetY) => {
      return new Promise((resolve) => {
        const wallKey = getWallKey(wallName);
        const wall = walls[wallKey];
        if (wall.frames && Array.isArray(wall.frames) && wall.frames.length > 0) {
          let loadedFrames = 0;
          const totalFrames = wall.frames.filter(frame => frame.image).length;
          if (totalFrames === 0) {
            resolve();
            return;
          }
          wall.frames.forEach(frame => {
            if (frame.image) {
              const img = new window.Image();
              img.onload = () => {
                ctx.drawImage(img, offsetX + frame.x, offsetY + frame.y, frame.width, frame.height);
                loadedFrames++;
                if (loadedFrames === totalFrames) {
                  resolve();
                }
              };
              img.src = frame.image;
            }
          });
        } else {
          resolve();
        }
      });
    };
    // Draw all edited walls in a grid and wait for all to complete
    Promise.all(editedWalls.map((wallName, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = col * wallWidth;
      const y = row * wallHeight;
      // Add wall label
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(wallName, x + wallWidth / 2, y + 25);
      return drawWall(wallName, x, y + 30);
    })).then(() => {
      // Download the combined image after all walls are drawn
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `room-design-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  // Function to download a single wall
  const downloadSingleWall = (wallName) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const wallWidth = 600;
    const wallHeight = 300;
    canvas.width = wallWidth;
    canvas.height = wallHeight;
    
    const wallKey = getWallKey(wallName);
    const wall = walls[wallKey];
    
    // Draw wall background
    if (wall.wallpaper) {
      const img = new window.Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, wallWidth, wallHeight);
        drawFrames(wallName, 0, 0).then(() => {
          downloadCanvas(canvas, `${wallName.toLowerCase().replace(' ', '-')}-design.png`);
        });
      };
      img.src = wall.wallpaper;
    } else if (wall.wallColor) {
      ctx.fillStyle = wall.wallColor;
      ctx.fillRect(0, 0, wallWidth, wallHeight);
      drawFrames(wallName, 0, 0).then(() => {
        downloadCanvas(canvas, `${wallName.toLowerCase().replace(' ', '-')}-design.png`);
      });
    } else {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, wallWidth, wallHeight);
      drawFrames(wallName, 0, 0).then(() => {
        downloadCanvas(canvas, `${wallName.toLowerCase().replace(' ', '-')}-design.png`);
      });
    }
    
    // Function to draw frames on a wall
    const drawFrames = (wallName, offsetX, offsetY) => {
      return new Promise((resolve) => {
        const wallKey = getWallKey(wallName);
        const wall = walls[wallKey];
        
        if (wall.frames && Array.isArray(wall.frames) && wall.frames.length > 0) {
          let loadedFrames = 0;
          const totalFrames = wall.frames.filter(frame => frame.image).length;
          
          if (totalFrames === 0) {
            resolve();
            return;
          }
          
          wall.frames.forEach(frame => {
            if (frame.image) {
              const img = new window.Image();
              img.onload = () => {
                ctx.drawImage(img, offsetX + frame.x, offsetY + frame.y, frame.width, frame.height);
                loadedFrames++;
                if (loadedFrames === totalFrames) {
                  resolve();
                }
              };
              img.src = frame.image;
            }
          });
        } else {
          resolve();
        }
      });
    };
  };
  
  // Helper function to download canvas
  const downloadCanvas = (canvas, filename) => {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="gradient-bg min-h-screen font-sans">
      <Header
        onSetDimensions={() => setShowDimensionModal(true)}
        onViewPrevious={() => setShowPreviousModal(true)}
        onSaveRoom={() => {
          const roomName = prompt('Enter room name:');
          if (roomName !== null) {
            saveCurrentRoom(roomName);
          }
        }}
        onNewRoom={resetCurrentRoom}
        onDownloadWalls={downloadAllWalls}
        user={user}
        onLogout={onLogout}
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
          onRoomSelect={handleRoomSelect}
          onShowImagePopup={() => setShowImagePopup(true)}
          onSetDimensions={() => setShowDimensionModal(true)}
          showRoomPopup={showRoomPopup}
          setShowRoomPopup={setShowRoomPopup}
          onDownloadSingleWall={downloadSingleWall}
          selectedFrameId={selectedFrameId}
          onResizeSelectedFrame={resizeSelectedFrame}
          frames={editingWall && walls[getWallKey(editingWall)] && Array.isArray(walls[getWallKey(editingWall)].frames) ? walls[getWallKey(editingWall)].frames : []}
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
                {/* Lock Other Frames Toggle */}
                <div className="flex items-center justify-center mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockOtherFrames}
                      onChange={e => setLockOtherFrames(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-accent-blue"
                    />
                    <span className="text-base text-gray-700">Lock Other Frames</span>
                  </label>
                </div>
                <div className="w-full h-64 flex items-center justify-center">
                  <WallCanvas
                    ref={wallCanvasRef}
                    wallName={editingWall?.toLowerCase()}
                    frames={walls[getWallKey(editingWall)].frames}
                    setFrames={frames => handleSetFrames(editingWall, frames)}
                    wallColor={walls[getWallKey(editingWall)].wallColor}
                    wallpaper={walls[getWallKey(editingWall)].wallpaper}
                    selectedFrameId={selectedFrameId}
                    onSelectedFrameChange={setSelectedFrameId}
                    lockOtherFrames={lockOtherFrames}
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
        <PreviousRoomsModal 
          onClose={() => setShowPreviousModal(false)} 
          onLoadRoom={loadRoom}
        />
      )}
    </div>
  );
};

export default Homepage;
