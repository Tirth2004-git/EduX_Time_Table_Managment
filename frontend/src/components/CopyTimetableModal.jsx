import React from 'react';
import { Copy, X, Loader } from 'lucide-react';
import { useMasterData } from '@/hooks/useMasterData';

function CopyTimetableModal({ open, onClose, sourceDivision, targetDivision, setTargetDivision, onConfirm, copying }) {
  const { divisions } = useMasterData();

  if (!open) return null;

  const handleCopy = () => {
    if (!targetDivision) {
      alert('Please select a target division');
      return;
    }
    if (targetDivision === sourceDivision) {
      alert('Cannot copy to the same division');
      return;
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-scaleIn flex flex-col">
        <div className="flex items-center gap-3 bg-slate-900 px-6 py-4 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Copy className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">Copy Timetable</h2>
            <p className="text-slate-400 text-xs">Duplicate schedule to another division</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white transition-colors bg-transparent border-0 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Source Division</label>
            <div className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-semibold">
              Division {divisions.find(d => d._id === sourceDivision)?.division_name || sourceDivision}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Target Division</label>
            <select
              value={targetDivision}
              onChange={(e) => setTargetDivision(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer"
            >
              <option value="">Select target division...</option>
              {divisions.filter(d => d._id !== sourceDivision).map(d => (
                <option key={d._id} value={d._id}>
                  Division {d.division_name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
              <span className="text-amber-500 font-bold">⚠</span> Existing slots in the target division will be overwritten.
            </p>
          </div>
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button 
            onClick={onClose} 
            className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors border-0 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            disabled={copying || !targetDivision}
            className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-black transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border-0 cursor-pointer flex items-center gap-2"
          >
            {copying ? (
              <><Loader className="w-4 h-4 animate-spin" /> Copying...</>
            ) : (
              <><Copy className="w-4 h-4" /> Confirm Copy</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CopyTimetableModal;
