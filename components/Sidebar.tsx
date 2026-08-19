
import React, { useState } from 'react';
import { RoomData, ViewState } from '../types';
import { PWAInstallBadge } from './PWAInstallBadge';

interface SidebarProps {
  rooms: RoomData[];
  currentView: ViewState;
  selectedRoomId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onViewChange: (view: ViewState) => void;
  onRoomSelect: (roomId: string) => void;
  onAddRoom: () => void;
  selectedLibraryCategory?: 'procedure' | 'medication' | 'disease';
  onLibraryCategorySelect?: (category: 'procedure' | 'medication' | 'disease') => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  rooms,
  currentView,
  selectedRoomId,
  isOpen,
  onClose,
  onViewChange,
  onRoomSelect,
  onAddRoom,
  selectedLibraryCategory = 'procedure',
  onLibraryCategorySelect
}) => {
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);

  const handleNav = (view: ViewState) => {
    onViewChange(view);
    onClose();
  };

  const handleRoomNav = (id: string) => {
    onRoomSelect(id);
    onClose();
  };

  const handleLibraryClick = () => {
    setIsLibraryOpen(prev => !prev);
    if (currentView !== 'library') {
      onViewChange('library');
    }
  };

  const handleCategoryClick = (category: 'procedure' | 'medication' | 'disease') => {
    if (onLibraryCategorySelect) {
      onLibraryCategorySelect(category);
    }
    onViewChange('library');
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <aside className={`fixed md:sticky top-0 left-0 z-50 w-72 bg-green-900 flex-shrink-0 flex flex-col h-screen transition-all duration-500 ease-in-out transform md:translate-x-0 ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-10 pb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-black text-white tracking-tighter leading-none">
              Duty<br/><span className="text-green-100 font-medium opacity-90">Companion</span>
            </h1>
          </div>
          <button onClick={onClose} className="md:hidden text-green-100 w-10 h-10 rounded-full hover:bg-green-800 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-8 pt-4 space-y-10 custom-scrollbar">
          <div>
            <p className="text-[10px] font-bold text-green-100 uppercase tracking-[0.2em] mb-4 px-4 opacity-70">Navigation</p>
            <div className="space-y-2">
              <button
                onClick={() => handleNav('directory')}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${
                  currentView === 'directory' ? 'bg-white text-green-900 shadow-md' : 'text-white hover:bg-green-800 hover:text-white'
                }`}
              >
                <i className="fas fa-address-book w-5 text-center text-inherit opacity-80"></i>
                <span className="text-[14px] font-bold tracking-tight">Room Directory</span>
              </button>

              {/* CLINICAL LIBRARY DROPDOWN */}
              <div className="space-y-1">
                <button
                  onClick={handleLibraryClick}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group ${
                    currentView === 'library' ? 'bg-green-800 text-white shadow-md ring-1 ring-white/20' : 'text-white hover:bg-green-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <i className="fas fa-book-medical w-5 text-center text-inherit opacity-80"></i>
                    <span className="text-[14px] font-bold tracking-tight">Clinical Library</span>
                  </div>
                  <i className={`fas fa-chevron-down text-xs text-green-200 transition-transform duration-200 ${isLibraryOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {isLibraryOpen && (
                  <div className="pl-4 pr-1 py-1.5 space-y-1 bg-green-950/40 rounded-2xl border border-green-800/40 animate-in fade-in slide-in-from-top-1 duration-200">
                    <button
                      onClick={() => handleCategoryClick('procedure')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                        currentView === 'library' && selectedLibraryCategory === 'procedure'
                          ? 'bg-white text-green-900 shadow-sm'
                          : 'text-green-100/90 hover:bg-green-800 hover:text-white'
                      }`}
                    >
                      <i className="fas fa-procedures w-4 text-center text-xs opacity-75"></i>
                      <span>Procedures</span>
                    </button>
                    <button
                      onClick={() => handleCategoryClick('medication')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                        currentView === 'library' && selectedLibraryCategory === 'medication'
                          ? 'bg-white text-green-900 shadow-sm'
                          : 'text-green-100/90 hover:bg-green-800 hover:text-white'
                      }`}
                    >
                      <i className="fas fa-pills w-4 text-center text-xs opacity-75"></i>
                      <span>Medications</span>
                    </button>
                    <button
                      onClick={() => handleCategoryClick('disease')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                        currentView === 'library' && selectedLibraryCategory === 'disease'
                          ? 'bg-white text-green-900 shadow-sm'
                          : 'text-green-100/90 hover:bg-green-800 hover:text-white'
                      }`}
                    >
                      <i className="fas fa-heartbeat w-4 text-center text-xs opacity-75"></i>
                      <span>Diseases</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleNav('tools')}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${
                  currentView === 'tools' ? 'bg-white text-green-900 shadow-md' : 'text-white hover:bg-green-800 hover:text-white'
                }`}
              >
                <i className="fas fa-toolbox w-5 text-center text-inherit opacity-80"></i>
                <span className="text-[14px] font-bold tracking-tight">Clinical Tools</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4 px-4">
              <p className="text-[10px] font-bold text-green-100 uppercase tracking-[0.2em] opacity-70">Patient Rooms</p>
              <button 
                onClick={onAddRoom}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-green-800 text-white hover:bg-white hover:text-green-900 transition-all active:scale-90 shadow-sm"
                title="Register Bed"
              >
                <i className="fas fa-plus text-[10px]"></i>
              </button>
            </div>
            <div className="space-y-1.5">
              {rooms.length === 0 ? (
                <div className="px-6 py-8 border border-dashed border-green-700/50 rounded-2xl text-center">
                  <p className="text-[10px] text-green-100/60 font-medium uppercase tracking-[0.1em]">No rooms assigned</p>
                </div>
              ) : (
                rooms.map((room) => (
                  <button 
                    key={room.id}
                    onClick={() => handleRoomNav(room.id)}
                    className={`w-full text-left px-5 py-3.5 rounded-2xl text-[14px] transition-all flex items-center justify-between group/room ${
                      selectedRoomId === room.id 
                        ? 'bg-green-800 text-white font-bold ring-1 ring-green-400/30' 
                        : room.status === 'inactive'
                          ? 'bg-slate-900/60 text-slate-500 border border-slate-800/50'
                          : 'text-green-50 hover:bg-green-800 hover:text-white'
                    }`}
                  >
                    <span className="truncate tracking-tight font-semibold">
                      Room {room.roomNumber}
                    </span>
                    {room.status === 'inactive' && (
                      <span className="text-[7px] font-black uppercase tracking-tighter bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700/50">Inactive</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </nav>

        {/* PWA & OFFLINE STATUS BADGE */}
        <div className="p-6 pt-0">
          <PWAInstallBadge />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
