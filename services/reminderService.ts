import { Task, RoomData } from '../types';

export interface DueAlertItem {
  taskId: string;
  taskDescription: string;
  roomId: string;
  roomNumber: string;
  timeDue: string;
  createdAt: string;
  minsRemaining: number;
}

export function parseTaskDueDate(timeDueStr: string): Date | null {
  if (!timeDueStr || typeof timeDueStr !== 'string') return null;
  const now = new Date();
  
  // Format "HH:MM" (24-hour e.g. "14:30", "09:05")
  const match24 = timeDueStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const mins = parseInt(match24[2], 10);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
  }
  
  // Format "HH:MM AM/PM"
  const match12 = timeDueStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const mins = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
  }

  return null;
}

export function playAlertChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    playTone(587.33, 0, 0.2);   // D5
    playTone(880, 0.15, 0.25);   // A5
    playTone(1174.66, 0.35, 0.4); // D6
  } catch (e) {
    console.error("Audio playback error:", e);
  }
}
