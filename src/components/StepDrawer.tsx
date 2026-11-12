import React, { useRef, useState } from 'react';
import {
  Download,
  FileUp,
  Trash2,
  X,
  User,
  ClipboardList,
  FileSpreadsheet,
  FileOutput
} from 'lucide-react';
import { Diva5CalculatedSummary, Diva5ClinicalState, TriState } from '../types/diva5';
import { DIVA5_SYMPTOMS } from '../data/diva5-symptoms';
import { computeEffectiveSymptomPresence } from '../utils/scoring';

export interface WizardStepMeta {
  index: number;
  id: string;
  shortTitle: string;
  fullTitle: string;
  group: 'setup' | 'part1' | 'part2' | 'part3' | 'summary';
}

export const WIZARD_STEPS: WizardStepMeta[] = [
  {
    index: 0,
    id: 'patient',
    shortTitle: 'Карточка пациента',
    fullTitle: 'Шаг 0: Карточка пациента и Приватность',
    group: 'setup'
  },
  ...DIVA5_SYMPTOMS.map((sym, i) => ({
    index: i + 1,
    id: sym.id,
    shortTitle: `${sym.codeLabel} (${sym.dsmCode})`,
    fullTitle: `Часть ${sym.part}: ${sym.codeLabel} — ${sym.questionText}`,
    group: (sym.part === 1 ? 'part1' : 'part2') as 'part1' | 'part2'
  })),
  {
    index: 19,
    id: 'criterion_b',
    shortTitle: 'Критерий B (Возраст начала)',
    fullTitle: 'Часть 3: Критерий B — Возраст появления симптомов (Стр. 14)',
    group: 'part3'
  },
  {
    index: 20,
    id: 'criterion_c',
    shortTitle: 'Критерий C (5 сфер жизни)',
    fullTitle: 'Часть 3: Критерий C — Нарушения функционирования в 5 сферах (Стр. 15–17)',
    group: 'part3'
  },
  {
    index: 21,
    id: 'summary_form',
    shortTitle: 'Сводка и Формуляр DSM-5',
    fullTitle: 'Клиническая сводка и Формуляр подсчета (Стр. 18–19)',
    group: 'summary'
  },
  {
    index: 22,
    id: 'export',
    shortTitle: 'Экспорт и Печать',
    fullTitle: 'Экспорт отчета (Markdown / JSON / Печать PDF)',
    group: 'summary'
  }
];

interface StepDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: Diva5ClinicalState;
  summary: Diva5CalculatedSummary;
  onSelectStep: (stepIndex: number) => void;
  onDownloadJsonDraft: (anonymize: boolean) => void;
  onUploadJsonDraft: (file: File) => void;
  onClearAll: () => void;
  importError: string | null;
}

export const StepDrawer: React.FC<StepDrawerProps> = ({
  isOpen,
  onClose,
  state,
  summary,
  onSelectStep,
  onDownloadJsonDraft,
  onUploadJsonDraft,
  onClearAll,
  importError
}) => {
  const [confirmClearStep, setConfirmClearStep] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const autoVerdict = state.settings.autoVerdictOnExampleSelect;

  const renderStatusText = (adultVal: TriState, childVal: TriState) => {
    const fmt = (v: TriState) => (v === true ? 'Да' : v === false ? 'Нет' : '—');
    const bothEvaluated = adultVal !== null && childVal !== null;
    const anyPositive = adultVal === true || childVal === true;
    return (
      <span
        className={`font-mono text-xs font-medium ${
          !bothEvaluated
            ? 'text-slate-400'
            : anyPositive
              ? 'text-[#1e3a8a] font-semibold'
              : 'text-emerald-700'
        }`}
      >
        Взр: {fmt(adultVal)} · Дет: {fmt(childVal)}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Оглавление и управление черновиком"
    >
      <div className="flex h-full w-full max-w-md flex-col bg-white border-l border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#1e3a8a] px-4 py-3.5 text-white">
          <div>
            <h2 className="text-base font-semibold">Оглавление опросника DIVA-5</h2>
            <p className="text-xs text-white/80 font-mono">
              Оценено блоков: {summary.answeredSymptomBlocks}/36
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть оглавление"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Setup */}
          <div>
            <div className="px-2 pb-1.5 text-xs font-semibold text-slate-500">
              Регистрация и настройки
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectStep(0);
                onClose();
              }}
              className={`flex w-full min-h-[44px] items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                state.currentStepIndex === 0
                  ? 'bg-[#e0f2fe] text-[#1e3a8a] font-semibold'
                  : 'text-slate-800 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-[#1e3a8a]" />
                <span>0. Карточка пациента и Приватность</span>
              </span>
              <span className="font-mono text-xs text-slate-500">
                {state.patient.sex !== 'Не указан' || state.patient.age !== null
                  ? 'Заполнено'
                  : 'Шаблон'}
              </span>
            </button>
          </div>

          {/* Part 1 */}
          <div>
            <div className="px-2 pb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Часть 1. Дефицит внимания (A1–A9)</span>
              <span className="font-mono text-[#1e3a8a]">
                Взр: {summary.inattentionAdultCount}/9 · Дет: {summary.inattentionChildhoodCount}/9
              </span>
            </div>
            <div className="space-y-1">
              {DIVA5_SYMPTOMS.filter((s) => s.part === 1).map((sym) => {
                const stepIdx = DIVA5_SYMPTOMS.findIndex((x) => x.id === sym.id) + 1;
                const ans = state.symptoms[sym.id];
                const adultVal = computeEffectiveSymptomPresence(ans.adult, autoVerdict);
                const childVal = computeEffectiveSymptomPresence(ans.childhood, autoVerdict);
                const isCurrent = state.currentStepIndex === stepIdx;
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => {
                      onSelectStep(stepIdx);
                      onClose();
                    }}
                    className={`flex w-full min-h-[44px] items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isCurrent
                        ? 'bg-[#e0f2fe] text-[#1e3a8a] font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate pr-2">
                      <strong className="font-mono">{sym.codeLabel}</strong> ({sym.dsmCode})
                    </span>
                    {renderStatusText(adultVal, childVal)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Part 2 */}
          <div>
            <div className="px-2 pb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Часть 2. Гиперактивность/Импульсивность (H/I 1–9)</span>
              <span className="font-mono text-[#1e3a8a]">
                Взр: {summary.hyperactivityAdultCount}/9 · Дет: {summary.hyperactivityChildhoodCount}/9
              </span>
            </div>
            <div className="space-y-1">
              {DIVA5_SYMPTOMS.filter((s) => s.part === 2).map((sym) => {
                const stepIdx = DIVA5_SYMPTOMS.findIndex((x) => x.id === sym.id) + 1;
                const ans = state.symptoms[sym.id];
                const adultVal = computeEffectiveSymptomPresence(ans.adult, autoVerdict);
                const childVal = computeEffectiveSymptomPresence(ans.childhood, autoVerdict);
                const isCurrent = state.currentStepIndex === stepIdx;
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => {
                      onSelectStep(stepIdx);
                      onClose();
                    }}
                    className={`flex w-full min-h-[44px] items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isCurrent
                        ? 'bg-[#e0f2fe] text-[#1e3a8a] font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate pr-2">
                      <strong className="font-mono">{sym.codeLabel}</strong> ({sym.dsmCode})
                    </span>
                    {renderStatusText(adultVal, childVal)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Part 3 & Summary */}
          <div>
            <div className="px-2 pb-1.5 text-xs font-semibold text-slate-500">
              Часть 3, Клиническая сводка и Экспорт
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  onSelectStep(19);
                  onClose();
                }}
                className={`flex w-full min-h-[44px] items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  state.currentStepIndex === 19
                    ? 'bg-[#e0f2fe] text-[#1e3a8a] font-semibold'
                    : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#1e3a8a]" />
                  <span>Критерий B (Возраст начала)</span>
                </span>
                <span className="font-mono text-xs text-slate-600">
                  {state.criterionB.alwaysPresentBefore12 === true
                    ? 'Да'
                    : state.criterionB.alwaysPresentBefore12 === false
                      ? 'Нет'
                      : 'Не оценено'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectStep(20);
                  onClose();
                }}
                className={`flex w-full min-h-[44px] items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  state.currentStepIndex === 20
                    ? 'bg-[#e0f2fe] text-[#1e3a8a] font-semibold'
                    : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#1e3a8a]" />
                  <span>Критерий C (5 сфер жизни)</span>
                </span>
                <span className="font-mono text-xs text-slate-600">
                  Взр: {summary.impairmentDomainsAdultCount}/5 · Дет: {summary.impairmentDomainsChildhoodCount}/5
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectStep(21);
                  onClose();
                }}
                className={`flex w-full min-h-[44px] items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  state.currentStepIndex === 21
                    ? 'bg-[#e0f2fe] text-[#1e3a8a] font-semibold'
                    : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-[#1e3a8a]" />
                  <span>Сводка и Формуляр (Стр. 18–19)</span>
                </span>
                <span className="font-mono text-xs text-[#1e3a8a] font-semibold">
                  Итог
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectStep(22);
                  onClose();
                }}
                className={`flex w-full min-h-[44px] items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  state.currentStepIndex === 22
                    ? 'bg-[#e0f2fe] text-[#1e3a8a] font-semibold'
                    : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileOutput className="h-4 w-4 text-[#1e3a8a]" />
                  <span>Экспорт в Markdown и Печать</span>
                </span>
                <span className="font-mono text-xs text-slate-500">.md / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Draft Management & Clear Footer */}
        <div className="border-t border-slate-200 bg-[#f8fafc] p-3.5 space-y-2.5">
          <div className="text-xs font-semibold text-slate-600">
            Управление черновиком (JSON) и сессией
          </div>

          {importError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {importError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onDownloadJsonDraft(true)}
              className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span>JSON (Анонимный)</span>
            </button>
            <button
              type="button"
              onClick={() => onDownloadJsonDraft(false)}
              className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span>JSON (Полный)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onUploadJsonDraft(file);
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100"
            >
              <FileUp className="h-3.5 w-3.5 shrink-0" />
              <span>Загрузить JSON</span>
            </button>

            {!confirmClearStep ? (
              <button
                type="button"
                onClick={() => setConfirmClearStep(true)}
                className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>Очистить анкету</span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setConfirmClearStep(false);
                    onClose();
                  }}
                  className="flex-1 min-h-[40px] rounded-lg bg-red-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Да, стереть
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearStep(false)}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
