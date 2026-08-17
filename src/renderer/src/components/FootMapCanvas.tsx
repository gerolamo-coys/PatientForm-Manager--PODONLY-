import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Trash2, Pen, Star, Circle, Square, Triangle, Diamond, Plus } from 'lucide-react';
import './FootMapCanvas.css';
import feetMapImg from '../assets/feet-map.png';

interface FootMapCanvasProps {
  onSaveAnnotation?: (base64Image: string) => void;
  initialAnnotation?: string; // Base64 image
}


type ActiveTool = 'draw' | 'erase' | 'star' | 'circle' | 'square' | 'triangle' | 'diamond' | 'plus';

export const FootMapCanvas: React.FC<FootMapCanvasProps> = ({ 
  onSaveAnnotation,
  initialAnnotation 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444');
  const [activeTool, setActiveTool] = useState<ActiveTool>('draw');
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const hasLoadedInitial = useRef(false);

  // Resize canvas to match container size
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (container && canvas) {
        const { width, height } = container.getBoundingClientRect();
        if (width === 0 || height === 0) return;
        
        if (canvas.width === width && canvas.height === height) return;

        const shouldRestore = isCanvasReady;
        let dataUrl = '';
        if (shouldRestore) {
          dataUrl = canvas.toDataURL();
        }
        
        canvas.width = width;
        canvas.height = height;
        
        if (shouldRestore && dataUrl) {
          const img = new Image();
          img.onload = () => {
            canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
          };
          img.src = dataUrl;
        } else {
          setIsCanvasReady(true);
        }
      }
    };

    const timer = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isCanvasReady]);

  // Load initial annotation
  useEffect(() => {
    if (initialAnnotation && canvasRef.current && isCanvasReady && !hasLoadedInitial.current) {
      hasLoadedInitial.current = true;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      };
      img.src = initialAnnotation;
    }
  }, [initialAnnotation, isCanvasReady]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent touch scrolling
    
    if (activeTool !== 'draw' && activeTool !== 'erase') {
      drawStamp(e, activeTool);
      return;
    }
    
    setIsDrawing(true);
    draw(e);
  };

  const drawStamp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, stampType: ActiveTool) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = color;
    
    const size = 12;

    switch (stampType) {
      case 'circle':
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'square':
        ctx.rect(x - size, y - size, size * 2, size * 2);
        ctx.fill();
        break;
      case 'triangle':
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y + size);
        ctx.lineTo(x - size, y + size);
        ctx.closePath();
        ctx.fill();
        break;
      case 'diamond':
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
        break;
      case 'plus':
        const thickness = 5;
        ctx.rect(x - size, y - thickness / 2, size * 2, thickness);
        ctx.rect(x - thickness / 2, y - size, thickness, size * 2);
        ctx.fill();
        break;
      case 'star':
        const spikes = 5;
        const outerRadius = size * 1.5;
        const innerRadius = size * 0.6;
        let rot = Math.PI / 2 * 3;
        let step = Math.PI / spikes;

        ctx.moveTo(x, y - outerRadius);
        for (let i = 0; i < spikes; i++) {
          let x1 = x + Math.cos(rot) * outerRadius;
          let y1 = y + Math.sin(rot) * outerRadius;
          ctx.lineTo(x1, y1);
          rot += step;

          x1 = x + Math.cos(rot) * innerRadius;
          y1 = y + Math.sin(rot) * innerRadius;
          ctx.lineTo(x1, y1);
          rot += step;
        }
        ctx.lineTo(x, y - outerRadius);
        ctx.closePath();
        ctx.fill();
        break;
    }

    if (onSaveAnnotation) {
      onSaveAnnotation(canvas.toDataURL('image/png'));
    }
  };

  const finishDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
      
      // Trigger save
      if (onSaveAnnotation) {
        onSaveAnnotation(canvas.toDataURL('image/png'));
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Get coordinates relative to canvas
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = activeTool === 'erase' ? 20 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (activeTool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (onSaveAnnotation) {
        onSaveAnnotation(canvas.toDataURL('image/png'));
      }
    }
  };

  return (
    <div className="foot-map-container">
      <div className="foot-map-toolbar">
        <div className="color-picker-wrapper" title="Escolher cor">
          <input 
            type="color" 
            value={color} 
            onChange={(e) => {
              setColor(e.target.value);
              if (activeTool === 'erase') setActiveTool('draw');
            }}
            className="color-picker-input"
          />
        </div>
        
        <div style={{ width: '1px', height: '24px', backgroundColor: '#cbd5e1', margin: '0 4px' }} />

        <button 
          type="button"
          className={`tool-btn ${activeTool === 'draw' ? 'active' : ''}`}
          onClick={() => setActiveTool('draw')}
          title="Draw"
        >
          <Pen size={16} />
        </button>

        <button 
          type="button"
          className={`tool-btn ${activeTool === 'erase' ? 'active' : ''}`}
          onClick={() => setActiveTool('erase')}
          title="Erase"
        >
          <Eraser size={16} />
        </button>

        <div style={{ width: '1px', height: '24px', backgroundColor: '#cbd5e1', margin: '0 4px' }} />

        <button 
          type="button"
          className={`tool-btn ${activeTool === 'star' ? 'active' : ''}`}
          onClick={() => setActiveTool('star')}
          title="Verruga (Star)"
        >
          <Star size={16} />
        </button>

        <button 
          type="button"
          className={`tool-btn ${activeTool === 'circle' ? 'active' : ''}`}
          onClick={() => setActiveTool('circle')}
          title="Calo (Circle)"
        >
          <Circle size={16} />
        </button>

        <button 
          type="button"
          className={`tool-btn ${activeTool === 'square' ? 'active' : ''}`}
          onClick={() => setActiveTool('square')}
          title="Queratose (Square)"
        >
          <Square size={16} />
        </button>

        <button 
          type="button"
          className={`tool-btn ${activeTool === 'triangle' ? 'active' : ''}`}
          onClick={() => setActiveTool('triangle')}
          title="Trauma (Triangle)"
        >
          <Triangle size={16} />
        </button>

        <button 
          type="button"
          className={`tool-btn ${activeTool === 'diamond' ? 'active' : ''}`}
          onClick={() => setActiveTool('diamond')}
          title="Onicomicose (Diamond)"
        >
          <Diamond size={16} />
        </button>

        <button 
          type="button"
          className={`tool-btn ${activeTool === 'plus' ? 'active' : ''}`}
          onClick={() => setActiveTool('plus')}
          title="Calo Interdigital / Úlcera (Plus)"
        >
          <Plus size={16} />
        </button>

        <div style={{ flex: 1 }} />

        <button 
          type="button"
          className="tool-btn danger"
          onClick={clearCanvas}
        >
          <Trash2 size={16} /> Clear All
        </button>
      </div>

      <div className="canvas-wrapper" ref={containerRef}>
        <img 
          src={feetMapImg} 
          alt="Feet Map" 
          className="canvas-background"
          onLoad={() => {
            // Trigger a resize to match image dimensions exactly when it loads
            window.dispatchEvent(new Event('resize'));
          }}
        />
        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseOut={finishDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={finishDrawing}
          onTouchMove={draw}
        />
      </div>
    </div>
  );
};

export default FootMapCanvas;
