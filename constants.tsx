
import React from 'react';
import { RoomData } from './types';

export const STORAGE_KEY = 'Z_STATION_MANAGER_DATA_V4';

export const getInitialRoomData = (): Omit<RoomData, 'id' | 'roomNumber' | 'lastUpdated'> => ({
  status: 'active',
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
});

export const MEDICATION_FREQUENCIES = [
  { label: 'QD (Once Daily)', value: 'QD', defaultTimes: ['08:00'] },
  { label: 'BID (Twice Daily)', value: 'BID', defaultTimes: ['08:00', '20:00'] },
  { label: 'TID (3x Daily)', value: 'TID', defaultTimes: ['08:00', '13:00', '18:00'] },
  { label: 'QID (4x Daily)', value: 'QID', defaultTimes: ['06:00', '12:00', '18:00', '24:00'] },
  { label: 'Q4H (Every 4 Hours)', value: 'Q4H', defaultTimes: ['02:00', '06:00', '10:00', '14:00', '18:00', '22:00'] },
  { label: 'Q6H (Every 6 Hours)', value: 'Q6H', defaultTimes: ['06:00', '12:00', '18:00', '00:00'] },
  { label: 'Q8H (Every 8 Hours)', value: 'Q8H', defaultTimes: ['06:00', '14:00', '22:00'] },
  { label: 'Q12H (Every 12 Hours)', value: 'Q12H', defaultTimes: ['08:00', '20:00'] },
  { label: 'PRN (As Needed)', value: 'PRN', defaultTimes: [] },
  { label: 'STAT (Immediately)', value: 'STAT', defaultTimes: [] },
];

export const isTimeInShift = (timeStr: string, shift: string): boolean => {
  if (!timeStr) return true;
  const [hStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return true;

  if (shift === '6-2') {
    return h >= 6 && h < 14;
  }
  if (shift === '2-10') {
    return h >= 14 && h < 22;
  }
  if (shift === '10-6') {
    return h >= 22 || h < 6;
  }
  return true;
};

export const getTimesForShift = (times: string[], shift: string): string[] => {
  if (!times || times.length === 0) return [];
  return times.filter(t => isTimeInShift(t, shift));
};

export const COMMON_PRECAUTIONS = [
  "NPO",
  "Strict Bed Rest",
  "Left Arm Precaution",
  "Right Arm Precaution",
  "Fall Precaution",
  "Seizure Precaution"
];

export const CONTRAPTION_OPTIONS = [
  "JP Drain",
  "IFC",
  "NGT",
  "Chest Tube",
  "Hemovac"
];

export const FLUID_OPTIONS = [
  "PNSS 1L",
  "D5LRS 1L",
  "D5NRSS 1L",
  "D50.3 NaCl 1L",
  "PLR 1L",
  "Other"
];

export const COLORS = {
  primary: 'green-700',
  secondary: 'green-50',
  accent: 'green-400',
  danger: 'rose-500',
  success: 'green-600',
  text: 'slate-900'
};

export const getDefaultClinicalTemplates = (): import('./types').ClinicalTemplate[] => [
  {
    id: 'tmpl_blood_transfusion',
    title: 'Blood Transfusion Protocol',
    type: 'procedure',
    category: 'Transfusion & Hematology',
    description: 'Standard bedside nursing verification, monitoring, and administration protocol for packed RBC / blood products.',
    steps: [
      { id: 's1', text: "Check physician's order and verify signed informed consent in chart" },
      { id: 's2', text: "Verify patient identity, blood type, Rh, and unit cross-match number with 2nd RN" },
      { id: 's3', text: "Obtain baseline vital signs (BP, HR, RR, Temp) prior to spiking unit" },
      { id: 's4', text: "Spike blood unit using 0.9% Normal Saline Y-tubing with filter" },
      { id: 's5', text: "Begin infusion slowly at ~2 mL/min for the first 15 minutes (stay at bedside)" },
      { id: 's6', text: "Re-check and log vital signs at 15 minutes post-initiation" },
      { id: 's7', text: "Monitor for transfusion reaction (fever, chills, rash, dyspnea, flank pain)" },
      { id: 's8', text: "Re-check vital signs hourly until infusion completes (max 4 hrs)" },
      { id: 's9', text: "Flush line with Normal Saline post-transfusion and log total volume" }
    ]
  },
  {
    id: 'tmpl_foley_insertion',
    title: 'Indwelling Foley Catheterization',
    type: 'procedure',
    category: 'Genitourinary Care',
    description: 'Aseptic technique protocol for placement of indwelling urinary catheter.',
    steps: [
      { id: 's1', text: "Verify physician order and check patient for allergies (Latex, Betadine)" },
      { id: 's2', text: "Perform hand hygiene and set up sterile field using aseptic technique" },
      { id: 's3', text: "Test catheter balloon with 10 mL sterile water prior to insertion" },
      { id: 's4', text: "Cleanse meatus with antiseptic and insert lubricated catheter until urine flash" },
      { id: 's5', text: "Advance catheter an additional 1-2 inches before inflating balloon with 10 mL water" },
      { id: 's6', text: "Secure catheter to inner thigh and hang drainage bag below bladder level" },
      { id: 's7', text: "Document catheter size, balloon volume, urine color, and initial output" }
    ]
  },
  {
    id: 'tmpl_central_line_dressing',
    title: 'Central Line Dressing Change',
    type: 'procedure',
    category: 'Vascular Access & Wound',
    description: 'Sterile dressing change protocol for CVC, PICC, or Dialysis catheters.',
    steps: [
      { id: 's1', text: "Position patient flat or trendelenburg; don mask on patient and nurse" },
      { id: 's2', text: "Don clean gloves and carefully remove old dressing away from insertion site" },
      { id: 's3', text: "Inspect insertion site for erythema, swelling, tenderness, or purulent exudate" },
      { id: 's4', text: "Don sterile gloves and cleanse site with Chlorhexidine (CHG) for 30 sec; let air dry" },
      { id: 's5', text: "Apply CHG biopatch and occlusive transparent sterile dressing" },
      { id: 's6', text: "Label dressing with date, time, and nurse initials" }
    ]
  },
  {
    id: 'tmpl_furosemide',
    title: 'Furosemide (Lasix) IV/PO',
    type: 'medication',
    category: 'Cardiovascular & Renal',
    description: 'Loop diuretic administration nursing considerations and safety checks.',
    steps: [
      { id: 's1', text: "Check Blood Pressure and Heart Rate before dose (hold if BP < 90/60)" },
      { id: 's2', text: "Verify serum Potassium (K+) level prior to dose (notify provider if < 3.5 mEq/L)" },
      { id: 's3', text: "Administer IV push slowly over 1-2 minutes (max 20mg/min to prevent ototoxicity)" },
      { id: 's4', text: "Monitor strict Intake & Output (I&O) and daily weight trends" },
      { id: 's5', text: "Watch for hypokalemia signs: muscle cramps, weakness, cardiac dysrhythmias" }
    ]
  },
  {
    id: 'tmpl_digoxin',
    title: 'Digoxin (Lanoxin)',
    type: 'medication',
    category: 'Cardiovascular',
    description: 'Inotropic agent administration and digitalis toxicity precautions.',
    steps: [
      { id: 's1', text: "Count apical pulse for 1 full minute prior to administration" },
      { id: 's2', text: "Hold dose and notify provider if apical pulse is < 60 bpm in adults" },
      { id: 's3', text: "Check most recent serum Digoxin level (therapeutic range: 0.5 - 2.0 ng/mL)" },
      { id: 's4', text: "Check serum Potassium level (hypokalemia increases risk of Digoxin toxicity)" },
      { id: 's5', text: "Monitor for toxicity signs: nausea, vomiting, yellow/green halo vision, bradycardia" }
    ]
  },
  {
    id: 'tmpl_regular_insulin',
    title: 'Regular / Short-Acting Insulin',
    type: 'medication',
    category: 'Endocrine & Glycemic',
    description: 'Subcutaneous insulin administration protocol & hypoglycemia watch.',
    steps: [
      { id: 's1', text: "Obtain capillary blood glucose (CBG) reading within 30 minutes before meal" },
      { id: 's2', text: "Verify meal tray is available at bedside before injecting short-acting insulin" },
      { id: 's3', text: "Double-check dose and syringe units with 2nd RN per hospital policy" },
      { id: 's4', text: "Rotate subcutaneous injection sites (abdomen, thigh, upper arm)" },
      { id: 's5', text: "Monitor for hypoglycemia (CBG < 70 mg/dL): tremors, diaphoresis, confusion" }
    ]
  },
  {
    id: 'tmpl_morphine_iv',
    title: 'Morphine Sulfate IV Push',
    type: 'medication',
    category: 'Analgesics & Opioids',
    description: 'Opioid administration guidelines and respiratory depression monitoring.',
    steps: [
      { id: 's1', text: "Assess baseline pain rating (0-10) and Respiratory Rate prior to dose" },
      { id: 's2', text: "Hold dose and contact provider if Respiratory Rate < 12 breaths/min" },
      { id: 's3', text: "Dilute dose with Normal Saline and push slowly over 4-5 minutes" },
      { id: 's4', text: "Re-assess pain score, sedation level, and vital signs at 15-30 minutes post-dose" },
      { id: 's5', text: "Ensure Naloxone (Narcan) is readily accessible on the unit" }
    ]
  },
  {
    id: 'tmpl_acs_mi',
    title: 'Acute Coronary Syndrome (ACS) / Myocardial Infarction',
    type: 'disease',
    category: 'Cardiovascular Care',
    description: 'Clinical assessment, MONA therapy checks, telemetry monitoring, and serial cardiac enzyme protocol.',
    diseaseDetails: {
      pathophysiology: 'Atherosclerotic plaque rupture or erosion causing platelet aggregation, thrombus formation, and acute occlusion of coronary arterial blood flow, resulting in myocardial ischemia and tissue necrosis.',
      signsAndSymptoms: [
        'Substernal crushing chest pain radiating to jaw, neck, left arm, or back',
        'Diaphoresis, shortness of breath, nausea, and vomiting',
        'Atypical presentation in diabetics/females: unexplained dyspnea, fatigue, epigastric discomfort',
        'Tachycardia, pallor, hypotension (if cardiogenic shock ensues)'
      ],
      interventions: [
        'Obtain immediate 12-lead ECG within 10 minutes of chest pain onset',
        'Administer supplemental O2 if SpO2 < 90% or patient in respiratory distress',
        'Continuous cardiac telemetry monitoring for arrhythmias (VT, VF, heart blocks)',
        'Maintain strict bedrest and calm environment; establish 2 large-bore IV lines'
      ],
      medicalManagement: [
        'Chewable Aspirin 160-325 mg stat (unless contraindicated)',
        'Sublingual Nitroglycerin 0.4 mg q5min x 3 doses (hold if SBP < 90 mmHg or HR < 50 bpm)',
        'IV Morphine or Fentanyl for refractory ischemic pain',
        'Stat serial cardiac biomarkers (Troponin I/T, CK-MB) at 0h, 3h, 6h',
        'Anticoagulation (Heparin / Enoxaparin) & P2Y12 inhibitors (Clopidogrel, Ticagrelor)'
      ],
      redFlags: [
        'Sustained Ventricular Tachycardia (VT) or Ventricular Fibrillation (VF)',
        'New pulmonary crackles, S3 gallop, or acute hypotension (Cardiogenic shock)',
        'Refractory ischemic pain unimproved by nitrates and analgesics'
      ]
    },
    steps: [
      { id: 's1', text: "Obtain immediate 12-lead ECG within 10 minutes of chest pain onset" },
      { id: 's2', text: "Administer supplemental O2 if SpO2 < 90% or patient in respiratory distress" },
      { id: 's3', text: "Administer chewable Aspirin (160-325 mg) unless contraindicated" },
      { id: 's4', text: "Administer Sublingual Nitroglycerin q5min x 3 doses (hold if SBP < 90 mmHg or HR < 50)" },
      { id: 's5', text: "Continuous cardiac telemetry monitoring for arrhythmias (VT, VF, heart blocks)" },
      { id: 's6', text: "Draw stat serial Troponin and CK-MB per lab protocol" },
      { id: 's7', text: "Maintain strict bedrest and calm environment; establish 2 large-bore IV lines" }
    ]
  },
  {
    id: 'tmpl_pneumonia',
    title: 'Pneumonia / Lower Respiratory Tract Infection',
    type: 'disease',
    category: 'Respiratory Care',
    description: 'Respiratory assessment, oxygenation, sputum collection, and antibiotic therapy protocol.',
    diseaseDetails: {
      pathophysiology: 'Infectious microbial colonization and acute inflammatory exudate accumulation in the pulmonary alveoli and bronchioles, impairing alveolar gas exchange and causing ventilation-perfusion mismatch.',
      signsAndSymptoms: [
        'Fever, productive cough with purulent/rust-colored sputum, and chills',
        'Pleuritic chest pain aggravated by deep breathing or coughing',
        'Tachypnea, decreased SpO2, and increased work of breathing',
        'Auscultation: coarse crackles, bronchial breath sounds, increased tactile fremitus'
      ],
      interventions: [
        'Auscultate lung sounds q4h and monitor respiratory rate and depth',
        'Titrate supplemental O2 to maintain target SpO2 >= 92% (88-92% in chronic hypercapnic COPD)',
        'Position patient in Semi-to-High Fowler position to maximize diaphragmatic expansion',
        'Encourage coughing, deep breathing, and Incentive Spirometry (10 breaths/hour while awake)',
        'Ensure adequate oral/IV hydration to thin tenacious pulmonary secretions'
      ],
      medicalManagement: [
        'Collect sputum culture and 2 sets of blood cultures BEFORE starting antibiotics',
        'Initiate empiric broad-spectrum antibiotic therapy within 4 hours of admission',
        'Antipyretics (Acetaminophen) for fever and comfort',
        'Chest X-ray and serial complete blood counts (CBC with differential)'
      ],
      redFlags: [
        'Respiratory rate > 30 breaths/min or acute drop in SpO2 < 88% despite supplemental O2',
        'Use of accessory muscles, paradoxical breathing, or altered mental status (hypercapnia/hypoxia)',
        'Signs of septic shock (SBP < 90 mmHg, lactate > 2 mmol/L)'
      ]
    },
    steps: [
      { id: 's1', text: "Auscultate lung sounds q4h (assess for rales, rhonchi, bronchial breath sounds)" },
      { id: 's2', text: "Monitor continuous SpO2 and titrate O2 delivery to maintain SpO2 >= 92%" },
      { id: 's3', text: "Collect sputum culture and blood cultures BEFORE starting first dose of antibiotics" },
      { id: 's4', text: "Encourage deep breathing, coughing exercises, and Incentive Spirometry (10x/hr)" },
      { id: 's5', text: "Position patient in semi-to-high Fowler position to maximize lung expansion" },
      { id: 's6', text: "Ensure adequate hydration (oral/IV) to help thin and mobilize pulmonary secretions" }
    ]
  },
  {
    id: 'tmpl_chf_exacerbation',
    title: 'Congestive Heart Failure (CHF) Exacerbation',
    type: 'disease',
    category: 'Cardiovascular & Fluid Management',
    description: 'Fluid overload management, diuretic therapy, daily weights, and sodium restriction.',
    diseaseDetails: {
      pathophysiology: 'Impaired myocardial contractility (HFrEF) or ventricular relaxation (HFpEF) leading to elevated ventricular filling pressures, systemic/pulmonary venous congestion, and inadequate organ perfusion.',
      signsAndSymptoms: [
        'Dyspnea on exertion, orthopnea (pillows needed to sleep), paroxysmal nocturnal dyspnea',
        'Bilateral lower extremity pitting edema, sacral edema, and sudden weight gain',
        'Jugular venous distention (JVD), S3 gallop, bilateral basilar crackles/rales',
        'Persistent nonproductive or pink frothy cough (acute pulmonary edema)'
      ],
      interventions: [
        'Position patient in High-Fowler position with legs dependent to reduce venous return',
        'Strict Intake & Output (I&O) recording every shift',
        'Obtain daily weight each morning at the same time after first void using the same scale',
        'Enforce ordered dietary sodium restriction (< 2g/day) and fluid restriction (1.5-2L/day)'
      ],
      medicalManagement: [
        'IV Loop Diuretics (Furosemide / Bumetanide) with prompt monitoring of hourly urine output',
        'Vasodilators (Nitroglycerin / Nitroprusside) for acute afterload reduction',
        'Electrolyte monitoring (serum Potassium, Magnesium, BUN, Creatinine)',
        'Serial BNP / NT-proBNP and bedside echocardiogram'
      ],
      redFlags: [
        'Acute respiratory distress with pink, frothy sputum (Flash Pulmonary Edema)',
        'Severe oliguria (< 30 mL/hr) or doubling of serum creatinine (Cardiorenal syndrome)',
        'Symptomatic hypotension or complex ventricular arrhythmias'
      ]
    },
    steps: [
      { id: 's1', text: "Assess for fluid overload: peripheral edema, JVD, lung crackles, and orthopnea" },
      { id: 's2', text: "Maintain strict Intake & Output (I&O) record and obtain daily weight before breakfast" },
      { id: 's3', text: "Administer prescribed loop diuretics (e.g., Furosemide) and monitor urine output" },
      { id: 's4', text: "Enforce sodium restriction (< 2g/day) and fluid restriction as ordered" },
      { id: 's5', text: "Monitor serum Potassium and renal panel (BUN/Creatinine) closely" },
      { id: 's6', text: "Elevate head of bed (High Fowler's) to reduce venous return and relieve dyspnea" }
    ]
  },
  {
    id: 'tmpl_dka',
    title: 'Diabetic Ketoacidosis (DKA) Protocol',
    type: 'disease',
    category: 'Endocrine & Metabolic',
    description: 'Hyperglycemia crisis, IV insulin infusion, aggressive hydration, and electrolyte monitoring.',
    diseaseDetails: {
      pathophysiology: 'Critical insulin deficiency coupled with counter-regulatory hormone excess causing profound hyperglycemia, osmotic diuresis, accelerated lipolysis, and free fatty acid oxidation into ketoacids, producing high anion gap metabolic acidosis.',
      signsAndSymptoms: [
        'Kussmaul breathing (rapid, deep respirations) and fruity/acetone breath odor',
        'Polyuria, polydipsia, severe dehydration, poor skin turgor, dry mucous membranes',
        'Nausea, vomiting, diffuse abdominal pain, weakness, and altered level of consciousness',
        'Marked hyperglycemia (> 250 mg/dL), ketonuria, elevated serum beta-hydroxybutyrate'
      ],
      interventions: [
        'Bedside Capillary Blood Glucose (CBG) hourly monitoring during insulin titration',
        'Strict hourly Intake & Output tracking with urinary catheter (target >= 0.5 mL/kg/hr)',
        'Continuous cardiac monitoring for peaked T-waves or U-waves from potassium shifts',
        'Frequent neurological checks q1h to assess for cerebral edema during rapid glucose drops'
      ],
      medicalManagement: [
        'Aggressive isotonic 0.9% Normal Saline rehydration (1-1.5 L in 1st hour)',
        'Verify serum Potassium >= 3.3 mEq/L before initiating continuous IV Regular Insulin infusion',
        'Add Potassium replacement to IV fluids as insulin shifts K+ into cells',
        'Add 5% Dextrose (D5W) to IV infusion when blood glucose reaches 200-250 mg/dL to prevent cerebral edema',
        'Serial BMP/VBG every 2-4 hours to monitor anion gap closure and serum potassium'
      ],
      redFlags: [
        'Acute neurological decline, headache, bradycardia, hypertension (Cerebral Edema)',
        'Severe hypokalemia (< 3.0 mEq/L) risking fatal cardiac arrest / ventricular arrhythmia',
        'Refractory metabolic acidosis (pH < 6.9)'
      ]
    },
    steps: [
      { id: 's1', text: "Check hourly bedside Capillary Blood Glucose (CBG) and titrate regular insulin drip" },
      { id: 's2', text: "Initiate aggressive isotonic 0.9% Normal Saline rehydration as ordered" },
      { id: 's3', text: "Verify serum Potassium >= 3.3 mEq/L before starting insulin infusion to prevent arrhythmia" },
      { id: 's4', text: "Switch IV fluids to D5W 0.45% NaCl when blood glucose drops below 250 mg/dL" },
      { id: 's5', text: "Monitor hourly urine output and strict I&O (target >= 0.5 mL/kg/hr)" },
      { id: 's6', text: "Assess for resolution of ketoacidosis: anion gap normalization, ABG pH > 7.30" }
    ]
  },
  {
    id: 'tmpl_ischemic_stroke',
    title: 'Acute Ischemic Stroke / CVA Care',
    type: 'disease',
    category: 'Neurological Care',
    description: 'Neuro check q1-2h, NIHSS monitoring, BP parameters, and aspiration precautions.',
    diseaseDetails: {
      pathophysiology: 'Acute focal interruption of cerebral arterial blood flow due to thrombosis or embolism, producing a central core of infarcted tissue surrounded by a salvageable ischemic penumbra.',
      signsAndSymptoms: [
        'Sudden unilateral facial droop, arm/leg weakness, hemiplegia, or numbness',
        'Sudden speech impairment: expressive or receptive aphasia, dysarthria',
        'Visual field cuts, gaze deviation, ataxia, or sudden severe loss of balance',
        'Altered level of consciousness or confusion'
      ],
      interventions: [
        'Perform serial neurological assessments and Glasgow Coma Scale (GCS) q1-2h',
        'Maintain strict NPO until bedside dysphagia swallow screen is formally passed',
        'Keep Head of Bed (HOB) elevated at 30 degrees to optimize cerebral perfusion pressure and venous drainage',
        'Implement strict Fall Precautions and Aspiration Precautions at bedside',
        'Reposition patient every 2 hours and support paretic extremities with pillows'
      ],
      medicalManagement: [
        'Stat Non-contrast Head CT to rule out hemorrhage',
        'Evaluate for IV thrombolysis (Alteplase/Tenecteplase) within 4.5 hours of Last Known Well (LKW)',
        'Adhere to strict BP parameters (SBP < 180/105 post-thrombolytic, permissive HTN < 220/120 if no tPA)',
        'Antiplatelet therapy (Aspirin 325 mg) started 24 hours post-thrombolytic or immediately if no tPA'
      ],
      redFlags: [
        'Acute neurological decline: >= 4 point worsening on NIHSS or 2 point drop in GCS',
        'Severe sudden headache, acute nausea/vomiting, or hypertension with bradycardia (Hemorrhagic transformation)',
        'Loss of protective airway reflexes'
      ]
    },
    steps: [
      { id: 's1', text: "Perform neurological assessment and GCS scoring q1-2h (note acute changes immediately)" },
      { id: 's2', text: "Maintain strict NPO until formal bedside dysphagia swallow screen is completed" },
      { id: 's3', text: "Monitor Blood Pressure closely; adhere to permissive hypertension targets per orders" },
      { id: 's4', text: "Keep head of bed elevated 30 degrees to minimize intracranial pressure (ICP)" },
      { id: 's5', text: "Implement strict Fall and Aspiration Precautions with side rails elevated" },
      { id: 's6', text: "Perform passive/active range-of-motion exercises and reposition q2h to prevent skin breakdown" }
    ]
  },
  {
    id: 'tmpl_sepsis_protocol',
    title: 'Sepsis & Septic Shock Hour-1 Bundle',
    type: 'disease',
    category: 'Critical Care & Infectious Disease',
    description: 'Rapid identification, lactate clearance, broad-spectrum antibiotics, and crystalloid resuscitation.',
    diseaseDetails: {
      pathophysiology: 'Dysregulated host systemic immune and inflammatory response to infection resulting in widespread endothelial injury, capillary leak, microvascular thrombosis, vasodilation, and multiple organ dysfunction syndrome (MODS).',
      signsAndSymptoms: [
        'Systemic signs: Temperature > 38.3°C or < 36.0°C, Heart Rate > 90 bpm, RR > 20 bpm',
        'Hypotension (SBP < 90 mmHg or MAP < 65 mmHg) refractory to initial fluid',
        'Altered mental status, confusion, lethargy, or extreme restlessness',
        'Mottled or cool extremities, delayed capillary refill (> 3 seconds), oliguria'
      ],
      interventions: [
        'Obtain 2 sets of blood cultures (1 aerobic, 1 anaerobic per site) BEFORE antibiotic initiation',
        'Measure initial serum Lactate stat; re-measure within 2-4 hours if initial > 2 mmol/L',
        'Rapid 30 mL/kg IV crystalloid fluid bolus for hypotension (MAP < 65) or lactate >= 4 mmol/L',
        'Monitor strict hourly urine output via indwelling urinary catheter (target >= 0.5 mL/kg/hr)'
      ],
      medicalManagement: [
        'Administer ordered broad-spectrum IV antibiotics within 1 hour of recognition (Hour-1 Bundle)',
        'Vasopressors (First-line: Norepinephrine infusion) to maintain MAP >= 65 mmHg if hypotension persists',
        'Invasive arterial line and central venous line placement for continuous hemodynamic tracking',
        'Serial CBC, Lactate, Coagulation panel (PT/INR/PTT), and Liver/Renal panels'
      ],
      redFlags: [
        'Persistent hypotension requiring escalating vasopressor doses (Septic Shock)',
        'Lactate level rising despite aggressive crystalloid resuscitation',
        'Development of Disseminated Intravascular Coagulation (DIC) or acute respiratory distress syndrome (ARDS)'
      ]
    },
    steps: [
      { id: 's1', text: "Measure serum Lactate level stat (re-measure within 2-4 hrs if initial > 2 mmol/L)" },
      { id: 's2', text: "Obtain 2 sets of Blood Cultures prior to starting broad-spectrum antibiotics" },
      { id: 's3', text: "Administer prescribed broad-spectrum IV antibiotics within the first hour of recognition" },
      { id: 's4', text: "Begin rapid 30 mL/kg crystalloid fluid bolus for hypotension or lactate >= 4 mmol/L" },
      { id: 's5', text: "Monitor Mean Arterial Pressure (MAP >= 65 mmHg); titrate vasopressors (Norepinephrine) if shock persists" },
      { id: 's6', text: "Strict urine output monitoring via indwelling catheter (target >= 0.5 mL/kg/hr)" }
    ]
  }
];
