import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import SidebarLeft from '../components/SidebarLeft';
import RoomCanvas from '../components/RoomCanvas';
import RoomDimensionModal from '../components/RoomDimensionModal';
import PreviousRoomsModal from '../components/PreviousRoomsModal';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import Canvas from '../components/Canvas';
import { v4 as uuidv4 } from 'uuid';
import html2canvas from 'html2canvas';

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareBlobUrl, setShareBlobUrl] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [receiverEmail, setReceiverEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [isSending, setIsSending] = useState(false);
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

  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAddImages = async (event) => {
    const files = Array.from(event.target.files);
    const newImages = await Promise.all(files.map(async file => ({
      url: await fileToDataUrl(file),
      name: file.name,
      file
    })));
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
        wallCanvasData: wallCanvasData,
        walls: walls // <-- persist frames and all wall data
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

    // Update walls state based on loaded room, always restoring frames
    const newWalls = { ...walls };
    Object.keys(newWalls).forEach(wallKey => {
      const wallName = wallKey.charAt(0).toUpperCase() + wallKey.slice(1) + ' Wall';
      if (room.wall_colors && room.wall_colors[wallName]) {
        newWalls[wallKey].wallColor = room.wall_colors[wallName];
      }
      if (room.wallpapers && room.wallpapers[wallName]) {
        newWalls[wallKey].wallpaper = room.wallpapers[wallName];
      }
      // Always restore frames for each wall, defaulting to [] if not present
      newWalls[wallKey].frames = (room.walls && room.walls[wallKey] && Array.isArray(room.walls[wallKey].frames))
        ? room.walls[wallKey].frames
        : [];
    });
    setWalls(newWalls);
    // Open the 2D editor for the selected wall, or default to North Wall
    setIs2DMode(true);
    setEditingWall(selectedWall || 'North Wall');
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

  // Download all edited walls as a PDF, each wall as a page with its wall name
  const downloadAllWalls = async () => {
    const wallNames = ['North Wall', 'South Wall', 'East Wall', 'West Wall'];
    const editedWalls = wallNames.filter(isWallEdited);
    if (editedWalls.length === 0) {
      alert('No walls have been designed yet!');
      return;
    }
    const wallWidth = 600;
    const wallHeight = 300;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [wallWidth, wallHeight + 30] });
    for (let i = 0; i < editedWalls.length; i++) {
      const wallName = editedWalls[i];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = wallWidth;
      canvas.height = wallHeight + 30; // extra space for label
      // Draw label background
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, wallWidth, 30);
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(wallName, wallWidth / 2, 22);
      // Draw wall background
      const wallKey = getWallKey(wallName);
      const wall = walls[wallKey];
      await new Promise((resolve) => {
        if (wall.wallpaper) {
          const img = new window.Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 30, wallWidth, wallHeight);
            drawFrames(ctx, wallName, 0, 30).then(() => resolve());
          };
          img.src = wall.wallpaper;
        } else if (wall.wallColor) {
          ctx.fillStyle = wall.wallColor;
          ctx.fillRect(0, 30, wallWidth, wallHeight);
          drawFrames(ctx, wallName, 0, 30).then(() => resolve());
        } else {
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(0, 30, wallWidth, wallHeight);
          drawFrames(ctx, wallName, 0, 30).then(() => resolve());
        }
      });
      const imgData = canvas.toDataURL('image/png');
      if (i > 0) pdf.addPage([wallWidth, wallHeight + 30], 'landscape');
      pdf.addImage(imgData, 'PNG', 0, 0, wallWidth, wallHeight + 30);
    }
    pdf.save('room-design.pdf');
  };

  // Function to draw frames on a wall
  const drawFrames = (ctx, wallName, offsetX, offsetY) => {
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
        drawFrames(ctx, wallName, 0, 0).then(() => {
          downloadCanvas(canvas, `${wallName.toLowerCase().replace(' ', '-')}-design.png`);
        });
      };
      img.src = wall.wallpaper;
    } else if (wall.wallColor) {
      ctx.fillStyle = wall.wallColor;
      ctx.fillRect(0, 0, wallWidth, wallHeight);
      drawFrames(ctx, wallName, 0, 0).then(() => {
        downloadCanvas(canvas, `${wallName.toLowerCase().replace(' ', '-')}-design.png`);
      });
    } else {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, wallWidth, wallHeight);
      drawFrames(ctx, wallName, 0, 0).then(() => {
        downloadCanvas(canvas, `${wallName.toLowerCase().replace(' ', '-')}-design.png`);
      });
    }
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

  // Helper: Generate a combined PNG of all edited walls and return a blob
  const generateAllWallsImageBlob = () => {
    return new Promise((resolve, reject) => {
      const wallNames = ['North Wall', 'South Wall', 'East Wall', 'West Wall'];
      // Always export all four walls, not just edited ones
      const exportedWalls = wallNames;
      // Calculate grid size
      const cols = Math.min(2, exportedWalls.length);
      const rows = Math.ceil(exportedWalls.length / cols);
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
        return new Promise((resolveWall) => {
          const wallKey = getWallKey(wallName);
          const wall = walls[wallKey];
          if (wall.wallpaper) {
            const img = new window.Image();
            img.onload = () => {
              ctx.drawImage(img, x, y, wallWidth, wallHeight);
              drawFrames(ctx, wallName, x, y).then(resolveWall);
            };
            img.src = wall.wallpaper;
          } else if (wall.wallColor) {
            ctx.fillStyle = wall.wallColor;
            ctx.fillRect(x, y, wallWidth, wallHeight);
            drawFrames(ctx, wallName, x, y).then(resolveWall);
          } else {
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(x, y, wallWidth, wallHeight);
            drawFrames(ctx, wallName, x, y).then(resolveWall);
          }
        });
      };
      // Draw all walls in a grid and wait for all to complete
      Promise.all(exportedWalls.map((wallName, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = col * wallWidth;
        const y = row * wallHeight;
        // Add wall label with background for readability
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, wallWidth, 30); // background for label
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(wallName, x + wallWidth / 2, y + 22);
        return drawWall(wallName, x, y + 30);
      })).then(() => {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject('Failed to generate image blob');
        }, 'image/png');
      });
    });
  };

  // Share handler: always share all walls as a PDF
  const handleShare = async () => {
    try {
      const wallNames = ['North Wall', 'South Wall', 'East Wall', 'West Wall'];
      const editedWalls = wallNames.filter(isWallEdited);
      if (editedWalls.length === 0) {
        alert('No walls have been designed yet!');
        return;
      }
      const wallWidth = 600;
      const wallHeight = 300;
      const jsPDFModule = (await import('jspdf')).default;
      const pdf = new jsPDFModule({ orientation: 'landscape', unit: 'px', format: [wallWidth, wallHeight + 30] });
      for (let i = 0; i < editedWalls.length; i++) {
        const wallName = editedWalls[i];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = wallWidth;
        canvas.height = wallHeight + 30; // extra space for label
        // Draw label background
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, wallWidth, 30);
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(wallName, wallWidth / 2, 22);
        // Draw wall background
        const wallKey = getWallKey(wallName);
        const wall = walls[wallKey];
        await new Promise((resolve) => {
          if (wall.wallpaper) {
            const img = new window.Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 30, wallWidth, wallHeight);
              drawFrames(ctx, wallName, 0, 30).then(() => resolve());
            };
            img.src = wall.wallpaper;
          } else if (wall.wallColor) {
            ctx.fillStyle = wall.wallColor;
            ctx.fillRect(0, 30, wallWidth, wallHeight);
            drawFrames(ctx, wallName, 0, 30).then(() => resolve());
          } else {
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(0, 30, wallWidth, wallHeight);
            drawFrames(ctx, wallName, 0, 30).then(() => resolve());
          }
        });
        const imgData = canvas.toDataURL('image/png');
        if (i > 0) pdf.addPage([wallWidth, wallHeight + 30], 'landscape');
        pdf.addImage(imgData, 'PNG', 0, 0, wallWidth, wallHeight + 30);
      }
      // Get PDF blob
      const pdfBlob = pdf.output('blob');
      // Upload PDF to backend
      const formData = new FormData();
      formData.append('file', pdfBlob, 'room-design.pdf');
      const response = await fetch('http://localhost:5000/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.url) {
        setShareUrl(data.url);
        setShowShareModal(true);
      } else {
        alert('Failed to upload PDF for sharing.');
      }
    } catch (err) {
      // error already alerted in generateAllWallsImageBlob
    }
  };

  // Handler to open email modal
  const handleEmailShare = () => {
    setShowEmailModal(true);
    setReceiverEmail("");
    setOtpSent(false);
    setOtpInput("");
    setEmailStatus("");
  };

  // Handler to send OTP
  const handleSendOtp = async () => {
    setIsSending(true);
    setEmailStatus("");
    try {
      const res = await fetch('http://localhost:5000/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver: receiverEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setEmailStatus("OTP sent to " + receiverEmail);
      } else {
        setEmailStatus(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setEmailStatus('Network error');
    }
    setIsSending(false);
  };

  // Handler to verify OTP and send PDF
  const handleVerifyOtpAndSendPdf = async () => {
    setIsSending(true);
    setEmailStatus("");
    try {
      const res = await fetch('http://localhost:5000/api/verify-otp-and-send-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver: receiverEmail, otp: otpInput, pdf_link: shareUrl })
      });
      const data = await res.json();
      if (res.ok) {
        setEmailStatus("PDF link sent to " + receiverEmail);
        setTimeout(() => setShowEmailModal(false), 2000);
      } else {
        setEmailStatus(data.error || 'Failed to send PDF');
      }
    } catch (err) {
      setEmailStatus('Network error');
    }
    setIsSending(false);
  };

  const [imagePopupPosition, setImagePopupPosition] = useState(null);

  const handleShowImagePopup = (pos) => {
    setShowImagePopup(true);
    setImagePopupPosition(pos || { top: 100, left: 100 });
  };

  // Add state for 2D elements for the current wall
  const [wallElements, setWallElements] = useState({
    north: [],
    south: [],
    east: [],
    west: []
  });

  // Handler to add a new element to the current wall's elements
  const handleAddElement = (element) => {
    if (!editingWall) return;
    const wallKey = getWallKey(editingWall);
    const defaultX = 50 + Math.random() * 100;
    const defaultY = 50 + Math.random() * 100;
    setWallElements(prev => ({
      ...prev,
      [wallKey]: [
        ...((Array.isArray(prev[wallKey]) ? prev[wallKey] : [])),
        {
          ...element,
          id: uuidv4(),
          x: defaultX,
          y: defaultY,
        }
      ]
    }));
  };

  // Helper to get elements for the current wall
  const getCurrentWallElements = () => wallElements[getWallKey(editingWall)] || [];
  const setCurrentWallElements = (elements) => {
    setWallElements(prev => ({ ...prev, [getWallKey(editingWall)]: elements }));
  };

  return (
    <div className="gradient-bg min-h-screen font-sans">
      <Header
        onSetDimensions={() => setShowDimensionModal(true)}
        onViewPrevious={() => setShowPreviousModal(true)}
        onSaveRoom={() => {
          let roomName = null;
          while (roomName === null || roomName.trim() === "") {
            roomName = prompt('Enter room name:');
            if (roomName === null) return; // user cancelled
          }
          saveCurrentRoom(roomName);
        }}
        onNewRoom={createNewRoom}
        onResetRoom={resetCurrentRoom}
        onDownloadWalls={downloadAllWalls}
        user={user}
        onLogout={onLogout}
        onShare={handleShare}
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
          onShowImagePopup={handleShowImagePopup}
          onSetDimensions={() => setShowDimensionModal(true)}
          showRoomPopup={showRoomPopup}
          setShowRoomPopup={setShowRoomPopup}
          onDownloadSingleWall={downloadSingleWall}
          selectedFrameId={selectedFrameId}
          onResizeSelectedFrame={resizeSelectedFrame}
          frames={editingWall && walls[getWallKey(editingWall)] && Array.isArray(walls[getWallKey(editingWall)].frames) ? walls[getWallKey(editingWall)].frames : []}
          onAddElement={handleAddElement}
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
                className="glass-effect rounded-2xl p-8 shadow-xl h-full flex flex-col items-center justify-center border-4 border-accent-blue bg-white relative"
                style={{ minHeight: 400 }}
              >
                {/* Top right: title and 3D View button in a flex row */}
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-10" style={{ minHeight: '32px' }}>
                  <div className="text-3xl font-bold text-text-primary whitespace-nowrap">Customize your {editingWall}</div>
                  <button
                    className="px-5 py-2 rounded-xl bg-accent-purple text-white font-medium hover:bg-purple-600 transition-all shadow-lg"
                    onClick={async () => {
                      // Export the 2D wall as an image and set as 3D wallpaper
                      if (editingWall) {
                        const wallKey = getWallKey(editingWall);
                        const canvasDiv = document.querySelector('.design-canvas');
                        if (canvasDiv) {
                          const canvasImage = await html2canvas(canvasDiv, { backgroundColor: null });
                          const dataUrl = canvasImage.toDataURL();
                          setWallpapers(prev => ({
                            ...prev,
                            [wallKey.charAt(0).toUpperCase() + wallKey.slice(1) + ' Wall']: dataUrl
                          }));
                        }
                      }
                      setIs2DMode(false);
                      setSelectedWall("");
                      setEditingWall(null);
                    }}
                  >
                    3D View
                  </button>
                </div>
                {/* Lock Other Frames Toggle just below the header */}
                <div className="flex items-center justify-center mb-6">
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
                  {/* Render the new Canvas component for 2D editing */}
                  {(() => {
                    const wallKey = getWallKey(editingWall);
                    const wallData = walls[wallKey] || {};
                    return (
                  <Canvas
                    elements={getCurrentWallElements()}
                    setElements={setCurrentWallElements}
                    wallpaper={wallData.wallpaper}
                    wallColor={wallData.wallColor}
                  />
                    );
                  })()}
                </div>
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

      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-xs flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4 text-text-primary">Share Your Room Design (PDF)</h3>
            <button
              className="w-full bg-accent-blue text-white py-2 rounded-lg text-center font-medium mb-2"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Room Design',
                    text: 'Check out my room design!',
                    url: shareUrl
                  });
                } else {
                  alert('Native sharing is not supported in this browser.');
                }
              }}
            >
              Share
            </button>
            <button onClick={() => setShowShareModal(false)} className="mt-2 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-medium">Close</button>
          </div>
        </div>
      )}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-xs flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4 text-text-primary">Send PDF via Email</h3>
            <input
              type="email"
              placeholder="Receiver's Email"
              value={receiverEmail}
              onChange={e => setReceiverEmail(e.target.value)}
              className="w-full border p-2 rounded mb-3"
              disabled={otpSent}
            />
            {!otpSent ? (
              <button
                onClick={handleSendOtp}
                className="w-full bg-blue-500 text-white py-2 rounded-lg text-center font-medium mb-2"
                disabled={isSending || !receiverEmail}
              >
                {isSending ? 'Sending OTP...' : 'Send OTP'}
              </button>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value)}
                  className="w-full border p-2 rounded mb-3"
                />
                <button
                  onClick={handleVerifyOtpAndSendPdf}
                  className="w-full bg-green-500 text-white py-2 rounded-lg text-center font-medium mb-2"
                  disabled={isSending || !otpInput}
                >
                  {isSending ? 'Verifying...' : 'Verify & Send PDF'}
                </button>
              </>
            )}
            {emailStatus && <div className="text-sm text-center mt-2 text-gray-700">{emailStatus}</div>}
            <button onClick={() => setShowEmailModal(false)} className="mt-4 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-medium">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Homepage;
