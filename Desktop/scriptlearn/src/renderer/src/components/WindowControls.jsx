export default function WindowControls({ className = '' }) {
  const minimize = () => window.electronAPI.window.minimize()
  const maximize = () => window.electronAPI.window.maximize()
  const close    = () => window.electronAPI.window.close()

  return (
    <div
      className={`flex items-center ${className}`}
      style={{ WebkitAppRegion: 'no-drag' }}
    >
      <button
        onClick={minimize}
        title="Réduire"
        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#232640] transition-colors text-base leading-none rounded"
      >
        ─
      </button>
      <button
        onClick={maximize}
        title="Agrandir / Restaurer"
        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#232640] transition-colors text-xs leading-none rounded"
      >
        ⬜
      </button>
      <button
        onClick={close}
        title="Fermer"
        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-red-500/80 transition-colors text-base leading-none rounded"
      >
        ✕
      </button>
    </div>
  )
}
