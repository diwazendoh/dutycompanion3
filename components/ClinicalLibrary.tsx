import React, { useState, useEffect } from 'react';
import { ClinicalTemplate, RoomData, Task, RoomMedication, DiseaseDetails } from '../types';
import { saveRoomToFirestore, saveTemplateToFirestore, deleteTemplateFromFirestore } from '../services/firebaseService';

interface ClinicalLibraryProps {
  templates: ClinicalTemplate[];
  rooms: RoomData[];
  selectedCategory?: 'procedure' | 'medication' | 'disease';
  onCategoryChange?: (category: 'procedure' | 'medication' | 'disease') => void;
}

export const ClinicalLibrary: React.FC<ClinicalLibraryProps> = ({ 
  templates, 
  rooms, 
  selectedCategory = 'procedure',
  onCategoryChange 
}) => {
  const [activeTab, setActiveTab] = useState<'procedure' | 'medication' | 'disease'>(selectedCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTemplateIds, setExpandedTemplateIds] = useState<string[]>([]);

  // Sync activeTab when selectedCategory prop changes from sidebar
  useEffect(() => {
    if (selectedCategory && selectedCategory !== activeTab) {
      setActiveTab(selectedCategory);
    }
  }, [selectedCategory]);

  const handleTabChange = (tab: 'procedure' | 'medication' | 'disease') => {
    setActiveTab(tab);
    if (onCategoryChange) {
      onCategoryChange(tab);
    }
  };

  // Modal states for applying template to room tasks
  const [selectedTemplateForAssign, setSelectedTemplateForAssign] = useState<ClinicalTemplate | null>(null);
  const [targetRoomId, setTargetRoomId] = useState<string>('');
  const [taskDueTime, setTaskDueTime] = useState<string>('');
  const [assignSuccessMsg, setAssignSuccessMsg] = useState<string>('');

  // Modal states for creating / editing template
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formType, setFormType] = useState<'procedure' | 'medication' | 'disease'>('procedure');
  const [formDescription, setFormDescription] = useState('');
  const [formStepInputs, setFormStepInputs] = useState<string[]>(['']);
  
  // Dedicated disease form fields
  const [diseasePatho, setDiseasePatho] = useState('');
  const [diseaseSigns, setDiseaseSigns] = useState<string[]>(['']);
  const [diseaseMedMgmt, setDiseaseMedMgmt] = useState<string[]>(['']);
  const [diseaseRedFlags, setDiseaseRedFlags] = useState<string[]>(['']);

  const [formError, setFormError] = useState<string>('');

  // Delete modal state
  const [deletingTemplate, setDeletingTemplate] = useState<ClinicalTemplate | null>(null);

  const activeRooms = rooms.filter(r => r.status === 'active');

  // Filter templates by active tab and search query
  const filteredTemplates = templates.filter(t => {
    if (t.type !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchCategory = (t.category || '').toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchSteps = t.steps.some(s => s.text.toLowerCase().includes(q));
      const matchPatho = (t.diseaseDetails?.pathophysiology || '').toLowerCase().includes(q);
      const matchSigns = (t.diseaseDetails?.signsAndSymptoms || []).some(s => s.toLowerCase().includes(q));
      const matchMeds = (t.diseaseDetails?.medicalManagement || []).some(s => s.toLowerCase().includes(q));
      return matchTitle || matchCategory || matchDesc || matchSteps || matchPatho || matchSigns || matchMeds;
    }
    return true;
  });

  const openAssignModal = (template: ClinicalTemplate) => {
    setSelectedTemplateForAssign(template);
    setTargetRoomId(activeRooms.length > 0 ? activeRooms[0].id : '');
    setTaskDueTime('');
    setAssignSuccessMsg('');
  };

  const handleApplyToRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateForAssign || !targetRoomId) return;

    const room = rooms.find(r => r.id === targetRoomId);
    if (!room) return;

    const nowIso = new Date().toISOString();
    
    if (selectedTemplateForAssign.type === 'medication') {
      const frequency = 'Q8H';
      const defaultTimes = ['06:00', '14:00', '22:00'];
      const newMed: RoomMedication = {
        id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: selectedTemplateForAssign.title,
        frequency: frequency,
        scheduleTimes: defaultTimes,
        substeps: (selectedTemplateForAssign.steps || []).map(s => s.text),
        instructions: selectedTemplateForAssign.description || '',
        createdAt: nowIso,
        checklist: defaultTimes.map((t, idx) => ({
          id: `chk_${idx}_${Date.now()}`,
          time: t,
          isGiven: false
        }))
      };

      const updatedRoom: RoomData = {
        ...room,
        medications: [...(room.medications || []), newMed],
        lastUpdated: nowIso
      };

      await saveRoomToFirestore(updatedRoom);
      setAssignSuccessMsg(`Successfully added "${selectedTemplateForAssign.title}" to Room ${room.roomNumber} Medication Panel!`);
    } else {
      // Create ONE SINGLE TASK with title and substeps dropdown
      const stepsToUse = selectedTemplateForAssign.diseaseDetails?.interventions && selectedTemplateForAssign.diseaseDetails.interventions.length > 0
        ? selectedTemplateForAssign.diseaseDetails.interventions
        : (selectedTemplateForAssign.steps || []).map(s => s.text);

      const newTask: Task = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        description: selectedTemplateForAssign.type === 'disease' 
          ? `Protocol: ${selectedTemplateForAssign.title}` 
          : selectedTemplateForAssign.title,
        substeps: stepsToUse,
        isCompleted: false,
        createdAt: nowIso,
      };
      if (taskDueTime.trim()) {
        newTask.timeDue = taskDueTime.trim();
      }

      const updatedRoom: RoomData = {
        ...room,
        tasks: [...(room.tasks || []), newTask],
        lastUpdated: nowIso
      };

      await saveRoomToFirestore(updatedRoom);
      setAssignSuccessMsg(`Successfully added "${selectedTemplateForAssign.title}" care plan to Room ${room.roomNumber}!`);
    }

    setTimeout(() => {
      setSelectedTemplateForAssign(null);
      setAssignSuccessMsg('');
    }, 1500);
  };

  const openCreateModal = () => {
    setEditingTemplateId(null);
    setFormTitle('');
    setFormCategory('');
    setFormType(activeTab);
    setFormDescription('');
    setFormStepInputs(['']);
    setDiseasePatho('');
    setDiseaseSigns(['']);
    setDiseaseMedMgmt(['']);
    setDiseaseRedFlags(['']);
    setFormError('');
    setIsTemplateModalOpen(true);
  };

  const openEditModal = (template: ClinicalTemplate) => {
    setEditingTemplateId(template.id);
    setFormTitle(template.title);
    setFormCategory(template.category || '');
    setFormType(template.type);
    setFormDescription(template.description || '');
    setFormStepInputs(template.steps && template.steps.length > 0 ? template.steps.map(s => s.text) : ['']);
    
    // Disease details
    setDiseasePatho(template.diseaseDetails?.pathophysiology || template.description || '');
    setDiseaseSigns(template.diseaseDetails?.signsAndSymptoms && template.diseaseDetails.signsAndSymptoms.length > 0 
      ? template.diseaseDetails.signsAndSymptoms 
      : ['']);
    setDiseaseMedMgmt(template.diseaseDetails?.medicalManagement && template.diseaseDetails.medicalManagement.length > 0 
      ? template.diseaseDetails.medicalManagement 
      : ['']);
    setDiseaseRedFlags(template.diseaseDetails?.redFlags && template.diseaseDetails.redFlags.length > 0 
      ? template.diseaseDetails.redFlags 
      : ['']);

    setFormError('');
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formTitle.trim()) {
      setFormError('Please enter a title.');
      return;
    }

    const validSteps = formStepInputs.map(s => s.trim()).filter(Boolean);
    if (validSteps.length === 0 && formType !== 'disease') {
      setFormError('Please add at least one step or nursing consideration.');
      return;
    }

    let diseaseObj: DiseaseDetails | undefined = undefined;
    if (formType === 'disease') {
      const validSigns = diseaseSigns.map(s => s.trim()).filter(Boolean);
      const validMedMgmt = diseaseMedMgmt.map(s => s.trim()).filter(Boolean);
      const validRedFlags = diseaseRedFlags.map(s => s.trim()).filter(Boolean);

      diseaseObj = {
        pathophysiology: diseasePatho.trim(),
        signsAndSymptoms: validSigns,
        interventions: validSteps,
        medicalManagement: validMedMgmt,
        redFlags: validRedFlags
      };
    }

    const tmplToSave: ClinicalTemplate = {
      id: editingTemplateId || `tmpl_${Date.now()}`,
      title: formTitle.trim(),
      category: formCategory.trim() || undefined,
      type: formType,
      description: formType === 'disease' ? (diseasePatho.trim() || formDescription.trim()) : formDescription.trim(),
      steps: validSteps.map((st, i) => ({ id: `s_${i}_${Date.now()}`, text: st })),
      diseaseDetails: diseaseObj,
      isCustom: true
    };

    await saveTemplateToFirestore(tmplToSave);
    setIsTemplateModalOpen(false);
  };

  const handleDeleteTemplate = (template: ClinicalTemplate) => {
    setDeletingTemplate(template);
  };

  const confirmDeleteTemplate = async () => {
    if (!deletingTemplate) return;
    await deleteTemplateFromFirestore(deletingTemplate.id);
    setDeletingTemplate(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-green-900 to-green-800 text-white rounded-3xl p-6 shadow-md flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Clinical Library</h2>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-emerald-400 hover:bg-emerald-300 text-green-950 font-black text-xs px-4 py-2.5 rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <i className="fas fa-plus"></i>
          <span>
            {activeTab === 'procedure' ? 'Add Procedure' : activeTab === 'medication' ? 'Add Medication' : 'Add Disease'}
          </span>
        </button>
      </div>

      {/* SEARCH AND NAVIGATION TABS */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* TAB BUTTONS */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 overflow-x-auto">
          <button
            onClick={() => handleTabChange('procedure')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'procedure'
                ? 'bg-white text-green-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className="fas fa-procedures"></i>
            <span>Procedures ({templates.filter(t => t.type === 'procedure').length})</span>
          </button>
          <button
            onClick={() => handleTabChange('medication')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'medication'
                ? 'bg-white text-green-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className="fas fa-pills"></i>
            <span>Medications ({templates.filter(t => t.type === 'medication').length})</span>
          </button>
          <button
            onClick={() => handleTabChange('disease')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'disease'
                ? 'bg-white text-green-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className="fas fa-heartbeat"></i>
            <span>Diseases ({templates.filter(t => t.type === 'disease').length})</span>
          </button>
        </div>

        {/* SEARCH INPUT */}
        <div className="relative flex-1 max-w-md">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            placeholder={`Search ${activeTab === 'procedure' ? 'procedures...' : activeTab === 'medication' ? 'medications...' : 'diseases & protocols...'}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-700/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>

      {/* TEMPLATES CONTAINER */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
            <i className={`fas ${activeTab === 'procedure' ? 'fa-clipboard-list' : activeTab === 'medication' ? 'fa-capsules' : 'fa-heartbeat'}`}></i>
          </div>
          <h3 className="font-bold text-slate-700 text-base">No items found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No items matching "${searchQuery}".`
              : `No ${activeTab} items available in this category.`}
          </p>
        </div>
      ) : activeTab === 'disease' ? (
        /* DEDICATED CLINICAL DISEASE FORMAT */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTemplates.map((template) => {
            const isExpanded = expandedTemplateIds.includes(template.id);
            const d = template.diseaseDetails;
            const interventions = d?.interventions || (template.steps || []).map(s => s.text);
            const signs = d?.signsAndSymptoms || [];
            const medMgmt = d?.medicalManagement || [];
            const redFlags = d?.redFlags || [];
            const patho = d?.pathophysiology || template.description;

            return (
              <div
                key={template.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* HEADER */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-rose-50 text-rose-700 border border-rose-200/70 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg tracking-wider flex items-center gap-1">
                          <i className="fas fa-stethoscope text-[9px]"></i>
                          {template.category || 'Clinical Pathology'}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">{template.title}</h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(template)}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                        title="Edit disease protocol"
                      >
                        <i className="fas fa-pencil-alt text-xs"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(template)}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                        title="Delete disease protocol"
                      >
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    </div>
                  </div>

                  {/* PATHOPHYSIOLOGY / OVERVIEW */}
                  {patho && (
                    <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/60 space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <i className="fas fa-dna text-green-700"></i> Pathophysiology & Clinical Mechanism
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {patho}
                      </p>
                    </div>
                  )}

                  {/* SIGNS & SYMPTOMS */}
                  {signs.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <i className="fas fa-search-plus text-amber-600"></i> Clinical Manifestations & Signs
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {signs.map((s, idx) => (
                          <div key={idx} className="bg-amber-50/60 border border-amber-200/60 text-amber-950 p-2 rounded-xl text-[11px] font-semibold flex items-start gap-2">
                            <i className="fas fa-circle-notch text-[8px] text-amber-600 mt-1 shrink-0"></i>
                            <span className="leading-snug">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* NURSING INTERVENTIONS ACCORDION */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedTemplateIds(prev => prev.includes(template.id) ? prev.filter(id => id !== template.id) : [...prev, template.id])}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 bg-green-50/80 hover:bg-green-100 text-green-900 rounded-xl text-xs font-black transition-all border border-green-200/70 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <i className="fas fa-clipboard-check text-green-700"></i>
                        <span>Priority Nursing Care Plan & Actions ({interventions.length})</span>
                      </div>
                      <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px] text-green-700`}></i>
                    </button>

                    {isExpanded && (
                      <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                        {/* INTERVENTIONS LIST */}
                        <div className="space-y-1.5">
                          {interventions.map((stepText, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="w-4 h-4 rounded-full bg-green-800 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-medium text-slate-800 leading-snug">{stepText}</span>
                            </div>
                          ))}
                        </div>

                        {/* MEDICAL MANAGEMENT & PHARMACOTHERAPY */}
                        {medMgmt.length > 0 && (
                          <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200/60 space-y-2">
                            <p className="text-[10px] font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fas fa-prescription-bottle-alt text-blue-700"></i> Medical Management & Pharmacotherapy
                            </p>
                            <ul className="space-y-1">
                              {medMgmt.map((m, idx) => (
                                <li key={idx} className="text-[11px] font-medium text-blue-950 flex items-start gap-2">
                                  <i className="fas fa-check text-[9px] text-blue-600 mt-1 shrink-0"></i>
                                  <span className="leading-snug">{m}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* RED FLAGS */}
                        {redFlags.length > 0 && (
                          <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 space-y-2">
                            <p className="text-[10px] font-black text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                              <i className="fas fa-exclamation-triangle text-rose-600"></i> Red Flags & Acute Complications
                            </p>
                            <ul className="space-y-1">
                              {redFlags.map((rf, idx) => (
                                <li key={idx} className="text-[11px] font-bold text-rose-900 flex items-start gap-2">
                                  <i className="fas fa-bolt text-[9px] text-rose-600 mt-1 shrink-0"></i>
                                  <span className="leading-snug">{rf}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* APPLY BUTTON */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openAssignModal(template)}
                    className="w-full py-2.5 px-4 bg-green-900 hover:bg-green-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer"
                  >
                    <i className="fas fa-plus-circle text-emerald-400"></i>
                    <span>Apply Care Plan to Room Tasks</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* STANDARD PROCEDURES & MEDICATIONS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTemplates.map((template) => {
            const isExpanded = expandedTemplateIds.includes(template.id);
            const stepCount = (template.steps || []).length;

            return (
              <div
                key={template.id}
                className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      {template.category && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          {template.category}
                        </span>
                      )}
                      <h3 className="text-base font-black text-slate-900 leading-tight">{template.title}</h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(template)}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                        title="Edit template"
                      >
                        <i className="fas fa-pencil-alt text-xs"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(template)}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                        title="Delete template"
                      >
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-xs text-slate-500 leading-snug bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {template.description}
                    </p>
                  )}

                  {stepCount > 0 && (
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedTemplateIds(prev => prev.includes(template.id) ? prev.filter(id => id !== template.id) : [...prev, template.id])}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-extrabold transition-all border border-emerald-200/60 cursor-pointer"
                      >
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px] text-emerald-700`}></i>
                        <span>
                          {template.type === 'procedure'
                            ? 'Step-by-Step Protocol'
                            : 'Nursing Considerations & Checks'} ({stepCount})
                        </span>
                      </button>

                      {isExpanded && (
                        <ul className="space-y-1.5 text-xs text-slate-700 pt-1 animate-in fade-in duration-150">
                          {template.steps.map((step, idx) => (
                            <li key={step.id || idx} className="flex items-start gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                              <span className="w-4 h-4 rounded-full bg-emerald-800 text-white font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="leading-snug font-medium text-slate-800">{step.text}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openAssignModal(template)}
                    className="w-full py-2.5 px-4 bg-green-900 hover:bg-green-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer"
                  >
                    <i className={`fas ${template.type === 'medication' ? 'fa-pills text-emerald-400' : 'fa-plus-circle text-emerald-400'}`}></i>
                    <span>
                      {template.type === 'medication' 
                        ? 'Add to Room Medication Panel' 
                        : 'Add to Shift Tasks'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ASSIGN TEMPLATE TO ROOM MODAL */}
      {selectedTemplateForAssign && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[9px] font-black uppercase text-green-800 tracking-wider">
                  {selectedTemplateForAssign.type === 'medication' ? 'Add to Medication Panel' : 'Add Shift Task'}
                </span>
                <h3 className="text-lg font-black text-slate-900">{selectedTemplateForAssign.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTemplateForAssign(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>

            {assignSuccessMsg ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl">
                  <i className="fas fa-check"></i>
                </div>
                <p className="font-bold text-slate-800 text-sm">{assignSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleApplyToRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Patient Room:</label>
                  {activeRooms.length === 0 ? (
                    <p className="text-xs text-rose-500 font-semibold bg-rose-50 p-3 rounded-xl border border-rose-100">
                      No active patient rooms available. Please register a room in the station first.
                    </p>
                  ) : (
                    <select
                      value={targetRoomId}
                      onChange={(e) => setTargetRoomId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-700/20"
                    >
                      {activeRooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.roomNumber} {r.diagnosis ? `— ${r.diagnosis}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Item Preview:</span>
                  <p className="text-xs font-bold text-slate-800">{selectedTemplateForAssign.title}</p>
                  <p className="text-[11px] text-slate-500">
                    Includes {selectedTemplateForAssign.type === 'disease' && selectedTemplateForAssign.diseaseDetails?.interventions ? selectedTemplateForAssign.diseaseDetails.interventions.length : selectedTemplateForAssign.steps.length} dropdown step(s) / nursing consideration(s).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Time (Optional):</label>
                  <input
                    type="time"
                    value={taskDueTime}
                    onChange={(e) => setTaskDueTime(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateForAssign(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={activeRooms.length === 0}
                    className="flex-1 py-3 bg-green-900 hover:bg-green-800 disabled:bg-slate-300 text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Apply to Room
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT TEMPLATE MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">
                {editingTemplateId ? 'Edit Clinical Entry' : 'Add Clinical Entry'}
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4 overflow-y-auto pr-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2">
                  <i className="fas fa-exclamation-circle text-rose-500"></i>
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Entry Category:</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`p-2.5 rounded-2xl border text-center text-xs font-bold cursor-pointer transition-all ${
                    formType === 'procedure' ? 'bg-green-800 text-white border-green-800 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}>
                    <input type="radio" name="tmplType" checked={formType === 'procedure'} onChange={() => setFormType('procedure')} className="hidden" />
                    <i className="fas fa-procedures mr-1.5"></i> Procedure
                  </label>
                  <label className={`p-2.5 rounded-2xl border text-center text-xs font-bold cursor-pointer transition-all ${
                    formType === 'medication' ? 'bg-green-800 text-white border-green-800 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}>
                    <input type="radio" name="tmplType" checked={formType === 'medication'} onChange={() => setFormType('medication')} className="hidden" />
                    <i className="fas fa-pills mr-1.5"></i> Medication
                  </label>
                  <label className={`p-2.5 rounded-2xl border text-center text-xs font-bold cursor-pointer transition-all ${
                    formType === 'disease' ? 'bg-green-800 text-white border-green-800 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}>
                    <input type="radio" name="tmplType" checked={formType === 'disease'} onChange={() => setFormType('disease')} className="hidden" />
                    <i className="fas fa-heartbeat mr-1.5"></i> Disease
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {formType === 'disease' ? 'Disease / Condition Name *' : 'Title *'}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      formType === 'procedure' 
                        ? 'e.g. Blood Transfusion Protocol' 
                        : formType === 'medication' 
                          ? 'e.g. Furosemide (Lasix)'
                          : 'e.g. Acute Coronary Syndrome'
                    }
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-green-700/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specialty / Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Cardiovascular, Respiratory, ICU"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-700/20"
                  />
                </div>
              </div>

              {formType === 'disease' ? (
                /* DEDICATED DISEASE FORM SECTIONS */
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pathophysiology & Clinical Summary</label>
                    <textarea
                      placeholder="Explain the disease etiology, mechanism, and organ effects..."
                      value={diseasePatho}
                      onChange={(e) => setDiseasePatho(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Signs & Symptoms / Presentation</label>
                      <button
                        type="button"
                        onClick={() => setDiseaseSigns([...diseaseSigns, ''])}
                        className="text-[10px] font-bold text-green-800 hover:underline"
                      >
                        + Add Sign
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {diseaseSigns.map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="e.g. Diaphoresis, crushing substernal chest pain..."
                            value={val}
                            onChange={(e) => {
                              const updated = [...diseaseSigns];
                              updated[idx] = e.target.value;
                              setDiseaseSigns(updated);
                            }}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:outline-none"
                          />
                          {diseaseSigns.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setDiseaseSigns(diseaseSigns.filter((_, i) => i !== idx))}
                              className="text-slate-300 hover:text-rose-500 p-1"
                            >
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Priority Nursing Interventions & Actions *</label>
                      <button
                        type="button"
                        onClick={() => setFormStepInputs([...formStepInputs, ''])}
                        className="text-[10px] font-bold text-green-800 hover:underline"
                      >
                        + Add Action
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {formStepInputs.map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-green-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            placeholder={`Nursing action ${idx + 1}...`}
                            value={val}
                            onChange={(e) => {
                              const updated = [...formStepInputs];
                              updated[idx] = e.target.value;
                              setFormStepInputs(updated);
                            }}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:outline-none"
                          />
                          {formStepInputs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setFormStepInputs(formStepInputs.filter((_, i) => i !== idx))}
                              className="text-slate-300 hover:text-rose-500 p-1"
                            >
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Medical Management & Pharmacotherapy</label>
                      <button
                        type="button"
                        onClick={() => setDiseaseMedMgmt([...diseaseMedMgmt, ''])}
                        className="text-[10px] font-bold text-green-800 hover:underline"
                      >
                        + Add Drug/Lab
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {diseaseMedMgmt.map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="e.g. Aspirin 325 mg stat, serial troponins..."
                            value={val}
                            onChange={(e) => {
                              const updated = [...diseaseMedMgmt];
                              updated[idx] = e.target.value;
                              setDiseaseMedMgmt(updated);
                            }}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:outline-none"
                          />
                          {diseaseMedMgmt.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setDiseaseMedMgmt(diseaseMedMgmt.filter((_, i) => i !== idx))}
                              className="text-slate-300 hover:text-rose-500 p-1"
                            >
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Red Flags & Urgent Warnings</label>
                      <button
                        type="button"
                        onClick={() => setDiseaseRedFlags([...diseaseRedFlags, ''])}
                        className="text-[10px] font-bold text-rose-700 hover:underline"
                      >
                        + Add Red Flag
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {diseaseRedFlags.map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="e.g. SBP < 90 mmHg, ventricular fibrillation..."
                            value={val}
                            onChange={(e) => {
                              const updated = [...diseaseRedFlags];
                              updated[idx] = e.target.value;
                              setDiseaseRedFlags(updated);
                            }}
                            className="flex-1 bg-rose-50/60 border border-rose-200 rounded-xl p-2 text-xs font-medium focus:outline-none"
                          />
                          {diseaseRedFlags.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setDiseaseRedFlags(diseaseRedFlags.filter((_, i) => i !== idx))}
                              className="text-slate-300 hover:text-rose-500 p-1"
                            >
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* STANDARD PROCEDURE / MEDICATION FORM */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Short Description (Optional)</label>
                    <textarea
                      placeholder="Brief overview or clinical note..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        {formType === 'procedure'
                          ? 'Step-by-Step Bullets *'
                          : 'Nursing Considerations & Checks *'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormStepInputs([...formStepInputs, ''])}
                        className="text-[10px] font-bold text-green-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fas fa-plus"></i> Add Line
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formStepInputs.map((stepVal, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            placeholder={`Line ${idx + 1}...`}
                            value={stepVal}
                            onChange={(e) => {
                              const updated = [...formStepInputs];
                              updated[idx] = e.target.value;
                              setFormStepInputs(updated);
                            }}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:outline-none"
                          />
                          {formStepInputs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setFormStepInputs(formStepInputs.filter((_, i) => i !== idx))}
                              className="text-slate-300 hover:text-rose-500 p-1 cursor-pointer"
                            >
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-green-900 hover:bg-green-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTemplate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-xl">
              <i className="fas fa-trash-alt"></i>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Delete Clinical Item?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong className="text-slate-800">"{deletingTemplate.title}"</strong> from the library?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeletingTemplate(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTemplate}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
