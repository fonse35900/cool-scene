'use client';

export default function DateInput({ value, onChange, className }) {
  function setToday() {
    const today = new Date().toISOString().split('T')[0];
    onChange(today);
  }

  return (
    <div className="flex gap-1 items-center">
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={className}
      />
      <button
        type="button"
        onClick={setToday}
        title="Hoje"
        className="shrink-0 text-xs px-2 py-1.5 bg-octane-dark border border-octane-border rounded text-octane-gold hover:bg-octane-gold hover:text-octane-black transition-colors whitespace-nowrap"
      >
        Hoje
      </button>
    </div>
  );
}
