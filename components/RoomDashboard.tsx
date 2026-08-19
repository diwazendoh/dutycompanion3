import React, { useState, useMemo } from 'react';
import { RoomData, Task, ClinicalAssessment, RoomMedication, ClinicalTemplate } from '../types';
import { saveTemplateToFirestore } from '../services/firebaseService';
import NurseNotesChecklist from './NurseNotesChecklist';

interface RoomDashboardProps {
  room: RoomData;
  onUpdate: (updatedRoom: RoomData) => void;
  onDeleteTask: (taskId: string) => void;
  templates?: ClinicalTemplate[];
}

const RoomDashboard: React.FC<RoomDashboardProps> = ({ room, onUpdate, onDeleteTask, templates = [] }) => {
  const [newTask, setNewTask] = useState('');
  const [newTaskTimeDue, setNewTaskTimeDue] = useState('');
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Medication Panel State
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false);
  const [selectedLibraryTemplateId, setSelectedLibraryTemplateId] = useState('');
  const [newMedName, setNewMedName] = useState('');
  const [newMedInstructions, setNewMedInstructions] = useState('');
  const [newMedSubsteps, setNewMedSubsteps] = useState<string[]>(['']);

  const [medTaskModalData, setMedTaskModalData] = useState<{
    medication: RoomMedication;
    targetTime: string;
    taskDescription: string;
    substeps: string[];
  } | null>(null);

  const handleSelectLibraryTemplate = (tmplId: string) => {
    setSelectedLibraryTemplateId(tmplId);
    if (!tmplId) return;
    const tmpl = templates.find(t => t.id === tmplId);
    if (tmpl) {
      setNewMedName(tmpl.title);
      setNewMedInstructions(tmpl.description || '');
      setNewMedSubsteps(tmpl.steps && tmpl.steps.length > 0 ? tmpl.steps.map(s => s.text) : ['']);
    }
  };

  const handleSaveNewMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) return;

    const nowIso = new Date().toISOString();
    const cleanedSubsteps = newMedSubsteps.map(s => s.trim()).filter(Boolean);

    const newMed: RoomMedication = {
      id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: newMedName.trim(),
      frequency: 'Q8H',
      scheduleTimes: [],
      instructions: newMedInstructions.trim() || undefined,
      substeps: cleanedSubsteps.length > 0 ? cleanedSubsteps : undefined,
      createdAt: nowIso
    };

    // 1. Add to current room medications
    onUpdate({ ...room, medications: [...(room.medications || []), newMed] });

    // 2. Automatically sync and save to Clinical Library as medication template
    try {
      const templateId = selectedLibraryTemplateId || `tmpl_med_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const newTemplate: ClinicalTemplate = {
        id: templateId,
        title: newMedName.trim(),
        type: 'medication',
        description: newMedInstructions.trim() || undefined,
        steps: cleanedSubsteps.map((st, idx) => ({ id: `step_${idx}_${Date.now()}`, text: st })),
        isCustom: true
      };
      await saveTemplateToFirestore(newTemplate);
    } catch (err) {
      console.error("Error saving medication template to library:", err);
    }

    // Reset form & close modal
    setSelectedLibraryTemplateId('');
    setNewMedName('');
    setNewMedInstructions('');
    setNewMedSubsteps(['']);
    setIsAddMedModalOpen(false);
  };

  const handleDeleteMedication = (medId: string) => {
    const updatedMeds = (room.medications || []).filter(m => m.id !== medId);
    onUpdate({ ...room, medications: updatedMeds });
  };

  const handlePrepareMedTask = (med: RoomMedication) => {
    setMedTaskModalData({
      medication: med,
      targetTime: '',
      taskDescription: med.name,
      substeps: med.substeps || (med.instructions ? [med.instructions] : [])
    });
  };

  const handleConfirmAddMedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medTaskModalData) return;

    const task: Task = {
      id: `tk_med_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      description: medTaskModalData.taskDescription,
      substeps: medTaskModalData.substeps.length > 0 ? medTaskModalData.substeps : undefined,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      timeDue: medTaskModalData.targetTime.trim() || undefined
    };

    onUpdate({ ...room, tasks: [...(room.tasks || []), task] });
    setMedTaskModalData(null);
  };

  const handleClearRoomData = () => {
    const clearedRoom: RoomData = {
      ...room,
      status: 'inactive',
      diagnosis: '',
      doctors: '',
      history: [],
      ivFluid: '',
      ivFluidOther: '',
      regulation: '',
      sideDrips: '',
      contraptions: [],
      contraptionsOther: '',
      precautions: [],
      otherPrecaution: '',
      tasks: [],
      medications: [],
      clinicalAssessment: undefined,
      shiftEndorsement: undefined,
      lastUpdated: new Date().toISOString()
    };
    onUpdate(clearedRoom);
    setIsClearModalOpen(false);
  };

  const toggleExpandTask = (taskId: string) => {
    setExpandedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const sortedTasks = useMemo(
    () => [...(room.tasks || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [room.tasks]
  );

  const handleTaskToggle = (taskId: string) => {
    const updatedTasks = (room.tasks || []).map(t => {
      if (t.id === taskId) {
        const isCompleted = !t.isCompleted;
        return {
          ...t,
          isCompleted,
          completedAt: isCompleted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
        };
      }
      return t;
    });
    onUpdate({ ...room, tasks: updatedTasks });
  };

  const addTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTask.trim()) return;
    const task: Task = {
      id: "tk_" + Date.now(),
      description: newTask.trim(),
      isCompleted: false,
      createdAt: new Date().toISOString(),
      timeDue: newTaskTimeDue ? newTaskTimeDue : undefined
    };
    onUpdate({ ...room, tasks: [...(room.tasks || []), task] });
    setNewTask('');
    setNewTaskTimeDue('');
  };

  const handleInputChange = (field: keyof RoomData, value: any) => {
    onUpdate({ ...room, [field]: value });
  };

  const toggleStatus = () => {
    handleInputChange('status', room.status === 'active' ? 'inactive' : 'active');
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* MINIMAL ROOM TOP HEADER */}
      <div className="flex items-center justify-between bg-white px-8 py-5 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
            room.status === 'active' 
              ? 'bg-green-800 text-white shadow-md shadow-green-900/20' 
              : 'bg-slate-100 text-slate-400'
          }`}>
            {room.roomNumber}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Room {room.roomNumber}</h2>
            <p className="text-[11px] font-bold text-slate-400">Duty Companion</p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={toggleStatus}
            className={`text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              room.status === 'active' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100' 
                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
            }`}
            title="Click to toggle Active / Inactive"
          >
            <span className={`w-2 h-2 rounded-full ${room.status === 'active' ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`}></span>
            <span>{room.status === 'active' ? 'Active' : 'Inactive'}</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT GRID: SHIFT TASKS & MEDICATION PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* SHIFT TASKS CARD (2 COLS) */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-sm border border-slate-100 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-800 shadow-inner">
                <i className="fas fa-tasks text-lg"></i>
              </div>
              <span>Shift Tasks</span>
            </h3>
            <div className="text-[10px] font-black text-slate-500 bg-slate-50 px-4 py-2 rounded-full uppercase tracking-widest border border-slate-100">
              {room.tasks?.filter(t => t.isCompleted).length || 0} / {room.tasks?.length || 0} Done
            </div>
          </div>

          {/* Add Task Form */}
          <form onSubmit={addTask} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              value={newTask} 
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Log med, vital, or clinical order..." 
              className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:border-green-700/30 focus:bg-white focus:ring-4 focus:ring-green-700/5 outline-none font-semibold text-sm transition-all shadow-inner placeholder:text-slate-300"
            />
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 focus-within:border-green-700/30 focus-within:bg-white focus-within:ring-4 focus-within:ring-green-700/5 transition-all shadow-inner">
              <i className="far fa-clock text-slate-300 text-xs"></i>
              <input 
                type="time" 
                value={newTaskTimeDue} 
                onChange={(e) => setNewTaskTimeDue(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
                title="Optional Time Due"
              />
            </div>
            <button 
              type="submit" 
              className="bg-green-800 text-white px-8 py-4 rounded-2xl hover:bg-green-900 shadow-md shadow-green-800/20 hover:-translate-y-0.5 transition-all font-black text-xs uppercase tracking-widest active:scale-95 cursor-pointer whitespace-nowrap"
            >
              Add Task
            </button>
          </form>

          {/* Tasks List */}
          <div className="space-y-3">
            {sortedTasks.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                <i className="fas fa-clipboard-list text-2xl text-slate-200 mb-2 block"></i>
                <p className="text-slate-400 font-extrabold text-xs uppercase tracking-widest">No tasks logged for this room</p>
                <p className="text-slate-300 text-[11px] font-medium mt-1">Add tasks above or add from the medication panel</p>
              </div>
            ) : (
              sortedTasks.map((task) => {
                const hasSubsteps = task.substeps && task.substeps.length > 0;
                const isExpanded = expandedTaskIds.includes(task.id);

                return (
                  <div
                    key={task.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      task.isCompleted
                        ? 'bg-slate-50/60 border-slate-100 opacity-60'
                        : 'bg-white border-slate-100 shadow-2xs hover:border-slate-200'
                    }`}
                  >
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleTaskToggle(task.id)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            task.isCompleted
                              ? 'bg-green-800 border-green-800 text-white'
                              : 'border-slate-300 hover:border-green-700'
                          }`}
                        >
                          {task.isCompleted && <i className="fas fa-check text-[10px]"></i>}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold text-slate-900 leading-snug break-words ${task.isCompleted ? 'line-through text-slate-400' : ''}`}>
                            {task.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {task.timeDue && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                <i className="far fa-clock text-[9px]"></i>
                                {task.timeDue}
                              </span>
                            )}
                            {task.completedAt && (
                              <span className="text-[10px] font-bold text-slate-400">
                                Completed at {task.completedAt}
                              </span>
                            )}
                            {hasSubsteps && (
                              <button
                                type="button"
                                onClick={() => toggleExpandTask(task.id)}
                                className="text-[10px] font-bold text-green-800 hover:underline flex items-center gap-1 cursor-pointer ml-1"
                              >
                                <span>{task.substeps?.length} Safety Checks</span>
                                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[8px]`}></i>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-300 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer shrink-0"
                        title="Delete task"
                      >
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    </div>

                    {/* Expandable Substeps Accordion */}
                    {hasSubsteps && isExpanded && (
                      <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 space-y-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Nursing Considerations & Safety Checks:</span>
                        <ul className="space-y-1.5 text-xs text-slate-700">
                          {task.substeps?.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-slate-100">
                              <span className="w-4 h-4 rounded-full bg-green-800 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="font-medium text-slate-800 leading-snug">{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MEDICATION PANEL CARD (1 COL) */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center shadow-inner text-emerald-800 shrink-0">
                <i className="fas fa-pills text-base"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950 tracking-tight">Medication Panel</h3>
                <p className="text-slate-400 text-[11px] font-bold mt-0.5">Active room medications</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddMedModalOpen(true)}
              className="bg-emerald-800 text-white px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-emerald-900 transition-all active:scale-95 shadow-md shadow-emerald-800/20 flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fas fa-plus text-[9px]"></i> Add Med
            </button>
          </div>

          {/* List of Medications */}
          {(!room.medications || room.medications.length === 0) ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 px-4">
              <i className="fas fa-pills text-2xl text-slate-200 mb-2 block"></i>
              <p className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider">No active medications logged</p>
              <p className="text-slate-300 text-[10px] font-medium mt-1">Add medication or select from Clinical Library</p>
            </div>
          ) : (
            <div className="space-y-3">
              {room.medications.map((med) => (
                <div key={med.id} className="bg-slate-50/70 rounded-2xl border border-slate-100 p-4 flex items-center justify-between gap-3 hover:border-emerald-200/80 transition-all group shadow-2xs">
                  <h4 className="text-sm font-black text-slate-900 flex-1 leading-snug break-words">{med.name}</h4>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePrepareMedTask(med)}
                      className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Add to shift task"
                    >
                      <i className="fas fa-calendar-plus text-xs"></i>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteMedication(med.id)}
                      className="w-8 h-8 rounded-xl bg-transparent hover:bg-rose-50 text-slate-300 hover:text-rose-600 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                      title="Delete medication"
                    >
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* NURSE'S NOTES & CLINICAL ASSESSMENT CHECKLIST */}
      <div className="pt-2">
        <NurseNotesChecklist
          assessment={room.clinicalAssessment}
          roomNumber={room.roomNumber}
          onChange={(updated) => handleInputChange('clinicalAssessment', updated)}
        />
      </div>

      {/* CLEAR ROOM DATA ACTION BANNER AT END OF PAGE */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-slate-800">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">End of Admission / Clear Room</span>
          </div>
          <h4 className="text-xl sm:text-2xl font-black tracking-tight text-white">Reset & Clear Room {room.roomNumber} Data</h4>
          <p className="text-xs text-slate-400 font-medium max-w-xl">
            Wipe tasks, medications, systems assessments, and shift endorsements for this room.
          </p>
        </div>

        <button 
          type="button"
          onClick={() => setIsClearModalOpen(true)}
          className="px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.15em] bg-rose-600 hover:bg-rose-700 text-white transition-all flex items-center gap-3 cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95 shrink-0"
        >
          <i className="fas fa-broom text-sm"></i>
          <span>Clear Room Data</span>
        </button>
      </div>

      {/* CLEAR ROOM DATA CONFIRMATION MODAL */}
      {isClearModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-inner">
              <i className="fas fa-broom"></i>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Clear Room {room.roomNumber} Data?</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                This will wipe all data for Room <strong className="text-slate-800">{room.roomNumber}</strong>:
              </p>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-left text-[11px] font-semibold text-slate-600 space-y-1.5 mt-2">
                <p className="flex items-center gap-2"><i className="fas fa-check text-rose-500 text-[10px]"></i> All Shift Tasks & Times Due</p>
                <p className="flex items-center gap-2"><i className="fas fa-check text-rose-500 text-[10px]"></i> Active Room Medications</p>
                <p className="flex items-center gap-2"><i className="fas fa-check text-rose-500 text-[10px]"></i> Systems Assessment & Clinical Checklist</p>
                <p className="flex items-center gap-2"><i className="fas fa-check text-rose-500 text-[10px]"></i> Shift Endorsements & Handover Logs</p>
              </div>
              <p className="text-[11px] font-bold text-slate-400 pt-2">
                The room will remain registered and set to <span className="text-slate-600 font-extrabold">Inactive</span>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearRoomData}
                className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Clear Room Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEDICATION MODAL */}
      {isAddMedModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                  <i className="fas fa-pills text-lg"></i>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Add Medication</h3>
                  <p className="text-slate-400 text-xs font-bold">Linked to Clinical Library</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMedModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            <form onSubmit={handleSaveNewMedication} className="space-y-4">
              {/* SELECT FROM CLINICAL LIBRARY */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                  <span>Select from Clinical Library</span>
                  <span className="text-emerald-700 font-bold">Auto-fills details</span>
                </label>
                <select
                  value={selectedLibraryTemplateId}
                  onChange={(e) => handleSelectLibraryTemplate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-700/10 focus:border-emerald-700/40 transition-all cursor-pointer"
                >
                  <option value="">-- Create Custom or Select Template --</option>
                  {(templates || [])
                    .filter(t => t.type === 'medication')
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Medication Name *</label>
                <input
                  type="text"
                  required
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  placeholder="e.g., Paracetamol, Ceftriaxone, Insulin"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-700/10 focus:border-emerald-700/40 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instructions / Description</label>
                <textarea
                  rows={2}
                  value={newMedInstructions}
                  onChange={(e) => setNewMedInstructions(e.target.value)}
                  placeholder="Nursing instructions or clinical notes..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-700/10 focus:border-emerald-700/40 transition-all resize-none"
                />
              </div>

              {/* SAFETY CHECKS / SUBSTEPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nursing Considerations / Safety Checks</label>
                  <button
                    type="button"
                    onClick={() => setNewMedSubsteps([...newMedSubsteps, ''])}
                    className="text-[10px] font-bold text-emerald-800 hover:underline cursor-pointer"
                  >
                    + Add Step
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {newMedSubsteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-black text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => {
                          const next = [...newMedSubsteps];
                          next[idx] = e.target.value;
                          setNewMedSubsteps(next);
                        }}
                        placeholder={`Step ${idx + 1} check...`}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-emerald-700/40"
                      />
                      {newMedSubsteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewMedSubsteps(newMedSubsteps.filter((_, i) => i !== idx))}
                          className="text-slate-300 hover:text-rose-600 p-1 text-xs"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddMedModalOpen(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-800/20 cursor-pointer"
                >
                  Save & Add to Library
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEDICATION TO SHIFT TASK MODAL */}
      {medTaskModalData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                  <i className="fas fa-calendar-plus text-lg"></i>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Add to Shift Task</h3>
                  <p className="text-slate-400 text-xs font-bold">{medTaskModalData.medication.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMedTaskModalData(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            <form onSubmit={handleConfirmAddMedTask} className="space-y-4">
              <div className="bg-emerald-50/80 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold shrink-0">
                  <i className="fas fa-pills text-lg"></i>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">Medication Task</span>
                  <h4 className="text-sm font-black text-slate-900 leading-snug">{medTaskModalData.medication.name}</h4>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                  <span>Optional Time Due</span>
                  <span className="text-slate-400 font-normal text-[10px]">(e.g., 08:00 or leave blank)</span>
                </label>
                <input
                  type="text"
                  value={medTaskModalData.targetTime}
                  onChange={(e) => setMedTaskModalData({ ...medTaskModalData, targetTime: e.target.value })}
                  placeholder="e.g. 08:00 or leave blank"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-700/10 focus:border-emerald-700/40 transition-all"
                />
              </div>

              {medTaskModalData.substeps.length > 0 && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Attached Safety Checks ({medTaskModalData.substeps.length}):</span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {medTaskModalData.substeps.map((st, i) => (
                      <li key={i} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-100">
                        <span className="w-4 h-4 rounded-full bg-emerald-800 text-white font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <span className="font-medium text-slate-800 leading-snug">{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMedTaskModalData(null)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-800/20 cursor-pointer"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomDashboard;
