import { Diva5ClinicalState } from '../types/diva5';
import { DIVA5_SYMPTOMS } from '../data/diva5-symptoms';
import {
  CRITERION_B_TEXT,
  DIVA5_IMPAIRMENT_DOMAINS,
  SUBTYPE_PRESENTATION_OPTIONS
} from '../data/diva5-impairment';
import {
  calculateDiva5Summary,
  computeEffectiveDomainAffected,
  computeEffectiveSymptomPresence,
  formatVerdictLabel
} from './scoring';

export type ExportReportMode = 'compact_ai' | 'full_form';

export function generateDiva5Markdown(
  state: Diva5ClinicalState,
  mode: ExportReportMode = 'compact_ai'
): string {
  const summary = calculateDiva5Summary(state);
  const anonymized = state.settings.anonymizeExport;
  const autoVerdict = state.settings.autoVerdictOnExampleSelect;

  const selectedSubtypeObj = SUBTYPE_PRESENTATION_OPTIONS.find(
    (o) => o.code === state.dsm5Form.subtypeCode
  );

  const hasCollateralNotes =
    state.dsm5Form.collateralNotes.trim().length > 0 ||
    state.dsm5Form.collateralFamilyRole.trim().length > 0 ||
    state.dsm5Form.collateralPartnerRole.trim().length > 0;

  // Build YAML Frontmatter with strict 2-space indentation and JSON.stringify escaping
  const yamlLines: string[] = [
    '---',
    `document: ${JSON.stringify('DIVA-5 Clinical Assessment Report')}`,
    `edition: ${JSON.stringify('DSM-5 / Russian Edition')}`,
    `date: ${JSON.stringify(state.patient.assessmentDate || new Date().toISOString().slice(0, 10))}`,
    `anonymized: ${anonymized}`,
    'completion_status:',
    `  answered_symptom_blocks: ${summary.answeredSymptomBlocks}`,
    `  unanswered_blocks: ${summary.unansweredSymptomBlocks}`,
    summary.consistencyWarnings.length === 0
      ? '  consistency_warnings: []'
      : '  consistency_warnings:\n' +
        summary.consistencyWarnings
          .map((w) => `    - ${JSON.stringify(w)}`)
          .join('\n'),
    'patient:',
    `  id: ${JSON.stringify(state.patient.id)}`,
    `  age: ${state.patient.age !== null ? state.patient.age : 'null'}`,
    `  sex: ${JSON.stringify(state.patient.sex)}`
  ];

  if (!anonymized) {
    yamlLines.push(
      `  full_name: ${JSON.stringify(state.patient.fullName || '')}`,
      `  birth_date: ${JSON.stringify(state.patient.birthDate || '')}`,
      `  reg_number: ${JSON.stringify(state.patient.regNumber || '')}`,
      `  clinician: ${JSON.stringify(state.patient.clinicianName || '')}`
    );
  }

  yamlLines.push(
    'scores:',
    `  inattention_adult: ${summary.inattentionAdultCount}`,
    `  inattention_childhood: ${summary.inattentionChildhoodCount}`,
    `  hyperactivity_adult: ${summary.hyperactivityAdultCount}`,
    `  hyperactivity_childhood: ${summary.hyperactivityChildhoodCount}`,
    `  impairment_domains_adult: ${summary.impairmentDomainsAdultCount}`,
    `  impairment_domains_childhood: ${summary.impairmentDomainsChildhoodCount}`,
    'dsm5_criteria_check:',
    `  criterion_a_childhood_met: ${summary.criterionAChildhoodMet}`,
    `  criterion_a_adult_inattention_met: ${summary.criterionAAdultInattentionMet}`,
    `  criterion_a_adult_hyperactivity_met: ${summary.criterionAAdultHyperactivityMet}`,
    `  criterion_b_onset_before_12: ${summary.criterionBMet}`,
    `  criterion_b_onset_age_if_later: ${
      state.criterionB.alwaysPresentBefore12 === false &&
      state.criterionB.onsetAgeIfLater.trim()
        ? JSON.stringify(state.criterionB.onsetAgeIfLater.trim())
        : 'null'
    }`,
    `  criterion_cd_impairment_adult_met: ${summary.criterionCDAdultMet}`,
    `  criterion_cd_impairment_childhood_met: ${summary.criterionCDChildhoodMet}`,
    `  criterion_e_better_explained_by_other: ${state.dsm5Form.criterionEBetterExplainedByOther === true}`,
    `  criterion_e_explanation: ${
      state.dsm5Form.criterionEBetterExplainedByOther === true &&
      state.dsm5Form.criterionEExplanation.trim()
        ? JSON.stringify(state.dsm5Form.criterionEExplanation.trim())
        : 'null'
    }`,
    `  algorithmic_suggestion: ${JSON.stringify(summary.algorithmicSuggestionLabel)}`,
    'collateral_history:',
    `  family_score: ${JSON.stringify(state.dsm5Form.collateralFamilyScore)}`,
    `  partner_score: ${JSON.stringify(state.dsm5Form.collateralPartnerScore)}`,
    `  school_reports_score: ${JSON.stringify(state.dsm5Form.collateralSchoolScore)}`,
    `  has_notes: ${hasCollateralNotes}`,
    'clinician_final_decision:',
    `  diagnosis_confirmed: ${
      state.dsm5Form.diagnosisConfirmed === null
        ? 'null'
        : state.dsm5Form.diagnosisConfirmed
    }`,
    `  subtype_code: ${
      selectedSubtypeObj ? JSON.stringify(selectedSubtypeObj.fullLabel) : 'null'
    }`,
    `  in_partial_remission: ${state.dsm5Form.inPartialRemission}`,
    `  severity: ${
      state.dsm5Form.severity ? JSON.stringify(state.dsm5Form.severity) : 'null'
    }`,
    '---'
  );

  const md: string[] = [yamlLines.join('\n'), ''];

  // Section 0: Header + Patient Metadata Table
  md.push('# Результаты диагностического интервью DIVA-5');
  md.push('');
  md.push(
    `**Режим отчета:** ${
      mode === 'compact_ai'
        ? 'Компактный для ИИ и врача (LLM-Optimized)'
        : 'Полный клинический бланк (Full Form)'
    } · **Приватность:** ${
      anonymized ? 'Персональные данные скрыты (Анонимизировано)' : 'Полные данные пациента'
    }`
  );
  md.push('');
  md.push('| Параметр | Значение |');
  md.push('| :--- | :--- |');
  md.push(`| **ID / Псевдоним пациента** | \`${state.patient.id}\` |`);
  md.push(`| **Возраст / Пол** | ${state.patient.age ?? 'Не указан'} лет / ${state.patient.sex} |`);
  md.push(`| **Дата обследования** | ${state.patient.assessmentDate || 'Не указана'} |`);
  if (!anonymized) {
    md.push(`| **ФИО пациента** | ${state.patient.fullName || '—'} |`);
    md.push(`| **Дата рождения** | ${state.patient.birthDate || '—'} |`);
    md.push(`| **Регистрационный номер** | ${state.patient.regNumber || '—'} |`);
    md.push(`| **Обследование проводил(а)** | ${state.patient.clinicianName || '—'} |`);
  }
  md.push(
    `| **Полнота заполнения симптомов** | Оценено ${summary.answeredSymptomBlocks} из 36 блоков (не оценено: ${summary.unansweredSymptomBlocks}) |`
  );
  md.push('');

  // Section 1: Summary Table (Pages 18-19)
  md.push('## 1. Сводная таблица подсчета симптомов и критериев DSM-5 (Стр. 18–19)');
  md.push('');
  md.push('### 1.1. Обобщение симптомов (Стр. 18)');
  md.push('');
  md.push('| Код DSM-5 | Пункт DIVA-5 | Зрелость (≥ 6 мес.) | Детство (5–12 лет) |');
  md.push('| :--- | :--- | :--- | :--- |');

  for (const sym of DIVA5_SYMPTOMS) {
    const ans = state.symptoms[sym.id];
    const adultLabel = formatVerdictLabel(ans.adult, autoVerdict);
    const childLabel = formatVerdictLabel(ans.childhood, autoVerdict);
    md.push(
      `| **${sym.dsmCode}** | **${sym.codeLabel}** — ${sym.summaryText.replace(/^(A\d|H\/I \d)\.\s*/, '')} | ${adultLabel} | ${childLabel} |`
    );
  }
  md.push(
    `| **ИТОГО A1** | **Общее число критериев Дефицита внимания** | **${summary.inattentionAdultCount} / 9** | **${summary.inattentionChildhoodCount} / 9** |`
  );
  md.push(
    `| **ИТОГО A2** | **Общее число критериев Гиперактивности/Импульсивности** | **${summary.hyperactivityAdultCount} / 9** | **${summary.hyperactivityChildhoodCount} / 9** |`
  );
  md.push('');

  md.push('### 1.2. Формуляр подсчета DSM-5 и Гетероанамнез (Стр. 19)');
  md.push('');
  md.push('| Критерий DSM-5 / Раздел | Условие | Статус / Значение |');
  md.push('| :--- | :--- | :--- |');
  md.push(
    `| **Критерий A (Детство)** | Присутствуют ли различные (≥ 3) симптомы Д или ГИ? | **${
      summary.criterionAChildhoodMet ? 'Да' : 'Нет'
    }** (Д: ${summary.inattentionChildhoodCount}/9, ГИ: ${summary.hyperactivityChildhoodCount}/9) |`
  );
  md.push(
    `| **Критерий A (Зрелость — Д)** | Число признаков Дефицита внимания ≥ 5? | **${
      summary.criterionAAdultInattentionMet ? 'Да' : 'Нет'
    }** (${summary.inattentionAdultCount}/9) |`
  );
  md.push(
    `| **Критерий A (Зрелость — ГИ)** | Число признаков Гиперактивности/Импульсивности ≥ 5? | **${
      summary.criterionAAdultHyperactivityMet ? 'Да' : 'Нет'
    }** (${summary.hyperactivityAdultCount}/9) |`
  );
  md.push(
    `| **Критерий B** | Пожизненное присутствие симптомов, возникших до 12 лет? | **${
      state.criterionB.alwaysPresentBefore12 === true
        ? 'Да (до 12 лет)'
        : state.criterionB.alwaysPresentBefore12 === false
          ? `Нет (возраст появления: ${state.criterionB.onsetAgeIfLater || 'не указан'})`
          : 'Не оценено'
    }** |`
  );
  md.push(
    `| **Критерии C и D (Зрелость)** | Нарушения минимум в 2 жизненных сферах? | **${
      summary.criterionCDAdultMet ? 'Да' : 'Нет'
    }** (затронуто сфер: ${summary.impairmentDomainsAdultCount} из 5) |`
  );
  md.push(
    `| **Критерии C и D (Детство)** | Нарушения минимум в 2 жизненных сферах? | **${
      summary.criterionCDChildhoodMet ? 'Да' : 'Нет'
    }** (затронуто сфер: ${summary.impairmentDomainsChildhoodCount} из 5) |`
  );
  md.push(
    `| **Критерий E** | Можно ли приписать симптомы другому психическому расстройству? | **${
      state.dsm5Form.criterionEBetterExplainedByOther === true
        ? `Да (${state.dsm5Form.criterionEExplanation || 'без уточнения'})`
        : state.dsm5Form.criterionEBetterExplainedByOther === false
          ? 'Нет'
          : 'Не оценено'
    }** |`
  );
  md.push(
    `| **Гетероанамнез: Родные** | ${
      state.dsm5Form.collateralFamilyRole
        ? `Роль: ${state.dsm5Form.collateralFamilyRole}`
        : 'Родители/брат/сестра/пр.'
    } | Оценка: **${state.dsm5Form.collateralFamilyScore}** |`
  );
  md.push(
    `| **Гетероанамнез: Партнер/друзья** | ${
      state.dsm5Form.collateralPartnerRole
        ? `Роль: ${state.dsm5Form.collateralPartnerRole}`
        : 'Партнер/друзья/пр.'
    } | Оценка: **${state.dsm5Form.collateralPartnerScore}** |`
  );
  md.push(
    `| **Школьные дневники / табели** | Подтверждение по школьным документам | Оценка: **${state.dsm5Form.collateralSchoolScore}** |`
  );
  md.push(
    `| **Алгоритмическая пред-оценка** | Автоматическая сверка A + B + C/D + E | **${summary.algorithmicSuggestionLabel}** |`
  );
  md.push(
    `| **Финальное решение специалиста** | Диагноз СДВГ подтвержден? | **${
      state.dsm5Form.diagnosisConfirmed === true
        ? 'ДА'
        : state.dsm5Form.diagnosisConfirmed === false
          ? 'НЕТ'
          : 'Не вынесено'
    }** |`
  );
  if (selectedSubtypeObj) {
    md.push(`| **Форма проявления (Код)** | Выбранный код | **${selectedSubtypeObj.fullLabel}** |`);
  }
  md.push(
    `| **Ремиссия и степень тяжести** | Дополнительные спецификаторы | Частично в ремиссии: **${
      state.dsm5Form.inPartialRemission ? 'Да' : 'Нет'
    }** · Тяжесть: **${state.dsm5Form.severity || 'Не указана'}** |`
  );
  md.push('');

  if (summary.consistencyWarnings.length > 0) {
    md.push('**Предупреждения проверки непротиворечивости:**');
    for (const w of summary.consistencyWarnings) {
      md.push(`- ⚠️ ${w}`);
    }
    md.push('');
  }

  // Section 2: Aggregated Free-Text Comments & Anamnesis
  md.push('## 2. Сводка всех свободных комментариев и анамнеза (Фокус для специалиста и ИИ)');
  md.push('');
  const collectedComments: string[] = [];

  for (const sym of DIVA5_SYMPTOMS) {
    const ans = state.symptoms[sym.id];
    if (ans.adult.otherText.trim()) {
      collectedComments.push(
        `- **${sym.codeLabel} (Зрелость — Прочее):** ${ans.adult.otherText.trim()}`
      );
    }
    if (ans.childhood.otherText.trim()) {
      collectedComments.push(
        `- **${sym.codeLabel} (Детство — Прочее):** ${ans.childhood.otherText.trim()}`
      );
    }
  }

  for (const dom of DIVA5_IMPAIRMENT_DOMAINS) {
    const domAns = state.impairmentDomains[dom.id];
    if (domAns.adult.otherText.trim()) {
      collectedComments.push(
        `- **Критерий C — ${dom.adultTitle} (Зрелость — Прочее):** ${domAns.adult.otherText.trim()}`
      );
    }
    if (domAns.childhood.otherText.trim()) {
      collectedComments.push(
        `- **Критерий C — ${dom.childhoodTitle} (Детство — Прочее):** ${domAns.childhood.otherText.trim()}`
      );
    }
  }

  if (state.criterionCD.specialNotes.trim()) {
    collectedComments.push(
      `- **Особенности (Стр. 17):** ${state.criterionCD.specialNotes.trim()}`
    );
  }
  if (state.dsm5Form.criterionEExplanation.trim()) {
    collectedComments.push(
      `- **Критерий E (Дифференциальная диагностика):** ${state.dsm5Form.criterionEExplanation.trim()}`
    );
  }
  if (state.dsm5Form.collateralNotes.trim()) {
    collectedComments.push(
      `- **Пояснение гетероанамнеза (Стр. 19):** ${state.dsm5Form.collateralNotes.trim()}`
    );
  }

  if (collectedComments.length === 0) {
    md.push('_Рукописные комментарии и поля «Прочее» не заполнялись._');
  } else {
    md.push(...collectedComments);
  }
  md.push('');

  // Helper to render symptom details for Part 1 and Part 2
  const renderSymptomList = (partNumber: 1 | 2) => {
    const items = DIVA5_SYMPTOMS.filter((s) => s.part === partNumber);
    for (const sym of items) {
      const ans = state.symptoms[sym.id];
      const adultVerdict = formatVerdictLabel(ans.adult, autoVerdict);
      const childVerdict = formatVerdictLabel(ans.childhood, autoVerdict);

      md.push(`### ${sym.codeLabel} (${sym.dsmCode}): ${sym.questionText}`);
      if (sym.footnote) {
        md.push(`_${sym.footnote}_`);
      }
      md.push('');

      // Adulthood
      md.push(`**Во взрослом возрасте** — Клинический вердикт: **${adultVerdict}**`);
      const adultSelectedExamples = sym.adultExamples.filter((ex) =>
        ans.adult.checkedIds.includes(ex.id)
      );
      if (mode === 'compact_ai') {
        if (adultSelectedExamples.length === 0 && !ans.adult.otherText.trim()) {
          md.push('- Примеры не отмечены');
        } else {
          for (const ex of adultSelectedExamples) {
            md.push(`- [x] ${ex.text}`);
          }
          if (ans.adult.otherText.trim()) {
            md.push(`- [x] **Прочее:** ${ans.adult.otherText.trim()}`);
          }
        }
      } else {
        for (const ex of sym.adultExamples) {
          const checked = ans.adult.checkedIds.includes(ex.id);
          md.push(`- [${checked ? 'x' : ' '}] ${ex.text}`);
        }
        md.push(
          `- [${
            ans.adult.otherChecked || ans.adult.otherText.trim() ? 'x' : ' '
          }] **Прочее:** ${ans.adult.otherText.trim() || '—'}`
        );
      }
      md.push('');

      // Childhood
      md.push(`**В детстве (5–12 лет)** — Клинический вердикт: **${childVerdict}**`);
      const childSelectedExamples = sym.childhoodExamples.filter((ex) =>
        ans.childhood.checkedIds.includes(ex.id)
      );
      if (mode === 'compact_ai') {
        if (childSelectedExamples.length === 0 && !ans.childhood.otherText.trim()) {
          md.push('- Примеры не отмечены');
        } else {
          for (const ex of childSelectedExamples) {
            md.push(`- [x] ${ex.text}`);
          }
          if (ans.childhood.otherText.trim()) {
            md.push(`- [x] **Прочее:** ${ans.childhood.otherText.trim()}`);
          }
        }
      } else {
        for (const ex of sym.childhoodExamples) {
          const checked = ans.childhood.checkedIds.includes(ex.id);
          md.push(`- [${checked ? 'x' : ' '}] ${ex.text}`);
        }
        md.push(
          `- [${
            ans.childhood.otherChecked || ans.childhood.otherText.trim() ? 'x' : ' '
          }] **Прочее:** ${ans.childhood.otherText.trim() || '—'}`
        );
      }
      md.push('');
    }
  };

  // Section 3: Inattention (A1-A9)
  md.push('## 3. Детализация: Дефицит внимания (A1–A9)');
  md.push('');
  renderSymptomList(1);

  // Section 4: Hyperactivity / Impulsivity (H/I 1-9)
  md.push('## 4. Детализация: Гиперактивность и Импульсивность (H/I 1–9)');
  md.push('');
  renderSymptomList(2);

  // Section 5: Impairment (Criteria B & C)
  md.push('## 5. Детализация: Нарушения функционирования (Критерии B и C — 5 сфер жизни)');
  md.push('');
  md.push(`### ${CRITERION_B_TEXT.title}: ${CRITERION_B_TEXT.question}`);
  md.push(
    `- **Ответ:** ${
      state.criterionB.alwaysPresentBefore12 === true
        ? CRITERION_B_TEXT.yesLabel
        : state.criterionB.alwaysPresentBefore12 === false
          ? `Нет (возраст появления: ${state.criterionB.onsetAgeIfLater || 'не указан'})`
          : 'Не оценено'
    }`
  );
  md.push('');

  for (const dom of DIVA5_IMPAIRMENT_DOMAINS) {
    const domAns = state.impairmentDomains[dom.id];
    const adultAff = computeEffectiveDomainAffected(domAns.adult, autoVerdict);
    const childAff = computeEffectiveDomainAffected(domAns.childhood, autoVerdict);

    const adultStatusStr =
      adultAff === null
        ? 'НЕ ОЦЕНЕНО'
        : adultAff
          ? domAns.adult.isManualOverride
            ? 'ДА (Вручную)'
            : 'ДА (Авто)'
          : domAns.adult.isManualOverride
            ? 'НЕТ (Вручную)'
            : 'НЕТ (Авто)';

    const childStatusStr =
      childAff === null
        ? 'НЕ ОЦЕНЕНО'
        : childAff
          ? domAns.childhood.isManualOverride
            ? 'ДА (Вручную)'
            : 'ДА (Авто)'
          : domAns.childhood.isManualOverride
            ? 'НЕТ (Вручную)'
            : 'НЕТ (Авто)';

    md.push(`### Сфера: ${dom.adultTitle} / ${dom.childhoodTitle}`);
    md.push('');
    md.push(`**Зрелость (${dom.adultTitle})** — Сфера затронута: **${adultStatusStr}**`);
    const adultChecked = dom.adultExamples.filter((ex) =>
      domAns.adult.checkedIds.includes(ex.id)
    );
    if (mode === 'compact_ai') {
      if (adultChecked.length === 0 && !domAns.adult.otherText.trim()) {
        md.push('- Примеры не отмечены');
      } else {
        for (const ex of adultChecked) {
          md.push(`- [x] ${ex.text}`);
        }
        if (domAns.adult.otherText.trim()) {
          md.push(`- [x] **Прочее:** ${domAns.adult.otherText.trim()}`);
        }
      }
    } else {
      for (const ex of dom.adultExamples) {
        const checked = domAns.adult.checkedIds.includes(ex.id);
        md.push(`- [${checked ? 'x' : ' '}] ${ex.text}`);
      }
      md.push(
        `- [${
          domAns.adult.otherChecked || domAns.adult.otherText.trim() ? 'x' : ' '
        }] **Прочее:** ${domAns.adult.otherText.trim() || '—'}`
      );
    }
    md.push('');

    md.push(`**Детство (${dom.childhoodTitle})** — Сфера затронута: **${childStatusStr}**`);
    const childChecked = dom.childhoodExamples.filter((ex) =>
      domAns.childhood.checkedIds.includes(ex.id)
    );
    if (mode === 'compact_ai') {
      if (childChecked.length === 0 && !domAns.childhood.otherText.trim()) {
        md.push('- Примеры не отмечены');
      } else {
        for (const ex of childChecked) {
          md.push(`- [x] ${ex.text}`);
        }
        if (domAns.childhood.otherText.trim()) {
          md.push(`- [x] **Прочее:** ${domAns.childhood.otherText.trim()}`);
        }
      }
    } else {
      for (const ex of dom.childhoodExamples) {
        const checked = domAns.childhood.checkedIds.includes(ex.id);
        md.push(`- [${checked ? 'x' : ' '}] ${ex.text}`);
      }
      md.push(
        `- [${
          domAns.childhood.otherChecked || domAns.childhood.otherText.trim() ? 'x' : ' '
        }] **Прочее:** ${domAns.childhood.otherText.trim() || '—'}`
      );
    }
    md.push('');
  }

  return md.join('\n');
}
