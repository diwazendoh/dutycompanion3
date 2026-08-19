import React from 'react';
import { DueAlertItem } from '../services/reminderService';

interface ReminderModalProps {
  alerts: DueAlertItem[];
  reminderMinutes: number;
  onToggleTask: (roomId: string, taskId: string) => void;
  onSnoozeTask: (taskId: string, mins?: number) => void;
  onDismissTask: (taskId: string) => void;
  onGoToRoom: (roomId: string) => void;
  onClose: () => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  alerts,
  reminderMinutes,
  onToggleTask,
  onSnoozeTask,
  onDismissTask,
  onGoToRoom,
  onClose
}) => {
  if (!alerts || alerts.length === 0) return null;

  // Group alerts by Room ID / Room Number
  const groupedByRoomMap = new Map<string, { roomId: string; roomNumber: string; items: DueAlertItem[] }>();
  alerts.forEach((item) => {
    if (!groupedByRoomMap.has(item.roomId)) {
      groupedByRoomMap.set(item.roomId, {
        roomId: item.roomId,
        roomNumber: item.roomNumber,
        items: []
      });
    }
    groupedByRoomMap.get(item.roomId)!.items.push(item);
  });

  const groupedRooms = Array.from(groupedByRoomMap.values());

  const handleMarkAllDone = () => {
    alerts.forEach((item) => {
      onToggleTask(item.roomId, item.taskId);
      onDismissTask(item.taskId);
    });
  };

  const handleSnoozeAll = (mins: number = 10) => {
    alerts.forEach((item) => {
      onSnoozeTask(item.taskId, mins);
    });
  };

  const handleDismissAll = () => {
    alerts.forEach((item) => {
      onDismissTask(item.taskId);
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* HEADER SYNCHRONIZED WITH APP COLOR SCHEME */}
        <div className="bg-green-800 p-6 text-white flex items-center justify-between border-b border-green-900/40">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300 text-xl shadow-inner">
              <i className="fas fa-bell animate-bounce"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight uppercase">DUE SHIFT TASKS</h3>
                <span className="bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full text-xs font-black">
                  {alerts.length} {alerts.length === 1 ? 'Task' : 'Tasks'}
                </span>
              </div>
              <p className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider mt-0.5">
                Alerts active within {reminderMinutes} minutes of due time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            title="Close reminder window"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* ORGANIZED SCROLLABLE LIST GROUPED BY ROOM */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
          {groupedRooms.map((group) => (
            <div key={group.roomId} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
              {/* ROOM SUBHEADER */}
              <div className="bg-green-50/90 border-b border-green-200/80 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-green-800 text-white flex items-center justify-center text-xs font-black shadow-xs">
                    <i className="fas fa-door-closed"></i>
                  </div>
                  <div>
                    <span className="text-xs font-black text-green-950 uppercase tracking-wide block">
                      Room {group.roomNumber}
                    </span>
                    <span className="text-[10px] font-extrabold text-green-800">
                      {group.items.length} pending {group.items.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onGoToRoom(group.roomId);
                    onClose();
                  }}
                  className="bg-white hover:bg-green-800 hover:text-white border border-green-700/30 text-green-900 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>View Room</span>
                  <i className="fas fa-arrow-right text-[10px]"></i>
                </button>
              </div>

              {/* CHECKABLE TASKS LIST IN ROOM */}
              <div className="divide-y divide-slate-200/70">
                {group.items.map((item) => {
                  const isOverdue = item.minsRemaining < 0;
                  return (
                    <div
                      key={item.taskId}
                      className="p-4 sm:p-5 flex items-start justify-between gap-4 bg-white hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-start gap-3.5 flex-1">
                        {/* INTERACTIVE CHECKBOX */}
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => {
                            onToggleTask(item.roomId, item.taskId);
                            onDismissTask(item.taskId);
                          }}
                          className="w-5 h-5 mt-0.5 rounded-lg text-green-700 border-slate-300 focus:ring-0 cursor-pointer transition-transform active:scale-90"
                          title="Click to mark task complete"
                        />
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-extrabold text-slate-900 leading-snug">
                            {item.taskDescription}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                            <span className="flex items-center gap-1">
                              <i className="far fa-clock text-green-800"></i> Due: <strong className="text-slate-800">{item.timeDue}</strong>
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : item.minsRemaining === 0
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}>
                              {isOverdue
                                ? `Overdue by ${Math.abs(item.minsRemaining)}m`
                                : item.minsRemaining === 0
                                ? 'Due Now'
                                : `Due in ${item.minsRemaining}m`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ITEM QUICK ACTIONS */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onSnoozeTask(item.taskId, 10)}
                          className="bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 p-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                          title="Snooze 10 minutes"
                        >
                          <i className="fas fa-clock"></i>
                        </button>
                        <button
                          onClick={() => onDismissTask(item.taskId)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 p-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                          title="Dismiss alert"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* BOTTOM BULK ACTIONS FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleMarkAllDone}
            className="bg-green-800 text-white hover:bg-green-900 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <i className="fas fa-check-circle text-sm"></i>
            <span>Mark All Done</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSnoozeAll(10)}
              className="bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              <i className="fas fa-clock text-amber-700 mr-1.5"></i>
              Snooze All (10m)
            </button>
            <button
              onClick={handleDismissAll}
              className="bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Dismiss All
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReminderModal;
