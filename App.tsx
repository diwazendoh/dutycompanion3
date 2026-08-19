
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RoomData, ViewState, Task, ClinicalTemplate } from './types';
import { STORAGE_KEY, getInitialRoomData } from './constants';
import Sidebar from './components/Sidebar';
import RoomDashboard from './components/RoomDashboard';
import { ClinicalLibrary } from './components/ClinicalLibrary';
import { ClinicalTools } from './components/ClinicalTools';
import ReminderModal from './components/ReminderModal';
import { parseTaskDueDate, playAlertChime, DueAlertItem } from './services/reminderService';
import { subscribeRooms, subscribeTemplates, saveRoomToFirestore, deleteRoomFromFirestore } from './services/firebaseService';

const App: React.FC = () => {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('directory');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [isQuickTaskModalOpen, setIsQuickTaskModalOpen] = useState(false);
  
  // REMINDER STATE
  const [reminderMinutes, setReminderMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('shift_reminder_mins');
    return saved ? parseInt(saved, 10) : 15;
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('shift_reminder_sound');
    return saved ? saved === 'true' : true;
  });
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(false);
  const [dismissedTaskIds, setDismissedTaskIds] = useState<Set<string>>(new Set());
  const [snoozedUntilMap, setSnoozedUntilMap] = useState<Map<string, number>>(new Map());
  const [activeAlerts, setActiveAlerts] = useState<DueAlertItem[]>([]);
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
  const prevAlertCountRef = useRef(0);
  
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [quickTaskData, setQuickTaskData] = useState({ roomId: '', task: '', timeDue: '' });
  const [searchFilter, setSearchFilter] = useState('');
  const [libraryCategory, setLibraryCategory] = useState<'procedure' | 'medication' | 'disease'>('procedure');

  const [overviewDate, setOverviewDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [overviewShift, setOverviewShift] = useState<'6-2' | '2-10' | '10-6'>(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return '6-2';
    if (hour >= 14 && hour < 22) return '2-10';
    return '10-6';
  });

  const handleOverviewShiftChange = (newShift: '6-2' | '2-10' | '10-6') => {
    setOverviewShift(newShift);
    // Automatically reset all active rooms altogether for the new shift
    const updatedRooms = (Array.isArray(rooms) ? rooms : []).map(r => {
      if (r.status !== 'active') return r;
      return {
        ...r,
        shiftEndorsement: {
          date: overviewDate,
          shift: newShift,
          previousShiftEndorsement: '',
          myShiftEvents: ''
        },
        clinicalAssessment: undefined,
        tasks: [],
        lastUpdated: new Date().toISOString()
      };
    });
    setRooms(updatedRooms);
    updatedRooms.forEach(room => {
      if (room.status === 'active') {
        saveRoomToFirestore(room);
      }
    });
  };

  const handleOverviewDateChange = (newDate: string) => {
    setOverviewDate(newDate);
    const updatedRooms = (Array.isArray(rooms) ? rooms : []).map(r => {
      if (r.status !== 'active') return r;
      return {
        ...r,
        shiftEndorsement: {
          date: newDate,
          shift: overviewShift,
          previousShiftEndorsement: r.shiftEndorsement?.previousShiftEndorsement || '',
          myShiftEvents: r.shiftEndorsement?.myShiftEvents || ''
        },
        lastUpdated: new Date().toISOString()
      };
    });
    setRooms(updatedRooms);
    updatedRooms.forEach(room => {
      if (room.status === 'active') {
        saveRoomToFirestore(room);
      }
    });
  };

  const handleClearRoomDirectly = (roomToClear: RoomData) => {
    if (!window.confirm(`Clear all patient data for Room ${roomToClear.roomNumber}?`)) return;
    const clearedRoom: RoomData = {
      ...roomToClear,
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
    setRooms(prev => prev.map(r => r.id === roomToClear.id ? clearedRoom : r));
    saveRoomToFirestore(clearedRoom);
  };

  // Save Reminder Settings
  const updateReminderMinutes = (mins: number) => {
    setReminderMinutes(mins);
    localStorage.setItem('shift_reminder_mins', mins.toString());
  };

  const toggleSoundEnabled = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('shift_reminder_sound', newVal.toString());
  };

  // Initial Real-time Sync with Firestore (supports Offline IndexedDB)
  useEffect(() => {
    const unsubscribe = subscribeRooms((realtimeRooms) => {
      const safeRooms = Array.isArray(realtimeRooms) ? realtimeRooms : [];
      setRooms(safeRooms);
      setIsLoaded(true);
      // Backup to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(safeRooms));
      } catch (e) {
        console.error("Local storage sync error:", e);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync Clinical Templates from Firestore
  useEffect(() => {
    const unsub = subscribeTemplates((realtimeTemplates) => {
      setTemplates(realtimeTemplates || []);
    });
    return () => unsub();
  }, []);

  // Periodic Reminder Checker Loop (Runs every 5 seconds)
  useEffect(() => {
    const checkReminders = () => {
      if (!isLoaded || !Array.isArray(rooms) || rooms.length === 0) return;
      const nowTime = Date.now();
      const dueList: DueAlertItem[] = [];

      rooms.forEach(room => {
        if (!room || room.status === 'inactive') return;
        (room.tasks || []).forEach(task => {
          if (task.isCompleted || !task.timeDue) return;
          if (dismissedTaskIds.has(task.id)) return;

          const snoozed = snoozedUntilMap.get(task.id);
          if (snoozed && snoozed > nowTime) return;

          const dueDate = parseTaskDueDate(task.timeDue);
          if (!dueDate) return;

          const diffMs = dueDate.getTime() - nowTime;
          const minsRemaining = Math.floor(diffMs / 60000);

          // Alert if within configured reminder time (e.g. <= 15 min) or overdue up to 180 min
          if (minsRemaining <= reminderMinutes && minsRemaining >= -180) {
            dueList.push({
              taskId: task.id,
              taskDescription: task.description,
              roomId: room.id,
              roomNumber: room.roomNumber || '',
              timeDue: task.timeDue,
              createdAt: task.createdAt,
              minsRemaining
            });
          }
        });
      });

      if (dueList.length > prevAlertCountRef.current && soundEnabled) {
        playAlertChime();
      }
      prevAlertCountRef.current = dueList.length;
      setActiveAlerts(dueList);
    };

    checkReminders();
    const interval = setInterval(checkReminders, 5000);
    return () => clearInterval(interval);
  }, [rooms, isLoaded, reminderMinutes, soundEnabled, dismissedTaskIds, snoozedUntilMap]);

  const handleMarkAlertDone = (taskId: string, roomId: string) => {
    toggleTask(roomId, taskId);
    setDismissedTaskIds(prev => new Set(prev).add(taskId));
  };

  const handleSnoozeAlert = (taskId: string, mins: number = 10) => {
    setSnoozedUntilMap(prev => {
      const next = new Map(prev);
      next.set(taskId, Date.now() + mins * 60000);
      return next;
    });
  };

  const handleDismissAlert = (taskId: string) => {
    setDismissedTaskIds(prev => new Set(prev).add(taskId));
  };

  const handleGoToAlertRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setCurrentView('room-detail');
  };

  // Priority Sorting Logic
  const sortedRooms = useMemo(() => {
    const safe = Array.isArray(rooms) ? rooms : [];
    return [...safe].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1;
      }
      return (a.roomNumber || '').toString().localeCompare((b.roomNumber || '').toString(), undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [rooms]);

  const handleAddRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNum = newRoomNumber.trim();
    if (!cleanNum) return;
    
    if (Array.isArray(rooms) && rooms.some(r => r.roomNumber === cleanNum)) {
      alert(`Room ${cleanNum} is already assigned!`);
      return;
    }

    const newRoom: RoomData = {
      ...getInitialRoomData(),
      id: "rm_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      roomNumber: cleanNum,
      lastUpdated: new Date().toISOString()
    } as RoomData;

    saveRoomToFirestore(newRoom);
    setSelectedRoomId(newRoom.id);
    setCurrentView('room-detail');
    setIsAddRoomModalOpen(false);
    setNewRoomNumber('');
  };

  const updateRoom = (updatedRoom: RoomData) => {
    const roomWithDate = { ...updatedRoom, lastUpdated: new Date().toISOString() };
    saveRoomToFirestore(roomWithDate);
  };

  const toggleTask = (roomId: string, taskId: string) => {
    if (!Array.isArray(rooms)) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

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

    const updatedRoom = { ...room, tasks: updatedTasks, lastUpdated: new Date().toISOString() };
    saveRoomToFirestore(updatedRoom);
  };

  const deleteTask = useCallback((taskId: string) => {
    if (!selectedRoomId || !Array.isArray(rooms)) return;
    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return;

    const updatedTasks = (room.tasks || []).filter(t => t.id !== taskId);
    const updatedRoom = { ...room, tasks: updatedTasks, lastUpdated: new Date().toISOString() };
    saveRoomToFirestore(updatedRoom);
  }, [rooms, selectedRoomId]);

  const handleQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    const { roomId, task, timeDue } = quickTaskData;
    if (!roomId || !task.trim() || !Array.isArray(rooms)) return;

    const nowIso = new Date().toISOString();

    if (roomId === 'routine') {
      const activeRms = rooms.filter(r => r.status === 'active');
      const targetRooms = activeRms.length > 0 ? activeRms : rooms;

      targetRooms.forEach(room => {
        const newTask: Task = {
          id: "tk_rtn_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
          description: `[ROUTINE] ${task.trim()}`,
          isCompleted: false,
          createdAt: nowIso,
          timeDue: timeDue ? timeDue : undefined
        };
        const updatedRoom = { ...room, tasks: [...(room.tasks || []), newTask], lastUpdated: nowIso };
        saveRoomToFirestore(updatedRoom);
      });
    } else {
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      const newTask: Task = {
        id: "tk_" + Date.now(),
        description: task.trim(),
        isCompleted: false,
        createdAt: nowIso,
        timeDue: timeDue ? timeDue : undefined
      };

      const updatedRoom = { ...room, tasks: [...(room.tasks || []), newTask], lastUpdated: nowIso };
      saveRoomToFirestore(updatedRoom);
    }

    setQuickTaskData({ roomId: '', task: '', timeDue: '' });
    setIsQuickTaskModalOpen(false);
  };

  const activeRoom = Array.isArray(rooms) ? rooms.find(r => r.id === selectedRoomId) : undefined;

  const allTasks = useMemo(() => {
    if (!Array.isArray(rooms)) return [];
    return rooms.flatMap(r => (r.tasks || []).map(t => ({ ...t, roomNumber: r.roomNumber || '', roomId: r.id })))
                .sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [rooms]);

  const filteredDirectory = useMemo(() => {
    if (!searchFilter.trim()) return sortedRooms;
    const query = searchFilter.toLowerCase();
    return sortedRooms.filter(r => 
      r.roomNumber.toLowerCase().includes(query) ||
      (r.tasks || []).some(t => t.description.toLowerCase().includes(query))
    );
  }, [sortedRooms, searchFilter]);

  return (
    <div className="flex min-h-screen bg-[#FDFDFD] font-sans text-slate-900 selection:bg-green-100 selection:text-green-900">
      <Sidebar 
        rooms={sortedRooms}
        currentView={currentView}
        selectedRoomId={selectedRoomId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onViewChange={setCurrentView}
        onRoomSelect={(id) => { setSelectedRoomId(id); setCurrentView('room-detail'); }}
        onAddRoom={() => setIsAddRoomModalOpen(true)}
        selectedLibraryCategory={libraryCategory}
        onLibraryCategorySelect={(cat) => {
          setLibraryCategory(cat);
          setCurrentView('library');
        }}
      />

      <main className="flex-1 p-5 md:p-10 overflow-y-auto h-screen max-w-7xl mx-auto w-full">
        <header className="mb-12 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-green-700 hover:bg-green-50 w-11 h-11 rounded-2xl flex items-center justify-center transition-colors">
              <i className="fas fa-bars text-xl"></i>
            </button>
            <div>
              <p className="text-[10px] font-bold text-green-800 uppercase tracking-[0.25em] mb-1 opacity-80">Duty Companion</p>
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                {currentView === 'directory' 
                  ? 'Room Directory' 
                  : currentView === 'library'
                    ? 'Clinical Library'
                    : currentView === 'tools'
                      ? 'Clinical Tools'
                      : activeRoom 
                        ? `Room ${activeRoom.roomNumber}` 
                        : 'Room Detail'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsReminderSettingsOpen(true)}
              className="bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/80 px-4 py-3 rounded-[1.25rem] text-[11px] font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
              title="Configure task reminder alerts"
            >
              <i className="fas fa-bell text-amber-600"></i>
              <span>{reminderMinutes}m Reminder</span>
              {activeAlerts.length > 0 && (
                <span className="bg-rose-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {activeAlerts.length}
                </span>
              )}
            </button>
            <button onClick={() => setIsQuickTaskModalOpen(true)} className="bg-green-800 text-white w-12 h-12 rounded-[1.25rem] hover:bg-green-900 shadow-sm hover:shadow-green-700/20 flex items-center justify-center transition-all active:scale-95 group">
              <i className="fas fa-plus text-sm group-hover:scale-110 transition-transform"></i>
            </button>
          </div>
        </header>

        {currentView === 'directory' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
            {/* STATION SHIFT CONTROLS ON ROOM DIRECTORY */}
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-800 shadow-2xs">
                  <i className="fas fa-calendar-check text-base"></i>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Station Shift Controls</h4>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100">
                  <i className="fas fa-calendar-alt text-green-800 text-xs"></i>
                  <span className="text-[10px] font-black uppercase text-slate-400">Date:</span>
                  <input
                    type="date"
                    value={overviewDate}
                    onChange={(e) => handleOverviewDateChange(e.target.value)}
                    className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  <i className="fas fa-clock text-green-800 text-xs ml-2"></i>
                  <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Shift:</span>
                  {(['6-2', '2-10', '10-6'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleOverviewShiftChange(s)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        overviewShift === s
                          ? 'bg-green-800 text-white shadow-md shadow-green-900/20 scale-105'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SEARCH AND DIRECTORY CONTROLS */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="bg-white px-8 py-4 rounded-3xl flex items-center gap-5 border border-slate-100 shadow-sm w-full max-w-2xl focus-within:ring-4 focus-within:ring-green-800/5 transition-all">
                <i className="fas fa-search text-slate-300"></i>
                <input 
                  type="text" 
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search by Room or Task..." 
                  className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-semibold text-slate-700 py-1"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsAddRoomModalOpen(true)}
                className="bg-green-800 hover:bg-green-900 text-white px-6 py-4 rounded-3xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <i className="fas fa-plus text-xs"></i>
                <span>Register Bed</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDirectory.map(room => {
                const roomTasks = room.tasks || [];
                const completedCount = roomTasks.filter(t => t.isCompleted).length;

                return (
                  <div 
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      setCurrentView('room-detail');
                    }}
                    className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-green-400/30 cursor-pointer hover:shadow-xl transition-all shadow-sm group flex flex-col h-full relative ${
                      room.status === 'inactive' ? 'opacity-60 bg-slate-50/50 grayscale-[0.2]' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-4">
                          <h3 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">
                            {room.roomNumber}
                          </h3>
                          <div className={`w-2.5 h-2.5 rounded-full ${room.status === 'active' ? 'bg-green-800 shadow-[0_0_12px_rgba(20,83,45,0.5)] animate-pulse' : 'bg-slate-200'}`}></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          room.status === 'active' ? 'bg-green-800 text-white shadow-lg shadow-green-900/20' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {room.status === 'active' ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 flex-1">
                       {/* SHIFT TASKS DISPLAY */}
                       <div className="bg-slate-50/60 p-5 rounded-3xl border border-slate-100/80">
                         <div className="flex items-center justify-between mb-3">
                           <label className="text-[10px] font-black text-green-800 uppercase tracking-[0.2em] flex items-center gap-2">
                             <i className="fas fa-tasks text-[11px]"></i> Shift Tasks
                           </label>
                           <span className="text-[10px] font-black text-slate-400 bg-white px-2.5 py-0.5 rounded-full border border-slate-100 uppercase">
                             {completedCount}/{roomTasks.length} Done
                           </span>
                         </div>

                         {roomTasks.length === 0 ? (
                           <p className="text-[13px] font-semibold text-slate-300 italic py-1">No shift tasks assigned</p>
                         ) : (
                           <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                             {roomTasks.map((t) => (
                               <div 
                                 key={t.id} 
                                 onClick={(e) => e.stopPropagation()}
                                 className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-slate-100/80 shadow-2xs hover:border-green-200 transition-all"
                               >
                                 <input 
                                   type="checkbox" 
                                   checked={t.isCompleted} 
                                   onChange={() => toggleTask(room.id, t.id)}
                                   className="mt-0.5 w-4 h-4 rounded text-green-700 border-slate-200 cursor-pointer focus:ring-0"
                                 />
                                 <div className="flex-1 min-w-0">
                                   <p className={`text-[13px] font-bold leading-tight truncate ${t.isCompleted ? 'line-through text-slate-300' : 'text-slate-800'}`}>
                                     {t.description}
                                   </p>
                                   {t.timeDue && (
                                     <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mt-1 border border-amber-100">
                                       <i className="far fa-clock text-[9px]"></i> Due {t.timeDue}
                                     </span>
                                   )}
                                 </div>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                    </div>
                    
                    <div className="mt-8 pt-5 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-300">
                        <i className="far fa-clock text-[10px]"></i>
                        <span className="text-[10px] font-black uppercase tracking-tight">Updated {new Date(room.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-green-800 transition-all group-hover:shadow-lg group-hover:shadow-green-900/20">
                        <i className="fas fa-arrow-right text-slate-200 group-hover:text-white text-xs transition-all group-hover:translate-x-0.5"></i>
                      </div>
                    </div>
                  </div>
                );
              })}
             </div>
          </div>
        )}

        {currentView === 'room-detail' && activeRoom && (
          <RoomDashboard 
            room={activeRoom} 
            onUpdate={updateRoom} 
            onDeleteTask={deleteTask}
            templates={templates}
          />
        )}

        {currentView === 'library' && (
          <ClinicalLibrary 
            templates={templates} 
            rooms={rooms}
            selectedCategory={libraryCategory}
            onCategoryChange={setLibraryCategory}
          />
        )}

        {currentView === 'tools' && (
          <ClinicalTools 
            rooms={rooms} 
            onUpdateRoom={updateRoom} 
          />
        )}
      </main>

      {/* MODALS */}
      {isAddRoomModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-sm p-12 animate-in zoom-in-95 duration-300">
            <div className="text-center mb-10">
              <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter">New Room</h3>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Entry bed or station ID</p>
            </div>
            <form onSubmit={handleAddRoom} className="space-y-10">
              <div className="relative group">
                <input 
                  autoFocus 
                  type="text" 
                  required 
                  value={newRoomNumber} 
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  placeholder="000"
                  className="w-full bg-slate-50 border border-slate-100 rounded-[2.5rem] p-10 text-7xl text-center font-black text-green-950 outline-none focus:bg-white focus:ring-[15px] focus:ring-green-700/5 focus:border-green-700/40 transition-all placeholder:text-slate-100"
                />
              </div>
              <div className="flex flex-col gap-4">
                <button type="submit" className="w-full bg-green-700 text-white py-6 rounded-[1.75rem] font-black shadow-2xl shadow-green-700/30 uppercase text-[12px] tracking-[0.2em] hover:bg-green-800 hover:-translate-y-1 transition-all active:scale-95">Assign Bed</button>
                <button type="button" onClick={() => setIsAddRoomModalOpen(false)} className="w-full py-2 font-black text-slate-300 text-[10px] uppercase tracking-widest hover:text-slate-500 transition-colors">Discard Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isQuickTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-sm p-12 animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-slate-900 mb-10 uppercase tracking-widest text-center">Rapid Log Entry</h3>
            <form onSubmit={handleQuickTask} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Identity</label>
                 <select 
                  required 
                  value={quickTaskData.roomId} 
                  onChange={(e) => setQuickTaskData({ ...quickTaskData, roomId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-black text-[15px] outline-none focus:bg-white focus:ring-8 focus:ring-green-700/5 focus:border-green-700/40 transition-all appearance-none"
                >
                  <option value="">Select Bed / Scope</option>
                  <option value="routine">📋 Routine (All Active Rooms)</option>
                  {sortedRooms.map(r => <option key={r.id} value={r.id}>Room {r.roomNumber}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Task Details</label>
                <textarea 
                  required 
                  rows={3} 
                  value={quickTaskData.task} 
                  onChange={(e) => setQuickTaskData({ ...quickTaskData, task: e.target.value })}
                  placeholder="Order, med, or observation..." 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 font-semibold text-[16px] outline-none focus:bg-white focus:ring-8 focus:ring-green-700/5 focus:border-green-700/40 transition-all resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Optional Time Due</label>
                <input 
                  type="time" 
                  value={quickTaskData.timeDue} 
                  onChange={(e) => setQuickTaskData({ ...quickTaskData, timeDue: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold text-[15px] text-slate-800 outline-none focus:bg-white focus:ring-8 focus:ring-green-700/5 focus:border-green-700/40 transition-all cursor-pointer"
                />
              </div>
              <div className="pt-4 flex flex-col gap-4">
                <button type="submit" className="w-full bg-green-700 text-white py-6 rounded-2xl font-black shadow-xl shadow-green-700/10 uppercase text-[12px] tracking-[0.2em] hover:bg-green-800 transition-all active:scale-95">Add Log</button>
                <button type="button" onClick={() => setIsQuickTaskModalOpen(false)} className="w-full py-2 font-black text-slate-300 text-[10px] uppercase tracking-widest hover:text-slate-500 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORGANIZED REMINDER PANEL SYNCHRONIZED WITH COLOR SCHEME */}
      {activeAlerts.length > 0 && (
        <ReminderModal
          alerts={activeAlerts}
          reminderMinutes={reminderMinutes}
          onToggleTask={(roomId, taskId) => toggleTask(roomId, taskId)}
          onSnoozeTask={(taskId, mins) => handleSnoozeAlert(taskId, mins)}
          onDismissTask={(taskId) => handleDismissAlert(taskId)}
          onGoToRoom={(roomId) => handleGoToAlertRoom(roomId)}
          onClose={() => handleDismissAlert(activeAlerts[0]?.taskId)}
        />
      )}

      {/* REMINDER CONFIGURATION SETTINGS MODAL */}
      {isReminderSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[150] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 duration-200 space-y-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-4">
                <i className="fas fa-bell"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">REMINDER SYSTEM SETTINGS</h3>
              <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mt-1">Configure pop-up alert lead time</p>
            </div>

            {/* MINUTES SELECTOR */}
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Reminder Lead Time (Before Time Due)</label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15, 20, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => updateReminderMinutes(mins)}
                    className={`py-3 rounded-2xl font-black text-sm uppercase transition-all ${
                      reminderMinutes === mins
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                        : 'bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-bold text-slate-500">Custom minutes:</span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={reminderMinutes}
                  onChange={(e) => updateReminderMinutes(Math.max(1, parseInt(e.target.value, 10) || 15))}
                  className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-center text-sm outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* AUDIO TONE TOGGLE */}
            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
              <div>
                <span className="text-xs font-black uppercase text-slate-800 block">Sound Alert Chime</span>
                <span className="text-[11px] font-bold text-slate-400">Play audio chime when reminder pops up</span>
              </div>
              <button
                type="button"
                onClick={toggleSoundEnabled}
                className={`w-12 h-7 rounded-full transition-colors relative p-1 ${soundEnabled ? 'bg-amber-500' : 'bg-slate-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsReminderSettingsOpen(false)}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-wider hover:bg-slate-800 transition-all active:scale-95"
            >
              Save & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
