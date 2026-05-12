import { useRef, useState } from 'react';
import { useCanvasStore, COLORS, type ToolType } from '../store/canvasStore';
import { resizeImageDataUrl } from '../lib/canvas';
import { sendAddImage } from '../lib/socket';

interface Tool {
  type: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

const TOOLS: Tool[] = [
  {
    type: 'hand',
    label: 'Pan',
    shortcut: 'H',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
      </svg>
    ),
  },
  {
    type: 'brush',
    label: 'Brush',
    shortcut: 'B',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    type: 'eraser',
    label: 'Eraser',
    shortcut: 'E',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L17.5 6.5a2.121 2.121 0 00-3-3L3 15l3 3zm0 0h7.5" />
      </svg>
    ),
  },
  {
    type: 'rect',
    label: 'Rectangle',
    shortcut: 'R',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <rect x="3" y="5" width="18" height="14" rx="1" strokeWidth={2} />
      </svg>
    ),
  },
  {
    type: 'circle',
    label: 'Circle',
    shortcut: 'C',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
      </svg>
    ),
  },
  {
    type: 'line',
    label: 'Line',
    shortcut: 'L',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <line x1="4" y1="20" x2="20" y2="4" strokeWidth={2} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type: 'arrow',
    label: 'Arrow',
    shortcut: 'A',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19L19 5m0 0H9m10 0v10" />
      </svg>
    ),
  },
  {
    type: 'text',
    label: 'Text',
    shortcut: 'T',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
  },
  {
    type: 'note',
    label: 'Sticky Note',
    shortcut: 'N',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export function Toolbar({ darkMode }: { darkMode?: boolean }) {
  const { currentColor, currentSize, currentTool, setColor, setSize, setTool, roomId, userId, addImage } = useCanvasStore();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      const dataUrl = await resizeImageDataUrl(raw);
      const img = new Image();
      img.onload = () => {
        const imageId = crypto.randomUUID();
        const { zoom, pan } = useCanvasStore.getState();
        const x = (200 - pan.x) / zoom;
        const y = (200 - pan.y) / zoom;
        const payload = { imageId, type: 'image' as const, x, y, width: img.width, height: img.height, dataUrl };
        addImage(payload);
        if (roomId) {
          sendAddImage({ roomId, userId, imageId, x, y, width: img.width, height: img.height, dataUrl });
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const panelBase = darkMode
    ? 'bg-gray-900 border-gray-700 shadow-2xl shadow-black/40'
    : 'bg-white border-gray-100 shadow-2xl';

  const divider = darkMode ? 'bg-gray-700' : 'bg-gray-200';

  return (
    <>
      {/* Main toolbar — bottom center */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-in">
        <div className={`flex items-center gap-1 rounded-2xl border p-1.5 max-w-[95vw] overflow-x-auto ${panelBase}`}>

          {/* Tools */}
          <div className="flex items-center gap-0.5 shrink-0">
            {TOOLS.map((tool) => (
              <ToolButton
                key={tool.type}
                tool={tool}
                isActive={currentTool === tool.type}
                darkMode={darkMode}
                onClick={() => setTool(tool.type)}
              />
            ))}
          </div>

          <div className={`w-px h-7 ${divider} mx-0.5 shrink-0`} />

          {/* Image upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload image"
            data-tooltip="Upload image"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              darkMode
                ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <div className={`w-px h-7 ${divider} mx-0.5 shrink-0`} />

          {/* Colors */}
          <div className="relative flex items-center gap-1 shrink-0">
            {COLORS.slice(0, 5).map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                isActive={currentColor === color && currentTool !== 'eraser'}
                onClick={() => { setColor(color); setShowColorPicker(false); }}
              />
            ))}
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="More colors"
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                showColorPicker
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : darkMode
                    ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <svg className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>

          <div className={`w-px h-7 ${divider} mx-0.5 shrink-0 hidden sm:block`} />

          {/* Brush size */}
          <div className="hidden sm:flex items-center gap-2 px-1 shrink-0">
            <div
              className={`rounded-full shrink-0 ${darkMode ? 'bg-gray-300' : 'bg-gray-800'}`}
              style={{ width: `${Math.max(4, Math.min(currentSize, 18))}px`, height: `${Math.max(4, Math.min(currentSize, 18))}px` }}
            />
            <input
              type="range"
              min="1"
              max="24"
              value={currentSize}
              onChange={(e) => setSize(parseInt(e.target.value))}
              className="w-20 accent-blue-500"
              title={`Size: ${currentSize}px`}
            />
            <span className={`text-xs w-5 text-right tabular-nums ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>{currentSize}</span>
          </div>
        </div>
      </div>

      {/* Mobile size slider */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 sm:hidden">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${panelBase}`}>
          <div
            className={`rounded-full shrink-0 ${darkMode ? 'bg-gray-300' : 'bg-gray-800'}`}
            style={{ width: `${Math.max(4, Math.min(currentSize, 18))}px`, height: `${Math.max(4, Math.min(currentSize, 18))}px` }}
          />
          <input
            type="range"
            min="1"
            max="24"
            value={currentSize}
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="w-32 accent-blue-500"
          />
          <span className={`text-xs tabular-nums ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>{currentSize}px</span>
        </div>
      </div>

      {/* Expanded color palette */}
      {showColorPicker && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-2xl border p-3 animate-slide-in ${panelBase}`}>
          <div className="grid grid-cols-5 gap-2">
            {COLORS.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                isActive={currentColor === color}
                size="lg"
                onClick={() => { setColor(color); setShowColorPicker(false); }}
              />
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => { setColor(e.target.value); }}
              className="w-full h-8 rounded cursor-pointer border border-gray-200 dark:border-gray-600"
              title="Custom color"
            />
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
          e.target.value = '';
        }}
      />
    </>
  );
}

function ToolButton({ tool, isActive, darkMode, onClick }: {
  tool: Tool;
  isActive: boolean;
  darkMode?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-100 shrink-0 ${
        isActive
          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
          : darkMode
            ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700'
            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
      }`}
    >
      {tool.icon}
    </button>
  );
}

function ColorSwatch({ color, isActive, onClick, size = 'sm' }: {
  color: string;
  isActive: boolean;
  onClick: () => void;
  size?: 'sm' | 'lg';
}) {
  const dim = size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return (
    <button
      onClick={onClick}
      title={color}
      className={`${dim} rounded-full border-2 transition-all duration-100 hover:scale-110`}
      style={{
        backgroundColor: color,
        borderColor: isActive ? '#3b82f6' : 'transparent',
        boxShadow: isActive
          ? '0 0 0 2px #bfdbfe'
          : color === '#ffffff' ? 'inset 0 0 0 1px #e5e7eb' : 'none',
        transform: isActive ? 'scale(1.15)' : undefined,
      }}
    />
  );
}
