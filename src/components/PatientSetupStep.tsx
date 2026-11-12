import React, { useRef, useState } from 'react';
import {
  Download,
  FileUp,
  Lock,
  RefreshCw,
  Shield,
  Trash2,
  UserCheck,
  Zap
} from 'lucide-react';
import { AppSettingsState, PatientInfoState } from '../types/diva5';
import { calculateAgeFromBirthDate, generatePseudonymId } from '../utils/scoring';

interface PatientSetupStepProps {
  patient: PatientInfoState;
  settings: AppSettingsState;
  onUpdatePatient: (patch: Partial<PatientInfoState>) => void;
  onUpdateSettings: (patch: Partial<AppSettingsState>) => void;
  onDownloadJsonDraft: (anonymize: boolean) => void;
  onUploadJsonDraft: (file: File) => void;
  onClearAll: () => void;
  importError: string | null;
}

export const PatientSetupStep: React.FC<PatientSetupStepProps> = ({
  patient,
  settings,
  onUpdatePatient,
  onUpdateSettings,
  onDownloadJsonDraft,
  onUploadJsonDraft,
  onClearAll,
  importError
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleBirthDateChange = (birthDate: string) => {
    const computedAge = calculateAgeFromBirthDate(
      birthDate,
      patient.assessmentDate
    );
    onUpdatePatient({
      birthDate,
      ...(computedAge !== null ? { age: computedAge } : {})
    });
  };

  const handleAssessmentDateChange = (assessmentDate: string) => {
    const computedAge = patient.birthDate
      ? calculateAgeFromBirthDate(patient.birthDate, assessmentDate)
      : patient.age;
    onUpdatePatient({
      assessmentDate,
      ...(computedAge !== null ? { age: computedAge } : {})
    });
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-bold text-[#1e3a8a]">
            DIVA-5 — Диагностический опросник по СДВГ у взрослых (DSM-5)
          </h1>
          <span className="text-xs font-mono text-slate-500">
            Стр. 5 PDF · Регистрация и Приватность
          </span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Все данные обрабатываются и сохраняются строго локально в вашем браузере (100% автономный режим без сетевых запросов). Перед началом интервью настройте параметры приватности и заполните карточку обследования.
        </p>
      </div>

      {/* Global Privacy & Automation Toggles */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Режимы приватности ПДн и автоматизации подсчета
        </h2>

        <div className="space-y-3">
          {/* Anonymize Export Toggle */}
          <label className="flex min-h-[52px] cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 bg-[#f8fafc] p-3.5 hover:border-[#1e3a8a]/40">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-[#1e3a8a] shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  🔒 Анонимизировать персональные данные при экспорте
                </div>
                <div className="text-xs text-slate-600 leading-relaxed mt-0.5">
                  При экспорте в Markdown (.md) исключает ФИО пациента, дату рождения, рег. номер и ФИО врача, оставляя только анонимный ID, возраст и пол.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.anonymizeExport}
              onChange={(e) =>
                onUpdateSettings({ anonymizeExport: e.target.checked })
              }
              className="mt-1 h-5 w-5 shrink-0 accent-[#1e3a8a] rounded"
            />
          </label>

          {/* SessionStorage Only Toggle */}
          <label className="flex min-h-[52px] cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 bg-[#f8fafc] p-3.5 hover:border-[#1e3a8a]/40">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-[#1e3a8a] shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  🛡️ Повышенная приватность на общем устройстве: хранить ФИО только в sessionStorage
                </div>
                <div className="text-xs text-slate-600 leading-relaxed mt-0.5">
                  Очищает 4 чувствительных поля (ФИО пациента, Рег. номер, Точная дата рождения, ФИО врача) перед записью в localStorage и IndexedDB. Они сохраняются только в оперативной сессии вкладки и бесследно стираются при закрытии вкладки.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.sessionOnlyPersonalData}
              onChange={(e) =>
                onUpdateSettings({ sessionOnlyPersonalData: e.target.checked })
              }
              className="mt-1 h-5 w-5 shrink-0 accent-[#1e3a8a] rounded"
            />
          </label>

          {/* Auto Verdict Toggle */}
          <label className="flex min-h-[52px] cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 bg-[#f8fafc] p-3.5 hover:border-[#1e3a8a]/40">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-[#1e3a8a] shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  ⚡ Авто-вердикт симптома при выборе примеров
                </div>
                <div className="text-xs text-slate-600 leading-relaxed mt-0.5">
                  При выборе хотя бы 1 примера (или заполнении поля «Прочее») автоматически устанавливает вердикт периода «Да (Авто)». Просмотренный пустой период при переходе «Далее →» получает статус «Нет (Авто)». Врач всегда может переопределить вердикт вручную.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoVerdictOnExampleSelect}
              onChange={(e) =>
                onUpdateSettings({ autoVerdictOnExampleSelect: e.target.checked })
              }
              className="mt-1 h-5 w-5 shrink-0 accent-[#1e3a8a] rounded"
            />
          </label>
        </div>
      </section>

      {/* Safe Non-Identifying Metadata */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-[#1e3a8a]" />
          <h2 className="text-base font-semibold text-slate-900">
            1. Обезличенные данные обследования (включаются в анонимный отчет)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="patient-pseudonym-id"
              className="block text-sm font-medium text-slate-800 mb-1"
            >
              ID / Псевдоним анкеты
            </label>
            <div className="flex gap-2">
              <input
                id="patient-pseudonym-id"
                type="text"
                value={patient.id}
                onChange={(e) => onUpdatePatient({ id: e.target.value })}
                className="flex-1 min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-[#1e3a8a] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onUpdatePatient({ id: generatePseudonymId() })}
                title="Сгенерировать новый код"
                aria-label="Сгенерировать новый ID анкеты"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-[#f8fafc] text-slate-700 hover:bg-slate-100"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="patient-assessment-date"
              className="block text-sm font-medium text-slate-800 mb-1"
            >
              Дата заполнения
            </label>
            <input
              id="patient-assessment-date"
              type="date"
              value={patient.assessmentDate}
              onChange={(e) => handleAssessmentDateChange(e.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1e3a8a] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="patient-age"
              className="block text-sm font-medium text-slate-800 mb-1"
            >
              Возраст (полных лет)
            </label>
            <input
              id="patient-age"
              type="number"
              min={5}
              max={120}
              value={patient.age ?? ''}
              onChange={(e) => {
                const val = e.target.value.trim();
                onUpdatePatient({
                  age: val === '' ? null : Math.max(0, parseInt(val, 10) || 0)
                });
              }}
              placeholder="Напр., 29"
              className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-[#1e3a8a] focus:outline-none"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-800 mb-1">
              Пол (Стр. 5)
            </span>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Пол пациента">
              {(['М', 'Ж', 'Не указан'] as const).map((sexOpt) => {
                const active = patient.sex === sexOpt;
                return (
                  <button
                    key={sexOpt}
                    type="button"
                    onClick={() => onUpdatePatient({ sex: sexOpt })}
                    className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {sexOpt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Personal Fields from Page 5 PDF */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            2. Персональные поля бланка (Стр. 5 PDF — необязательно)
          </h2>
          <span className="text-xs text-slate-500">
            {settings.sessionOnlyPersonalData
              ? '🛡️ Режим sessionStorage активен (не пишется на диск в localStorage/IndexedDB)'
              : 'Сохраняется локально на этом устройстве'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="patient-full-name"
              className="block text-sm font-medium text-slate-800 mb-1"
            >
              Имя пациента (ФИО)
            </label>
            <input
              id="patient-full-name"
              type="text"
              value={patient.fullName}
              onChange={(e) => onUpdatePatient({ fullName: e.target.value })}
              placeholder="Фамилия Имя Отчество (по желанию)"
              className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1e3a8a] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="patient-birth-date"
              className="block text-sm font-medium text-slate-800 mb-1"
            >
              Дата рождения (автоматически вычисляет возраст)
            </label>
            <input
              id="patient-birth-date"
              type="date"
              value={patient.birthDate}
              onChange={(e) => handleBirthDateChange(e.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1e3a8a] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="patient-clinician"
              className="block text-sm font-medium text-slate-800 mb-1"
            >
              Обследование проводил(а)
            </label>
            <input
              id="patient-clinician"
              type="text"
              value={patient.clinicianName}
              onChange={(e) => onUpdatePatient({ clinicianName: e.target.value })}
              placeholder="ФИО врача / клинического психолога"
              className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1e3a8a] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="patient-reg-number"
              className="block text-sm font-medium text-slate-800 mb-1"
            >
              Регистрационный номер пациента
            </label>
            <input
              id="patient-reg-number"
              type="text"
              value={patient.regNumber}
              onChange={(e) => onUpdatePatient({ regNumber: e.target.value })}
              placeholder="Номер амбулаторной карты / истории болезни"
              className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-[#1e3a8a] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Draft Backup & Reset */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Резервное копирование черновика (JSON) и управление анкетой
        </h2>

        {importError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {importError}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onDownloadJsonDraft(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-[#f8fafc] px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            <Download className="h-4 w-4 text-[#1e3a8a]" />
            <span>Скачать JSON-черновик (Анонимизированный)</span>
          </button>

          <button
            type="button"
            onClick={() => onDownloadJsonDraft(false)}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-[#f8fafc] px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            <Download className="h-4 w-4 text-[#1e3a8a]" />
            <span>Скачать JSON-черновик (Полный)</span>
          </button>

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
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <FileUp className="h-4 w-4 text-[#1e3a8a]" />
            <span>Загрузить JSON-черновик</span>
          </button>

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 ml-auto"
            >
              <Trash2 className="h-4 w-4" />
              <span>Очистить анкету</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-medium text-red-700">
                Удалить все ответы?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setConfirmClear(false);
                }}
                className="min-h-[44px] rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Подтвердить очистку
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
