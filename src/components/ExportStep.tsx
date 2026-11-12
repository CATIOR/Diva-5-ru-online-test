import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileCode2,
  FileText,
  Lock,
  Printer
} from 'lucide-react';
import { Diva5CalculatedSummary, Diva5ClinicalState } from '../types/diva5';
import {
  ExportReportMode,
  generateDiva5Markdown
} from '../utils/markdownExport';
import { DIVA5_SYMPTOMS } from '../data/diva5-symptoms';
import {
  DIVA5_IMPAIRMENT_DOMAINS,
  SUBTYPE_PRESENTATION_OPTIONS
} from '../data/diva5-impairment';
import {
  computeEffectiveDomainAffected,
  formatVerdictLabel
} from '../utils/scoring';

interface ExportStepProps {
  state: Diva5ClinicalState;
  summary: Diva5CalculatedSummary;
  onToggleAnonymize: (anonymize: boolean) => void;
  onDownloadJsonDraft: (anonymize: boolean) => void;
}

export const ExportStep: React.FC<ExportStepProps> = ({
  state,
  summary,
  onToggleAnonymize,
  onDownloadJsonDraft
}) => {
  const [reportMode, setReportMode] = useState<ExportReportMode>('compact_ai');
  const [copied, setCopied] = useState(false);

  const markdownText = useMemo(
    () => generateDiva5Markdown(state, reportMode),
    [state, reportMode]
  );

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy via temporary textarea
      const el = document.createElement('textarea');
      el.value = markdownText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownText], {
      type: 'text/markdown;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const suffix = reportMode === 'compact_ai' ? 'llm' : 'full';
    a.href = url;
    a.download = `${state.patient.id || 'DIVA5'}_${suffix}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const autoVerdict = state.settings.autoVerdictOnExampleSelect;
  const anonymized = state.settings.anonymizeExport;
  const selectedSubtype = SUBTYPE_PRESENTATION_OPTIONS.find(
    (o) => o.code === state.dsm5Form.subtypeCode
  );

  return (
    <div className="space-y-6">
      {/* Interactive Controls (Hidden during @media print) */}
      <div className="space-y-4 print:hidden">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-[#1e3a8a]">
                Экспорт в Markdown и Печать клинического заключения
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Выберите формат отчета (компактный для ИИ/врача или полный бланк) и проверьте настройки приватности.
              </p>
            </div>
            <label className="flex min-h-[42px] cursor-pointer items-center gap-2.5 rounded-lg border border-slate-300 bg-[#f8fafc] px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800">
              <Lock className="h-4 w-4 text-[#1e3a8a]" />
              <span>🔒 Анонимизировать ПДн</span>
              <input
                type="checkbox"
                checked={anonymized}
                onChange={(e) => onToggleAnonymize(e.target.checked)}
                className="h-4 w-4 accent-[#1e3a8a] rounded"
              />
            </label>
          </div>

          {/* Mode Selector */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            role="radiogroup"
            aria-label="Режим экспорта отчета"
          >
            <button
              type="button"
              onClick={() => setReportMode('compact_ai')}
              className={`flex min-h-[54px] items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                reportMode === 'compact_ai'
                  ? 'border-[#1e3a8a] bg-[#e0f2fe]/60 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileCode2 className="h-5 w-5 text-[#1e3a8a] shrink-0" />
              <div>
                <div className="text-sm font-bold">
                  🤖 Компактный для ИИ (LLM-Optimized)
                </div>
                <div className="text-xs text-slate-600">
                  YAML Frontmatter + сводные таблицы + только выбранные [x] примеры и комментарии
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setReportMode('full_form')}
              className={`flex min-h-[54px] items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                reportMode === 'full_form'
                  ? 'border-[#1e3a8a] bg-[#e0f2fe]/60 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileText className="h-5 w-5 text-[#1e3a8a] shrink-0" />
              <div>
                <div className="text-sm font-bold">
                  📋 Полный клинический бланк (Full Form)
                </div>
                <div className="text-xs text-slate-600">
                  Все 293 примера опросника ([x] и [ ]), полное воспроизведение бумажного документа
                </div>
              </div>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="flex min-h-[44px] items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Скопировано в буфер!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Скопировать Markdown</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-[#1e3a8a] bg-white px-4 py-2 text-sm font-semibold text-[#1e3a8a] hover:bg-[#e0f2fe]/40"
            >
              <Download className="h-4 w-4" />
              <span>Скачать .md</span>
            </button>

            <button
              type="button"
              onClick={() => onDownloadJsonDraft(anonymized)}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              <Download className="h-4 w-4 text-slate-600" />
              <span>Скачать .json</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-[#f8fafc] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 ml-auto"
            >
              <Printer className="h-4 w-4 text-[#1e3a8a]" />
              <span>🖨️ Печать / PDF</span>
            </button>
          </div>
        </div>

        {/* Live Markdown Preview on Screen */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-[#f8fafc] px-4 py-2.5">
            <span className="text-xs font-semibold text-slate-700">
              Живой предпросмотр Markdown ({markdownText.length} симв.)
            </span>
            <span className="font-mono text-xs text-slate-500">
              UTF-8 · YAML Frontmatter + 6 разделов
            </span>
          </div>
          <pre className="max-h-[540px] overflow-y-auto p-4 font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap break-words bg-slate-50">
            {markdownText}
          </pre>
        </div>
      </div>

      {/* Dedicated Multi-Page Print Layout (Visible on @media print, height: auto, overflow: visible) */}
      <div className="hidden print:block print:w-full print:h-auto print:overflow-visible print:text-black print:bg-white space-y-6 text-sm">
        <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">
              DIVA-5 — Результаты диагностического интервью СДВГ у взрослых
            </h1>
            <p className="text-xs text-slate-600">
              Редакция DSM-5 (Русское издание) · Дата отчета: {state.patient.assessmentDate}
            </p>
          </div>
          <div className="text-right font-mono text-xs">
            <div>ID: {state.patient.id}</div>
            <div>
              Возраст: {state.patient.age ?? '—'} · Пол: {state.patient.sex}
            </div>
          </div>
        </div>

        {!anonymized && (
          <div className="grid grid-cols-2 gap-2 border border-slate-300 rounded p-3 text-xs">
            <div>
              <strong>ФИО пациента:</strong> {state.patient.fullName || '—'}
            </div>
            <div>
              <strong>Дата рождения:</strong> {state.patient.birthDate || '—'}
            </div>
            <div>
              <strong>Рег. номер:</strong> {state.patient.regNumber || '—'}
            </div>
            <div>
              <strong>Обследование проводил(а):</strong>{' '}
              {state.patient.clinicianName || '—'}
            </div>
          </div>
        )}

        {/* Print Summary Table */}
        <div className="space-y-2">
          <h2 className="text-base font-bold">
            1. Сводная таблица симптомов и критериев DSM-5 (Стр. 18–19)
          </h2>
          <table className="w-full border-collapse border border-slate-400 text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 p-1.5 text-left">Код</th>
                <th className="border border-slate-400 p-1.5 text-left">Симптом</th>
                <th className="border border-slate-400 p-1.5 text-center">Зрелость</th>
                <th className="border border-slate-400 p-1.5 text-center">Детство</th>
              </tr>
            </thead>
            <tbody>
              {DIVA5_SYMPTOMS.map((sym) => {
                const ans = state.symptoms[sym.id];
                return (
                  <tr key={sym.id}>
                    <td className="border border-slate-400 p-1.5 font-mono font-semibold">
                      {sym.codeLabel} ({sym.dsmCode})
                    </td>
                    <td className="border border-slate-400 p-1.5">{sym.summaryText}</td>
                    <td className="border border-slate-400 p-1.5 text-center font-mono">
                      {formatVerdictLabel(ans.adult, autoVerdict)}
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center font-mono">
                      {formatVerdictLabel(ans.childhood, autoVerdict)}
                    </td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-slate-100">
                <td colSpan={2} className="border border-slate-400 p-1.5">
                  ИТОГО A1 (Дефицит внимания)
                </td>
                <td className="border border-slate-400 p-1.5 text-center font-mono">
                  {summary.inattentionAdultCount} / 9
                </td>
                <td className="border border-slate-400 p-1.5 text-center font-mono">
                  {summary.inattentionChildhoodCount} / 9
                </td>
              </tr>
              <tr className="font-bold bg-slate-100">
                <td colSpan={2} className="border border-slate-400 p-1.5">
                  ИТОГО A2 (Гиперактивность / Импульсивность)
                </td>
                <td className="border border-slate-400 p-1.5 text-center font-mono">
                  {summary.hyperactivityAdultCount} / 9
                </td>
                <td className="border border-slate-400 p-1.5 text-center font-mono">
                  {summary.hyperactivityChildhoodCount} / 9
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Print DSM-5 Form Conclusion */}
        <div className="border border-slate-400 rounded p-3 space-y-1.5 text-xs">
          <div>
            <strong>Критерий A (Детство ≥ 3):</strong>{' '}
            {summary.criterionAChildhoodMet ? 'Да' : 'Нет'} ·{' '}
            <strong>Критерий A (Зрелость Д ≥ 5):</strong>{' '}
            {summary.criterionAAdultInattentionMet ? 'Да' : 'Нет'} ·{' '}
            <strong>Критерий A (Зрелость ГИ ≥ 5):</strong>{' '}
            {summary.criterionAAdultHyperactivityMet ? 'Да' : 'Нет'}
          </div>
          <div>
            <strong>Критерий B (Дебют до 12 лет):</strong>{' '}
            {state.criterionB.alwaysPresentBefore12 === true
              ? 'Да'
              : state.criterionB.alwaysPresentBefore12 === false
                ? `Нет (${state.criterionB.onsetAgeIfLater || 'возраст не указан'})`
                : 'Не оценено'}
          </div>
          <div>
            <strong>Критерии C и D (Нарушения ≥ 2 сфер):</strong> Зрелость:{' '}
            {summary.criterionCDAdultMet ? 'Да' : 'Нет'} (
            {summary.impairmentDomainsAdultCount}/5) · Детство:{' '}
            {summary.criterionCDChildhoodMet ? 'Да' : 'Нет'} (
            {summary.impairmentDomainsChildhoodCount}/5)
          </div>
          <div>
            <strong>Критерий E (Объясняется другим расстройством):</strong>{' '}
            {state.dsm5Form.criterionEBetterExplainedByOther
              ? `Да (${state.dsm5Form.criterionEExplanation || '—'})`
              : 'Нет'}
          </div>
          <div>
            <strong>Гетероанамнез:</strong> Родные: {state.dsm5Form.collateralFamilyScore} · Партнер:{' '}
            {state.dsm5Form.collateralPartnerScore} · Школьные дневники:{' '}
            {state.dsm5Form.collateralSchoolScore}
          </div>
          <div>
            <strong>Алгоритмическая пред-оценка:</strong>{' '}
            {summary.algorithmicSuggestionLabel}
          </div>
          <div>
            <strong>Финальное решение специалиста:</strong>{' '}
            {state.dsm5Form.diagnosisConfirmed === true
              ? 'Диагноз СДВГ подтвержден'
              : state.dsm5Form.diagnosisConfirmed === false
                ? 'Диагноз исключен'
                : 'Не вынесено'}{' '}
            {selectedSubtype ? `(${selectedSubtype.fullLabel})` : ''} · Тяжесть:{' '}
            {state.dsm5Form.severity || '—'} · Частично в ремиссии:{' '}
            {state.dsm5Form.inPartialRemission ? 'Да' : 'Нет'}
          </div>
        </div>

        {/* Print Detailed Symptoms & Domains */}
        <div className="space-y-4">
          <h2 className="text-base font-bold">
            2. Детализация отмеченных симптомов и сфер функционирования
          </h2>
          {DIVA5_SYMPTOMS.map((sym) => {
            const ans = state.symptoms[sym.id];
            const adultChecked = sym.adultExamples.filter((ex) =>
              ans.adult.checkedIds.includes(ex.id)
            );
            const childChecked = sym.childhoodExamples.filter((ex) =>
              ans.childhood.checkedIds.includes(ex.id)
            );
            return (
              <div key={sym.id} className="border-b border-slate-300 pb-2 text-xs">
                <div className="font-bold">
                  {sym.codeLabel} ({sym.dsmCode}): {sym.questionText}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <strong>
                      Зрелость ({formatVerdictLabel(ans.adult, autoVerdict)}):
                    </strong>
                    <ul className="list-disc pl-4">
                      {adultChecked.map((ex) => (
                        <li key={ex.id}>{ex.text}</li>
                      ))}
                      {ans.adult.otherText.trim() && (
                        <li>Прочее: {ans.adult.otherText.trim()}</li>
                      )}
                      {adultChecked.length === 0 &&
                        !ans.adult.otherText.trim() && (
                          <li className="text-slate-500">Примеры не отмечены</li>
                        )}
                    </ul>
                  </div>
                  <div>
                    <strong>
                      Детство ({formatVerdictLabel(ans.childhood, autoVerdict)}):
                    </strong>
                    <ul className="list-disc pl-4">
                      {childChecked.map((ex) => (
                        <li key={ex.id}>{ex.text}</li>
                      ))}
                      {ans.childhood.otherText.trim() && (
                        <li>Прочее: {ans.childhood.otherText.trim()}</li>
                      )}
                      {childChecked.length === 0 &&
                        !ans.childhood.otherText.trim() && (
                          <li className="text-slate-500">Примеры не отмечены</li>
                        )}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}

          {DIVA5_IMPAIRMENT_DOMAINS.map((dom) => {
            const domAns = state.impairmentDomains[dom.id];
            const adultAff = computeEffectiveDomainAffected(
              domAns.adult,
              autoVerdict
            );
            const childAff = computeEffectiveDomainAffected(
              domAns.childhood,
              autoVerdict
            );
            const adultChecked = dom.adultExamples.filter((ex) =>
              domAns.adult.checkedIds.includes(ex.id)
            );
            const childChecked = dom.childhoodExamples.filter((ex) =>
              domAns.childhood.checkedIds.includes(ex.id)
            );
            return (
              <div key={dom.id} className="border-b border-slate-300 pb-2 text-xs">
                <div className="font-bold">
                  Критерий C — Сфера: {dom.adultTitle} / {dom.childhoodTitle}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <strong>
                      Зрелость ({adultAff ? 'ДА' : adultAff === false ? 'НЕТ' : 'НЕ ОЦЕНЕНО'}):
                    </strong>
                    <ul className="list-disc pl-4">
                      {adultChecked.map((ex) => (
                        <li key={ex.id}>{ex.text}</li>
                      ))}
                      {domAns.adult.otherText.trim() && (
                        <li>Прочее: {domAns.adult.otherText.trim()}</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <strong>
                      Детство ({childAff ? 'ДА' : childAff === false ? 'НЕТ' : 'НЕ ОЦЕНЕНО'}):
                    </strong>
                    <ul className="list-disc pl-4">
                      {childChecked.map((ex) => (
                        <li key={ex.id}>{ex.text}</li>
                      ))}
                      {domAns.childhood.otherText.trim() && (
                        <li>Прочее: {domAns.childhood.otherText.trim()}</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
