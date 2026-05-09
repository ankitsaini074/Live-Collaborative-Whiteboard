import { useState } from 'react';
import { useCanvasStore, COLORS, NOTE_COLORS } from '../store/canvasStore';
import type { ToolType } from '../store/canvasStore';

const TOOLS: { type: ToolType; icon: string; label: string }[] = [
  { type: 'brush', icon: '✏️', label: 'Brush' },
  { type: 'eraser', icon: '🧹', label: 'Eraser' },
  { type: 'rect', icon: '⬜', label: 'Rectangle' },
  { type: 'circle', icon: '⭕', label: 'Circle' },
  { type: 'line', icon: '📏', label: 'Line' },
  { type: 'arrow', icon: '➡️', label: 'Arrow' },
  { type: 'text', icon: '📝', label: 'Text' },
  { type: 'note', icon: '📌', label: 'Sticky Note' },
];

export function Toolbar() {
  const {
    currentColor,
    currentSize,
    currentTool,
    setColor,
    setSize,
    setTool,
  } = useCanvasStore();

  const isEraser = currentTool === 'eraser';
  const [showColors, setShowColors] = useState(false);
  const [showSize, setShowSize] = useState(false);

  return (
    <>
      {/* Main toolbar - mobile friendly */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl p-2 sm:p-4 flex items-center gap-2 sm:gap-4 border border-gray-200 z-50 max-w-[95vw] overflow-x-auto">
        {/* Tool buttons */}
        <div className="flex gap-1 flex-shrink-0">
          {TOOLS.map((tool) => (
            <button
              key={tool.type}
              onClick={() => setTool(tool.type)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-lg sm:text-xl transition-all ${
                currentTool === tool.type
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        {/* Separator - hidden on very small screens */}
        <div className="hidden sm:block w-px h-8 bg-gray-300 flex-shrink-0" />

        {/* Color swatches - compact on mobile */}
        <div className="flex gap-1 flex-shrink-0">
          {COLORS.slice(0, 4).map((color) => (
            <button
              key={color}
              onClick={() => setColor(color)}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition-all flex-shrink-0 ${
                currentColor === color && !isEraser && currentTool !== 'note'
                  ? 'border-blue-500 scale-110 shadow-lg'
                  : 'border-gray-300 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          {/* More colors button on mobile */}
          <button
            onClick={() => setShowColors(!showColors)}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-500 hover:scale-105 transition-all flex-shrink-0"
            title="More colors"
          >
            +
          </button>
        </div>

        {/* Separator - hidden on very small screens */}
        <div className="hidden sm:block w-px h-8 bg-gray-300 flex-shrink-0" />

        {/* Brush size slider - compact on mobile */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <span className="hidden sm:inline text-xs text-gray-600">Size</span>
          <input
            type="range"
            min="1"
            max="20"
            value={currentSize}
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="w-16 sm:w-20"
            title={`Brush size: ${currentSize}px`}
          />
          <span className="text-xs text-gray-600 w-4">{currentSize}</span>
        </div>
      </div>

      {/* Expanded color palette (mobile overlay) */}
      {showColors && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl p-3 border border-gray-200 z-50">
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  setColor(color);
                  setShowColors(false);
                }}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  currentColor === color && !isEraser
                    ? 'border-blue-500 scale-110 shadow-lg'
                    : 'border-gray-300 hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
