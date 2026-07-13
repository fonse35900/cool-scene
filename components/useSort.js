import { useState, useMemo } from 'react';

export function useSort(data, defaultCol, defaultDir = 'asc') {
  const [sort, setSort] = useState({ col: defaultCol, dir: defaultDir });

  function toggle(col) {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
  }

  const sorted = useMemo(() => {
    if (!data) return data;
    return [...data].sort((a, b) => {
      let av = a[sort.col] ?? '';
      let bv = b[sort.col] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sort]);

  return { sorted, sort, toggle };
}

export function Th({ label, col, sort, toggle, className = '' }) {
  const active = sort.col === col;
  return (
    <th
      className={`text-left p-3 font-medium text-xs uppercase tracking-wider cursor-pointer select-none whitespace-nowrap group ${className}`}
      onClick={() => toggle(col)}>
      <span className={active ? 'text-octane-gold' : 'text-octane-gray group-hover:text-octane-white transition-colors'}>
        {label}
        <span className="ml-1 inline-block w-3 text-center">
          {active ? (sort.dir === 'asc' ? '↑' : '↓') : <span className="text-octane-border opacity-60">↕</span>}
        </span>
      </span>
    </th>
  );
}

export function SmallTh({ label, col, sort, toggle, className = '' }) {
  const active = sort.col === col;
  return (
    <th
      className={`text-left pb-2 pr-3 font-medium text-xs uppercase tracking-wider cursor-pointer select-none whitespace-nowrap group ${className}`}
      onClick={() => toggle(col)}>
      <span className={active ? 'text-octane-gold' : 'text-octane-gray group-hover:text-octane-white transition-colors'}>
        {label}
        <span className="ml-1 inline-block w-3 text-center">
          {active ? (sort.dir === 'asc' ? '↑' : '↓') : <span className="text-octane-border opacity-60">↕</span>}
        </span>
      </span>
    </th>
  );
}
