import React from 'react';
import { CheckCircle2, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import { SelfVerificationReport } from '../utils/selfVerification';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: SelfVerificationReport;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  report
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between bg-[#1e3a8a] px-4 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <h2
              id="verification-modal-title"
              className="text-base sm:text-lg font-semibold"
            >
              Отчет встроенной самопроверки (Schema & Runtime TDD)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно самопроверки"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/90 hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div
            className={`rounded-xl border p-4 flex items-center justify-between ${
              report.allPassed
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            <div className="space-y-0.5">
              <div className="text-sm font-semibold">
                {report.allPassed
                  ? 'Все автоматические проверки успешно пройдены'
                  : 'Обнаружены несоответствия при самопроверке'}
              </div>
              <div className="text-xs opacity-80">
                Выполнено проверок: {report.passedChecks} из {report.totalChecks} · Время старта: {report.timestamp}
              </div>
            </div>
            <span className="font-mono text-sm font-bold">
              {report.passedChecks}/{report.totalChecks} OK
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              1. Целостность схемы данных и Контрольная матрица (Schema Check)
            </h3>
            <div className="space-y-2.5">
              {report.schemaChecks.map((check) => (
                <div
                  key={check.id}
                  className="rounded-lg border border-slate-200 bg-[#f8fafc] p-3.5 flex items-start gap-3"
                >
                  {check.passed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-slate-900">
                      {check.title}
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      {check.details}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              2. Эталонные клинические сценарии подсчета (Runtime TDD Check)
            </h3>
            <div className="space-y-2.5">
              {report.tddChecks.map((check) => (
                <div
                  key={check.id}
                  className="rounded-lg border border-slate-200 bg-[#f8fafc] p-3.5 flex items-start gap-3"
                >
                  {check.passed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-slate-900">
                      {check.title}
                    </div>
                    <div className="font-mono text-xs text-slate-600">
                      {check.details}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-[#f8fafc] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a8a]/90"
          >
            Закрыть отчет
          </button>
        </div>
      </div>
    </div>
  );
};
