export default function SummaryStat({ label, value, icon, color = 'indigo' }) {
  const colorMap = {
    indigo: 'from-indigo-600/20 to-indigo-400/10',
    green: 'from-emerald-600/20 to-emerald-400/10',
    amber: 'from-amber-600/20 to-amber-400/10',
    slate: 'from-slate-600/20 to-slate-400/10',
    blue: 'from-blue-600/20 to-blue-400/10',
    red: 'from-rose-600/20 to-rose-400/10',
  };
  const bg = colorMap[color] || colorMap.indigo;
  return (
    <div className={`card p-4 bg-gradient-to-br ${bg} border border-zinc-800/60`}> 
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-center text-gray-300">
            {icon}
          </div>
        )}
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
          <div className="mt-0.5 text-2xl font-semibold text-gray-100">{value}</div>
        </div>
      </div>
    </div>
  );
}
