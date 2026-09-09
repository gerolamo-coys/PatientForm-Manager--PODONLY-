import React, { useRef, useState, useEffect } from 'react';
import {
  Eraser,
  Trash2,
  Pen,
  Star,
  Circle,
  Square,
  Triangle,
  Diamond,
  Plus,
  MapPin,
  Sliders,
  Tag
} from 'lucide-react';
import './FootMapCanvas.css';
import feetMapImg from '../assets/feet-map.png';
import {
  ClinicalSymbolDef,
  ClinicalSymbolShape,
  DEFAULT_CLINICAL_SYMBOLS,
  FootMapSnapshotPayload
} from '../types/feetCanvas';
import FeetCanvasBuilderModal from './FeetCanvasBuilderModal';

interface FootMapCanvasProps {
  onSaveAnnotation?: (payloadString: string) => void;
  initialAnnotation?: string; // Base64 image or stringified JSON snapshot
}

type ActiveTool = 'draw' | 'erase' | ClinicalSymbolShape;

export const FootMapCanvas: React.FC<FootMapCanvasProps> = ({ 
  onSaveAnnotation,
  initialAnnotation 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444');
  const [activeTool, setActiveTool] = useState<ActiveTool>('draw');
  const [activeSymbolId, setActiveSymbolId] = useState<string | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [canvasBackgroundSrc, setCanvasBackgroundSrc] = useState<string>(feetMapImg);
  const [symbols, setSymbols] = useState<ClinicalSymbolDef[]>(DEFAULT_CLINICAL_SYMBOLS);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const hasLoadedInitial = useRef(false);

  // Load custom feet canvas template and symbols
  const loadActiveTemplate = () => {
    window.api.getCustomFeetMapBase64().then(customBase64 => {
      if (customBase64) {
        setCanvasBackgroundSrc(customBase64);
      } else {
        setCanvasBackgroundSrc(feetMapImg);
      }
    }).catch(console.error);

    window.api.getSetting('custom_feet_symbols_legend').then(symStr => {
      if (symStr) {
        try {
          const parsed = JSON.parse(symStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSymbols(parsed);
          }
        } catch (e) {
          console.error('Falha ao carregar símbolos:', e);
        }
      }
    }).catch(console.error);
  };

  useEffect(() => {
    loadActiveTemplate();

    const handleTemplateUpdated = () => {
      loadActiveTemplate();
    };

    window.addEventListener('podonly-feet-template-updated', handleTemplateUpdated);
    return () => {
      window.removeEventListener('podonly-feet-template-updated', handleTemplateUpdated);
    };
  }, []);

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

  // Load initial annotation with backward-compatibility for historical snapshots
  useEffect(() => {
    if (initialAnnotation && canvasRef.current && isCanvasReady && !hasLoadedInitial.current) {
      hasLoadedInitial.current = true;
      let drawingSrc = initialAnnotation;

      // Detect if initialAnnotation is a JSON snapshot containing preserved background
      if (initialAnnotation.trim().startsWith('{')) {
        try {
          const snapshot = JSON.parse(initialAnnotation) as FootMapSnapshotPayload;
          if (snapshot.background) {
            setCanvasBackgroundSrc(snapshot.background);
          }
          if (snapshot.symbols && Array.isArray(snapshot.symbols)) {
            setSymbols(snapshot.symbols);
          }
          drawingSrc = snapshot.drawing || snapshot.composite || '';
        } catch (err) {
          console.warn('Falha ao analisar snapshot de histórico do mapa dos pés:', err);
        }
      }

      if (drawingSrc) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        };
        img.src = drawingSrc;
      }
    }
  }, [initialAnnotation, isCanvasReady]);

  // Helper to trigger save with composite & historical preservation snapshot
  const triggerSave = () => {
    if (!onSaveAnnotation) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const drawingDataUrl = canvas.toDataURL('image/png');

    // Create offscreen canvas to generate flattened composite with the background
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width || 800;
    offscreen.height = canvas.height || 600;
    const ctx = offscreen.getContext('2d');

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.onload = () => {
      if (ctx) {
        ctx.drawImage(bgImg, 0, 0, offscreen.width, offscreen.height);
        ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
        const compositeDataUrl = offscreen.toDataURL('image/png');

        const snapshot: FootMapSnapshotPayload = {
          version: 2,
          composite: compositeDataUrl,
          drawing: drawingDataUrl,
          background: canvasBackgroundSrc,
          symbols: symbols,
          createdAt: new Date().toISOString()
        };

        onSaveAnnotation(JSON.stringify(snapshot));
      }
    };
    bgImg.onerror = () => {
      const snapshot: FootMapSnapshotPayload = {
        version: 2,
        composite: drawingDataUrl,
        drawing: drawingDataUrl,
        background: canvasBackgroundSrc,
        symbols: symbols,
        createdAt: new Date().toISOString()
      };
      onSaveAnnotation(JSON.stringify(snapshot));
    };
    bgImg.src = canvasBackgroundSrc;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (activeTool !== 'draw' && activeTool !== 'erase') {
      drawStamp(e, activeTool);
      return;
    }
    
    setIsDrawing(true);
    draw(e);
  };

  const drawStamp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, stampShape: ClinicalSymbolShape) => {
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

    switch (stampShape) {
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
      case 'cross':
        const thickness = 5;
        ctx.rect(x - size, y - thickness / 2, size * 2, thickness);
        ctx.rect(x - thickness / 2, y - size, thickness, size * 2);
        ctx.fill();
        break;
      case 'pin':
        ctx.arc(x, y - size * 0.4, size * 0.7, Math.PI * 0.8, Math.PI * 0.2, true);
        ctx.lineTo(x, y + size);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(x, y - size * 0.4, size * 0.28, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'star':
      default:
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

    triggerSave();
  };

  const finishDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
      triggerSave();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    
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
      triggerSave();
    }
  };

  const renderShapeIcon = (shape: ClinicalSymbolShape, iconColor: string) => {
    switch (shape) {
      case 'star':
        return <Star size={16} color={iconColor} fill={iconColor} />;
      case 'circle':
        return <Circle size={16} color={iconColor} fill={iconColor} />;
      case 'square':
        return <Square size={16} color={iconColor} fill={iconColor} />;
      case 'triangle':
        return <Triangle size={16} color={iconColor} fill={iconColor} />;
      case 'diamond':
        return <Diamond size={16} color={iconColor} fill={iconColor} />;
      case 'plus':
      case 'cross':
        return <Plus size={16} color={iconColor} strokeWidth={3} />;
      case 'pin':
      default:
        return <MapPin size={16} color={iconColor} fill={iconColor} />;
    }
  };

  const handleSelectSymbol = (sym: ClinicalSymbolDef) => {
    setActiveTool(sym.shape);
    setActiveSymbolId(sym.id);
    setColor(sym.defaultColor);
  };

  return (
    <div className="foot-map-container">
      {/* Toolbar */}
      <div className="foot-map-toolbar">
        <div className="color-picker-wrapper" title="Escolher cor ativa">
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
          onClick={() => {
            setActiveTool('draw');
            setActiveSymbolId(null);
          }}
          title="Desenhar Livre (Traço)"
        >
          <Pen size={16} />
        </button>

        <button 
          type="button"
          className={`tool-btn ${activeTool === 'erase' ? 'active' : ''}`}
          onClick={() => {
            setActiveTool('erase');
            setActiveSymbolId(null);
          }}
          title="Borracha"
        >
          <Eraser size={16} />
        </button>

        <div style={{ width: '1px', height: '24px', backgroundColor: '#cbd5e1', margin: '0 4px' }} />

        {/* Dynamic Clinical Symbols from User's Legend */}
        {symbols.map(sym => (
          <button
            key={sym.id}
            type="button"
            className={`tool-btn ${activeSymbolId === sym.id ? 'active' : ''}`}
            onClick={() => handleSelectSymbol(sym)}
            title={`${sym.label} (${sym.shape})`}
          >
            {renderShapeIcon(sym.shape, sym.defaultColor)}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Button to open Builder Modal */}
        <button
          type="button"
          className="tool-btn"
          onClick={() => setShowBuilderModal(true)}
          title="Personalizar Diagrama dos Pés, Cores & Legendas"
          style={{ width: 'auto', padding: '0 10px', gap: '5px', color: 'var(--accent-color)', borderColor: 'rgba(14, 145, 168, 0.3)' }}
        >
          <Sliders size={14} /> Personalizar
        </button>

        <button 
          type="button"
          className="tool-btn danger"
          onClick={clearCanvas}
          title="Limpar todas as marcações do mapa"
        >
          <Trash2 size={16} /> Limpar
        </button>
      </div>

      {/* Main Canvas Viewport */}
      <div className="canvas-wrapper" ref={containerRef}>
        <img 
          src={canvasBackgroundSrc} 
          alt="Mapa dos pés" 
          className="canvas-background"
          onError={() => {
            console.warn('Falha ao carregar diagrama dos pés, restaurando imagem padrão...');
            setCanvasBackgroundSrc(feetMapImg);
          }}
          onLoad={() => {
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

      {/* Dynamic Clinical Legend Box */}
      <div className="foot-map-legend-box">
        <div className="foot-map-legend-header">
          <span className="foot-map-legend-title">
            <Tag size={13} color="var(--accent-color)" /> Legenda Clínico-Podológica
          </span>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Clique em um símbolo na legenda para ativá-lo
          </span>
        </div>
        <div className="foot-map-legend-grid">
          {symbols.map(sym => (
            <div
              key={sym.id}
              className={`foot-map-legend-pill ${activeSymbolId === sym.id ? 'active' : ''}`}
              onClick={() => handleSelectSymbol(sym)}
              title={`Selecionar ${sym.label}`}
            >
              {renderShapeIcon(sym.shape, sym.defaultColor)}
              <span>{sym.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Builder Modal */}
      {showBuilderModal && (
        <FeetCanvasBuilderModal
          isOpen={showBuilderModal}
          onClose={() => setShowBuilderModal(false)}
          onTemplateSaved={() => {
            loadActiveTemplate();
          }}
        />
      )}
    </div>
  );
};

export default FootMapCanvas;
