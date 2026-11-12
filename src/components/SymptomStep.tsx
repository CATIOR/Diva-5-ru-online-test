import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, RotateCcw } from 'lucide-react';
import {
  PeriodSymptomState,
  SymptomAnswerState,
  SymptomExample,
  SymptomQuestionData,
  TriState
} from '../types/diva5';
import { PART_1_HEADER_NOTE, PART_2_HEADER_NOTE } from '../data/diva5-symptoms';
import {
  computeEffectiveSymptomPresence,
  formatVerdictLabel
} from '../utils/scoring';
import { DebouncedTextarea, FlushRegistry } from './DebouncedTextarea';

interface CheckboxItemRowProps {
  example: SymptomExample;
  checked: boolean;
  onToggle: (id: string) => void;
}

const CheckboxItemRow: React.FC<CheckboxItemRowProps> = React.memo(
  ({ example, checked, onToggle }) => {
    return (
      <label
        className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition-colors select-none ${
          checked
            ? 'border-[#1e3a8a] bg-[#e0f2fe]/60 text-slate-900 font-medium'
            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(example.id)}
          className="h-5 w-5 shrink-0 rounded accent-[#1e3a8a]"
        />
        <span className="leading-snug">{example.text}</span>
      </label>
    );
  }
);
CheckboxItemRow.displayName = 'CheckboxItemRow';

interface PeriodColumnProps {
  questionId: string;
  periodKey: 'adult' | 'childhood';
  title: string;
  subtitle: string;
  examples: SymptomExample[];
  periodState: PeriodSymptomState;
  autoVerdictEnabled: boolean;
  footnote?: string;
  flushRegistry: FlushRegistry;
  onToggleExample: (periodKey: 'adult' | 'childhood', exampleId: string) => void;
  onToggleOtherCheckbox: (periodKey: 'adult' | 'childhood', checked: boolean) => void;
  onChangeOtherText: (periodKey: 'adult' | 'childhood', text: string) => void;
  onSetManualVerdict: (periodKey: 'adult' | 'childhood', present: TriState) => void;
  onResetToAutoVerdict: (periodKey: 'adult' | 'childhood') => void;
}

const PeriodColumn: React.FC<PeriodColumnProps> = React.memo(
  ({
    questionId,
    periodKey,
    title,
    subtitle,
    examples,
    periodState,
    autoVerdictEnabled,
    footnote,
    flushRegistry,
    onToggleExample,
    onToggleOtherCheckbox,
    onChangeOtherText,
    onSetManualVerdict,
    onResetToAutoVerdict
  }) => {
    const effectivePresence = computeEffectiveSymptomPresence(
      periodState,
      autoVerdictEnabled
    );
    const verdictText = formatVerdictLabel(periodState, autoVerdictEnabled);
    const selectedCount =
      periodState.checkedIds.length +
      (periodState.otherChecked || periodState.otherText.trim().length > 0 ? 1 : 0);

    return (
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#1e3a8a]">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className="text-right font-mono text-xs text-slate-600 shrink-0 whitespace-nowrap">
            <div>Выбрано: {selectedCount}</div>
            <div
              className={`font-semibold ${
                effectivePresence === true
                  ? 'text-[#1e3a8a]'
                  : effectivePresence === false
                    ? 'text-emerald-700'
                    : 'text-slate-400'
              }`}
            >
              {verdictText}
            </div>
          </div>
        </div>

        {/* Examples List */}
        <div className="space-y-2">
          {examples.map((ex) => (
            <CheckboxItemRow
              key={ex.id}
              example={ex}
              checked={periodState.checkedIds.includes(ex.id)}
              onToggle={(id) => onToggleExample(periodKey, id)}
            />
          ))}

          {/* "Прочее:" checkbox + DebouncedTextarea */}
          <div
            className={`rounded-lg border p-3 space-y-2.5 transition-colors ${
              periodState.otherChecked || periodState.otherText.trim().length > 0
                ? 'border-[#1e3a8a] bg-[#e0f2fe]/35'
                : 'border-slate-200 bg-[#f8fafc]'
            }`}
          >
            <label className="flex min-h-[36px] cursor-pointer items-center gap-3 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={
                  periodState.otherChecked ||
                  periodState.otherText.trim().length > 0
                }
                onChange={(e) =>
                  onToggleOtherCheckbox(periodKey, e.target.checked)
                }
                className="h-5 w-5 shrink-0 rounded accent-[#1e3a8a]"
              />
              <span>Прочее:</span>
            </label>
            <DebouncedTextarea
              id={`${questionId}_${periodKey}_other`}
              value={periodState.otherText}
              onCommit={(val) => onChangeOtherText(periodKey, val)}
              flushRegistry={flushRegistry}
              placeholder="Собственный пример пациента или уточнение..."
              rows={2}
            />
          </div>
        </div>

        {footnote && (
          <p className="text-xs italic text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-200">
            {footnote}
          </p>
        )}

        {/* 3-State Clinical Verdict */}
        <div className="mt-auto border-t border-slate-200 pt-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">
              Симптомы присутствуют?
            </span>
            <span className="font-mono text-xs text-slate-600">
              Статус: <strong>{verdictText}</strong>
            </span>
          </div>

          <div
            className="grid grid-cols-3 gap-2"
            role="group"
            aria-label={`Симптомы присутствуют (${title})`}
          >
            <button
              type="button"
              onClick={() => onSetManualVerdict(periodKey, true)}
              className={`min-h-[46px] rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                effectivePresence === true
                  ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Да
            </button>
            <button
              type="button"
              onClick={() => onSetManualVerdict(periodKey, false)}
              className={`min-h-[46px] rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                effectivePresence === false
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Нет
            </button>
            <button
              type="button"
              onClick={() => onSetManualVerdict(periodKey, null)}
              className={`min-h-[46px] rounded-lg border px-2 py-2 text-xs sm:text-sm font-medium transition-colors ${
                effectivePresence === null
                  ? 'border-slate-600 bg-slate-700 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Не оценено
            </button>
          </div>

          {periodState.isManualOverride && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onResetToAutoVerdict(periodKey)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1e3a8a] hover:underline"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Вернуть авто-расчет по примерам</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);
PeriodColumn.displayName = 'PeriodColumn';

interface SymptomStepProps {
  question: SymptomQuestionData;
  answer: SymptomAnswerState;
  autoVerdictEnabled: boolean;
  activeMobilePeriod: 'adult' | 'childhood';
  onSelectMobilePeriod: (period: 'adult' | 'childhood') => void;
  flushRegistry: FlushRegistry;
  onToggleExample: (periodKey: 'adult' | 'childhood', exampleId: string) => void;
  onToggleOtherCheckbox: (periodKey: 'adult' | 'childhood', checked: boolean) => void;
  onChangeOtherText: (periodKey: 'adult' | 'childhood', text: string) => void;
  onSetManualVerdict: (periodKey: 'adult' | 'childhood', present: TriState) => void;
  onResetToAutoVerdict: (periodKey: 'adult' | 'childhood') => void;
}

export const SymptomStep: React.FC<SymptomStepProps> = ({
  question,
  answer,
  autoVerdictEnabled,
  activeMobilePeriod,
  onSelectMobilePeriod,
  flushRegistry,
  onToggleExample,
  onToggleOtherCheckbox,
  onChangeOtherText,
  onSetManualVerdict,
  onResetToAutoVerdict
}) => {
  const [showHelperTip, setShowHelperTip] = useState(true);

  const adultCount =
    answer.adult.checkedIds.length +
    (answer.adult.otherChecked || answer.adult.otherText.trim().length > 0 ? 1 : 0);
  const childCount =
    answer.childhood.checkedIds.length +
    (answer.childhood.otherChecked || answer.childhood.otherText.trim().length > 0
      ? 1
      : 0);

  const adultVerdict = formatVerdictLabel(answer.adult, autoVerdictEnabled);
  const childVerdict = formatVerdictLabel(answer.childhood, autoVerdictEnabled);

  return (
    <div className="space-y-4">
      {/* Part Banner */}
      <div className="rounded-xl bg-[#be123c] px-4 py-2.5 text-white flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-bold">
          {question.part === 1
            ? 'Часть 1. Симптомы дефицита внимания (DSM-5, критерий A1)'
            : 'Часть 2. Симптомы гиперактивности/импульсивности (DSM-5, критерий A2)'}
        </span>
        <span className="font-mono text-xs text-white/90">
          Стр. {question.page} PDF · Критерий {question.dsmCode}
        </span>
      </div>

      {/* Clinical Note */}
      <p className="text-xs text-slate-600 leading-relaxed px-1">
        {question.part === 1 ? PART_1_HEADER_NOTE : PART_2_HEADER_NOTE}
      </p>

      {/* Question Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-stretch bg-[#e0f2fe]">
          <div className="flex items-center justify-center bg-[#1e3a8a] px-4 sm:px-6 py-4 text-white font-mono text-lg sm:text-2xl font-bold shrink-0">
            {question.codeLabel}
          </div>
          <div className="p-3.5 sm:p-5 flex-1">
            <h1 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
              {question.questionText}
            </h1>
          </div>
        </div>

        {/* Collapsible helperTip */}
        <div className="border-t border-slate-200 bg-[#f8fafc] px-4 py-2.5">
          <button
            type="button"
            onClick={() => setShowHelperTip((v) => !v)}
            aria-expanded={showHelperTip}
            className="flex w-full items-center justify-between text-left text-xs sm:text-sm font-medium text-[#1e3a8a] py-1"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 shrink-0" />
              <span>💡 Пояснение к критерию ({question.codeLabel})</span>
            </span>
            {showHelperTip ? (
              <ChevronUp className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
          </button>
          {showHelperTip && (
            <p className="mt-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed pb-1">
              {question.helperTip}
            </p>
          )}
        </div>
      </div>

      {/* Mobile Segmented Control (< 768px) */}
      <div
        className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-200 p-1 md:hidden"
        role="tablist"
        aria-label="Выбор возрастного периода"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeMobilePeriod === 'adult'}
          onClick={() => onSelectMobilePeriod('adult')}
          className={`min-h-[46px] rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
            activeMobilePeriod === 'adult'
              ? 'bg-[#1e3a8a] text-white'
              : 'bg-white text-slate-700'
          }`}
        >
          <div className="truncate">Во взрослом возрасте</div>
          <div className="font-mono text-[11px] opacity-90">
            Выбрано: {adultCount} · {adultVerdict}
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeMobilePeriod === 'childhood'}
          onClick={() => onSelectMobilePeriod('childhood')}
          className={`min-h-[46px] rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
            activeMobilePeriod === 'childhood'
              ? 'bg-[#1e3a8a] text-white'
              : 'bg-white text-slate-700'
          }`}
        >
          <div className="truncate">В детстве (5–12 лет)</div>
          <div className="font-mono text-[11px] opacity-90">
            Выбрано: {childCount} · {childVerdict}
          </div>
        </button>
      </div>

      {/* Responsive Columns: 1 active tab on mobile, 2 parallel columns on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <div
          className={`${
            activeMobilePeriod === 'adult' ? 'block' : 'hidden'
          } md:block h-full`}
        >
          <PeriodColumn
            questionId={question.id}
            periodKey="adult"
            title="Примеры (поведения) в зрелости"
            subtitle="Присутствуют ≥ 6 последних месяцев"
            examples={question.adultExamples}
            periodState={answer.adult}
            autoVerdictEnabled={autoVerdictEnabled}
            footnote={question.footnote}
            flushRegistry={flushRegistry}
            onToggleExample={onToggleExample}
            onToggleOtherCheckbox={onToggleOtherCheckbox}
            onChangeOtherText={onChangeOtherText}
            onSetManualVerdict={onSetManualVerdict}
            onResetToAutoVerdict={onResetToAutoVerdict}
          />
        </div>

        <div
          className={`${
            activeMobilePeriod === 'childhood' ? 'block' : 'hidden'
          } md:block h-full`}
        >
          <PeriodColumn
            questionId={question.id}
            periodKey="childhood"
            title="Примеры (поведения) в детстве"
            subtitle="Возраст строго от 5 до 12 лет"
            examples={question.childhoodExamples}
            periodState={answer.childhood}
            autoVerdictEnabled={autoVerdictEnabled}
            footnote={question.footnote}
            flushRegistry={flushRegistry}
            onToggleExample={onToggleExample}
            onToggleOtherCheckbox={onToggleOtherCheckbox}
            onChangeOtherText={onChangeOtherText}
            onSetManualVerdict={onSetManualVerdict}
            onResetToAutoVerdict={onResetToAutoVerdict}
          />
        </div>
      </div>
    </div>
  );
};
