import React, { useState, useEffect, useRef } from 'react';
import { RoomData } from '../types';

interface ClinicalToolsProps {
  rooms: RoomData[];
  onUpdateRoom?: (room: RoomData) => void;
}

export const ClinicalTools: React.FC<ClinicalToolsProps> = ({ rooms, onUpdateRoom }) => {
  const [activeTool, setActiveTool] = useState<'timer' | 'gcs' | 'map' | 'calc'>('timer');

  // ==========================================
  // 1. 1-MINUTE TIMER STATE
  // ==========================================
  const TIMER_DURATION = 60;
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const timerIntervalRef = useRef<any>(null);

  // Web Audio Synth for offline sound effects
  const playBeep = (freq = 800, duration = 0.1) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // AudioContext unavailable or restricted
    }
  };

  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimerRunning(false);
            playBeep(1200, 0.4); // Completion chime
            return 0;
          }
          if (prev <= 4) {
            playBeep(600, 0.08); // Countdown warning tick
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isTimerRunning, soundEnabled]);

  const handleStartPauseTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(TIMER_DURATION);
    }
    setIsTimerRunning(!isTimerRunning);
    if (!isTimerRunning) {
      playBeep(900, 0.1);
    }
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    clearInterval(timerIntervalRef.current);
    setTimeLeft(TIMER_DURATION);
  };

  // SVG Circle Progress calculation for full 60 seconds
  const CIRCLE_RADIUS = 90;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~565.487
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - timeLeft / TIMER_DURATION);

  // ==========================================
  // 2. GLASGOW COMA SCALE (GCS) STATE (MINIMAL)
  // ==========================================
  const [gcsEye, setGcsEye] = useState<number>(4);
  const [gcsVerbal, setGcsVerbal] = useState<number>(5);
  const [gcsMotor, setGcsMotor] = useState<number>(6);
  const [selectedGcsRoomId, setSelectedGcsRoomId] = useState<string>('');
  const [gcsAssignSuccess, setGcsAssignSuccess] = useState<string>('');

  const gcsTotal = gcsEye + gcsVerbal + gcsMotor;

  const getGcsSeverity = (score: number) => {
    if (score >= 13) return { label: 'Mild / Minor Injury', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 9) return { label: 'Moderate Injury', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Severe Injury (Coma)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const handleAssignGcsToRoom = () => {
    if (!selectedGcsRoomId || !onUpdateRoom) return;
    const room = rooms.find((r) => r.id === selectedGcsRoomId);
    if (!room) return;

    const gcsText = `GCS ${gcsTotal}/15 (E${gcsEye} V${gcsVerbal} M${gcsMotor})`;
    const updatedRoom: RoomData = {
      ...room,
      clinicalAssessment: {
        ...(room.clinicalAssessment || {}),
        neurological: {
          noProblem: room.clinicalAssessment?.neurological?.noProblem ?? false,
          items: room.clinicalAssessment?.neurological?.items || [],
          remarks: room.clinicalAssessment?.neurological?.remarks
            ? `${room.clinicalAssessment.neurological.remarks}; ${gcsText}`
            : gcsText
        },
        additionalClinicalFindings: room.clinicalAssessment?.additionalClinicalFindings
          ? `${room.clinicalAssessment.additionalClinicalFindings}\n${gcsText}`
          : gcsText
      },
      lastUpdated: new Date().toISOString()
    };

    onUpdateRoom(updatedRoom);
    setGcsAssignSuccess(`Assigned GCS ${gcsTotal}/15 to Room ${room.roomNumber}`);
    setTimeout(() => setGcsAssignSuccess(''), 2500);
  };

  // ==========================================
  // 3. MAP (MEAN ARTERIAL PRESSURE) CALCULATOR
  // ==========================================
  const [sbp, setSbp] = useState<string>('120');
  const [dbp, setDbp] = useState<string>('80');
  const [selectedMapRoomId, setSelectedMapRoomId] = useState<string>('');
  const [mapAssignSuccess, setMapAssignSuccess] = useState<string>('');

  const sbpNum = parseFloat(sbp) || 0;
  const dbpNum = parseFloat(dbp) || 0;
  const mapValue = sbpNum > 0 && dbpNum > 0 ? ((sbpNum + 2 * dbpNum) / 3).toFixed(1) : '0';
  const mapNumeric = parseFloat(mapValue);
  const pulsePressure = sbpNum > 0 && dbpNum > 0 ? sbpNum - dbpNum : 0;

  const getMapStatus = (val: number) => {
    if (val === 0) return { label: 'Enter BP Values', color: 'text-slate-500 bg-slate-50 border-slate-200', desc: 'Awaiting systolic and diastolic values' };
    if (val < 65) return { label: 'Critical Hypoperfusion (<65 mmHg)', color: 'text-rose-700 bg-rose-50 border-rose-300', desc: 'Inadequate organ and tissue perfusion. Shock / sepsis alert.' };
    if (val <= 100) return { label: 'Optimal Normal Perfusion (70-100 mmHg)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', desc: 'Normal tissue perfusion and organ circulation.' };
    return { label: 'Elevated Perfusion Pressure (>100 mmHg)', color: 'text-amber-700 bg-amber-50 border-amber-200', desc: 'Increased cardiac afterload / hypertensive state.' };
  };

  const handleAssignMapToRoom = () => {
    if (!selectedMapRoomId || !onUpdateRoom) return;
    const room = rooms.find((r) => r.id === selectedMapRoomId);
    if (!room) return;

    const mapText = `BP: ${sbp}/${dbp} mmHg, MAP: ${mapValue} mmHg (PP: ${pulsePressure} mmHg)`;
    const updatedRoom: RoomData = {
      ...room,
      clinicalAssessment: {
        ...(room.clinicalAssessment || {}),
        cardiovascular: {
          noProblem: room.clinicalAssessment?.cardiovascular?.noProblem ?? false,
          items: room.clinicalAssessment?.cardiovascular?.items || [],
          remarks: room.clinicalAssessment?.cardiovascular?.remarks
            ? `${room.clinicalAssessment.cardiovascular.remarks}; ${mapText}`
            : mapText
        },
        additionalClinicalFindings: room.clinicalAssessment?.additionalClinicalFindings
          ? `${room.clinicalAssessment.additionalClinicalFindings}\n${mapText}`
          : mapText
      },
      lastUpdated: new Date().toISOString()
    };

    onUpdateRoom(updatedRoom);
    setMapAssignSuccess(`Assigned MAP ${mapValue} mmHg to Room ${room.roomNumber}`);
    setTimeout(() => setMapAssignSuccess(''), 2500);
  };

  // ==========================================
  // 4. DRUG & IV CALCULATOR WITH CHANGEABLE UNITS
  // ==========================================
  const [calcMode, setCalcMode] = useState<'iv_drip' | 'dosage' | 'continuous'>('dosage');

  // Dosage Formula States (D / H * V) with changeable units
  const [doseDesired, setDoseDesired] = useState<string>('500');
  const [doseDesiredUnit, setDoseDesiredUnit] = useState<string>('mg');
  const [doseOnHand, setDoseOnHand] = useState<string>('250');
  const [doseOnHandUnit, setDoseOnHandUnit] = useState<string>('mg');
  const [doseVehicle, setDoseVehicle] = useState<string>('5');
  const [doseVehicleUnit, setDoseVehicleUnit] = useState<string>('mL');

  // IV Drip States with changeable units
  const [ivVolume, setIvVolume] = useState<string>('1000');
  const [ivVolumeUnit, setIvVolumeUnit] = useState<'mL' | 'L'>('mL');
  const [ivTime, setIvTime] = useState<string>('8');
  const [ivTimeUnit, setIvTimeUnit] = useState<'hours' | 'mins'>('hours');
  const [dropFactor, setDropFactor] = useState<string>('15'); // 10, 15, 20, 60

  // Continuous Infusion States (mcg/kg/min) with changeable units
  const [patientWeight, setPatientWeight] = useState<string>('70');
  const [patientWeightUnit, setPatientWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [doseOrderedRate, setDoseOrderedRate] = useState<string>('5');
  const [doseRateUnit, setDoseRateUnit] = useState<'mcg/kg/min' | 'mg/kg/hr' | 'mcg/min'>('mcg/kg/min');
  const [bagDrugAmount, setBagDrugAmount] = useState<string>('400');
  const [bagDrugUnit, setBagDrugUnit] = useState<'mg' | 'g' | 'units'>('mg');
  const [bagVolume, setBagVolume] = useState<string>('250');
  const [bagVolumeUnit, setBagVolumeUnit] = useState<'mL' | 'L'>('mL');

  // Calculations for Dosage Formula with Unit Normalization
  const massUnitMultiplier: Record<string, number> = {
    g: 1000,
    mg: 1,
    mcg: 0.001,
    units: 1,
    mEq: 1
  };

  const dRaw = parseFloat(doseDesired) || 0;
  const hRaw = parseFloat(doseOnHand) || 0;
  const vRaw = parseFloat(doseVehicle) || 0;

  // Convert Desired & On Hand to common base if mass units
  const isMassUnitMatch = ['g', 'mg', 'mcg'].includes(doseDesiredUnit) && ['g', 'mg', 'mcg'].includes(doseOnHandUnit);
  let dNormalized = dRaw;
  let hNormalized = hRaw;
  let unitConversionApplied = false;

  if (isMassUnitMatch && doseDesiredUnit !== doseOnHandUnit) {
    dNormalized = dRaw * (massUnitMultiplier[doseDesiredUnit] || 1);
    hNormalized = hRaw * (massUnitMultiplier[doseOnHandUnit] || 1);
    unitConversionApplied = true;
  }

  const calculatedDoseResult = hNormalized > 0 ? ((dNormalized / hNormalized) * vRaw).toFixed(2) : '0';

  // Calculations for IV Drip Rate
  const rawVol = parseFloat(ivVolume) || 0;
  const totalVolumeMl = ivVolumeUnit === 'L' ? rawVol * 1000 : rawVol;
  const rawTime = parseFloat(ivTime) || 0;
  const totalTimeMinutes = ivTimeUnit === 'hours' ? rawTime * 60 : rawTime;
  const totalTimeHours = totalTimeMinutes / 60;
  const df = parseFloat(dropFactor) || 15;

  const ivFlowRateMlHr = totalTimeHours > 0 ? (totalVolumeMl / totalTimeHours).toFixed(1) : '0';
  const ivDripRateGttsMin = totalTimeMinutes > 0 ? Math.round((totalVolumeMl * df) / totalTimeMinutes) : 0;
  const ivSecPerDrop = ivDripRateGttsMin > 0 ? (60 / ivDripRateGttsMin).toFixed(1) : '0';

  // Calculations for Continuous Drip
  const rawWt = parseFloat(patientWeight) || 0;
  const wtKg = patientWeightUnit === 'lbs' ? rawWt * 0.453592 : rawWt;
  const rawDoseRate = parseFloat(doseOrderedRate) || 0;
  const rawBagDrug = parseFloat(bagDrugAmount) || 0;
  const rawBagVol = parseFloat(bagVolume) || 0;
  const bagVolMl = bagVolumeUnit === 'L' ? rawBagVol * 1000 : rawBagVol;

  // Convert bag drug to mcg
  let bagDrugMcg = 0;
  if (bagDrugUnit === 'g') bagDrugMcg = rawBagDrug * 1000000;
  else if (bagDrugUnit === 'mg') bagDrugMcg = rawBagDrug * 1000;
  else bagDrugMcg = rawBagDrug; // units

  const concentrationMcgPerMl = bagVolMl > 0 ? bagDrugMcg / bagVolMl : 0;

  // Total required rate in mcg/hr
  let totalRequiredMcgPerHr = 0;
  if (doseRateUnit === 'mcg/kg/min') {
    totalRequiredMcgPerHr = rawDoseRate * wtKg * 60;
  } else if (doseRateUnit === 'mg/kg/hr') {
    totalRequiredMcgPerHr = rawDoseRate * 1000 * wtKg;
  } else if (doseRateUnit === 'mcg/min') {
    totalRequiredMcgPerHr = rawDoseRate * 60;
  }

  const continuousPumpRateMlHr = concentrationMcgPerMl > 0 ? (totalRequiredMcgPerHr / concentrationMcgPerMl).toFixed(1) : '0';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-green-900 to-green-800 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
            <i className="fas fa-toolbox text-emerald-400 text-lg"></i>
            <span>Clinical Tools</span>
          </h2>
          <p className="text-xs text-green-100/80 font-medium mt-0.5">
            Bedside timers, neuro scoring, MAP, and unit-adaptive drug calculations
          </p>
        </div>

        {/* TOOL SELECTION TABS */}
        <div className="flex bg-green-950/60 p-1.5 rounded-2xl gap-1 border border-green-700/50 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTool('timer')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTool === 'timer' ? 'bg-white text-green-950 shadow-md' : 'text-green-100 hover:text-white'
            }`}
          >
            <i className="fas fa-stopwatch"></i>
            <span>1-Min Timer</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('gcs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTool === 'gcs' ? 'bg-white text-green-950 shadow-md' : 'text-green-100 hover:text-white'
            }`}
          >
            <i className="fas fa-brain"></i>
            <span>GCS Scoring</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('map')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTool === 'map' ? 'bg-white text-green-950 shadow-md' : 'text-green-100 hover:text-white'
            }`}
          >
            <i className="fas fa-heartbeat"></i>
            <span>MAP Calc</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('calc')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTool === 'calc' ? 'bg-white text-green-950 shadow-md' : 'text-green-100 hover:text-white'
            }`}
          >
            <i className="fas fa-calculator"></i>
            <span>Drug & IV Calc</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 1. 1-MINUTE TIMER (FULL CIRCLE DECREASING) */}
      {/* ========================================== */}
      {activeTool === 'timer' && (
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-sm flex flex-col items-center justify-between text-center space-y-8">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-green-50 text-green-800 flex items-center justify-center text-sm font-black shadow-2xs">
                  <i className="fas fa-stopwatch"></i>
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">1-Minute Timer</h3>
                  <p className="text-[11px] font-bold text-slate-400">Bedside Observation</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  soundEnabled ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                }`}
                title="Toggle Beep Sounds"
              >
                <i className={`fas ${soundEnabled ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
                <span className="text-[11px] font-bold">{soundEnabled ? 'Sound On' : 'Muted'}</span>
              </button>
            </div>

            {/* FULL CIRCLE THAT DECREASES EACH SECOND */}
            <div className="relative my-2 flex items-center justify-center">
              <div className="w-60 h-60 sm:w-64 sm:h-64 relative flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                  {/* Background Track Ring */}
                  <circle
                    cx="100"
                    cy="100"
                    r={CIRCLE_RADIUS}
                    stroke="#f1f5f9"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  {/* Active Decreasing Progress Ring */}
                  <circle
                    cx="100"
                    cy="100"
                    r={CIRCLE_RADIUS}
                    stroke="currentColor"
                    strokeWidth="12"
                    className={`${
                      timeLeft <= 5 ? 'text-rose-500' : 'text-green-800'
                    } transition-[stroke-dashoffset] duration-1000 ease-linear`}
                    fill="transparent"
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Center Digital Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight font-mono">
                    {timeLeft === 60 ? '01:00' : `00:${timeLeft < 10 ? `0${timeLeft}` : timeLeft}`}
                  </span>
                  <span className="text-xs font-black text-slate-400 mt-2 uppercase tracking-wider">
                    {isTimerRunning ? 'Observing...' : timeLeft === 0 ? 'Completed' : timeLeft === 60 ? 'Full Minute' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>

            {/* CONTROLS */}
            <div className="flex items-center gap-3 w-full max-w-sm">
              <button
                type="button"
                onClick={handleStartPauseTimer}
                className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2.5 ${
                  isTimerRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                    : 'bg-green-800 hover:bg-green-900 text-white shadow-green-900/20'
                }`}
              >
                <i className={`fas ${isTimerRunning ? 'fa-pause' : 'fa-play'} text-xs`}></i>
                <span>{isTimerRunning ? 'Pause' : timeLeft === 0 ? 'Restart (60s)' : 'Start Timer'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetTimer}
                className="p-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Reset to 60s"
              >
                <i className="fas fa-redo text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. GLASGOW COMA SCALE (GCS) - MINIMAL */}
      {/* ========================================== */}
      {activeTool === 'gcs' && (
        <div className="space-y-6">
          {/* MINIMAL TOTAL SCORE & ROOM ASSIGNMENT HEADER */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-black text-slate-900">
                {gcsTotal} <span className="text-base text-slate-400 font-normal">/ 15</span>
              </div>
              <span className={`text-xs font-black px-3.5 py-1.5 rounded-xl border ${getGcsSeverity(gcsTotal).color}`}>
                {getGcsSeverity(gcsTotal).label}
              </span>
            </div>

            {rooms.length > 0 && onUpdateRoom && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedGcsRoomId}
                  onChange={(e) => setSelectedGcsRoomId(e.target.value)}
                  className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="">Select Room...</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignGcsToRoom}
                  disabled={!selectedGcsRoomId}
                  className="px-4 py-2.5 bg-green-900 hover:bg-green-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl text-xs font-black transition-all shadow-xs cursor-pointer shrink-0"
                >
                  Assign to Room
                </button>
              </div>
            )}
          </div>

          {gcsAssignSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-2xl text-center">
              <i className="fas fa-check-circle mr-2"></i>
              <span>{gcsAssignSuccess}</span>
            </div>
          )}

          {/* 3 PARAMETERS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* EYE OPENING */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <i className="fas fa-eye text-emerald-700"></i> Eye Opening (E)
                </h4>
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                  {gcsEye}
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { val: 4, label: 'Spontaneous', desc: 'Opens eyes naturally' },
                  { val: 3, label: 'To Sound / Voice', desc: 'Opens on verbal command' },
                  { val: 2, label: 'To Pressure / Pain', desc: 'Opens to finger pressure' },
                  { val: 1, label: 'None', desc: 'No eye opening to stimuli' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setGcsEye(item.val)}
                    className={`w-full text-left p-3 rounded-2xl text-xs transition-all border cursor-pointer ${
                      gcsEye === item.val
                        ? 'bg-green-800 text-white border-green-800 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-black">{item.val} &bull; {item.label}</div>
                    <p className={`text-[11px] mt-0.5 ${gcsEye === item.val ? 'text-green-100' : 'text-slate-400'}`}>
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* VERBAL RESPONSE */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <i className="fas fa-comment-medical text-emerald-700"></i> Verbal Response (V)
                </h4>
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                  {gcsVerbal}
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { val: 5, label: 'Oriented', desc: 'Correct person, place, time' },
                  { val: 4, label: 'Confused', desc: 'Disoriented conversation' },
                  { val: 3, label: 'Inappropriate Words', desc: 'Random or disconnected words' },
                  { val: 2, label: 'Incomprehensible Sounds', desc: 'Moaning or groaning only' },
                  { val: 1, label: 'None', desc: 'No verbalization made' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setGcsVerbal(item.val)}
                    className={`w-full text-left p-3 rounded-2xl text-xs transition-all border cursor-pointer ${
                      gcsVerbal === item.val
                        ? 'bg-green-800 text-white border-green-800 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-black">{item.val} &bull; {item.label}</div>
                    <p className={`text-[11px] mt-0.5 ${gcsVerbal === item.val ? 'text-green-100' : 'text-slate-400'}`}>
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* MOTOR RESPONSE */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <i className="fas fa-running text-emerald-700"></i> Motor Response (M)
                </h4>
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                  {gcsMotor}
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { val: 6, label: 'Obeys Commands', desc: 'Follows 2-step requests' },
                  { val: 5, label: 'Localizes Pain', desc: 'Reaches above clavicle to stimulus' },
                  { val: 4, label: 'Flexion / Withdrawal', desc: 'Rapidly bends elbow away' },
                  { val: 3, label: 'Abnormal Flexion', desc: 'Decorticate posturing' },
                  { val: 2, label: 'Extension', desc: 'Decerebrate posturing' },
                  { val: 1, label: 'None / Flaccid', desc: 'No movement elicited' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setGcsMotor(item.val)}
                    className={`w-full text-left p-3 rounded-2xl text-xs transition-all border cursor-pointer ${
                      gcsMotor === item.val
                        ? 'bg-green-800 text-white border-green-800 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-black">{item.val} &bull; {item.label}</div>
                    <p className={`text-[11px] mt-0.5 ${gcsMotor === item.val ? 'text-green-100' : 'text-slate-400'}`}>
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. MAP (MEAN ARTERIAL PRESSURE) CALCULATOR */}
      {/* ========================================== */}
      {activeTool === 'map' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* INPUT FORM */}
          <div className="md:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <i className="fas fa-heartbeat text-rose-500"></i>
                <span>Blood Pressure Input</span>
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Bedside MAP</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Systolic BP (SBP) <span className="text-slate-400 font-normal">mmHg</span>
                </label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  value={sbp}
                  onChange={(e) => setSbp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                  placeholder="120"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Diastolic BP (DBP) <span className="text-slate-400 font-normal">mmHg</span>
                </label>
                <input
                  type="number"
                  min="20"
                  max="200"
                  value={dbp}
                  onChange={(e) => setDbp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                  placeholder="80"
                />
              </div>
            </div>

            {/* QUICK PRESETS */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Clinical Presets:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { s: '120', d: '80', l: '120/80 (Normal)' },
                  { s: '90', d: '60', l: '90/60 (Borderline)' },
                  { s: '75', d: '45', l: '75/45 (Hypotension / Sepsis)' },
                  { s: '160', d: '95', l: '160/95 (Hypertension)' },
                ].map((preset) => (
                  <button
                    key={preset.l}
                    type="button"
                    onClick={() => {
                      setSbp(preset.s);
                      setDbp(preset.d);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {preset.l}
                  </button>
                ))}
              </div>
            </div>

            {/* ROOM ASSIGNMENT */}
            {rooms.length > 0 && onUpdateRoom && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-700">Assign MAP to Room Record</label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMapRoomId}
                    onChange={(e) => setSelectedMapRoomId(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="">Select Room...</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAssignMapToRoom}
                    disabled={!selectedMapRoomId || !sbpNum || !dbpNum}
                    className="px-4 py-2.5 bg-green-900 hover:bg-green-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl text-xs font-black transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    Assign
                  </button>
                </div>
              </div>
            )}

            {mapAssignSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-2xl text-center">
                <i className="fas fa-check-circle mr-2"></i>
                <span>{mapAssignSuccess}</span>
              </div>
            )}
          </div>

          {/* RESULTS DISPLAY */}
          <div className="md:col-span-6 bg-gradient-to-br from-green-900 to-green-800 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Mean Arterial Pressure</span>
                <span className="text-[10px] font-bold text-green-200 bg-green-950/60 px-2.5 py-1 rounded-lg border border-green-700/50">
                  Target: &ge; 65 mmHg
                </span>
              </div>
              <h3 className="text-xl font-black mt-1">Perfusion Assessment</h3>
            </div>

            {/* BIG MAP NUMBER */}
            <div className="bg-green-950/60 p-6 rounded-3xl border border-green-700/50 text-center space-y-2">
              <span className="text-xs font-bold text-green-200 uppercase">Calculated MAP:</span>
              <div className="text-5xl sm:text-6xl font-black text-emerald-400">
                {mapValue} <span className="text-lg font-bold text-white">mmHg</span>
              </div>
              <div className="pt-2">
                <span className={`inline-block text-xs font-black px-3.5 py-1 rounded-xl border ${getMapStatus(mapNumeric).color}`}>
                  {getMapStatus(mapNumeric).label}
                </span>
              </div>
              <p className="text-xs text-green-200/90 font-medium pt-1">
                {getMapStatus(mapNumeric).desc}
              </p>
            </div>

            {/* DETAILS & FORMULA */}
            <div className="bg-green-950/40 p-4 rounded-2xl border border-green-700/40 text-xs text-green-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Pulse Pressure (SBP - DBP):</span>
                <strong className="text-emerald-300 font-black">{pulsePressure} mmHg</strong>
              </div>
              <p className="text-[11px] text-green-200/80 pt-1 border-t border-green-800/60">
                Formula: MAP = DBP + ⅓(SBP - DBP) = ({sbpNum} + 2 &times; {dbpNum}) &divide; 3
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. DRUG & IV CALCULATOR (CHANGEABLE UNITS) */}
      {/* ========================================== */}
      {activeTool === 'calc' && (
        <div className="space-y-6">
          {/* CALCULATOR SUBTABS */}
          <div className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setCalcMode('dosage')}
              className={`flex-1 min-w-[140px] py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                calcMode === 'dosage' ? 'bg-green-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <i className="fas fa-pills"></i>
              <span>Dosage (D/H &times; V)</span>
            </button>
            <button
              type="button"
              onClick={() => setCalcMode('iv_drip')}
              className={`flex-1 min-w-[140px] py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                calcMode === 'iv_drip' ? 'bg-green-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <i className="fas fa-tint"></i>
              <span>IV Drip Rate</span>
            </button>
            <button
              type="button"
              onClick={() => setCalcMode('continuous')}
              className={`flex-1 min-w-[140px] py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                calcMode === 'continuous' ? 'bg-green-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <i className="fas fa-syringe"></i>
              <span>Continuous Infusion</span>
            </button>
          </div>

          {/* MODE 1: DOSAGE D/H * V (WITH CHANGEABLE UNITS) */}
          {calcMode === 'dosage' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900">Dosage Formula (D &divide; H &times; V)</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Unit Adaptive</span>
                </div>

                {/* DESIRED DOSE */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Desired Dose (D) — Ordered
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={doseDesired}
                      onChange={(e) => setDoseDesired(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                      placeholder="e.g. 500"
                    />
                    <select
                      value={doseDesiredUnit}
                      onChange={(e) => setDoseDesiredUnit(e.target.value)}
                      className="w-28 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="mg">mg</option>
                      <option value="mcg">mcg</option>
                      <option value="g">g</option>
                      <option value="units">units</option>
                      <option value="mEq">mEq</option>
                    </select>
                  </div>
                </div>

                {/* DOSE ON HAND */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dose on Hand (H) — Available Strength
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={doseOnHand}
                      onChange={(e) => setDoseOnHand(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                      placeholder="e.g. 250"
                    />
                    <select
                      value={doseOnHandUnit}
                      onChange={(e) => setDoseOnHandUnit(e.target.value)}
                      className="w-28 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="mg">mg</option>
                      <option value="mcg">mcg</option>
                      <option value="g">g</option>
                      <option value="units">units</option>
                      <option value="mEq">mEq</option>
                    </select>
                  </div>
                </div>

                {/* VEHICLE */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vehicle Quantity (V)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={doseVehicle}
                      onChange={(e) => setDoseVehicle(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-900 focus:outline-none"
                      placeholder="e.g. 5"
                    />
                    <select
                      value={doseVehicleUnit}
                      onChange={(e) => setDoseVehicleUnit(e.target.value)}
                      className="w-28 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="mL">mL (liquid)</option>
                      <option value="tablets">tablets</option>
                      <option value="capsules">capsules</option>
                      <option value="drops">drops</option>
                      <option value="vials">vials</option>
                      <option value="units">units</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* RESULT DISPLAY */}
              <div className="md:col-span-6 bg-gradient-to-br from-green-900 to-green-800 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Amount to Administer</span>
                  <h3 className="text-xl font-black mt-1">Calculated Dose</h3>
                </div>

                <div className="bg-green-950/60 p-6 rounded-3xl border border-green-700/50 text-center">
                  <span className="text-xs font-bold text-green-200 uppercase">Give to Patient:</span>
                  <p className="text-4xl sm:text-5xl font-black text-emerald-400 mt-2">
                    {calculatedDoseResult} <span className="text-base font-bold text-white">{doseVehicleUnit}</span>
                  </p>
                </div>

                <div className="bg-green-950/40 p-4 rounded-2xl border border-green-700/40 text-xs text-green-100 space-y-1">
                  <p className="font-bold">
                    Formula: ({doseDesired} {doseDesiredUnit} &divide; {doseOnHand} {doseOnHandUnit}) &times; {doseVehicle} {doseVehicleUnit} = {calculatedDoseResult} {doseVehicleUnit}
                  </p>
                  {unitConversionApplied && (
                    <p className="text-[11px] text-emerald-300 font-medium">
                      <i className="fas fa-sync-alt mr-1"></i> Auto-converted {doseDesiredUnit} to {doseOnHandUnit} for safe calculation.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: IV DRIP RATE (WITH CHANGEABLE UNITS) */}
          {calcMode === 'iv_drip' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900">IV Infusion Parameters</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Volume & Time</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Volume to Infuse</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={ivVolume}
                      onChange={(e) => setIvVolume(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                      placeholder="e.g. 1000"
                    />
                    <select
                      value={ivVolumeUnit}
                      onChange={(e) => setIvVolumeUnit(e.target.value as 'mL' | 'L')}
                      className="w-24 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="mL">mL</option>
                      <option value="L">L</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Infusion Duration</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={ivTime}
                      onChange={(e) => setIvTime(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                      placeholder="e.g. 8"
                    />
                    <select
                      value={ivTimeUnit}
                      onChange={(e) => setIvTimeUnit(e.target.value as 'hours' | 'mins')}
                      className="w-28 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="hours">Hours</option>
                      <option value="mins">Minutes</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Drop Factor (Tubing Calibration)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: '10', label: '10 (Macro)' },
                      { val: '15', label: '15 (Standard)' },
                      { val: '20', label: '20 (Macro)' },
                      { val: '60', label: '60 (Micro)' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setDropFactor(item.val)}
                        className={`p-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                          dropFactor === item.val
                            ? 'bg-green-800 text-white border-green-800'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RESULT DISPLAY */}
              <div className="md:col-span-6 bg-gradient-to-br from-green-900 to-green-800 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Calculated Output</span>
                  <h3 className="text-xl font-black mt-1">Flow & Drip Rates</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-950/60 p-4 rounded-2xl border border-green-700/50">
                    <span className="text-[10px] font-bold text-green-200 uppercase">Infusion Pump Rate</span>
                    <p className="text-3xl font-black text-white mt-1">
                      {ivFlowRateMlHr} <span className="text-xs font-medium text-emerald-300">mL/hr</span>
                    </p>
                  </div>

                  <div className="bg-green-950/60 p-4 rounded-2xl border border-green-700/50">
                    <span className="text-[10px] font-bold text-green-200 uppercase">Gravity Drip Rate</span>
                    <p className="text-3xl font-black text-emerald-400 mt-1">
                      {ivDripRateGttsMin} <span className="text-xs font-medium text-white">gtts/min</span>
                    </p>
                  </div>
                </div>

                <div className="bg-green-950/40 p-4 rounded-2xl border border-green-700/40 text-xs text-green-100 space-y-1">
                  <p className="font-bold flex items-center gap-2">
                    <i className="fas fa-clock text-emerald-400"></i>
                    Timing: ~1 drop every <strong>{ivSecPerDrop} seconds</strong>
                  </p>
                  <p className="text-[11px] text-green-200/80">
                    Formula: ({totalVolumeMl} mL &times; {df} gtts/mL) &divide; ({totalTimeMinutes} mins)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: CONTINUOUS DRIP (WITH CHANGEABLE UNITS) */}
          {calcMode === 'continuous' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900">Continuous Inotrope / Vasopressor</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Weight & Bag Setup</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Patient Weight</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        value={patientWeight}
                        onChange={(e) => setPatientWeight(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                        placeholder="70"
                      />
                      <select
                        value={patientWeightUnit}
                        onChange={(e) => setPatientWeightUnit(e.target.value as 'kg' | 'lbs')}
                        className="w-16 bg-slate-50 border border-slate-200 rounded-2xl px-2 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="kg">kg</option>
                        <option value="lbs">lbs</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ordered Dose Rate</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        value={doseOrderedRate}
                        onChange={(e) => setDoseOrderedRate(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                        placeholder="5"
                      />
                      <select
                        value={doseRateUnit}
                        onChange={(e) => setDoseRateUnit(e.target.value as any)}
                        className="w-32 bg-slate-50 border border-slate-200 rounded-2xl px-2 py-2 text-[11px] font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="mcg/kg/min">mcg/kg/min</option>
                        <option value="mg/kg/hr">mg/kg/hr</option>
                        <option value="mcg/min">mcg/min</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Drug in Bag</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="any"
                        value={bagDrugAmount}
                        onChange={(e) => setBagDrugAmount(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                        placeholder="400"
                      />
                      <select
                        value={bagDrugUnit}
                        onChange={(e) => setBagDrugUnit(e.target.value as 'mg' | 'g' | 'units')}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-2xl px-2 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="mg">mg</option>
                        <option value="g">g</option>
                        <option value="units">units</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bag Volume</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="any"
                        value={bagVolume}
                        onChange={(e) => setBagVolume(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                        placeholder="250"
                      />
                      <select
                        value={bagVolumeUnit}
                        onChange={(e) => setBagVolumeUnit(e.target.value as 'mL' | 'L')}
                        className="w-18 bg-slate-50 border border-slate-200 rounded-2xl px-2 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="mL">mL</option>
                        <option value="L">L</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* RESULT DISPLAY */}
              <div className="md:col-span-6 bg-gradient-to-br from-green-900 to-green-800 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Infusion Pump Setting</span>
                  <h3 className="text-xl font-black mt-1">Volumetric Pump Rate</h3>
                </div>

                <div className="bg-green-950/60 p-6 rounded-3xl border border-green-700/50 text-center">
                  <span className="text-xs font-bold text-green-200 uppercase">Set Infusion Pump to:</span>
                  <p className="text-4xl sm:text-5xl font-black text-emerald-400 mt-2">
                    {continuousPumpRateMlHr} <span className="text-base font-bold text-white">mL/hr</span>
                  </p>
                </div>

                <div className="bg-green-950/40 p-4 rounded-2xl border border-green-700/40 text-xs text-green-100 space-y-1">
                  <p>Bag Concentration: <strong>{concentrationMcgPerMl.toFixed(1)} mcg/mL</strong></p>
                  <p>Weight Base: <strong>{wtKg.toFixed(1)} kg</strong></p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
