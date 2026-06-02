export default function WindowControls({ className = '' }) {
  const minimize = () => window.electronAPI.window.minimize()
  const maximize = () => window.electronAPI.window.maximize()
  const close    = () => window.electronAPI.window.close()

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      style={{ WebkitAppRegion: 'no-drag' }}
    >
      <button
        onClick={minimize}
        title="Réduire"
        className="w-7 h-7 flex items-center justify-center text-[#3d3a34] hover:text-[#78716c] hover:bg-[#1c1c1a] transition-colors text-xs leading-none rounded-sm"
      >
        −
      </button>
      <button
        onClick={maximize}
        title="Agrandir / Restaurer"
        className="w-7 h-7 flex items-center justify-center text-[#3d3a34] hover:text-[#78716c] hover:bg-[#1c1c1a] transition-colors text-xs leading-none rounded-sm"
      >
        □
      </button>
      <button
        onClick={close}
        title="Fermer"
        className="w-7 h-7 flex items-center justify-center text-[#3d3a34] hover:text-[#f5f0e8] hover:bg-red-900/60 transition-colors text-xs leading-none rounded-sm"
      >
        ×
      </button>
    </div>
  )
}
