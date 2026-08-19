
export interface Task {
  id: string;
  description: string;
  substeps?: string[];
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  timeDue?: string;
}

export interface HistoryEntry {
  id: string;
  date: string;
  note: string;
  createdAt: string;
}

export interface ShiftEndorsement {
  date: string;
  shift: '6-2' | '2-10' | '10-6' | string;
  previousShiftEndorsement?: string;
  myShiftEvents?: string;
  updatedAt?: string;
}

export interface ClinicalAssessment {
  patientLastName?: string;
  patientFirstName?: string;
  patientMI?: string;
  age?: string;
  sex?: string;
  ward?: string;
  bedNo?: string;
  hospNo?: string;
  dateAndShift?: string;
  date?: string;
  shift?: '6-2' | '2-10' | '10-6' | string;
  
  mental?: {
    items: string[];
    remarks: string;
  };
  neurological?: {
    noProblem: boolean;
    items: string[];
    remarks: string;
  };
  cardiovascular?: {
    noProblem: boolean;
    chestPain?: { active: boolean; locationAmount: string };
    palpitation?: boolean;
    neckVeinDistention?: boolean;
    dizziness?: boolean;
    cyanosis?: boolean;
    orthopnea?: boolean;
    edema?: { active: boolean; type: 'Pitting' | 'Non-Pitting' | ''; location: string; grade: string };
    cardiacArrhythmia?: boolean;
    remarks: string;
  };
  respiratory?: {
    noProblem: boolean;
    cough?: { active: boolean; type: 'Productive' | 'Non Productive' | ''; sputumColor: string };
    laboredBreathing?: boolean;
    shallowRespiration?: boolean;
    dyspneaSOB?: boolean;
    ralesRhonchi?: boolean;
    wheezes?: boolean;
    o2Sat?: string;
    o2Delivery?: { lpm: string; mode: 'PRN' | 'Continuous' | ''; type: string[] };
    remarks: string;
  };
  gastrointestinal?: {
    noProblem: boolean;
    appetite?: 'Good' | 'Fair' | 'Poor' | '';
    abdominalDistention?: boolean;
    nauseaVomiting?: boolean;
    diarrhea?: boolean;
    constipation?: boolean;
    bowelSound?: 'Present' | 'Not Present' | '';
    colostomy?: boolean;
    feedingTube?: boolean;
    diet?: string;
    remarks: string;
  };
  genitoUrinary?: {
    noProblem: boolean;
    painOnUrination?: boolean;
    distentionRetention?: boolean;
    frequencyUrgency?: boolean;
    hematuria?: boolean;
    incontinence?: boolean;
    urine?: { color: string; amount: string; odor: string };
    fcSuprapubicCathSize?: string;
    condomCath?: boolean;
    dialysisDays?: string[];
    remarks: string;
  };
  endocrine?: {
    noProblem: boolean;
    items: string[];
    remarks: string;
  };
  musculoskeletal?: {
    noProblem: boolean;
    items: string[];
    remarks: string;
  };
  skin?: {
    noProblem: boolean;
    turgor?: 'Good' | 'Fair' | 'Poor' | '';
    skinTemp?: 'Warm' | 'Hot' | 'Cold' | '';
    items: string[];
    ulcerDetails?: { site: string; drainage: string; description: string; amount: string };
    remarks: string;
  };
  pain?: {
    hasPain: boolean;
    location: string;
    intensity: number;
    type: string[];
    controlled?: 'Yes' | 'No' | '';
    remarks: string;
  };
  drainsContraptions?: {
    chestTubeRL?: string;
    chestTubeDetails?: string;
    jpPigtailLoc?: string;
    jpPigtailDetails?: string;
    hemovac?: boolean;
    hemovacDetails?: string;
    woundVac?: boolean;
    woundVacDetails?: string;
    cvc?: boolean;
    cvcDetails?: string;
    aLine?: boolean;
    aLineDetails?: string;
    ivAccess?: boolean;
    ivGauge?: string;
    ivSite?: string;
    remarks: string;
  };
  itemFollowups?: Record<string, string>;
  additionalClinicalFindings?: string;
  nurseSignature?: { name: string; licenseNo: string };
}

export type MonitoringInterval = 'Q1' | 'Q2' | 'None';

export interface MedicationChecklistItem {
  id: string;
  time: string;
  isGiven: boolean;
  givenAt?: string;
  givenBy?: string;
}

export interface RoomMedication {
  id: string;
  name: string;
  dosage?: string;
  route?: string;
  frequency: string;
  scheduleTimes: string[];
  instructions?: string;
  substeps?: string[];
  createdAt: string;
  checklist?: MedicationChecklistItem[];
}

export interface RoomData {
  id: string;
  roomNumber: string;
  status: 'active' | 'inactive';
  diagnosis: string;
  doctors: string;
  history?: HistoryEntry[];
  ivFluid: string;
  ivFluidOther: string;
  regulation: string;
  sideDrips: string;
  contraptions: string[];
  contraptionsOther: string;
  precautions: string[];
  otherPrecaution: string;
  monitoring?: MonitoringInterval;
  ioRequired?: boolean;
  tasks: Task[];
  medications?: RoomMedication[];
  clinicalAssessment?: ClinicalAssessment;
  shiftEndorsement?: ShiftEndorsement;
  lastUpdated: string;
}

export type ViewState = 'directory' | 'room-detail' | 'library' | 'tools';

export interface ProcedureStep {
  id: string;
  text: string;
}

export interface DiseaseDetails {
  pathophysiology?: string;
  signsAndSymptoms?: string[];
  interventions?: string[];
  medicalManagement?: string[];
  redFlags?: string[];
}

export interface ClinicalTemplate {
  id: string;
  title: string;
  type: 'procedure' | 'medication' | 'disease';
  category?: string;
  description?: string;
  steps: ProcedureStep[];
  defaultTimeDue?: string;
  isCustom?: boolean;
  diseaseDetails?: DiseaseDetails;
}

export interface AppState {
  rooms: RoomData[];
  selectedRoomId: string | null;
  currentView: ViewState;
}
