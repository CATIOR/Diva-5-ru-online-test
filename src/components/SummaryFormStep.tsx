import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ExternalLink,
  HelpCircle,
  Stethoscope
} from 'lucide-react';
import {
  CollateralScore,
  CriterionBState,
  CriterionCDManualState,
  DSM5FormState,
  Diva5CalculatedSummary,
  Diva5ClinicalState,
  SeverityLevel
} from '../types/diva5';
import { DIVA5_SYMPTOMS } from '../data/diva5-symptoms';
import { SUBTYPE_PRESENTATION_OPTIONS } from '../data/diva5-impairment';
import {
  computeEffectiveSymptomPresence,
  formatVerdictLabel
} from '../utils/scoring';
import { DebouncedTextarea, FlushRegistry } from './DebouncedTextarea';

interface SummaryFormStepProps {
  state: Diva5ClinicalState;
  summary: Diva5CalculatedSummary;
  flushRegistry: FlushRegistry;
  onJumpToStep: (stepIndex: number) => void;
  onUpdateCriterionB: (patch: Partial<CriterionBState>) => void;
  onUpdateCriterionCD: (patch: Partial<CriterionCDManualState>) => void;
  onUpdateDsm5Form: (patch: Partial<DSM5FormState>) => void;
}

const COLLATERAL_SCORES: CollateralScore[] = ['н.и.р.', '0', '1', '2'];
const SEVERITY_OPTIONS: SeverityLevel[] = ['легкая', 'умеренная', 'тяжелая'];

export const SummaryFormStep: React.FC<SummaryFormStepProps> = ({
  state,
  summary,
  flushRegistry,
  onJumpToStep,
  onUpdateCriterionB,
  onUpdateCriterionCD,
  onUpdateDsm5Form
}) => {
  const autoVerdict = state.settings.autoVerdictOnExampleSelect;
  const { dsm5Form } = state;

  const renderSymptomSummaryTable = (part: 1 | 2) => {
    const items = DIVA5_SYMPTOMS.filter((s) => s.part === part);
    const adultTotal =
      part === 1 ? summary.inattentionAdultCount : summary.hyperactivityAdultCount;
    const childTotal =
      part === 1
        ? summary.inattentionChildhoodCount
        : summary.hyperactivityChildhoodCount;

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-[#1e3a8a] text-white">
              <th className="py-2.5 px-3 font-semibold w-24">Критерий DSM-5</th>
              <th className="py-2.5 px-3 font-semibold">Симптом</th>
              <th className="py-2.5 px-3 font-semibold text-center w-36">
                Присутствует в зрелости
              </th>
              <th className="py-2.5 px-3 font-semibold text-center w-36">
                Присутствует в детстве
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((sym) => {
              const stepIdx = DIVA5_SYMPTOMS.findIndex((x) => x.id === sym.id) + 1;
              const ans = state.symptoms[sym.id];
              const adultPresent = computeEffectiveSymptomPresence(
                ans.adult,
                autoVerdict
              );
              const childPresent = computeEffectiveSymptomPresence(
                ans.childhood,
                autoVerdict
              );
              const adultLabel = formatVerdictLabel(ans.adult, autoVerdict);
              const childLabel = formatVerdictLabel(ans.childhood, autoVerdict);

              return (
                <tr key={sym.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-semibold text-[#1e3a8a]">
                    <button
                      type="button"
                      onClick={() => onJumpToStep(stepIdx)}
                      className="inline-flex items-center gap-1 hover:underline"
                      title={`Перейти к вопросу ${sym.codeLabel}`}
                    >
                      <span>{sym.dsmCode}</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-slate-800">{sym.summaryText}</td>
                  <td
                    className={`py-2.5 px-3 text-center font-mono text-xs font-semibold ${
                      adultPresent === true
                        ? 'bg-[#e0f2fe]/60 text-[#1e3a8a]'
                        : adultPresent === false
                          ? 'text-emerald-700'
                          : 'text-amber-600'
                    }`}
                  >
                    {adultLabel}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-center font-mono text-xs font-semibold ${
                      childPresent === true
                        ? 'bg-[#e0f2fe]/60 text-[#1e3a8a]'
                        : childPresent === false
                          ? 'text-emerald-700'
                          : 'text-amber-600'
                    }`}
                  >
                    {childLabel}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-[#e0f2fe] font-bold text-[#1e3a8a]">
              <td colSpan={2} className="py-3 px-3">
                {part === 1
                  ? 'Общее число критериев Дефицита внимания'
                  : 'Общее число критериев Гиперактивности/Импульсивности'}
              </td>
              <td className="py-3 px-3 text-center font-mono text-base">
                {adultTotal} / 9
              </td>
              <td className="py-3 px-3 text-center font-mono text-base">
                {childTotal} / 9
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page 18 Banner */}
      <div className="rounded-xl bg-[#be123c] px-4 py-3 text-white flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-sm sm:text-base font-bold">
          Обобщение симптомов Дефицита внимания (A) и Гиперактивности/импульсивности (HI)
        </h1>
        <span className="font-mono text-xs text-white/90">Стр. 18–19 PDF</span>
      </div>

      {/* Unanswered Blocks Warning */}
      {summary.unansweredSymptomBlocks > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="font-semibold">
              Внимание: не оценено {summary.unansweredSymptomBlocks} из 36 симптомных блоков
            </div>
            <p className="text-amber-800">
              Блоки со статусом «НЕ ОЦЕНЕНО» не прибавляют балл к сумме. Нажмите на код вопроса в таблице ниже, чтобы вернуться и завершить оценку.
            </p>
          </div>
        </div>
      )}

      {/* Page 18 Tables */}
      <section className="space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[#1e3a8a]">
          1. Таблица обобщения симптомов (Стр. 18 PDF)
        </h2>
        {renderSymptomSummaryTable(1)}
        {renderSymptomSummaryTable(2)}
      </section>

      {/* Page 19 DSM-5 Scoring Form */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="bg-[#be123c] px-4 py-3 text-white flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold">
            2. Формуляр подсчета DSM-5 (Стр. 19 PDF)
          </h2>
          <span className="font-mono text-xs text-white/90">Стр. 19</span>
        </div>

        <div className="divide-y divide-slate-200">
          {/* Criterion A */}
          <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 font-bold text-[#1e3a8a] text-sm">
              DSM-5 критерий A
            </div>
            <div className="lg:col-span-9 space-y-4">
              {/* Childhood >= 3 */}
              <div className="rounded-lg border border-slate-200 bg-[#f8fafc] p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-500">
                      Детство (5–12 лет)
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      Присутствуют ли различные (3 или более) симптомы Д или ГИ?
                    </div>
                    <div className="font-mono text-xs text-[#1e3a8a] mt-0.5">
                      Подсчет: Д_дет = {summary.inattentionChildhoodCount}/9 · ГИ_дет ={' '}
                      {summary.hyperactivityChildhoodCount}/9
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateDsm5Form({ criterionAChildhoodOverride: true })
                      }
                      className={`min-h-[40px] rounded-lg border px-3.5 py-1.5 text-xs sm:text-sm font-semibold ${
                        summary.criterionAChildhoodMet
                          ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      Да
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateDsm5Form({ criterionAChildhoodOverride: false })
                      }
                      className={`min-h-[40px] rounded-lg border px-3.5 py-1.5 text-xs sm:text-sm font-semibold ${
                        !summary.criterionAChildhoodMet
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      Нет
                    </button>
                    {dsm5Form.criterionAChildhoodOverride !== null && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateDsm5Form({ criterionAChildhoodOverride: null })
                        }
                        className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-600"
                      >
                        Авто
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-600 flex items-start gap-1.5 pt-1">
                  <HelpCircle className="h-3.5 w-3.5 text-[#1e3a8a] shrink-0 mt-0.5" />
                  <span>
                    Справка (стр. 4 и 19 PDF): в методике DIVA-5 для ретроспективной оценки детства у взрослых пациентов операционально используется порог <strong>≥ 3 симптомов</strong> в одной или обеих шкалах до 12 лет.
                  </span>
                </p>
              </div>

              {/* Adulthood >= 5 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 bg-[#f8fafc] p-3.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-500">
                      Зрелость
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      Число признаков Д ≥ 5?
                    </div>
                    <div className="font-mono text-xs text-[#1e3a8a]">
                      Д_взр = {summary.inattentionAdultCount} / 9
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateDsm5Form({
                          criterionAAdultInattentionOverride: true
                        })
                      }
                      className={`min-h-[40px] rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-semibold ${
                        summary.criterionAAdultInattentionMet
                          ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      Да
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateDsm5Form({
                          criterionAAdultInattentionOverride: false
                        })
                      }
                      className={`min-h-[40px] rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-semibold ${
                        !summary.criterionAAdultInattentionMet
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      Нет
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-[#f8fafc] p-3.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-500">
                      Зрелость
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      Число признаков ГИ ≥ 5?
                    </div>
                    <div className="font-mono text-xs text-[#1e3a8a]">
                      ГИ_взр = {summary.hyperactivityAdultCount} / 9
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateDsm5Form({
                          criterionAAdultHyperactivityOverride: true
                        })
                      }
                      className={`min-h-[40px] rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-semibold ${
                        summary.criterionAAdultHyperactivityMet
                          ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      Да
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateDsm5Form({
                          criterionAAdultHyperactivityOverride: false
                        })
                      }
                      className={`min-h-[40px] rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-semibold ${
                        !summary.criterionAAdultHyperactivityMet
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      Нет
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Criterion B */}
          <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 font-bold text-[#1e3a8a] text-sm">
              DSM-5 критерий B
            </div>
            <div className="lg:col-span-9 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">
                  Есть указания на пожизненное присутствие симптомов, возникших до 12-летнего возраста?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateCriterionB({ alwaysPresentBefore12: true })
                    }
                    className={`min-h-[40px] rounded-lg border px-3.5 py-1.5 text-xs sm:text-sm font-semibold ${
                      state.criterionB.alwaysPresentBefore12 === true
                        ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    Да
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateCriterionB({ alwaysPresentBefore12: false })
                    }
                    className={`min-h-[40px] rounded-lg border px-3.5 py-1.5 text-xs sm:text-sm font-semibold ${
                      state.criterionB.alwaysPresentBefore12 === false
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    Нет
                  </button>
                </div>
              </div>

              {summary.consistencyWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                  {summary.consistencyWarnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Criteria C and D */}
          <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 font-bold text-[#1e3a8a] text-sm">
              DSM-5 критерии C и D
            </div>
            <div className="lg:col-span-9 space-y-3">
              <div className="text-sm font-semibold text-slate-900">
                Симптомы и ограничения проявляются по меньшей мере в 2 жизненных сферах?
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 bg-[#f8fafc] p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Зрелость
                    </div>
                    <div className="font-mono text-xs text-[#1e3a8a]">
                      Затронуто сфер: {summary.impairmentDomainsAdultCount} из 5
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateCriterionCD({
                          adultImpairmentMet: true,
                          adultIsManualOverride: true
                        })
                      }
                      className={`min-h-[38px] rounded-lg border px-3 py-1 text-xs font-semibold ${
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
                      className={`min-h-[38px] rounded-lg border px-3 py-1 text-xs font-semibold ${
                        !summary.criterionCDAdultMet
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      Нет
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-[#f8fafc] p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Детство
                    </div>
                    <div className="font-mono text-xs text-[#1e3a8a]">
                      Затронуто сфер: {summary.impairmentDomainsChildhoodCount} из 5
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateCriterionCD({
                          childhoodImpairmentMet: true,
                          childhoodIsManualOverride: true
                        })
                      }
                      className={`min-h-[38px] rounded-lg border px-3 py-1 text-xs font-semibold ${
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
                      className={`min-h-[38px] rounded-lg border px-3 py-1 text-xs font-semibold ${
                        !summary.criterionCDChildhoodMet
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      Нет
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Criterion E */}
          <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 font-bold text-[#1e3a8a] text-sm">
              DSM-5 критерий E
            </div>
            <div className="lg:col-span-9 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">
                  Можно ли приписать симптомы другому психическому расстройству?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateDsm5Form({ criterionEBetterExplainedByOther: false })
                    }
                    className={`min-h-[40px] rounded-lg border px-4 py-1.5 text-xs sm:text-sm font-semibold ${
                      dsm5Form.criterionEBetterExplainedByOther === false
                        ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    Нет
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateDsm5Form({ criterionEBetterExplainedByOther: true })
                    }
                    className={`min-h-[40px] rounded-lg border px-4 py-1.5 text-xs sm:text-sm font-semibold ${
                      dsm5Form.criterionEBetterExplainedByOther === true
                        ? 'border-red-700 bg-red-700 text-white'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    Да, а именно:
                  </button>
                </div>
              </div>

              {dsm5Form.criterionEBetterExplainedByOther === true && (
                <DebouncedTextarea
                  id="criterion_e_explanation_input"
                  value={dsm5Form.criterionEExplanation}
                  onCommit={(val) =>
                    onUpdateDsm5Form({ criterionEExplanation: val })
                  }
                  flushRegistry={flushRegistry}
                  placeholder="Укажите психическое расстройство, которым лучше объясняются симптомы (дифференциальный диагноз)..."
                  rows={3}
                />
              )}
            </div>
          </div>

          {/* Collateral History (Гетероанамнез) */}
          <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 font-bold text-[#1e3a8a] text-sm">
              Гетероанамнез*
            </div>
            <div className="lg:col-span-9 space-y-4">
              <div className="text-sm font-semibold text-slate-900">
                Подтверждается ли диагноз гетероанамнезом?
              </div>

              <div className="rounded-lg bg-[#f8fafc] border border-slate-200 p-3 text-xs text-slate-600 font-mono">
                Шкала оценки: <strong>0</strong> = нет / незначительно ·{' '}
                <strong>1</strong> = в какой-то мере · <strong>2</strong> = явно подтверждается ·{' '}
                <strong>н.и.р.</strong> = неприменимо / нет данных
              </div>

              <div className="space-y-3">
                {/* Family */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-7 flex flex-col sm:flex-row sm:items-center gap-2">
                    <label
                      htmlFor="collateral-family-role"
                      className="text-xs sm:text-sm text-slate-800 shrink-0"
                    >
                      Родители/брат/сестра/пр., а именно*:
                    </label>
                    <input
                      id="collateral-family-role"
                      type="text"
                      value={dsm5Form.collateralFamilyRole}
                      onChange={(e) =>
                        onUpdateDsm5Form({ collateralFamilyRole: e.target.value })
                      }
                      placeholder="Мать / Отец / Сестра"
                      className="flex-1 min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="sm:col-span-5 grid grid-cols-4 gap-1.5">
                    {COLLATERAL_SCORES.map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() =>
                          onUpdateDsm5Form({ collateralFamilyScore: sc })
                        }
                        className={`min-h-[38px] rounded-lg border font-mono text-xs font-semibold ${
                          dsm5Form.collateralFamilyScore === sc
                            ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {sc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Partner / Friends */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-7 flex flex-col sm:flex-row sm:items-center gap-2">
                    <label
                      htmlFor="collateral-partner-role"
                      className="text-xs sm:text-sm text-slate-800 shrink-0"
                    >
                      Партнер/друзья/пр., а именно*:
                    </label>
                    <input
                      id="collateral-partner-role"
                      type="text"
                      value={dsm5Form.collateralPartnerRole}
                      onChange={(e) =>
                        onUpdateDsm5Form({ collateralPartnerRole: e.target.value })
                      }
                      placeholder="Супруг(а) / Партнер / Друг"
                      className="flex-1 min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="sm:col-span-5 grid grid-cols-4 gap-1.5">
                    {COLLATERAL_SCORES.map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() =>
                          onUpdateDsm5Form({ collateralPartnerScore: sc })
                        }
                        className={`min-h-[38px] rounded-lg border font-mono text-xs font-semibold ${
                          dsm5Form.collateralPartnerScore === sc
                            ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {sc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* School reports */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-7 text-xs sm:text-sm text-slate-800">
                    Школьные дневники / табели успеваемости:
                  </div>
                  <div className="sm:col-span-5 grid grid-cols-4 gap-1.5">
                    {COLLATERAL_SCORES.map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() =>
                          onUpdateDsm5Form({ collateralSchoolScore: sc })
                        }
                        className={`min-h-[38px] rounded-lg border font-mono text-xs font-semibold ${
                          dsm5Form.collateralSchoolScore === sc
                            ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {sc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <DebouncedTextarea
                id="collateral_notes_page19"
                label="Пояснение (к гетероанамнезу и школьным характеристикам):"
                value={dsm5Form.collateralNotes}
                onCommit={(val) => onUpdateDsm5Form({ collateralNotes: val })}
                flushRegistry={flushRegistry}
                placeholder="Записи в школьных дневниках, комментарии родственников и партнера..."
                rows={3}
              />
            </div>
          </div>

          {/* Algorithmic Pre-Assessment Hint */}
          <div className="p-4 sm:p-5 bg-[#e0f2fe]/50 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-3 flex items-center gap-2 font-bold text-[#1e3a8a] text-sm">
              <Cpu className="h-4 w-4 shrink-0" />
              <span>Алгоритмическая пред-оценка</span>
            </div>
            <div className="lg:col-span-9 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-600">
                  Проверка выполнения математических условий (A + B + C/D + E === Нет):
                </div>
                <div className="text-sm font-bold text-[#1e3a8a]">
                  {summary.algorithmicSuggestionLabel}
                </div>
              </div>
              {summary.algorithmicDiagnosisMet && summary.algorithmicSubtypeCode && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDsm5Form({
                      diagnosisConfirmed: true,
                      subtypeCode: summary.algorithmicSubtypeCode
                    })
                  }
                  className="min-h-[42px] shrink-0 rounded-lg bg-[#1e3a8a] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1e3a8a]/90"
                >
                  Применить в заключение
                </button>
              )}
            </div>
          </div>

          {/* Final Clinician Conclusion */}
          <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 flex items-start gap-2 font-bold text-[#1e3a8a] text-sm">
              <Stethoscope className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Диагноз СДВГ** (Финальное заключение)</span>
            </div>
            <div className="lg:col-span-9 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateDsm5Form({ diagnosisConfirmed: false })}
                  className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold ${
                    dsm5Form.diagnosisConfirmed === false
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Нет (Диагноз исключен)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDsm5Form({
                      diagnosisConfirmed: true,
                      subtypeCode:
                        dsm5Form.subtypeCode ||
                        summary.algorithmicSubtypeCode ||
                        '314.01_combined'
                    })
                  }
                  className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold ${
                    dsm5Form.diagnosisConfirmed === true
                      ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Да (Диагноз СДВГ подтвержден)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateDsm5Form({ diagnosisConfirmed: null })}
                  className={`min-h-[44px] rounded-lg border px-3.5 py-2 text-xs sm:text-sm font-medium ${
                    dsm5Form.diagnosisConfirmed === null
                      ? 'border-slate-600 bg-slate-700 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Не вынесено
                </button>
              </div>

              {/* Subtype / Presentation Selector */}
              <div className="space-y-2">
                <div className="text-xs sm:text-sm font-semibold text-slate-800">
                  Код и форма проявления (с разграничением DSM-5, МКБ-11 и официальных кодов МКБ-10 Минздрава РФ):
                </div>
                <div className="space-y-2">
                  {SUBTYPE_PRESENTATION_OPTIONS.map((opt) => {
                    const selected = dsm5Form.subtypeCode === opt.code;
                    return (
                      <label
                        key={opt.code}
                        className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-xs sm:text-sm transition-colors ${
                          selected
                            ? 'border-[#1e3a8a] bg-[#e0f2fe]/70 text-slate-900 font-semibold'
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="dsm5_subtype_code"
                          checked={selected}
                          onChange={() =>
                            onUpdateDsm5Form({
                              diagnosisConfirmed: true,
                              subtypeCode: opt.code
                            })
                          }
                          className="h-4 w-4 shrink-0 accent-[#1e3a8a]"
                        />
                        <span>{opt.fullLabel}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Partial Remission & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-sm font-medium text-slate-900">
                    <input
                      type="checkbox"
                      checked={dsm5Form.inPartialRemission}
                      onChange={(e) =>
                        onUpdateDsm5Form({ inPartialRemission: e.target.checked })
                      }
                      className="h-5 w-5 rounded accent-[#1e3a8a]"
                    />
                    <span>Частично в ремиссии</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">
                    Форма (степень тяжести):
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {SEVERITY_OPTIONS.map((sev) => {
                      const active = dsm5Form.severity === sev;
                      return (
                        <button
                          key={sev}
                          type="button"
                          onClick={() =>
                            onUpdateDsm5Form({
                              severity: active ? null : sev
                            })
                          }
                          className={`min-h-[40px] rounded-lg border px-2.5 py-1.5 text-xs sm:text-sm font-medium capitalize ${
                            active
                              ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {sev}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                <p>* Укажите, с кем был проведен гетероанамнез.</p>
                <p>
                  ** Если формы проявления в детстве и зрелости различны, при диагнозе превалируют нынешние, взрослые формы проявления.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
