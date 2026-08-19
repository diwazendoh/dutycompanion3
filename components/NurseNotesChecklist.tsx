import React, { useState } from 'react';
import { ClinicalAssessment } from '../types';

interface NurseNotesChecklistProps {
  assessment: ClinicalAssessment | undefined;
  roomNumber: string;
  onChange: (updated: ClinicalAssessment) => void;
}

const getCurrentShift = (): '6-2' | '2-10' | '10-6' => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return '6-2';
  if (hour >= 14 && hour < 22) return '2-10';
  return '10-6';
};

const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const NurseNotesChecklist: React.FC<NurseNotesChecklistProps> = ({ assessment, roomNumber, onChange }) => {
  const data: ClinicalAssessment = assessment || {};

  const currentShiftVal = data.shift || getCurrentShift();
  const currentDateVal = data.date || getTodayDateString();

  const [activeRemarkCategory, setActiveRemarkCategory] = useState<
    'physician' | 'care' | 'procedures' | 'events' | 'teaching' | 'plans' | 'endorsement'
  >('physician');

  const getF = (key: string, defaultVal: string = '') => {
    return data.itemFollowups?.[key] ?? defaultVal;
  };

  const setF = (key: string, val: string) => {
    const current = data.itemFollowups || {};
    onChange({
      ...data,
      itemFollowups: {
        ...current,
        [key]: val
      }
    });
  };

  const getArr = (key: string): string[] => {
    const val = data.itemFollowups?.[key];
    if (!val) return [];
    try {
      return JSON.parse(val);
    } catch {
      return val.split(',').filter(Boolean);
    }
  };

  const toggleArr = (key: string, item: string) => {
    const current = getArr(key);
    const updated = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
    setF(key, JSON.stringify(updated));
  };

  const handleAppendPresetNote = (presetText: string) => {
    const currentText = data.additionalClinicalFindings || '';
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    let formattedText = presetText;
    if (formattedText.includes('[time]')) {
      formattedText = formattedText.replace('[time]', nowTime);
    }
    const updatedText = currentText
      ? `${currentText.trim()}\n${formattedText}`
      : formattedText;

    onChange({
      ...data,
      additionalClinicalFindings: updatedText
    });
  };

  // Helper to check "No Problem Assessed"
  const isNoProb = (systemKey: string) => getF(`${systemKey}_no_prob`) === 'true';
  const toggleNoProb = (systemKey: string) => {
    const currentVal = isNoProb(systemKey);
    setF(`${systemKey}_no_prob`, currentVal ? 'false' : 'true');
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-300">

      {/* HEADER TITLE */}
      <div className="border-b-2 border-emerald-800/20 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
              CLINICAL CHECKLIST
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-700 bg-slate-100 px-3 py-1 rounded-md">
              ROOM {roomNumber}
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
            SYSTEMS ASSESSMENT & NURSE'S NOTES
          </h3>
        </div>

        {/* ACTIVE SHIFT DISPLAY BADGE */}
        <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/80 shrink-0">
          <i className="fas fa-clock text-emerald-800 text-xs"></i>
          <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
            Shift: {currentShiftVal} ({currentDateVal})
          </span>
        </div>
      </div>

      {/* 11 SYSTEMS ASSESSMENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* 1. MENTAL */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col space-y-3">
          <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <i className="fas fa-brain text-emerald-800"></i>
              <span>1. MENTAL</span>
            </h4>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80">
            <input
              type="checkbox"
              checked={isNoProb('mental')}
              onChange={() => toggleNoProb('mental')}
              className="w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
            />
            <span>No Problem Assessed at this time</span>
          </label>

          {!isNoProb('mental') && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Checklist</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    'Alert',
                    'Oriented',
                    'Lethargic',
                    'Restless',
                    'Stuporous',
                    'Forgetful',
                    'Comatose',
                    'Confused',
                    'See N/Vs',
                    'Anxious'
                  ].map((status) => {
                    const checked = getArr('mental_items').includes(status);
                    return (
                      <label key={status} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleArr('mental_items', status)}
                          className="w-3.5 h-3.5 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                        <span>{status}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Alert / Oriented Details */}
              {(getArr('mental_items').includes('Alert') || getArr('mental_items').includes('Oriented')) && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 text-[11px] block">Alert / Oriented Details</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">A&O ×</span>
                    <input
                      type="text"
                      placeholder="4"
                      value={getF('mental_ao_num')}
                      onChange={(e) => setF('mental_ao_num', e.target.value)}
                      className="w-12 bg-slate-50 border border-slate-200 rounded text-center text-xs py-0.5 font-bold"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {['Person', 'Place', 'Time', 'Situation'].map((o) => (
                      <label key={o} className="flex items-center gap-1 cursor-pointer font-medium text-slate-800">
                        <input
                          type="checkbox"
                          checked={getArr('mental_orient_items').includes(o)}
                          onChange={() => toggleArr('mental_orient_items', o)}
                          className="w-3.5 h-3.5 rounded text-emerald-700"
                        />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-3 text-xs pt-1">
                    {['Baseline', 'New change'].map((opt) => (
                      <label key={opt} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="mental_base" checked={getF('mental_base') === opt} onChange={() => setF('mental_base', opt)} />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Lethargic / Stuporous / Comatose Details */}
              {(getArr('mental_items').includes('Lethargic') || getArr('mental_items').includes('Stuporous') || getArr('mental_items').includes('Comatose')) && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2 text-xs">
                  <span className="font-bold text-amber-950 text-[11px] block">Responsiveness Details</span>
                  <input
                    type="text"
                    placeholder="Arousable? To voice? Pain?"
                    value={getF('mental_arousable')}
                    onChange={(e) => setF('mental_arousable', e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded px-2 py-1 text-xs outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-900">GCS:</span>
                    <input
                      type="text"
                      placeholder="15/15"
                      value={getF('mental_gcs')}
                      onChange={(e) => setF('mental_gcs', e.target.value)}
                      className="w-20 bg-white border border-amber-200 rounded text-center text-xs py-0.5 font-bold text-emerald-900"
                    />
                  </div>
                </div>
              )}

              {/* Confused / Forgetful Details */}
              {(getArr('mental_items').includes('Confused') || getArr('mental_items').includes('Forgetful')) && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 text-[11px] block">Confusion / Memory Details</span>
                  <input
                    type="text"
                    placeholder="What is the patient confused about?"
                    value={getF('mental_confused_about')}
                    onChange={(e) => setF('mental_confused_about', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none"
                  />
                  <div className="flex gap-3 text-xs">
                    {['Baseline', 'Acute change'].map((opt) => (
                      <label key={opt} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="mental_conf_type" checked={getF('mental_conf_type') === opt} onChange={() => setF('mental_conf_type', opt)} />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Restless / Anxious Details */}
              {(getArr('mental_items').includes('Restless') || getArr('mental_items').includes('Anxious')) && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 text-[11px] block">Behavior / Trigger</span>
                  <input
                    type="text"
                    placeholder="Specific behavior / apparent trigger..."
                    value={getF('mental_behavior_trigger')}
                    onChange={(e) => setF('mental_behavior_trigger', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. NEUROLOGICAL */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <i className="fas fa-microscope text-emerald-800"></i>
              <span>2. NEUROLOGICAL</span>
            </h4>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80">
            <input
              type="checkbox"
              checked={isNoProb('neuro')}
              onChange={() => toggleNoProb('neuro')}
              className="w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
            />
            <span>No Problem Assessed at this time</span>
          </label>

          {!isNoProb('neuro') && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Checklist</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    'Aphasia',
                    'Numbness',
                    'Slurred Speech',
                    'Visual Deficit',
                    'Headache',
                    'Hearing Deficit',
                    'Tremors',
                    'Speech Deficit',
                    'Vertigo'
                  ].map((item) => {
                    const checked = getArr('neuro_items').includes(item);
                    return (
                      <label key={item} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleArr('neuro_items', item)}
                          className="w-3.5 h-3.5 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Aphasia / Speech Deficit */}
              {(getArr('neuro_items').includes('Aphasia') || getArr('neuro_items').includes('Speech Deficit') || getArr('neuro_items').includes('Slurred Speech')) && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Aphasia / Speech Deficit</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500">Type:</span>
                    {['Expressive', 'Receptive'].map((a) => (
                      <label key={a} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="aphasia_type" checked={getF('aphasia_type') === a} onChange={() => setF('aphasia_type', a)} />
                        <span>{a}</span>
                      </label>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Difficulty speaking / understanding..."
                    value={getF('aphasia_desc')}
                    onChange={(e) => setF('aphasia_desc', e.target.value)}
                    className="w-full bg-slate-50 border rounded px-2 py-1 text-xs"
                  />
                </div>
              )}

              {/* Numbness */}
              {getArr('neuro_items').includes('Numbness') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Numbness Details</span>
                  <input
                    type="text"
                    placeholder="Location (e.g. L upper extremity, toes)"
                    value={getF('numbness_loc')}
                    onChange={(e) => setF('numbness_loc', e.target.value)}
                    className="w-full bg-slate-50 border rounded px-2 py-1 text-xs"
                  />
                  <div className="flex items-center gap-3 pt-0.5">
                    <span className="text-[10px] font-bold text-slate-500">Side:</span>
                    {['Right', 'Left', 'Bilateral'].map((s) => (
                      <label key={s} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="numbness_side" checked={getF('numbness_side') === s} onChange={() => setF('numbness_side', s)} />
                        <span>{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Deficit */}
              {getArr('neuro_items').includes('Visual Deficit') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Visual Deficit Details</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500">Eye/Side:</span>
                    {['Right', 'Left', 'Bilateral'].map((s) => (
                      <label key={s} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="visual_side" checked={getF('visual_side') === s} onChange={() => setF('visual_side', s)} />
                        <span>{s}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs pt-1">
                    {['Blurred vision', 'Loss of vision', 'Other'].map((v) => (
                      <label key={v} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="visual_type" checked={getF('visual_type') === v} onChange={() => setF('visual_type', v)} />
                        <span>{v}</span>
                      </label>
                    ))}
                  </div>
                  {getF('visual_type') === 'Other' && (
                    <input
                      type="text"
                      placeholder="Specify other visual deficit..."
                      value={getF('visual_other_desc')}
                      onChange={(e) => setF('visual_other_desc', e.target.value)}
                      className="w-full bg-slate-50 border rounded px-2 py-1 text-xs"
                    />
                  )}
                </div>
              )}

              {/* Headache */}
              {getArr('neuro_items').includes('Headache') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Headache Details</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Location" value={getF('headache_loc')} onChange={(e) => setF('headache_loc', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Severity (e.g. 6/10)" value={getF('headache_sev')} onChange={(e) => setF('headache_sev', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs font-bold text-emerald-900" />
                    <input type="text" placeholder="Character (throbbing/dull)" value={getF('headache_char')} onChange={(e) => setF('headache_char', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Onset" value={getF('headache_onset')} onChange={(e) => setF('headache_onset', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                  </div>
                </div>
              )}

              {/* Hearing Deficit */}
              {getArr('neuro_items').includes('Hearing Deficit') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Hearing Deficit Details</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500">Side:</span>
                    {['Right', 'Left', 'Bilateral'].map((s) => (
                      <label key={s} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="hearing_side" checked={getF('hearing_side') === s} onChange={() => setF('hearing_side', s)} />
                        <span>{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tremors */}
              {getArr('neuro_items').includes('Tremors') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Tremors Details</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Location (e.g. R hand)" value={getF('tremors_loc')} onChange={(e) => setF('tremors_loc', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Severity / Frequency" value={getF('tremors_sev_freq')} onChange={(e) => setF('tremors_sev_freq', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                  </div>
                </div>
              )}

              {/* Vertigo */}
              {getArr('neuro_items').includes('Vertigo') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Vertigo Details</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Onset" value={getF('vertigo_onset')} onChange={(e) => setF('vertigo_onset', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Trigger" value={getF('vertigo_trigger')} onChange={(e) => setF('vertigo_trigger', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                  </div>
                  <input type="text" placeholder="Associated symptoms (nausea/diaphoresis)..." value={getF('vertigo_symptoms')} onChange={(e) => setF('vertigo_symptoms', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-1 text-xs" />
                </div>
              )}

              {/* General Neurological Findings */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-800 block text-[11px]">General Neurological Findings</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">GCS:</span>
                    <input
                      type="text"
                      placeholder="15/15"
                      value={getF('neuro_gcs_full')}
                      onChange={(e) => setF('neuro_gcs_full', e.target.value)}
                      className="w-full bg-slate-50 border rounded px-2 py-0.5 text-xs font-bold text-emerald-900"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">PERRLA:</span>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold">
                      <input
                        type="checkbox"
                        checked={getF('perrla_yes') === 'true'}
                        onChange={(e) => setF('perrla_yes', e.target.checked ? 'true' : 'false')}
                        className="w-3.5 h-3.5 rounded text-emerald-700"
                      />
                      <span>Yes</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={getF('mae_yes') === 'true'}
                      onChange={(e) => setF('mae_yes', e.target.checked ? 'true' : 'false')}
                      className="w-3.5 h-3.5 rounded text-emerald-700"
                    />
                    <span>MAE (Moves All Extremities)</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Weakness/deficit → side and extremity"
                  value={getF('neuro_deficit_side')}
                  onChange={(e) => setF('neuro_deficit_side', e.target.value)}
                  className="w-full bg-slate-50 border rounded px-2 py-1 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. CARDIOVASCULAR */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <i className="fas fa-heartbeat text-emerald-800"></i>
              <span>3. CARDIOVASCULAR</span>
            </h4>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80">
            <input
              type="checkbox"
              checked={isNoProb('cv')}
              onChange={() => toggleNoProb('cv')}
              className="w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
            />
            <span>No Problem Assessed at this time</span>
          </label>

          {!isNoProb('cv') && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Checklist</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    'Chest Pain',
                    'Palpitation',
                    'Neck Vein Distention',
                    'Orthopnea',
                    'Cyanosis',
                    'Edema',
                    'Cardiac Arrhythmia'
                  ].map((item) => {
                    const checked = getArr('cv_items').includes(item);
                    return (
                      <label key={item} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleArr('cv_items', item)}
                          className="w-3.5 h-3.5 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Chest Pain Followup */}
              {getArr('cv_items').includes('Chest Pain') && (
                <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 space-y-2 text-xs">
                  <span className="font-bold text-rose-950 block text-[11px]">Chest Pain Details</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Exact location" value={getF('cp_loc')} onChange={(e) => setF('cp_loc', e.target.value)} className="bg-white border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Severity ___/10" value={getF('cp_sev')} onChange={(e) => setF('cp_sev', e.target.value)} className="bg-white border rounded px-2 py-1 text-xs font-bold text-rose-800" />
                    <input type="text" placeholder="Character (pressure/sharp/etc)" value={getF('cp_char')} onChange={(e) => setF('cp_char', e.target.value)} className="bg-white border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Radiation" value={getF('cp_rad')} onChange={(e) => setF('cp_rad', e.target.value)} className="bg-white border rounded px-2 py-1 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Onset / duration" value={getF('cp_onset_dur')} onChange={(e) => setF('cp_onset_dur', e.target.value)} className="bg-white border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Trigger / relieving factors" value={getF('cp_triggers_relieving')} onChange={(e) => setF('cp_triggers_relieving', e.target.value)} className="bg-white border rounded px-2 py-1 text-xs" />
                  </div>
                </div>
              )}

              {/* Palpitation Followup */}
              {getArr('cv_items').includes('Palpitation') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Palpitation Details</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Onset" value={getF('palp_onset')} onChange={(e) => setF('palp_onset', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Duration" value={getF('palp_duration')} onChange={(e) => setF('palp_duration', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                  </div>
                  <input type="text" placeholder="Associated HR / rhythm" value={getF('palp_hr_rhythm')} onChange={(e) => setF('palp_hr_rhythm', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-1 text-xs font-bold text-emerald-900" />
                </div>
              )}

              {/* JVD / Neck Vein Distention Followup */}
              {getArr('cv_items').includes('Neck Vein Distention') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">JVD / Neck Vein Distention</span>
                  <input type="text" placeholder="Degree / location (e.g. 4 cm at 45°)" value={getF('jvd_degree_loc')} onChange={(e) => setF('jvd_degree_loc', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-1 text-xs" />
                </div>
              )}

              {/* Orthopnea Followup */}
              {getArr('cv_items').includes('Orthopnea') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Orthopnea Details</span>
                  <input type="text" placeholder="Number of pillows / position needed" value={getF('orthopnea_pillows_pos')} onChange={(e) => setF('orthopnea_pillows_pos', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-1 text-xs" />
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-500">Dyspnea when lying flat?</span>
                    <div className="flex gap-3">
                      {['Yes', 'No'].map((opt) => (
                        <label key={opt} className="flex items-center gap-1 cursor-pointer font-bold">
                          <input type="radio" name="orthopnea_flat" checked={getF('orthopnea_flat_dyspnea') === opt} onChange={() => setF('orthopnea_flat_dyspnea', opt)} />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Cyanosis Followup */}
              {getArr('cv_items').includes('Cyanosis') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Cyanosis Details</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500">Type:</span>
                    {['Central', 'Peripheral'].map((t) => (
                      <label key={t} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="cyanosis_type" checked={getF('cyanosis_type') === t} onChange={() => setF('cyanosis_type', t)} />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>
                  <input type="text" placeholder="Location (e.g. lips, nail beds)" value={getF('cyanosis_loc')} onChange={(e) => setF('cyanosis_loc', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-1 text-xs" />
                </div>
              )}

              {/* Edema Followup */}
              {getArr('cv_items').includes('Edema') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Edema Details</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Location (e.g. bilateral ankles)" value={getF('edema_loc')} onChange={(e) => setF('edema_loc', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Grade (+1 to +4)" value={getF('edema_grade')} onChange={(e) => setF('edema_grade', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs font-bold text-emerald-900" />
                  </div>
                  <div className="flex gap-4 text-xs font-semibold pt-1">
                    {['Pitting', 'Non-Pitting'].map((t) => (
                      <label key={t} className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="edema_type" checked={getF('edema_type') === t} onChange={() => setF('edema_type', t)} />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Cardiac Arrhythmia Followup */}
              {getArr('cv_items').includes('Cardiac Arrhythmia') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Cardiac Arrhythmia Details</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Specific rhythm (e.g. AF, PVCs)" value={getF('arrhythmia_rhythm')} onChange={(e) => setF('arrhythmia_rhythm', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs font-bold text-slate-900" />
                    <input type="text" placeholder="HR (bpm)" value={getF('arrhythmia_hr')} onChange={(e) => setF('arrhythmia_hr', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs font-bold text-emerald-900" />
                  </div>
                  <input type="text" placeholder="Frequency / pattern if relevant..." value={getF('arrhythmia_freq_pattern')} onChange={(e) => setF('arrhythmia_freq_pattern', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-1 text-xs" />
                  <input type="text" placeholder="Monitor finding..." value={getF('arrhythmia_monitor_finding')} onChange={(e) => setF('arrhythmia_monitor_finding', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-1 text-xs" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. RESPIRATORY */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <i className="fas fa-lungs text-emerald-800"></i>
              <span>4. RESPIRATORY</span>
            </h4>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80">
            <input
              type="checkbox"
              checked={isNoProb('resp')}
              onChange={() => toggleNoProb('resp')}
              className="w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
            />
            <span>No Problem Assessed at this time</span>
          </label>

          {!isNoProb('resp') && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Checklist</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    'Cough',
                    'Labored Breathing',
                    'Dyspnea/SOB',
                    'Shallow Respiration',
                    'Rales/Rhonchi',
                    'Wheezes'
                  ].map((item) => {
                    const checked = getArr('resp_items').includes(item);
                    return (
                      <label key={item} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleArr('resp_items', item)}
                          className="w-3.5 h-3.5 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Cough & Sputum Followup */}
              {getArr('resp_items').includes('Cough') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Cough & Sputum Details</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500">Cough Type:</span>
                    {['Productive', 'Non-productive'].map((ct) => (
                      <label key={ct} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="cough_type" checked={getF('cough_type') === ct} onChange={() => setF('cough_type', ct)} />
                        <span>{ct}</span>
                      </label>
                    ))}
                  </div>
                  {getF('cough_type') === 'Productive' && (
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <input type="text" placeholder="Sputum Amount" value={getF('sputum_amt')} onChange={(e) => setF('sputum_amt', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                      <input type="text" placeholder="Color" value={getF('sputum_color')} onChange={(e) => setF('sputum_color', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                      <input type="text" placeholder="Character/consistency" value={getF('sputum_char')} onChange={(e) => setF('sputum_char', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    </div>
                  )}
                </div>
              )}

              {/* Labored Breathing / Dyspnea Followup */}
              {(getArr('resp_items').includes('Labored Breathing') || getArr('resp_items').includes('Dyspnea/SOB')) && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Labored Breathing / Dyspnea Details</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500">Occurs:</span>
                    {['At rest', 'On exertion'].map((occ) => (
                      <label key={occ} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="dyspnea_occ" checked={getF('dyspnea_occ') === occ} onChange={() => setF('dyspnea_occ', occ)} />
                        <span>{occ}</span>
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Accessory muscle use" value={getF('dyspnea_acc_muscle')} onChange={(e) => setF('dyspnea_acc_muscle', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Patient-reported severity" value={getF('dyspnea_sev')} onChange={(e) => setF('dyspnea_sev', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                  </div>
                </div>
              )}

              {/* Rales / Rhonchi / Wheezes Followup */}
              {(getArr('resp_items').includes('Rales/Rhonchi') || getArr('resp_items').includes('Wheezes')) && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Breath Sounds (Rales/Rhonchi/Wheezes)</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500">Side:</span>
                    {['Right', 'Left', 'Bilateral'].map((s) => (
                      <label key={s} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="bs_side" checked={getF('bs_side') === s} onChange={() => setF('bs_side', s)} />
                        <span>{s}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500">Field:</span>
                    {['Bases', 'Apices', 'Generalized'].map((f) => (
                      <label key={f} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="checkbox" checked={getArr('bs_fields').includes(f)} onChange={() => toggleArr('bs_fields', f)} className="w-3.5 h-3.5 rounded text-emerald-700" />
                        <span>{f}</span>
                      </label>
                    ))}
                  </div>
                  <input type="text" placeholder="Specific Location" value={getF('bs_loc_desc')} onChange={(e) => setF('bs_loc_desc', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-1 text-xs" />
                </div>
              )}

              {/* O2 Delivery Device Options */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-800 block text-[11px]">O₂ Delivery Device & Oxygenation</span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-[11px]">
                  {['RA', 'O₂ Cannula', 'O₂ FM', 'NRM', 'NCPAP', 'ET', 'Trache'].map((o2) => (
                    <label key={o2} className="flex items-center gap-1 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={getArr('o2_devices').includes(o2)}
                        onChange={() => toggleArr('o2_devices', o2)}
                        className="w-3.5 h-3.5 rounded text-emerald-700"
                      />
                      <span>{o2}</span>
                    </label>
                  ))}
                </div>

                {/* Show PRN/Continuous if any device checked except ONLY RA */}
                {getArr('o2_devices').length > 0 && !getArr('o2_devices').every(dev => dev === 'RA') && (
                  <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500">Schedule:</span>
                    {['Continuous', 'PRN'].map((m) => (
                      <label key={m} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="o2_mode" checked={getF('o2_mode') === m} onChange={() => setF('o2_mode', m)} />
                        <span>{m}</span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className="flex items-center gap-1 bg-slate-50 border rounded px-2 py-0.5">
                    <span className="text-[10px] font-bold text-slate-500">O₂ Sat:</span>
                    <input type="text" placeholder="e.g. 98%" value={getF('o2_sat')} onChange={(e) => setF('o2_sat', e.target.value)} className="w-full bg-transparent text-xs font-bold text-emerald-900 outline-none" />
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 border rounded px-2 py-0.5">
                    <span className="text-[10px] font-bold text-slate-500">Flow Rate:</span>
                    <input type="text" placeholder="e.g. 2 LPM" value={getF('o2_lpm')} onChange={(e) => setF('o2_lpm', e.target.value)} className="w-full bg-transparent text-xs font-bold text-emerald-900 outline-none" />
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 border rounded px-2 py-0.5">
                    <span className="text-[10px] font-bold text-slate-500">FiO₂:</span>
                    <input type="text" placeholder="e.g. 28%" value={getF('o2_fio2')} onChange={(e) => setF('o2_fio2', e.target.value)} className="w-full bg-transparent text-xs outline-none" />
                  </div>
                  <input type="text" placeholder="Response / SpO₂ if significant" value={getF('o2_response')} onChange={(e) => setF('o2_response', e.target.value)} className="bg-slate-50 border rounded px-2 py-0.5 text-xs outline-none" />
                </div>
              </div>

              {/* ET / Trache Airway Details */}
              {(getArr('o2_devices').includes('ET') || getArr('o2_devices').includes('Trache')) && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">ET / Trache Airway Details</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Size (e.g. 7.5 Fr)" value={getF('airway_size')} onChange={(e) => setF('airway_size', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Depth / marking at lip" value={getF('airway_depth')} onChange={(e) => setF('airway_depth', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Cuff status" value={getF('airway_cuff')} onChange={(e) => setF('airway_cuff', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Ventilator connection / settings" value={getF('airway_vent_settings')} onChange={(e) => setF('airway_vent_settings', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. GASTROINTESTINAL */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <i className="fas fa-utensils text-emerald-800"></i>
              <span>5. GASTROINTESTINAL</span>
            </h4>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80">
            <input
              type="checkbox"
              checked={isNoProb('gi')}
              onChange={() => toggleNoProb('gi')}
              className="w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
            />
            <span>No Problem Assessed at this time</span>
          </label>

          {!isNoProb('gi') && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Checklist</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    'Appetite',
                    'Abdominal Distention',
                    'Nausea/Vomiting',
                    'Diarrhea',
                    'Constipation',
                    'Bowel Sound',
                    'Colostomy',
                    'Feeding Tube'
                  ].map((item) => {
                    const checked = getArr('gi_items').includes(item);
                    return (
                      <label key={item} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleArr('gi_items', item)}
                          className="w-3.5 h-3.5 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Appetite Options */}
              {getArr('gi_items').includes('Appetite') && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Appetite Status</span>
                  <div className="flex gap-2 text-xs">
                    {['Good', 'Fair', 'Poor'].map((a) => (
                      <label key={a} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="gi_appetite" checked={getF('gi_appetite') === a} onChange={() => setF('gi_appetite', a)} />
                        <span>{a}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Abdominal Distention */}
              {getArr('gi_items').includes('Abdominal Distention') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Abdominal Distention Details</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Location / Generalized" value={getF('distention_loc')} onChange={(e) => setF('distention_loc', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Degree (Mild, Mod, Severe)" value={getF('distention_degree')} onChange={(e) => setF('distention_degree', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                  </div>
                  <input type="text" placeholder="Tenderness if present" value={getF('distention_tenderness')} onChange={(e) => setF('distention_tenderness', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-1 text-xs" />
                </div>
              )}

              {/* Nausea/Vomiting */}
              {getArr('gi_items').includes('Nausea/Vomiting') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Nausea / Vomiting Details</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <input type="text" placeholder="# Episodes" value={getF('nv_episodes')} onChange={(e) => setF('nv_episodes', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Amount (mL)" value={getF('nv_amount')} onChange={(e) => setF('nv_amount', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Character / Color" value={getF('nv_character')} onChange={(e) => setF('nv_character', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                  </div>
                </div>
              )}

              {/* Diarrhea */}
              {getArr('gi_items').includes('Diarrhea') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Diarrhea Details</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Frequency" value={getF('diarrhea_freq')} onChange={(e) => setF('diarrhea_freq', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Amount / character" value={getF('diarrhea_char')} onChange={(e) => setF('diarrhea_char', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                  </div>
                </div>
              )}

              {/* Constipation */}
              {getArr('gi_items').includes('Constipation') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Constipation Details</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Last BM" value={getF('gi_last_bm')} onChange={(e) => setF('gi_last_bm', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Number of days" value={getF('constip_days')} onChange={(e) => setF('constip_days', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                  </div>
                </div>
              )}

              {/* Bowel Sound Options */}
              {getArr('gi_items').includes('Bowel Sound') && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Bowel Sound</span>
                  <div className="flex gap-3 text-xs">
                    {['Present', 'Not Present', 'Hyperactive', 'Hypoactive'].map((bs) => (
                      <label key={bs} className="flex items-center gap-1 cursor-pointer font-medium">
                        <input type="radio" name="gi_bs" checked={getF('gi_bs') === bs} onChange={() => setF('gi_bs', bs)} />
                        <span>{bs}</span>
                      </label>
                    ))}
                  </div>
                  <input type="text" placeholder="Location / quality if abnormal" value={getF('bs_loc_quality')} onChange={(e) => setF('bs_loc_quality', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-1 text-xs" />
                </div>
              )}

              {/* Colostomy */}
              {getArr('gi_items').includes('Colostomy') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Colostomy Details</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <input type="text" placeholder="Site" value={getF('colostomy_site')} onChange={(e) => setF('colostomy_site', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Stoma appearance" value={getF('colostomy_stoma')} onChange={(e) => setF('colostomy_stoma', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Output / character" value={getF('colostomy_output')} onChange={(e) => setF('colostomy_output', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                  </div>
                </div>
              )}

              {/* Feeding Tube */}
              {getArr('gi_items').includes('Feeding Tube') && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Feeding Tube Details</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" placeholder="Type (NGT / PEG / J-tube)" value={getF('ftube_type')} onChange={(e) => setF('ftube_type', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Fr size" value={getF('ftube_size')} onChange={(e) => setF('ftube_size', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Marking / length" value={getF('ftube_marking')} onChange={(e) => setF('ftube_marking', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                    <input type="text" placeholder="Patency" value={getF('ftube_patency')} onChange={(e) => setF('ftube_patency', e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-xs" />
                  </div>
                  <input type="text" placeholder="Feeding / tolerance" value={getF('ftube_tolerance')} onChange={(e) => setF('ftube_tolerance', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-1 text-xs" />
                </div>
              )}

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <input type="text" placeholder="Diet (e.g. Regular / NPO)" value={getF('gi_diet')} onChange={(e) => setF('gi_diet', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-0.5 text-xs font-bold text-slate-800" />
              </div>
            </div>
          )}
        </div>

        {/* 6. GENITO-URINARY */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <i className="fas fa-tint text-emerald-800"></i>
              <span>6. GENITO-URINARY</span>
            </h4>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80">
            <input
              type="checkbox"
              checked={isNoProb('gu')}
              onChange={() => toggleNoProb('gu')}
              className="w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
            />
            <span>No Problem Assessed at this time</span>
          </label>

          {!isNoProb('gu') && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Checklist</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    'Pain on Urination',
                    'Distention/Retention',
                    'Frequency/Urgency',
                    'Hematuria',
                    'Incontinence',
                    'FC',
                    'Suprapubic Cath.',
                    'Condom Cath.',
                    'Dialysis'
                  ].map((item) => {
                    const checked = getArr('gu_items').includes(item);
                    return (
                      <label key={item} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleArr('gu_items', item)}
                          className="w-3.5 h-3.5 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Dialysis Schedule */}
              {getArr('gu_items').includes('Dialysis') && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px]">Dialysis Days</span>
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    {['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'].map((d) => (
                      <label key={d} className="flex items-center gap-0.5 cursor-pointer font-bold px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                        <input type="checkbox" checked={getArr('dialysis_days').includes(d)} onChange={() => toggleArr('dialysis_days', d)} className="w-3 h-3 rounded text-emerald-700" />
                        <span>{d}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <span className="font-bold text-slate-800 block text-[11px]">Urine Characteristics</span>
                <div className="grid grid-cols-3 gap-1">
                  <input type="text" placeholder="Color" value={getF('urine_color')} onChange={(e) => setF('urine_color', e.target.value)} className="bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                  <input type="text" placeholder="Amt (mL)" value={getF('urine_amt')} onChange={(e) => setF('urine_amt', e.target.value)} className="bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                  <input type="text" placeholder="Odor" value={getF('urine_odor')} onChange={(e) => setF('urine_odor', e.target.value)} className="bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                </div>
                <input type="text" placeholder="Cath Size (e.g. Fr16) / UO rate..." value={getF('gu_cath_size')} onChange={(e) => setF('gu_cath_size', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-0.5 text-xs" />
              </div>
            </div>
          )}
        </div>

        {/* 7. ENDOCRINE */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <i className="fas fa-syringes text-emerald-800"></i>
              <span>7. ENDOCRINE</span>
            </h4>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80">
            <input
              type="checkbox"
              checked={isNoProb('endo')}
              onChange={() => toggleNoProb('endo')}
              className="w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
            />
            <span>No Problem Assessed at this time</span>
          </label>

          {!isNoProb('endo') && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Checklist</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    'Diabetic',
                    'Polyuria',
                    'Polydipsia',
                    'Polyphagia',
                    'S/S Hypoglycemia',
                    'S/S Hyperglycemia'
                  ].map((item) => {
                    const checked = getArr('endo_items').includes(item);
                    return (
                      <label key={item} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleArr('endo_items', item)}
                          className="w-3.5 h-3.5 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500">CBG:</span>
                  <input type="text" placeholder="68 mg/dL" value={getF('cbg_val')} onChange={(e) => setF('cbg_val', e.target.value)} className="w-28 bg-slate-50 border rounded px-2 py-0.5 text-xs font-bold text-emerald-900" />
                </div>
                <input type="text" placeholder="Insulin / Intervention protocol..." value={getF('endo_interv')} onChange={(e) => setF('endo_interv', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-0.5 text-xs mt-1" />
              </div>
            </div>
          )}
        </div>

        {/* 8. MUSCULOSKELETAL */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <i className="fas fa-bone text-emerald-800"></i>
              <span>8. MUSCULOSKELETAL</span>
            </h4>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80">
            <input
              type="checkbox"
              checked={isNoProb('musc')}
              onChange={() => toggleNoProb('musc')}
              className="w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
            />
            <span>No Problem Assessed at this time</span>
          </label>

          {!isNoProb('musc') && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Checklist</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    'Stiff Joints',
                    'Contractures',
                    'Painful Joints',
                    'Unsteady Balance/Gait',
                    'Weakness',
                    'Paralysis/weakness'
                  ].map((item) => {
                    const checked = getArr('musc_items').includes(item);
                    return (
                      <label key={item} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleArr('musc_items', item)}
                          className="w-3.5 h-3.5 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
                <input type="text" placeholder="Assist level (e.g. Ambulates with assist ×1)" value={getF('musc_assist')} onChange={(e) => setF('musc_assist', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-0.5 text-xs font-bold text-slate-800" />
                <input type="text" placeholder="Joint / Weakness location details..." value={getF('musc_weakness_loc')} onChange={(e) => setF('musc_weakness_loc', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-0.5 text-xs" />
              </div>
            </div>
          )}
        </div>

        {/* 9. SKIN */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <i className="fas fa-hand-holding-medical text-emerald-800"></i>
              <span>9. SKIN</span>
            </h4>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80">
            <input
              type="checkbox"
              checked={isNoProb('skin')}
              onChange={() => toggleNoProb('skin')}
              className="w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
            />
            <span>No Problem Assessed at this time</span>
          </label>

          {!isNoProb('skin') && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Turgor & Temperature</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block">Turgor:</span>
                    <div className="flex gap-1 text-[11px]">
                      {['Good', 'Fair', 'Poor'].map((t) => (
                        <label key={t} className="flex items-center gap-0.5 cursor-pointer">
                          <input type="radio" name="skin_turgor" checked={getF('skin_turgor') === t} onChange={() => setF('skin_turgor', t)} />
                          <span>{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block">Temp:</span>
                    <div className="flex gap-1 text-[11px]">
                      {['Warm', 'Hot', 'Cold'].map((tm) => (
                        <label key={tm} className="flex items-center gap-0.5 cursor-pointer">
                          <input type="radio" name="skin_temp" checked={getF('skin_temp') === tm} onChange={() => setF('skin_temp', tm)} />
                          <span>{tm}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Checklist</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    'Tumor',
                    'Rash',
                    'Pruritus',
                    'Bruises',
                    'Blister',
                    'Dry',
                    'Cellulitis',
                    'Pallor',
                    'Surgical Wound',
                    'Jaundice',
                    'Skin Tear',
                    'Stasis Ulcer',
                    'Pressure Ulcer',
                    'Diabetic Ulcer'
                  ].map((item) => {
                    const checked = getArr('skin_items').includes(item);
                    return (
                      <label key={item} className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleArr('skin_items', item)}
                          className="w-3.5 h-3.5 rounded text-emerald-700 border-slate-300 focus:ring-0 cursor-pointer"
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <input type="text" placeholder="Site (e.g. Sacral area / R heel)" value={getF('skin_site')} onChange={(e) => setF('skin_site', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-0.5 text-xs font-bold text-slate-800" />
                <div className="grid grid-cols-2 gap-1">
                  <input type="text" placeholder="Drainage" value={getF('skin_drainage')} onChange={(e) => setF('skin_drainage', e.target.value)} className="bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                  <input type="text" placeholder="Amount" value={getF('skin_amount')} onChange={(e) => setF('skin_amount', e.target.value)} className="bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                </div>
                <input type="text" placeholder="Wound Description (e.g. dressing intact)" value={getF('skin_desc')} onChange={(e) => setF('skin_desc', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-0.5 text-xs" />
              </div>

              {/* ABNORMALITY PHOTO DOCUMENTATION REMINDER */}
              {(getArr('skin_items').length > 0 || !!getF('skin_site') || !!getF('skin_desc') || (!!getF('skin_turgor') && getF('skin_turgor') !== 'Good')) && (
                <label className="flex items-center justify-between p-2.5 bg-amber-50/80 hover:bg-amber-100/70 rounded-xl border border-amber-200/80 text-xs cursor-pointer transition-colors animate-in fade-in duration-150">
                  <span className="font-bold text-amber-950 text-xs flex items-center gap-2">
                    <i className="fas fa-camera text-amber-700 text-xs"></i>
                    <span>Photo Documentation Reminder</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={getF('skin_photo_taken') === 'yes'}
                    onChange={(e) => setF('skin_photo_taken', e.target.checked ? 'yes' : 'no')}
                    className="w-4 h-4 rounded text-amber-700 border-amber-300 focus:ring-0 cursor-pointer"
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {/* 10. PAIN */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <i className="fas fa-exclamation-circle text-emerald-800"></i>
              <span>10. PAIN</span>
            </h4>
          </div>

          <div className="flex gap-4 text-xs font-bold">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="pain_status" checked={getF('pain_status') === 'NO'} onChange={() => setF('pain_status', 'NO')} />
              <span>NO PAIN</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-rose-800">
              <input type="radio" name="pain_status" checked={getF('pain_status') === 'YES'} onChange={() => setF('pain_status', 'YES')} />
              <span>YES (Pain Present)</span>
            </label>
          </div>

          {getF('pain_status') === 'YES' && (
            <div className="space-y-2 text-xs bg-white p-3 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-1.5">
                <input type="text" placeholder="Location" value={getF('pain_loc')} onChange={(e) => setF('pain_loc', e.target.value)} className="bg-slate-50 border rounded px-2 py-0.5 text-xs" />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500">Intensity:</span>
                  <input type="text" placeholder="4/10" value={getF('pain_intensity')} onChange={(e) => setF('pain_intensity', e.target.value)} className="w-full bg-slate-50 border rounded px-1.5 py-0.5 text-xs font-bold text-rose-800" />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block">Character:</span>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  {['Sharp', 'Dull', 'Burning', 'Radiating'].map((pType) => (
                    <label key={pType} className="flex items-center gap-1 cursor-pointer font-medium">
                      <input type="checkbox" checked={getArr('pain_types').includes(pType)} onChange={() => toggleArr('pain_types', pType)} className="w-3.5 h-3.5 rounded text-emerald-700" />
                      <span>{pType}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-500">Controlled?</span>
                <div className="flex gap-2">
                  {['Yes', 'No'].map((c) => (
                    <label key={c} className="flex items-center gap-1 cursor-pointer font-bold">
                      <input type="radio" name="pain_controlled" checked={getF('pain_controlled') === c} onChange={() => setF('pain_controlled', c)} />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              <input type="text" placeholder="Intervention & Reassessment response..." value={getF('pain_reassessment')} onChange={(e) => setF('pain_reassessment', e.target.value)} className="w-full bg-slate-50 border rounded px-2 py-0.5 text-xs" />
            </div>
          )}
        </div>

        {/* 11. DRAINS / CONTRAPTIONS */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col space-y-3 md:col-span-2 lg:col-span-3">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <i className="fas fa-plug text-emerald-800"></i>
              <span>11. DRAINS / CONTRAPTIONS</span>
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 text-xs">
            {/* IV Access */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer font-black text-emerald-950 text-[11px]">
                <input type="checkbox" checked={getArr('drains_checked').includes('IV Access')} onChange={() => toggleArr('drains_checked', 'IV Access')} className="w-3.5 h-3.5 rounded text-emerald-700" />
                <span>IV ACCESS</span>
              </label>
              {getArr('drains_checked').includes('IV Access') && (
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <input type="text" placeholder="Site & Gauge (e.g. R forearm 20G)" value={getF('iv_site_gauge')} onChange={(e) => setF('iv_site_gauge', e.target.value)} className="w-full bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                  <input type="text" placeholder="Condition (Clean, dry, intact)" value={getF('iv_condition')} onChange={(e) => setF('iv_condition', e.target.value)} className="w-full bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                </div>
              )}
            </div>

            {/* Chest Tube */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer font-black text-emerald-950 text-[11px]">
                <input type="checkbox" checked={getArr('drains_checked').includes('Chest Tube')} onChange={() => toggleArr('drains_checked', 'Chest Tube')} className="w-3.5 h-3.5 rounded text-emerald-700" />
                <span>CHEST TUBE</span>
              </label>
              {getArr('drains_checked').includes('Chest Tube') && (
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <div className="flex gap-2 text-[10px]">
                    <label><input type="radio" name="ct_side" checked={getF('ct_side') === 'R'} onChange={() => setF('ct_side', 'R')} /> R</label>
                    <label><input type="radio" name="ct_side" checked={getF('ct_side') === 'L'} onChange={() => setF('ct_side', 'L')} /> L</label>
                  </div>
                  <input type="text" placeholder="System (water seal/suction)" value={getF('ct_system')} onChange={(e) => setF('ct_system', e.target.value)} className="w-full bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                  <input type="text" placeholder="Output (mL) & color" value={getF('ct_output')} onChange={(e) => setF('ct_output', e.target.value)} className="w-full bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                </div>
              )}
            </div>

            {/* JP / Pigtail */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer font-black text-emerald-950 text-[11px]">
                <input type="checkbox" checked={getArr('drains_checked').includes('JP/Pigtail')} onChange={() => toggleArr('drains_checked', 'JP/Pigtail')} className="w-3.5 h-3.5 rounded text-emerald-700" />
                <span>JP / PIGTAIL</span>
              </label>
              {getArr('drains_checked').includes('JP/Pigtail') && (
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <input type="text" placeholder="Location" value={getF('jp_loc')} onChange={(e) => setF('jp_loc', e.target.value)} className="w-full bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                  <input type="text" placeholder="Output (mL)" value={getF('jp_output')} onChange={(e) => setF('jp_output', e.target.value)} className="w-full bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                </div>
              )}
            </div>

            {/* Hemovac */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer font-black text-emerald-950 text-[11px]">
                <input type="checkbox" checked={getArr('drains_checked').includes('Hemovac')} onChange={() => toggleArr('drains_checked', 'Hemovac')} className="w-3.5 h-3.5 rounded text-emerald-700" />
                <span>HEMOVAC</span>
              </label>
              {getArr('drains_checked').includes('Hemovac') && (
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <input type="text" placeholder="Output & character" value={getF('hemo_details')} onChange={(e) => setF('hemo_details', e.target.value)} className="w-full bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                </div>
              )}
            </div>

            {/* Wound Vac */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer font-black text-emerald-950 text-[11px]">
                <input type="checkbox" checked={getArr('drains_checked').includes('Wound Vac')} onChange={() => toggleArr('drains_checked', 'Wound Vac')} className="w-3.5 h-3.5 rounded text-emerald-700" />
                <span>WOUND VAC</span>
              </label>
              {getArr('drains_checked').includes('Wound Vac') && (
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <input type="text" placeholder="Suction / Drainage" value={getF('wvac_details')} onChange={(e) => setF('wvac_details', e.target.value)} className="w-full bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                </div>
              )}
            </div>

            {/* CVC */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer font-black text-emerald-950 text-[11px]">
                <input type="checkbox" checked={getArr('drains_checked').includes('CVC')} onChange={() => toggleArr('drains_checked', 'CVC')} className="w-3.5 h-3.5 rounded text-emerald-700" />
                <span>CVC</span>
              </label>
              {getArr('drains_checked').includes('CVC') && (
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <input type="text" placeholder="Site & Dressing" value={getF('cvc_details')} onChange={(e) => setF('cvc_details', e.target.value)} className="w-full bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                </div>
              )}
            </div>

            {/* A/V Access */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer font-black text-emerald-950 text-[11px]">
                <input type="checkbox" checked={getArr('drains_checked').includes('A/V Access')} onChange={() => toggleArr('drains_checked', 'A/V Access')} className="w-3.5 h-3.5 rounded text-emerald-700" />
                <span>A/V ACCESS</span>
              </label>
              {getArr('drains_checked').includes('A/V Access') && (
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <input type="text" placeholder="Location & Thrill/Bruit" value={getF('av_details')} onChange={(e) => setF('av_details', e.target.value)} className="w-full bg-slate-50 border rounded px-1.5 py-0.5 text-xs" />
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 12. GENERAL REMARKS & ADDITIONAL CLINICAL FINDINGS (DELIBERATELY SEPARATE) */}
      <div className="bg-slate-50/90 rounded-3xl p-6 border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <i className="fas fa-edit text-emerald-800"></i>
              <span>12. GENERAL REMARKS & ADDITIONAL CLINICAL FINDINGS</span>
            </h4>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
              Select a category tab below to insert standard clinical shift event templates into your notes:
            </p>
          </div>
        </div>

        {/* CATEGORY TABS FOR PRESETS */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {[
            { id: 'physician', label: 'Physician', icon: 'fa-user-md' },
            { id: 'care', label: 'Nursing Care / Comfort', icon: 'fa-heart' },
            { id: 'procedures', label: 'Procedures', icon: 'fa-procedures' },
            { id: 'events', label: 'Significant Events', icon: 'fa-exclamation-triangle' },
            { id: 'teaching', label: 'Teaching', icon: 'fa-chalkboard-teacher' },
            { id: 'plans', label: 'Plans / Pending', icon: 'fa-tasks' },
            { id: 'endorsement', label: 'Endorsement', icon: 'fa-file-signature' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveRemarkCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeRemarkCategory === tab.id
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <i className={`fas ${tab.icon} text-[10px]`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* PRESET BUTTONS ACCORDING TO ACTIVE TAB */}
        <div className="flex flex-wrap gap-2 pt-1">
          {activeRemarkCategory === 'care' && (
            <>
              {[
                'Kept patient rested and comfortable.',
                'Safety precautions maintained.',
                'Assisted with repositioning as needed.'
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleAppendPresetNote(p)}
                  className="bg-white hover:bg-emerald-800 hover:text-white border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fas fa-plus text-[10px] text-emerald-700"></i>
                  <span>{p}</span>
                </button>
              ))}
            </>
          )}

          {activeRemarkCategory === 'physician' && (
            <>
              {[
                'Seen and examined by Dr. ___ at [time]H.',
                'Dr. ___ notified regarding ______.',
                'Orders received and carried out.',
                'For referral to ______.'
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleAppendPresetNote(p)}
                  className="bg-white hover:bg-emerald-800 hover:text-white border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fas fa-plus text-[10px] text-emerald-700"></i>
                  <span>{p}</span>
                </button>
              ))}
            </>
          )}

          {activeRemarkCategory === 'procedures' && (
            <>
              {[
                'Patient transported to ______ at [time]H.',
                'Post ______ procedure.',
                'Procedure tolerated well.'
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleAppendPresetNote(p)}
                  className="bg-white hover:bg-emerald-800 hover:text-white border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fas fa-plus text-[10px] text-emerald-700"></i>
                  <span>{p}</span>
                </button>
              ))}
            </>
          )}

          {activeRemarkCategory === 'events' && (
            <>
              {[
                'Episode of ______ noted at [time]H.',
                'No untoward events noted during shift.'
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleAppendPresetNote(p)}
                  className="bg-white hover:bg-emerald-800 hover:text-white border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fas fa-plus text-[10px] text-emerald-700"></i>
                  <span>{p}</span>
                </button>
              ))}
            </>
          )}

          {activeRemarkCategory === 'teaching' && (
            <>
              {[
                'Health teaching provided regarding ______.',
                'Patient/family verbalized understanding.'
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleAppendPresetNote(p)}
                  className="bg-white hover:bg-emerald-800 hover:text-white border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fas fa-plus text-[10px] text-emerald-700"></i>
                  <span>{p}</span>
                </button>
              ))}
            </>
          )}

          {activeRemarkCategory === 'plans' && (
            <>
              {[
                'For repeat ______ at [time]H.',
                'For follow-up of ______.',
                'For transfer/discharge as ordered.'
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleAppendPresetNote(p)}
                  className="bg-white hover:bg-emerald-800 hover:text-white border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fas fa-plus text-[10px] text-emerald-700"></i>
                  <span>{p}</span>
                </button>
              ))}
            </>
          )}

          {activeRemarkCategory === 'endorsement' && (
            <>
              {[
                'Pending ______ endorsed to incoming RN.',
                'Endorsed for continuity of care.'
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleAppendPresetNote(p)}
                  className="bg-white hover:bg-emerald-800 hover:text-white border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fas fa-plus text-[10px] text-emerald-700"></i>
                  <span>{p}</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* FULL WIDTH TEXTAREA */}
        <textarea
          rows={5}
          value={data.additionalClinicalFindings || ''}
          onChange={(e) => onChange({ ...data, additionalClinicalFindings: e.target.value })}
          placeholder="Enter additional clinical notes, shift endorsements, or specific patient responses here..."
          className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 outline-none focus:border-emerald-800 shadow-inner leading-relaxed"
        />
      </div>

    </div>
  );
};

export default NurseNotesChecklist;
