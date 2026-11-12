import React, { useState } from 'react';
import { HelpCircle, RotateCcw } from 'lucide-react';
import {
  CriterionCDManualState,
  Diva5CalculatedSummary,
  ImpairmentDomainAnswerState,
  ImpairmentDomainData,
  PeriodDomainState,
  TriState
} from '../types/diva5';
import {
  CRITERION_CD_SUMMARY_LABELS,
  CRITERION_C_PROMPT,
  DIVA5_IMPAIRMENT_DOMAINS
} from '../data/diva5-impairment';
import { computeEffectiveDomainAffected } from '../utils/scoring';
import { DebouncedTextarea, FlushRegistry } from './DebouncedTextarea';

interface DomainPeriodColumnProps {
  domainId: string;
  periodKey: 'adult' | 'childhood';
  title: string;
  subtitle: string;
  examples: { id: string; text: string }[];
  periodState: PeriodDomainState;
  autoVerdictEnabled: boolean;
  flushRegistry: FlushRegistry;
  onToggleExample: (
    domainId: string,
    periodKey: 'adult' | 'childhood',
    exampleId: string
  ) => void;
  onToggleOther: (
    domainId: string,
    periodKey: 'adult' | 'childhood',
    checked: boolean
  ) => void;
  onChangeOtherText: (
    domainId: string,
    periodKey: 'adult' | 'childhood',
    text: string
  ) => void;
  onSetManualAffected: (
    domainId: string,
    periodKey: 'adult' | 'childhood',
    affected: TriState
  ) => void;
  onResetAutoAffected: (domainId: string, periodKey: 'adult' | 'childhood') => void;
}

const DomainPeriodColumn: React.FC<DomainPeriodColumnProps> = React.memo(
  ({
    domainId,
    periodKey,
    title,
    subtitle,
    examples,
    periodState,
    autoVerdictEnabled,
    flushRegistry,
    onToggleExample,
    onToggleOther,
    onChangeOtherText,
    onSetManualAffected,
    onResetAutoAffected
  }) => {
    const effectiveAffected = computeEffectiveDomainAffected(
      periodState,
      autoVerdictEnabled
    );

    const statusLabel =
      effectiveAffected === null
        ? 'НЕ ОЦЕНЕНО'
        : effectiveAffected
          ? periodState.isManualOverride
            ? 'ДА (Вручную)'
            : 'ДА (Авто)'
          : periodState.isManualOverride
            ? 'НЕТ (Вручную)'
            : 'НЕТ (Авто)';

    return (
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-[#1e3a8a]">
              {title}
            </h4>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <span
            className={`font-mono text-xs font-semibold ${
              effectiveAffected === true
                ? 'text-[#1e3a8a]'
                : effectiveAffected === false
                  ? 'text-emerald-700'
                  : 'text-slate-400'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="space-y-2">
          {examples.map((ex) => {
            const checked = periodState.checkedIds.includes(ex.id);
            return (
              <label
                key={ex.id}
                className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors select-none ${
                  checked
                    ? 'border-[#1e3a8a] bg-[#e0f2fe]/60 text-slate-900 font-medium'
                    : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleExample(domainId, periodKey, ex.id)}
                  className="h-5 w-5 shrink-0 rounded accent-[#1e3a8a]"
                />
                <span className="leading-snug">{ex.text}</span>
              </label>
            );
          })}

          <div
            className={`rounded-lg border p-3 space-y-2 ${
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
                  onToggleOther(domainId, periodKey, e.target.checked)
                }
                className="h-5 w-5 shrink-0 rounded accent-[#1e3a8a]"
              />
              <span>Прочее:</span>
            </label>
            <DebouncedTextarea
              id={`domain_${domainId}_${periodKey}_other`}
              value={periodState.otherText}
              onCommit={(val) => onChangeOtherText(domainId, periodKey, val)}
              flushRegistry={flushRegistry}
              placeholder="Дополнительные проявления в этой сфере..."
              rows={2}
            />
          </div>
        </div>

        {/* Per-domain confirmation toggle */}
        <div className="mt-auto border-t border-slate-200 pt-3 space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold text-slate-800">
              Сфера затронута (с учетом компенсации IQ/структурой)?
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onSetManualAffected(domainId, periodKey, true)}
              className={`min-h-[42px] rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${
                effectiveAffected === true
                  ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Да
            </button>
            <button
              type="button"
              onClick={() => onSetManualAffected(domainId, periodKey, false)}
              className={`min-h-[42px] rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${
                effectiveAffected === false
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Нет
            </button>
            <button
              type="button"
              onClick={() => onSetManualAffected(domainId, periodKey, null)}
              className={`min-h-[42px] rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                effectiveAffected === null
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
                onClick={() => onResetAutoAffected(domainId, periodKey)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#1e3a8a] hover:underline"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Авто-расчет</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);
DomainPeriodColumn.displayName = 'DomainPeriodColumn';

interface CriterionCStepProps {
  impairmentDomains: Record<string, ImpairmentDomainAnswerState>;
  criterionCD: CriterionCDManualState;
  summary: Diva5CalculatedSummary;
  autoVerdictEnabled: boolean;
  flushRegistry: FlushRegistry;
  onToggleDomainExample: (
    domainId: string,
    periodKey: 'adult' | 'childhood',
    exampleId: string
  ) => void;
  onToggleDomainOther: (
    domainId: string,
    periodKey: 'adult' | 'childhood',
    checked: boolean
  ) => void;
  onChangeDomainOtherText: (
    domainId: string,
    periodKey: 'adult' | 'childhood',
    text: string
  ) => void;
  onSetDomainManualAffected: (
    domainId: string,
    periodKey: 'adult' | 'childhood',
    affected: TriState
  ) => void;
  onResetDomainAutoAffected: (
    domainId: string,
    periodKey: 'adult' | 'childhood'
  ) => void;
  onUpdateCriterionCD: (patch: Partial<CriterionCDManualState>) => void;
}

export const CriterionCStep: React.FC<CriterionCStepProps> = ({
  impairmentDomains,
  criterionCD,
  summary,
  autoVerdictEnabled,
  flushRegistry,
  onToggleDomainExample,
  onToggleDomainOther,
  onChangeDomainOtherText,
  onSetDomainManualAffected,
  onResetDomainAutoAffected,
  onUpdateCriterionCD
}) => {
  const [mobilePeriod, setMobilePeriod] = useState<'adult' | 'childhood'>('adult');

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-block rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-base font-bold text-white">
            Критерий C (Стр. 15–17 PDF)
          </div>
          <div className="font-mono text-xs sm:text-sm font-semibold text-[#1e3a8a]">
            Затронуто сфер: Зрелость {summary.impairmentDomainsAdultCount} из 5 · Детство{' '}
            {summary.impairmentDomainsChildhoodCount} из 5
          </div>
        </div>
        <h1 className="text-base sm:text-lg font-semibold text-slate-900">
          {CRITERION_C_PROMPT}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Для установления диагноза СДВГ необходимо наличие клинически значимых нарушений функционирования как минимум в 2 из 5 жизненных областей.
        </p>
      </div>

      {/* Mobile Segmented Control (< 768px) */}
      <div
        className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-200 p-1 md:hidden sticky top-14 z-20"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobilePeriod === 'adult'}
          onClick={() => setMobilePeriod('adult')}
          className={`min-h-[44px] rounded-lg px-2 py-1.5 text-xs font-semibold ${
            mobilePeriod === 'adult'
              ? 'bg-[#1e3a8a] text-white'
              : 'bg-white text-slate-700'
          }`}
        >
          <div>Зрелость</div>
          <div className="font-mono text-[11px]">
            Затронуто: {summary.impairmentDomainsAdultCount}/5
          </div>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobilePeriod === 'childhood'}
          onClick={() => setMobilePeriod('childhood')}
          className={`min-h-[44px] rounded-lg px-2 py-1.5 text-xs font-semibold ${
            mobilePeriod === 'childhood'
              ? 'bg-[#1e3a8a] text-white'
              : 'bg-white text-slate-700'
          }`}
        >
          <div>Детство (5–12 лет)</div>
          <div className="font-mono text-[11px]">
            Затронуто: {summary.impairmentDomainsChildhoodCount}/5
          </div>
        </button>
      </div>

      {/* 5 Paired Domains */}
      <div className="space-y-6">
        {DIVA5_IMPAIRMENT_DOMAINS.map((dom: ImpairmentDomainData, index: number) => {
          const domState = impairmentDomains[dom.id];
          return (
            <section
              key={dom.id}
              className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3.5 sm:p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {index + 1}. {dom.adultTitle} / {dom.childhoodTitle}
                </h2>
                <span className="font-mono text-xs text-slate-500">
                  Стр. {dom.page} PDF
                </span>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3 flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                <HelpCircle className="h-4 w-4 text-[#1e3a8a] shrink-0 mt-0.5" />
                <span>{dom.helperTip}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div
                  className={`${
                    mobilePeriod === 'adult' ? 'block' : 'hidden'
                  } md:block h-full`}
                >
                  <DomainPeriodColumn
                    domainId={dom.id}
                    periodKey="adult"
                    title={`Зрелость: ${dom.adultTitle}`}
                    subtitle={`Примеров в бланке: ${dom.adultExamples.length}`}
                    examples={dom.adultExamples}
                    periodState={domState.adult}
                    autoVerdictEnabled={autoVerdictEnabled}
                    flushRegistry={flushRegistry}
                    onToggleExample={onToggleDomainExample}
                    onToggleOther={onToggleDomainOther}
                    onChangeOtherText={onChangeDomainOtherText}
                    onSetManualAffected={onSetDomainManualAffected}
                    onResetAutoAffected={onResetDomainAutoAffected}
                  />
                </div>

                <div
                  className={`${
                    mobilePeriod === 'childhood' ? 'block' : 'hidden'
                  } md:block h-full`}
                >
                  <DomainPeriodColumn
                    domainId={dom.id}
                    periodKey="childhood"
                    title={`Детство: ${dom.childhoodTitle}`}
                    subtitle={`Примеров в бланке: ${dom.childhoodExamples.length}`}
                    examples={dom.childhoodExamples}
                    periodState={domState.childhood}
                    autoVerdictEnabled={autoVerdictEnabled}
                    flushRegistry={flushRegistry}
                    onToggleExample={onToggleDomainExample}
                    onToggleOther={onToggleDomainOther}
                    onChangeOtherText={onChangeDomainOtherText}
                    onSetManualAffected={onSetDomainManualAffected}
                    onResetAutoAffected={onResetDomainAutoAffected}
                  />
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Page 17 Summary Switches & Special Notes */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-base sm:text-lg font-bold text-[#1e3a8a]">
            Итог Критерия C и Особые примечания (Стр. 17 PDF)
          </h2>
          <span className="font-mono text-xs text-slate-500">Стр. 17 PDF</span>
        </div>

        <div className="space-y-4">
          {/* Adult >= 2 domains */}
          <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900">
                {CRITERION_CD_SUMMARY_LABELS.adultQuestion}
              </div>
              <div className="font-mono text-xs text-[#1e3a8a]">
                Автоподсчет затронутых сфер в Зрелости: {summary.impairmentDomainsAdultCount} из 5 (порог ≥ 2)
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  onUpdateCriterionCD({
                    adultImpairmentMet: true,
                    adultIsManualOverride: true
                  })
                }
                className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold ${
                  summary.criterionCDAdultMet
                    ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                Да
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateCriterionCD({
                    adultImpairmentMet: false,
                    adultIsManualOverride: true
                  })
                }
                className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold ${
                  !summary.criterionCDAdultMet &&
                  criterionCD.adultImpairmentMet === false
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                Нет
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateCriterionCD({
                    adultImpairmentMet: null,
                    adultIsManualOverride: false
                  })
                }
                className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Авто
              </button>
            </div>
          </div>

          {/* Childhood >= 2 domains */}
          <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900">
                {CRITERION_CD_SUMMARY_LABELS.childhoodQuestion}
              </div>
              <div className="font-mono text-xs text-[#1e3a8a]">
                Автоподсчет затронутых сфер в Детстве: {summary.impairmentDomainsChildhoodCount} из 5 (порог ≥ 2)
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  onUpdateCriterionCD({
                    childhoodImpairmentMet: true,
                    childhoodIsManualOverride: true
                  })
                }
                className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold ${
                  summary.criterionCDChildhoodMet
                    ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                Да
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateCriterionCD({
                    childhoodImpairmentMet: false,
                    childhoodIsManualOverride: true
                  })
                }
                className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold ${
                  !summary.criterionCDChildhoodMet &&
                  criterionCD.childhoodImpairmentMet === false
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                Нет
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateCriterionCD({
                    childhoodImpairmentMet: null,
                    childhoodIsManualOverride: false
                  })
                }
                className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Авто
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <div className="text-sm font-bold text-slate-900">
            {CRITERION_CD_SUMMARY_LABELS.endOfQuestionnaireNotice}
          </div>
          <DebouncedTextarea
            id="criterion_cd_special_notes_page17"
            label={CRITERION_CD_SUMMARY_LABELS.specialNotesLabel}
            value={criterionCD.specialNotes}
            onCommit={(val) => onUpdateCriterionCD({ specialNotes: val })}
            flushRegistry={flushRegistry}
            placeholder="Запишите клинические наблюдения, контекст компенсации, особенности течения симптомов..."
            rows={5}
          />
        </div>
      </section>
    </div>
  );
};
