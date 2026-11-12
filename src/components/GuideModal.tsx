import React, { useMemo, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import {
  DIVA5_BIBLIOGRAPHY,
  DIVA5_GUIDE_AUTHORS,
  DIVA5_GUIDE_CLINICIAN,
  DIVA5_GUIDE_DSM5_CHANGES,
  DIVA5_GUIDE_PATIENT,
  GuideSectionBlock
} from '../data/diva5-guide';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTabId = 'patient' | 'clinician' | 'dsm5' | 'authors';

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<GuideTabId>('patient');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs: { id: GuideTabId; label: string }[] = [
    { id: 'patient', label: 'Пациенту: Как заполнять' },
    { id: 'clinician', label: 'Клиницисту: Методология' },
    { id: 'dsm5', label: 'Изменения в DSM-5' },
    { id: 'authors', label: 'Авторы и библиография' }
  ];

  const activeSections: GuideSectionBlock[] = useMemo(() => {
    switch (activeTab) {
      case 'patient':
        return DIVA5_GUIDE_PATIENT;
      case 'clinician':
        return DIVA5_GUIDE_CLINICIAN;
      case 'dsm5':
        return DIVA5_GUIDE_DSM5_CHANGES;
      case 'authors':
        return DIVA5_GUIDE_AUTHORS;
    }
  }, [activeTab]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) return activeSections;
    const allSections = [
      ...DIVA5_GUIDE_PATIENT,
      ...DIVA5_GUIDE_CLINICIAN,
      ...DIVA5_GUIDE_DSM5_CHANGES,
      ...DIVA5_GUIDE_AUTHORS
    ];
    return allSections.filter((sec) => {
      const inTitle = sec.title.toLowerCase().includes(normalizedQuery);
      const inHighlight = sec.highlightBox?.toLowerCase().includes(normalizedQuery);
      const inParagraphs = sec.paragraphs.some((p) =>
        p.toLowerCase().includes(normalizedQuery)
      );
      const inBullets = (sec.bullets || []).some((b) =>
        b.toLowerCase().includes(normalizedQuery)
      );
      return inTitle || inHighlight || inParagraphs || inBullets;
    });
  }, [activeSections, normalizedQuery]);

  const filteredBibliography = useMemo(() => {
    if (!normalizedQuery && activeTab !== 'authors') return [];
    if (!normalizedQuery) return DIVA5_BIBLIOGRAPHY;
    return DIVA5_BIBLIOGRAPHY.filter(
      (b) =>
        b.authors.toLowerCase().includes(normalizedQuery) ||
        b.work.toLowerCase().includes(normalizedQuery) ||
        b.publication.toLowerCase().includes(normalizedQuery)
    );
  }, [activeTab, normalizedQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#1e3a8a] px-4 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 shrink-0" />
            <h2 id="guide-modal-title" className="text-base sm:text-lg font-semibold">
              Справочник и методология DIVA-5 (Стр. 1–4 PDF)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть справочник"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/90 hover:bg-white/15 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Tabs */}
        <div className="border-b border-slate-200 bg-[#f8fafc] px-4 pt-3 pb-2 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по справочнику, правилам подсчета и библиографии..."
              aria-label="Поиск по справочнику DIVA-5"
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none"
            />
          </div>

          {!normalizedQuery && (
            <div className="flex flex-wrap gap-1.5" role="tablist">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#1e3a8a] text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {filteredSections.length === 0 && filteredBibliography.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              По запросу «{searchQuery}» ничего не найдено.
            </div>
          ) : (
            <>
              {filteredSections.map((sec) => (
                <section
                  key={sec.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3"
                >
                  <h3 className="text-base sm:text-lg font-semibold text-[#1e3a8a]">
                    {sec.title}
                  </h3>
                  {sec.highlightBox && (
                    <div className="rounded-lg bg-[#e0f2fe] p-3.5 text-sm font-medium text-[#1e3a8a]">
                      {sec.highlightBox}
                    </div>
                  )}
                  {sec.paragraphs.map((p, idx) => (
                    <p
                      key={idx}
                      className="text-sm leading-relaxed text-slate-700"
                    >
                      {p}
                    </p>
                  ))}
                  {sec.bullets && sec.bullets.length > 0 && (
                    <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                      {sec.bullets.map((b, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}

              {filteredBibliography.length > 0 && (
                <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
                  <h3 className="text-base sm:text-lg font-semibold text-[#1e3a8a]">
                    Научные ссылки и источники (Стр. 4 PDF — 9 источников)
                  </h3>
                  <ol className="space-y-2.5 text-sm text-slate-700">
                    {filteredBibliography.map((item) => (
                      <li
                        key={item.number}
                        className="flex gap-2.5 leading-relaxed border-b border-slate-100 pb-2 last:border-b-0 last:pb-0"
                      >
                        <span className="font-mono font-semibold text-[#1e3a8a] shrink-0">
                          {item.number}.
                        </span>
                        <div>
                          <span className="font-medium text-slate-900">
                            {item.authors}:
                          </span>{' '}
                          <span>{item.work}.</span>{' '}
                          <span className="text-slate-600">{item.publication}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-[#f8fafc] px-4 py-3">
          <span className="text-xs text-slate-500">
            Фонд DIVA (Гаага, Нидерланды, март 2019) · Критерии DSM-5
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a8a]/90"
          >
            Закрыть справочник
          </button>
        </div>
      </div>
    </div>
  );
};
