import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Check, AlertTriangle, ChevronDown, ChevronUp, Search, Info } from 'lucide-react';
import { calculateTimetableCapacity } from '@/utils/timetableCalculations';
import { showToast } from '@/components/ui/toast';

export default function SmartGenerateModal({
  open,
  onClose,
  config,
  setConfig,
  subjects,
  classrooms,
  onConfirm,
  generating
}) {

  // Filter valid subjects
  const validSubjects = subjects.filter(s => s.subject_code !== 'LIB-FREE');
  const theorySubjectsAll = validSubjects.filter(s => s.type !== 'lab' && s.type !== 'Laboratory' && !s.requires_lab);
  const labSubjectsAll = validSubjects.filter(s => s.type === 'lab' || s.type === 'Laboratory' || s.requires_lab);

  // States
  const [includeTheory, setIncludeTheory] = useState(true);
  const [includeLabs, setIncludeLabs] = useState(true);
  const [includeLibrary, setIncludeLibrary] = useState(false);
  
  const [selectedTheory, setSelectedTheory] = useState(
    new Set(theorySubjectsAll.map(s => s._id))
  );
  const [selectedLabs, setSelectedLabs] = useState(
    new Set(labSubjectsAll.map(s => s._id))
  );
  
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [libraryPeriodsRequired, setLibraryPeriodsRequired] = useState(0);
  
  const [theoryOpen, setTheoryOpen] = useState(true);
  const [labsOpen, setLabsOpen] = useState(true);

  // Sync state if master switches toggle
  useEffect(() => {
    if (!includeTheory) setSelectedTheory(new Set());
    else setSelectedTheory(new Set(theorySubjectsAll.map(s => s._id)));
  }, [includeTheory, theorySubjectsAll.length]);

  useEffect(() => {
    if (!includeLabs) setSelectedLabs(new Set());
    else setSelectedLabs(new Set(labSubjectsAll.map(s => s._id)));
  }, [includeLabs, labSubjectsAll.length]);

  // Derived Summary metrics
  const selectedTheoryList = theorySubjectsAll.filter(s => selectedTheory.has(s._id));
  const selectedLabsList = labSubjectsAll.filter(s => selectedLabs.has(s._id));
  
  const totalTheoryPeriods = selectedTheoryList.reduce((acc, s) => acc + (s.requiredPeriods || s.weekly_periods || 3), 0);
  const totalLabPeriods = selectedLabsList.reduce((acc, s) => acc + (s.lab_duration_slots || s.weekly_periods || 2), 0);
  const totalRequiredPeriods = totalTheoryPeriods + totalLabPeriods + (includeLibrary ? libraryPeriodsRequired : 0);
  
  const { totalSlots, occupiedSlots, remainingSlots } = calculateTimetableCapacity(
    config?.holidays ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].filter(d => !config.holidays.includes(d)) : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    ['09:30-10:25', '10:25-11:20', '12:20-13:15', '13:15-14:10', '14:30-15:25', '15:25-16:20'],
    { theorySlots: totalTheoryPeriods, labSlots: totalLabPeriods, librarySlots: libraryPeriodsRequired }
  );

  const requiredTeachers = new Set([
    ...selectedTheoryList.map(s => s.teacherId),
    ...selectedLabsList.map(s => s.teacherId)
  ]).size; // Rough estimate based on mapped teachers
  
  const handleToggleTheory = (id) => {
    const next = new Set(selectedTheory);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTheory(next);
  };

  const handleToggleLab = (id) => {
    const next = new Set(selectedLabs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLabs(next);
  };
  
  const filteredTheory = theorySubjectsAll.filter(s => 
    s.subject_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredLabs = labSubjectsAll.filter(s => 
    s.subject_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGenerateClick = () => {
    if (!includeTheory && !includeLabs && !includeLibrary) {
      showToast('Please select timetable components before generating.', 'error');
      return;
    }

    onConfirm({
      includeTheory,
      includeLabs,
      includeLibrary,
      libraryPeriodsRequired,
      selectedTheorySubjects: Array.from(selectedTheory),
      selectedLabSubjects: Array.from(selectedLabs),
      randomSeed: true,
      mode: config?.mode || 'full'
    });
  };

  const renderSubjectRow = (s, isLab, isSelected, toggle) => {
    const isExpanded = expandedSubject === s._id;
    const hasTeacher = !!s.teacherId;
    const hasRoom = classrooms.length > 0; // Rough proxy, can be refined based on allowed_rooms

    return (
      <div key={s._id} className="border border-slate-100 rounded-lg mb-2 overflow-hidden bg-white hover:border-indigo-200 transition-colors">
        <div className="flex items-center p-3 gap-4">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={() => toggle(s._id)}
            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{s.subject_code}</span>
              <span className="text-slate-600 font-medium">{s.subject_name}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                {s.primaryTeacherName ? `Teacher: ${s.primaryTeacherName}` : 'No Teacher Mapped'}
              </span>
              <span>{isLab ? `${s.lab_duration_slots || 2} Consecutive Slots` : `${s.requiredPeriods || s.weekly_periods || 3} periods/week`}</span>
              {s.credits && <span>{s.credits} Credits</span>}
            </div>
          </div>
          
          <div className="flex gap-2">
            {hasTeacher ? (
              <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-xs flex items-center gap-1 font-medium"><Check size={14}/> Teacher</span>
            ) : (
              <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-xs flex items-center gap-1 font-medium"><AlertTriangle size={14}/> Missing Teacher</span>
            )}
          </div>
          
          <button 
            onClick={() => setExpandedSubject(isExpanded ? null : s._id)}
            className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
        
        {isExpanded && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs uppercase font-bold mb-1">Details</p>
              <p><strong>Department:</strong> {s.department}</p>
              <p><strong>Semester:</strong> {s.semester}</p>
              <p><strong>Room Type:</strong> {isLab ? 'Laboratory' : 'Theory Room'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase font-bold mb-1">Mappings</p>
              <p><strong>Primary:</strong> {s.primaryTeacherName || 'None'}</p>
              <p><strong>Substitutes:</strong> {(s.mappedTeachers && s.mappedTeachers.length > 1) ? s.mappedTeachers.length - 1 : 'None'}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-indigo-100 overflow-hidden animate-scaleIn flex flex-col h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Smart Timetable Generator</h2>
            <p className="text-indigo-200 text-sm">Configure subjects for automatic allocation</p>
          </div>
          <button onClick={onClose} className="ml-auto text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Top Summary */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
              {selectedTheory.size + selectedLabs.size}
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Selected Subjects</p>
              <p className="text-slate-800 font-bold text-xs">{selectedTheory.size} Theory, {selectedLabs.size} Labs</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
              {totalRequiredPeriods}
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Required Sessions</p>
              <p className="text-slate-800 font-bold text-xs">{totalRequiredPeriods} / {totalSlots || 36} slots</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-lg">
              {Math.min(100, Math.round((totalRequiredPeriods / Math.max(1, totalSlots || 36)) * 100))}%
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Projected Density</p>
              <p className="text-slate-800 font-bold text-xs">{(totalSlots || 36) - totalRequiredPeriods} Free slots</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-lg">
              {requiredTeachers || selectedTheory.size + selectedLabs.size}
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Faculty Mapped</p>
              <p className="text-slate-800 font-bold text-xs">{config?.mode === 'fill' ? 'Smart Fill' : 'Full Rebuild'}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
          {/* Master Controls & Search */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                  checked={includeTheory}
                  onChange={(e) => setIncludeTheory(e.target.checked)}
                />
                <span className="font-bold text-slate-700">Include Theory Subjects</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                  checked={includeLabs}
                  onChange={(e) => setIncludeLabs(e.target.checked)}
                />
                <span className="font-bold text-slate-700">Include Lab Subjects</span>
              </label>
            </div>
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search subjects..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section 1: Theory Subjects */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button 
              className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 hover:bg-slate-100 transition-colors"
              onClick={() => setTheoryOpen(!theoryOpen)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  {theorySubjectsAll.length}
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Theory Subjects</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                  {selectedTheory.size} Selected
                </span>
                {theoryOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
              </div>
            </button>
            
            {theoryOpen && (
              <div className="p-4">
                {filteredTheory.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No theory subjects found</div>
                ) : (
                  filteredTheory.map(s => renderSubjectRow(s, false, selectedTheory.has(s._id), handleToggleTheory))
                )}
              </div>
            )}
          </div>

          {/* Section 2: Lab Subjects */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button 
              className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 hover:bg-slate-100 transition-colors"
              onClick={() => setLabsOpen(!labsOpen)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  {labSubjectsAll.length}
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Lab Subjects</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                  {selectedLabs.size} Selected
                </span>
                {labsOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
              </div>
            </button>
            
            {labsOpen && (
              <div className="p-4">
                {filteredLabs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No lab subjects found</div>
                ) : (
                  filteredLabs.map(s => renderSubjectRow(s, true, selectedLabs.has(s._id), handleToggleLab))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Library Configuration */}
        <div className="bg-white border-t border-slate-200 p-5 shrink-0 flex items-center gap-6">
          <div className="flex-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={includeLibrary}
                onChange={(e) => {
                  setIncludeLibrary(e.target.checked);
                  if (!e.target.checked) setLibraryPeriodsRequired(0);
                }}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <span className="text-base font-bold text-slate-800 flex items-center gap-2">
                📚 Include Library / Self Study Periods
              </span>
            </label>
            <p className="text-slate-500 text-sm mt-1 ml-8">
              Allocate specific periods for library time.
            </p>
          </div>
          {includeLibrary && (
            <div className="flex items-center gap-3">
              <label className="text-slate-700 font-bold text-sm">How many library periods required?</label>
              <input 
                type="number"
                min="0"
                max="36"
                value={libraryPeriodsRequired}
                onChange={(e) => setLibraryPeriodsRequired(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>


        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-5 shrink-0 flex items-center justify-between">
          <div className="flex gap-6">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase">Theory</p>
              <p className="text-indigo-600 font-bold text-lg">{selectedTheory.size} <span className="text-slate-400 text-sm font-normal">/ {theorySubjectsAll.length}</span></p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase">Labs</p>
              <p className="text-purple-600 font-bold text-lg">{selectedLabs.size} <span className="text-slate-400 text-sm font-normal">/ {labSubjectsAll.length}</span></p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase">Projected Density</p>
              <p className="text-emerald-600 font-bold text-lg">
                {Math.round((occupiedSlots / Math.max(1, totalSlots)) * 100)}%
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              disabled={generating}
              className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleGenerateClick}
              disabled={generating || (selectedTheory.size === 0 && selectedLabs.size === 0)}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Generating...</>
              ) : (
                <><Sparkles size={18} /> Generate Schedule</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
