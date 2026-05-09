import { useState } from 'react';
import { useCanvasStore, COLORS, type ToolType } from '../store/canvasStore';

const TOOLS: { type: ToolType; icon: React.ReactNode; label: string }[] = [
  {
    type: 'brush',
    label: 'Brush',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    type: 'eraser',
    label: 'Eraser',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L17.5 6.5a2.121 2.121 0 00-3-3L3 15l3 3zm0 0h7.5" />
      </svg>
    ),
  },
  {
    type: 'rect',
    label: 'Rectangle',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <rect x="3" y="5" width="18" height="14" rx="1" strokeWidth={2} />
      </svg>
    ),
  },
  {
    type: 'circle',
    label: 'Circle',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
      </svg>
    ),
  },
  {
    type: 'line',
    label: 'Line',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <line x1="4" y1="20" x2="20" y2="4" strokeWidth={2} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type: 'arrow',
    label: 'Arrow',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19L19 5m0 0H9m10 0v10" />
      </svg>
    ),
  },
  {
    type: 'text',
    label: 'Text',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H6a1 1 0 00-1 1v14a1 1 0 001 1h12a1 1 0 001-1v-5M16 3l4 4-8 8H8v-4l8-8z" />
      </svg>
    ),
  },
  {
    type: 'note',
    label: 'Sticky Note',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export function Toolbar() {
  const { currentColor, currentSize, currentTool, setColor, setSize, setTool } = useCanvasStore();
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <>
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2">
          {/* Tools */}
          <div className="flex items-center gap-0.5">
            {TOOLS.map((tool) => (
              <button
                key={tool.type}
                onClick={() => setTool(tool.type)}
                title={tool.label}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-100 ${
                  currentTool === tool.type
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          <div className="w-px h-7 bg-gray-200 mx-1" />

          {/* Active color swatch + picker toggle */}
          <div className="relative flex items-center gap-1">
            {COLORS.slice(0, 5).map((color) => (
              <button
                key={color}
                onClick={() => { setColor(color); setShowColorPicker(false); }}
                title={color}
                className="w-6 h-6 rounded-full border-2 transition-all duration-100 hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: currentColor === color && currentTool !== 'eraser' ? '#3b82f6' : 'transparent',
                  boxShadow: currentColor === color && currentTool !== 'eraser' ? '0 0 0 2px #bfdbfe' : color === '#ffffff' ? 'inset 0 0 0 1px #e5e7eb' : 'none',
                  transform: currentColor === color && currentTool !== 'eraser' ? 'scale(1.15)' : undefined,
                }}
              />
            ))}
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="More colors"
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                showColorPicker ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="w-px h-7 bg-gray-200 mx-1" />

          {/* Brush size */}
          <div className="flex items-center gap-2 px-1">
            <div
              className="rounded-full bg-gray-800 shrink-0"
              style={{ width: `${Math.max(4, currentSize)}px`, height: `${Math.max(4, currentSize)}px`, maxWidth: '20px', maxHeight: '20px' }}
            />
            <input
              type="range"
              min="1"
              max="24"
              value={currentSize}
              onChange={(e) => setSize(parseInt(e.target.value))}
              className="w-20 accent-blue-600"
              title={`Size: ${currentSize}px`}
            />
            <span className="text-xs text-gray-400 w-5 text-right">{currentSize}</span>
          </div>
        </div>
      </div>

      {/* Expanded color palette */}
      {showColorPicker && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3">
          <div className="grid grid-cols-5 gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => { setColor(color); setShowColorPicker(false); }}
                className="w-8 h-8 rounded-full border-2 transition-all duration-100 hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: currentColor === color ? '#3b82f6' : 'transparent',
                  boxShadow: color === '#ffffff' ? 'inset 0 0 0 1px #e5e7eb' : 'none',
                }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
