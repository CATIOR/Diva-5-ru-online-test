import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check
} from 'lucide-react';
import {
  AppSettingsState,
  CriterionBState,
  CriterionCDManualState,
  DSM5FormState,
  Diva5ClinicalState,
  PatientInfoState,
  TriState
} from './types/diva5';
import { DIVA5_SYMPTOMS } from './data/diva5-symptoms';
import {
  calculateDiva5Summary,
  createInitialDiva5State,
  hasAnyDomainExampleSelected,
  hasAnySymptomExampleSelected
} from './utils/scoring';
import { runSelfVerification } from './utils/selfVerification';
import {
  clearAllClinicalStorage,
  loadClinicalStateSync,
  readStateFromIndexedDB,
  saveClinicalStateSync,
  stripPersonalData,
  validateAndHydrateState
} from './utils/storage';
import { createFlushRegistry } from './components/DebouncedTextarea';
import { GuideModal } from './components/GuideModal';
import { VerificationModal } from './components/VerificationModal';
import { StepDrawer, WIZARD_STEPS } from './components/StepDrawer';
import { PatientSetupStep } from './components/PatientSetupStep';
import { SymptomStep } from './components/SymptomStep';
import { CriterionBStep } from './components/CriterionBStep';
import { CriterionCStep } from './components/CriterionCStep';
import { SummaryFormStep } from './components/SummaryFormStep';
import { ExportStep } from './components/ExportStep';

export default function App() {
  const verificationReport = useMemo(() => runSelfVerification(), []);
  const flushRegistry = useMemo(() => createFlushRegistry(), []);

  const [state, setState] = useState<Diva5ClinicalState>(() => {
    const fromLocal = loadClinicalStateSync();
    if (fromLocal) return fromLocal;
    return createInitialDiva5State();
  });

  const stateRef = useRef<Diva5ClinicalState>(state);
  stateRef.current = state;

  const [activeMobilePeriod, setActiveMobilePeriod] = useState<'adult' | 'childhood'>('adult');
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Track viewport width for mobile vs desktop column visibility
  useEffect(() => {
    const onResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Recover from IndexedDB on initial mount if localStorage was empty or cleared
  useEffect(() => {
    const existingRaw = window.localStorage?.getItem('diva5_clinical_state_v2');
    if (!existingRaw) {
      void readStateFromIndexedDB().then((recovered) => {
        if (recovered) {
          setState(recovered);
          saveClinicalStateSync(recovered);
        } else {
          saveClinicalStateSync(stateRef.current);
        }
      });
    }
  }, []);

  // Persist to localStorage + IndexedDB whenever state changes
  const commitState = useCallback(
    (updater: (prev: Diva5ClinicalState) => Diva5ClinicalState) => {
      setState((prev) => {
        const next = updater(prev);
        const savedTime = saveClinicalStateSync(next);
        const updatedWithTime = { ...next, lastSavedAt: savedTime };
        stateRef.current = updatedWithTime;
        return updatedWithTime;
      });
    },
    []
  );

  // Emergency Sync Flush on visibilitychange, pagehide, beforeunload
  useEffect(() => {
    const emergencyFlush = () => {
      flushRegistry.flushAll();
      saveClinicalStateSync(stateRef.current);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        emergencyFlush();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', emergencyFlush);
    window.addEventListener('beforeunload', emergencyFlush);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', emergencyFlush);
      window.removeEventListener('beforeunload', emergencyFlush);
    };
  }, [flushRegistry]);

  // Mark active symptom periods as viewed when visiting a symptom step (1..18)
  const currentStepIndex = state.currentStepIndex;
  useEffect(() => {
    if (currentStepIndex >= 1 && currentStepIndex <= 18) {
      const sym = DIVA5_SYMPTOMS[currentStepIndex - 1];
      if (!sym) return;
      commitState((prev) => {
        const currentAns = prev.symptoms[sym.id];
        const markAdult = isMobileViewport
          ? activeMobilePeriod === 'adult' || currentAns.adult.wasViewed
          : true;
        const markChildhood = isMobileViewport
          ? activeMobilePeriod === 'childhood' || currentAns.childhood.wasViewed
          : true;

        if (
          currentAns.adult.wasViewed === markAdult &&
          currentAns.childhood.wasViewed === markChildhood
        ) {
          return prev;
        }

        return {
          ...prev,
          symptoms: {
            ...prev.symptoms,
            [sym.id]: {
              adult: { ...currentAns.adult, wasViewed: markAdult },
              childhood: { ...currentAns.childhood, wasViewed: markChildhood }
            }
          }
        };
      });
    }
  }, [currentStepIndex, activeMobilePeriod, isMobileViewport, commitState]);

  const summary = useMemo(() => calculateDiva5Summary(state), [state]);

  const currentStepMeta =
    WIZARD_STEPS[currentStepIndex] || WIZARD_STEPS[0];

  // Finalize viewed empty symptom periods as "Нет (Авто)" when leaving a symptom step
  const finalizeViewedEmptySymptomPeriods = useCallback(
    (prev: Diva5ClinicalState, stepIdx: number): Diva5ClinicalState => {
      if (!prev.settings.autoVerdictOnExampleSelect) return prev;
      if (stepIdx < 1 || stepIdx > 18) return prev;
      const sym = DIVA5_SYMPTOMS[stepIdx - 1];
      if (!sym) return prev;

      const ans = prev.symptoms[sym.id];
      let nextAdult = ans.adult;
      let nextChild = ans.childhood;

      if (
        ans.adult.wasViewed &&
        !ans.adult.isManualOverride &&
        ans.adult.present === null &&
        !hasAnySymptomExampleSelected(ans.adult)
      ) {
        nextAdult = { ...ans.adult, present: false };
      }

      if (
        ans.childhood.wasViewed &&
        !ans.childhood.isManualOverride &&
        ans.childhood.present === null &&
        !hasAnySymptomExampleSelected(ans.childhood)
      ) {
        nextChild = { ...ans.childhood, present: false };
      }

      if (nextAdult === ans.adult && nextChild === ans.childhood) {
        return prev;
      }

      return {
        ...prev,
        symptoms: {
          ...prev.symptoms,
          [sym.id]: {
            adult: nextAdult,
            childhood: nextChild
          }
        }
      };
    },
    []
  );

  const navigateToStep = useCallback(
    (targetStepIndex: number, finalizeCurrentSymptom: boolean = false) => {
      flushRegistry.flushAll();
      const clamped = Math.max(0, Math.min(WIZARD_STEPS.length - 1, targetStepIndex));
      commitState((prev) => {
        const finalized = finalizeCurrentSymptom
          ? finalizeViewedEmptySymptomPeriods(prev, prev.currentStepIndex)
          : prev;
        return {
          ...finalized,
          currentStepIndex: clamped
        };
      });
      setActiveMobilePeriod('adult');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    },
    [commitState, finalizeViewedEmptySymptomPeriods, flushRegistry]
  );

  // Check if mobile user is on Adult tab and hasn't viewed Childhood tab yet on current symptom step
  const currentSymptomQuestion =
    currentStepIndex >= 1 && currentStepIndex <= 18
      ? DIVA5_SYMPTOMS[currentStepIndex - 1]
      : null;

  const currentSymptomAnswer = currentSymptomQuestion
    ? state.symptoms[currentSymptomQuestion.id]
    : null;

  const shouldPromptChildhoodTabOnMobile = Boolean(
    isMobileViewport &&
      currentSymptomQuestion &&
      currentSymptomAnswer &&
      activeMobilePeriod === 'adult' &&
      !currentSymptomAnswer.childhood.wasViewed
  );

  const handleNextButtonClick = () => {
    flushRegistry.flushAll();
    if (shouldPromptChildhoodTabOnMobile && currentSymptomQuestion) {
      setActiveMobilePeriod('childhood');
      commitState((prev) => {
        const finalizedAdult =
          prev.settings.autoVerdictOnExampleSelect &&
          !prev.symptoms[currentSymptomQuestion.id].adult.isManualOverride &&
          prev.symptoms[currentSymptomQuestion.id].adult.present === null &&
          !hasAnySymptomExampleSelected(prev.symptoms[currentSymptomQuestion.id].adult)
            ? {
                ...prev.symptoms[currentSymptomQuestion.id].adult,
                present: false,
                wasViewed: true
              }
            : {
                ...prev.symptoms[currentSymptomQuestion.id].adult,
                wasViewed: true
              };

        return {
          ...prev,
          symptoms: {
            ...prev.symptoms,
            [currentSymptomQuestion.id]: {
              adult: finalizedAdult,
              childhood: {
                ...prev.symptoms[currentSymptomQuestion.id].childhood,
                wasViewed: true
              }
            }
          }
        };
      });
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      return;
    }

    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      navigateToStep(currentStepIndex + 1, true);
    }
  };

  const handlePrevButtonClick = () => {
    flushRegistry.flushAll();
    if (isMobileViewport && currentSymptomQuestion && activeMobilePeriod === 'childhood') {
      setActiveMobilePeriod('adult');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      return;
    }
    if (currentStepIndex > 0) {
      navigateToStep(currentStepIndex - 1);
    }
  };

  // Handlers for Step 0
  const handleUpdatePatient = useCallback(
    (patch: Partial<PatientInfoState>) => {
      commitState((prev) => ({
        ...prev,
        patient: { ...prev.patient, ...patch }
      }));
    },
    [commitState]
  );

  const handleUpdateSettings = useCallback(
    (patch: Partial<AppSettingsState>) => {
      commitState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch }
      }));
    },
    [commitState]
  );

  // Handlers for Symptoms (Steps 1..18)
  const handleToggleSymptomExample = useCallback(
    (periodKey: 'adult' | 'childhood', exampleId: string) => {
      if (!currentSymptomQuestion) return;
      const qId = currentSymptomQuestion.id;
      commitState((prev) => {
        const period = prev.symptoms[qId][periodKey];
        const exists = period.checkedIds.includes(exampleId);
        const nextCheckedIds = exists
          ? period.checkedIds.filter((id) => id !== exampleId)
          : [...period.checkedIds, exampleId];

        const nextPeriod = {
          ...period,
          checkedIds: nextCheckedIds,
          wasViewed: true
        };

        if (prev.settings.autoVerdictOnExampleSelect && !nextPeriod.isManualOverride) {
          nextPeriod.present = hasAnySymptomExampleSelected(nextPeriod)
            ? true
            : null;
        }

        return {
          ...prev,
          symptoms: {
            ...prev.symptoms,
            [qId]: {
              ...prev.symptoms[qId],
              [periodKey]: nextPeriod
            }
          }
        };
      });
    },
    [commitState, currentSymptomQuestion]
  );

  const handleToggleSymptomOtherCheckbox = useCallback(
    (periodKey: 'adult' | 'childhood', checked: boolean) => {
      if (!currentSymptomQuestion) return;
      const qId = currentSymptomQuestion.id;
      commitState((prev) => {
        const period = prev.symptoms[qId][periodKey];
        const nextPeriod = {
          ...period,
          otherChecked: checked,
          wasViewed: true
        };
        if (prev.settings.autoVerdictOnExampleSelect && !nextPeriod.isManualOverride) {
          nextPeriod.present =
            checked || hasAnySymptomExampleSelected(nextPeriod) ? true : null;
        }
        return {
          ...prev,
          symptoms: {
            ...prev.symptoms,
            [qId]: {
              ...prev.symptoms[qId],
              [periodKey]: nextPeriod
            }
          }
        };
      });
    },
    [commitState, currentSymptomQuestion]
  );

  const handleChangeSymptomOtherText = useCallback(
    (periodKey: 'adult' | 'childhood', text: string) => {
      if (!currentSymptomQuestion) return;
      const qId = currentSymptomQuestion.id;
      commitState((prev) => {
        const period = prev.symptoms[qId][periodKey];
        const hasText = text.trim().length > 0;
        const nextPeriod = {
          ...period,
          otherText: text,
          otherChecked: hasText ? true : period.otherChecked,
          wasViewed: true
        };
        if (prev.settings.autoVerdictOnExampleSelect && !nextPeriod.isManualOverride) {
          nextPeriod.present = hasAnySymptomExampleSelected(nextPeriod)
            ? true
            : null;
        }
        return {
          ...prev,
          symptoms: {
            ...prev.symptoms,
            [qId]: {
              ...prev.symptoms[qId],
              [periodKey]: nextPeriod
            }
          }
        };
      });
    },
    [commitState, currentSymptomQuestion]
  );

  const handleSetManualSymptomVerdict = useCallback(
    (periodKey: 'adult' | 'childhood', present: TriState) => {
      if (!currentSymptomQuestion) return;
      const qId = currentSymptomQuestion.id;
      commitState((prev) => ({
        ...prev,
        symptoms: {
          ...prev.symptoms,
          [qId]: {
            ...prev.symptoms[qId],
            [periodKey]: {
              ...prev.symptoms[qId][periodKey],
              present,
              isManualOverride: present !== null,
              wasViewed: true
            }
          }
        }
      }));
    },
    [commitState, currentSymptomQuestion]
  );

  const handleResetToAutoSymptomVerdict = useCallback(
    (periodKey: 'adult' | 'childhood') => {
      if (!currentSymptomQuestion) return;
      const qId = currentSymptomQuestion.id;
      commitState((prev) => {
        const period = prev.symptoms[qId][periodKey];
        const autoVal = hasAnySymptomExampleSelected(period) ? true : null;
        return {
          ...prev,
          symptoms: {
            ...prev.symptoms,
            [qId]: {
              ...prev.symptoms[qId],
              [periodKey]: {
                ...period,
                present: autoVal,
                isManualOverride: false
              }
            }
          }
        };
      });
    },
    [commitState, currentSymptomQuestion]
  );

  // Handlers for Criterion B & C & DSM-5 Form
  const handleUpdateCriterionB = useCallback(
    (patch: Partial<CriterionBState>) => {
      commitState((prev) => ({
        ...prev,
        criterionB: { ...prev.criterionB, ...patch }
      }));
    },
    [commitState]
  );

  const handleToggleDomainExample = useCallback(
    (domainId: string, periodKey: 'adult' | 'childhood', exampleId: string) => {
      commitState((prev) => {
        const domPeriod = prev.impairmentDomains[domainId][periodKey];
        const exists = domPeriod.checkedIds.includes(exampleId);
        const nextCheckedIds = exists
          ? domPeriod.checkedIds.filter((id) => id !== exampleId)
          : [...domPeriod.checkedIds, exampleId];

        const nextPeriod = {
          ...domPeriod,
          checkedIds: nextCheckedIds
        };

        if (prev.settings.autoVerdictOnExampleSelect && !nextPeriod.isManualOverride) {
          nextPeriod.affected = hasAnyDomainExampleSelected(nextPeriod)
            ? true
            : null;
        }

        return {
          ...prev,
          impairmentDomains: {
            ...prev.impairmentDomains,
            [domainId]: {
              ...prev.impairmentDomains[domainId],
              [periodKey]: nextPeriod
            }
          }
        };
      });
    },
    [commitState]
  );

  const handleToggleDomainOther = useCallback(
    (domainId: string, periodKey: 'adult' | 'childhood', checked: boolean) => {
      commitState((prev) => {
        const domPeriod = prev.impairmentDomains[domainId][periodKey];
        const nextPeriod = {
          ...domPeriod,
          otherChecked: checked
        };
        if (prev.settings.autoVerdictOnExampleSelect && !nextPeriod.isManualOverride) {
          nextPeriod.affected =
            checked || hasAnyDomainExampleSelected(nextPeriod) ? true : null;
        }
        return {
          ...prev,
          impairmentDomains: {
            ...prev.impairmentDomains,
            [domainId]: {
              ...prev.impairmentDomains[domainId],
              [periodKey]: nextPeriod
            }
          }
        };
      });
    },
    [commitState]
  );

  const handleChangeDomainOtherText = useCallback(
    (domainId: string, periodKey: 'adult' | 'childhood', text: string) => {
      commitState((prev) => {
        const domPeriod = prev.impairmentDomains[domainId][periodKey];
        const hasText = text.trim().length > 0;
        const nextPeriod = {
          ...domPeriod,
          otherText: text,
          otherChecked: hasText ? true : domPeriod.otherChecked
        };
        if (prev.settings.autoVerdictOnExampleSelect && !nextPeriod.isManualOverride) {
          nextPeriod.affected = hasAnyDomainExampleSelected(nextPeriod)
            ? true
            : null;
        }
        return {
          ...prev,
          impairmentDomains: {
            ...prev.impairmentDomains,
            [domainId]: {
              ...prev.impairmentDomains[domainId],
              [periodKey]: nextPeriod
            }
          }
        };
      });
    },
    [commitState]
  );

  const handleSetDomainManualAffected = useCallback(
    (domainId: string, periodKey: 'adult' | 'childhood', affected: TriState) => {
      commitState((prev) => ({
        ...prev,
        impairmentDomains: {
          ...prev.impairmentDomains,
          [domainId]: {
            ...prev.impairmentDomains[domainId],
            [periodKey]: {
              ...prev.impairmentDomains[domainId][periodKey],
              affected,
              isManualOverride: affected !== null
            }
          }
        }
      }));
    },
    [commitState]
  );

  const handleResetDomainAutoAffected = useCallback(
    (domainId: string, periodKey: 'adult' | 'childhood') => {
      commitState((prev) => {
        const domPeriod = prev.impairmentDomains[domainId][periodKey];
        return {
          ...prev,
          impairmentDomains: {
            ...prev.impairmentDomains,
            [domainId]: {
              ...prev.impairmentDomains[domainId],
              [periodKey]: {
                ...domPeriod,
                affected: hasAnyDomainExampleSelected(domPeriod) ? true : null,
                isManualOverride: false
              }
            }
          }
        };
      });
    },
    [commitState]
  );

  const handleUpdateCriterionCD = useCallback(
    (patch: Partial<CriterionCDManualState>) => {
      commitState((prev) => ({
        ...prev,
        criterionCD: { ...prev.criterionCD, ...patch }
      }));
    },
    [commitState]
  );

  const handleUpdateDsm5Form = useCallback(
    (patch: Partial<DSM5FormState>) => {
      commitState((prev) => ({
        ...prev,
        dsm5Form: { ...prev.dsm5Form, ...patch }
      }));
    },
    [commitState]
  );

  // JSON Draft Export / Import / Clear
  const handleDownloadJsonDraft = useCallback(
    (anonymize: boolean) => {
      flushRegistry.flushAll();
      const payload = anonymize
        ? stripPersonalData(stateRef.current)
        : stateRef.current;
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stateRef.current.patient.id || 'DIVA5'}_${
        anonymize ? 'anon' : 'full'
      }_draft.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [flushRegistry]
  );

  const handleUploadJsonDraft = useCallback((file: File) => {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        const validated = validateAndHydrateState(parsed);
        if (!validated) {
          setImportError(
            'Ошибка импорта: файл не соответствует схеме клинического опросника DIVA-5.'
          );
          return;
        }
        setState(validated);
        saveClinicalStateSync(validated);
        setImportError(null);
      } catch {
        setImportError(
          'Ошибка чтения JSON: файл поврежден или имеет неверный синтаксис.'
        );
      }
    };
    reader.onerror = () => {
      setImportError('Не удалось прочитать выбранный файл.');
    };
    reader.readAsText(file);
  }, []);

  const handleClearAll = useCallback(() => {
    void clearAllClinicalStorage().then((fresh) => {
      setState(fresh);
      setActiveMobilePeriod('adult');
      setImportError(null);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      {/* Sticky Top Header (Hidden in print) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 sm:px-6 h-14">
          {/* Left: Brand & Step Title */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => navigateToStep(0)}
              className="rounded-lg bg-[#1e3a8a] px-2 py-1 font-mono text-xs sm:text-sm font-bold text-white shrink-0"
            >
              DIVA-5
            </button>
            <div className="min-w-0">
              <div className="truncate text-xs sm:text-sm font-semibold text-slate-900">
                {currentStepMeta.shortTitle}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-600 font-mono whitespace-nowrap">
                <span className="sm:hidden">
                  Д:{summary.inattentionAdultCount}/{summary.inattentionChildhoodCount} | ГИ:{summary.hyperactivityAdultCount}/{summary.hyperactivityChildhoodCount}
                </span>
                <span className="hidden sm:inline">
                  Д: {summary.inattentionAdultCount}/9 взр,{' '}
                  {summary.inattentionChildhoodCount}/9 дет | ГИ:{' '}
                  {summary.hyperactivityAdultCount}/9 взр,{' '}
                  {summary.hyperactivityChildhoodCount}/9 дет
                </span>
                <span className="hidden lg:inline text-emerald-700">
                  · ✓ Сохранено локально ({state.lastSavedAt})
                </span>
              </div>
            </div>
          </div>

          {/* Right: Self-Verification, Guide, Drawer */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsVerificationOpen(true)}
              aria-label="Самопроверка: ОК"
              className={`flex min-h-[38px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                verificationReport.allPassed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              <span className="sm:hidden">🛡️ ОК</span>
              <span className="hidden sm:inline">
                🛡️ Самопроверка: {verificationReport.allPassed ? 'ОК' : 'Ошибка'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              aria-label="Справочник DIVA-5"
              className="flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 whitespace-nowrap"
            >
              <span className="md:hidden">📖</span>
              <span className="hidden md:inline">📖 Справочник</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Оглавление"
              className="flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#1e3a8a] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3a8a]/90 whitespace-nowrap"
            >
              <span>☰ Оглавление</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Active-Step Mounting (renders ONLY current active step) */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 sm:px-6 pt-4 pb-24 print:p-0 print:max-w-none">
        {currentStepIndex === 0 && (
          <PatientSetupStep
            patient={state.patient}
            settings={state.settings}
            onUpdatePatient={handleUpdatePatient}
            onUpdateSettings={handleUpdateSettings}
            onDownloadJsonDraft={handleDownloadJsonDraft}
            onUploadJsonDraft={handleUploadJsonDraft}
            onClearAll={handleClearAll}
            importError={importError}
          />
        )}

        {currentStepIndex >= 1 &&
          currentStepIndex <= 18 &&
          currentSymptomQuestion &&
          currentSymptomAnswer && (
            <SymptomStep
              key={currentSymptomQuestion.id}
              question={currentSymptomQuestion}
              answer={currentSymptomAnswer}
              autoVerdictEnabled={state.settings.autoVerdictOnExampleSelect}
              activeMobilePeriod={activeMobilePeriod}
              onSelectMobilePeriod={(period) => {
                setActiveMobilePeriod(period);
                commitState((prev) => ({
                  ...prev,
                  symptoms: {
                    ...prev.symptoms,
                    [currentSymptomQuestion.id]: {
                      ...prev.symptoms[currentSymptomQuestion.id],
                      [period]: {
                        ...prev.symptoms[currentSymptomQuestion.id][period],
                        wasViewed: true
                      }
                    }
                  }
                }));
              }}
              flushRegistry={flushRegistry}
              onToggleExample={handleToggleSymptomExample}
              onToggleOtherCheckbox={handleToggleSymptomOtherCheckbox}
              onChangeOtherText={handleChangeSymptomOtherText}
              onSetManualVerdict={handleSetManualSymptomVerdict}
              onResetToAutoVerdict={handleResetToAutoSymptomVerdict}
            />
          )}

        {currentStepIndex === 19 && (
          <CriterionBStep
            criterionB={state.criterionB}
            summary={summary}
            onUpdateCriterionB={handleUpdateCriterionB}
          />
        )}

        {currentStepIndex === 20 && (
          <CriterionCStep
            impairmentDomains={state.impairmentDomains}
            criterionCD={state.criterionCD}
            summary={summary}
            autoVerdictEnabled={state.settings.autoVerdictOnExampleSelect}
            flushRegistry={flushRegistry}
            onToggleDomainExample={handleToggleDomainExample}
            onToggleDomainOther={handleToggleDomainOther}
            onChangeDomainOtherText={handleChangeDomainOtherText}
            onSetDomainManualAffected={handleSetDomainManualAffected}
            onResetDomainAutoAffected={handleResetDomainAutoAffected}
            onUpdateCriterionCD={handleUpdateCriterionCD}
          />
        )}

        {currentStepIndex === 21 && (
          <SummaryFormStep
            state={state}
            summary={summary}
            flushRegistry={flushRegistry}
            onJumpToStep={navigateToStep}
            onUpdateCriterionB={handleUpdateCriterionB}
            onUpdateCriterionCD={handleUpdateCriterionCD}
            onUpdateDsm5Form={handleUpdateDsm5Form}
          />
        )}

        {currentStepIndex === 22 && (
          <ExportStep
            state={state}
            summary={summary}
            onToggleAnonymize={(anonymize) =>
              handleUpdateSettings({ anonymizeExport: anonymize })
            }
            onDownloadJsonDraft={handleDownloadJsonDraft}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation Bar with Smart Mobile Childhood Tab Guard (Hidden in print) */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 sm:px-6 h-16">
          <button
            type="button"
            onClick={handlePrevButtonClick}
            disabled={currentStepIndex === 0}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>Назад</span>
          </button>

          <div className="hidden sm:flex flex-col items-center text-xs text-slate-500 font-mono">
            <span>
              Шаг {currentStepIndex + 1} из {WIZARD_STEPS.length} · Оценено блоков:{' '}
              {summary.answeredSymptomBlocks}/36
            </span>
            <span className="text-[11px] text-emerald-700 flex items-center gap-1">
              <Check className="h-3 w-3" /> Сохранено локально ({state.lastSavedAt})
            </span>
          </div>

          {currentStepIndex < WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNextButtonClick}
              className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#1e3a8a] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#1e3a8a]/90 whitespace-nowrap"
            >
              <span>
                {shouldPromptChildhoodTabOnMobile
                  ? 'Далее: Детство (5–12 лет) →'
                  : 'Далее →'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigateToStep(21)}
              className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#1e3a8a] bg-[#e0f2fe]/50 px-4 py-2 text-xs sm:text-sm font-semibold text-[#1e3a8a] hover:bg-[#e0f2fe] whitespace-nowrap"
            >
              <span>К Формуляру подсчета</span>
            </button>
          )}
        </div>
      </footer>

      {/* Modals & Drawer */}
      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      <VerificationModal
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
        report={verificationReport}
      />
      <StepDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        state={state}
        summary={summary}
        onSelectStep={navigateToStep}
        onDownloadJsonDraft={handleDownloadJsonDraft}
        onUploadJsonDraft={handleUploadJsonDraft}
        onClearAll={handleClearAll}
        importError={importError}
      />
    </div>
  );
}
