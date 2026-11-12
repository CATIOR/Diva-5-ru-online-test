import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import {
  CriterionBState,
  Diva5CalculatedSummary,
  TriState
} from '../types/diva5';
import { CRITERION_B_TEXT } from '../data/diva5-impairment';

interface CriterionBStepProps {
  criterionB: CriterionBState;
  summary: Diva5CalculatedSummary;
  onUpdateCriterionB: (patch: Partial<CriterionBState>) => void;
}

export const CriterionBStep: React.FC<CriterionBStepProps> = ({
  criterionB,
  summary,
  onUpdateCriterionB
}) => {
  const setStatus = (val: TriState) => {
    onUpdateCriterionB({ alwaysPresentBefore12: val });
  };

  return (
    <div className="space-y-6">
      {/* Red Part 3 Banner */}
      <div className="rounded-xl bg-[#be123c] px-4 py-3 text-white flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm sm:text-base font-bold">
          {CRITERION_B_TEXT.subtitle}
        </span>
        <span className="font-mono text-xs text-white/90">Стр. 14 PDF</span>
      </div>

      {/* Main Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5">
        <div className="inline-block rounded-lg bg-[#1e3a8a] px-4 py-2 text-base font-bold text-white">
          {CRITERION_B_TEXT.title}
        </div>

        <h1 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
          {CRITERION_B_TEXT.question}
        </h1>

        <div className="rounded-lg border border-slate-200 bg-[#f8fafc] p-3.5 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-[#1e3a8a] shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <p>{CRITERION_B_TEXT.helperTip}</p>
            <p className="font-mono text-xs text-[#1e3a8a] font-semibold">
              Текущий подсчет по разделу Детства (5–12 лет): Дефицит внимания ={' '}
              {summary.inattentionChildhoodCount}/9 · Гиперактивность/Импульсивность ={' '}
              {summary.hyperactivityChildhoodCount}/9
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setStatus(true)}
            className={`flex w-full min-h-[52px] items-center justify-between rounded-xl border px-4 py-3 text-left text-sm sm:text-base font-medium transition-colors ${
              criterionB.alwaysPresentBefore12 === true
                ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>{CRITERION_B_TEXT.yesLabel}</span>
            <span className="font-mono text-xs shrink-0 ml-2">
              {criterionB.alwaysPresentBefore12 === true ? 'ВЫБРАНО' : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatus(false)}
            className={`flex w-full min-h-[52px] items-center justify-between rounded-xl border px-4 py-3 text-left text-sm sm:text-base font-medium transition-colors ${
              criterionB.alwaysPresentBefore12 === false
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>{CRITERION_B_TEXT.noLabel}</span>
            <span className="font-mono text-xs shrink-0 ml-2">
              {criterionB.alwaysPresentBefore12 === false ? 'ВЫБРАНО' : ''}
            </span>
          </button>
        </div>

        {criterionB.alwaysPresentBefore12 === false && (
          <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 space-y-2">
            <label
              htmlFor="criterion-b-onset-age"
              className="block text-sm font-medium text-slate-800"
            >
              Уточнение {CRITERION_B_TEXT.agePrompt}:
            </label>
            <input
              id="criterion-b-onset-age"
              type="text"
              value={criterionB.onsetAgeIfLater}
              onChange={(e) =>
                onUpdateCriterionB({ onsetAgeIfLater: e.target.value })
              }
              placeholder="Например: в 14 лет / в студенческом возрасте"
              className="w-full max-w-sm min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1e3a8a] focus:outline-none"
            />
          </div>
        )}

        {/* Consistency Alert if any */}
        {summary.consistencyWarnings.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <div className="font-semibold">
                Клиническая проверка непротиворечивости:
              </div>
              {summary.consistencyWarnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
