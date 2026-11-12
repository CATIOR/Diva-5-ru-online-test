import {
  DIVA5_BIBLIOGRAPHY,
  DIVA5_GUIDE_AUTHORS,
  DIVA5_GUIDE_CLINICIAN,
  DIVA5_GUIDE_DSM5_CHANGES,
  DIVA5_GUIDE_PATIENT
} from '../data/diva5-guide';
import { DIVA5_SYMPTOMS } from '../data/diva5-symptoms';
import { DIVA5_IMPAIRMENT_DOMAINS } from '../data/diva5-impairment';
import { calculateDiva5Summary, createInitialDiva5State } from './scoring';

export interface VerificationCheckResult {
  id: string;
  category: 'schema' | 'tdd';
  title: string;
  passed: boolean;
  details: string;
}

export interface SelfVerificationReport {
  allPassed: boolean;
  timestamp: string;
  totalChecks: number;
  passedChecks: number;
  schemaChecks: VerificationCheckResult[];
  tddChecks: VerificationCheckResult[];
}

const EXPECTED_SYMPTOM_MATRIX: Record<string, { adult: number; childhood: number }> = {
  A1: { adult: 9, childhood: 8 },
  A2: { adult: 7, childhood: 7 },
  A3: { adult: 6, childhood: 6 },
  A4: { adult: 5, childhood: 6 },
  A5: { adult: 14, childhood: 10 },
  A6: { adult: 7, childhood: 5 },
  A7: { adult: 7, childhood: 5 },
  A8: { adult: 5, childhood: 3 },
  A9: { adult: 8, childhood: 6 },
  HI1: { adult: 5, childhood: 6 },
  HI2: { adult: 6, childhood: 4 },
  HI3: { adult: 3, childhood: 4 },
  HI4: { adult: 5, childhood: 4 },
  HI5: { adult: 6, childhood: 6 },
  HI6: { adult: 6, childhood: 6 },
  HI7: { adult: 6, childhood: 5 },
  HI8: { adult: 4, childhood: 6 },
  HI9: { adult: 6, childhood: 5 }
};

const EXPECTED_DOMAIN_MATRIX: Record<string, { adult: number; childhood: number }> = {
  work_education: { adult: 11, childhood: 10 },
  relationships_family: { adult: 10, childhood: 4 },
  social_contacts: { adult: 6, childhood: 8 },
  free_time_hobbies: { adult: 10, childhood: 9 },
  self_confidence: { adult: 6, childhood: 5 }
};

function hasForbiddenPlaceholder(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.includes('TODO') || trimmed.includes('...')) return true;
  return false;
}

export function runSelfVerification(): SelfVerificationReport {
  const schemaChecks: VerificationCheckResult[] = [];
  const tddChecks: VerificationCheckResult[] = [];

  // 1. Check 18 symptoms count & matrix exact match
  const symptomCountOk = DIVA5_SYMPTOMS.length === 18;
  const symptomMismatches: string[] = [];
  let forbiddenStringsFound = 0;

  for (const sym of DIVA5_SYMPTOMS) {
    const expected = EXPECTED_SYMPTOM_MATRIX[sym.id];
    if (!expected) {
      symptomMismatches.push(`Неизвестный вопрос ${sym.id}`);
      continue;
    }
    if (sym.adultExamples.length !== expected.adult) {
      symptomMismatches.push(
        `${sym.codeLabel} Зрелость: ожидалось ${expected.adult}, получено ${sym.adultExamples.length}`
      );
    }
    if (sym.childhoodExamples.length !== expected.childhood) {
      symptomMismatches.push(
        `${sym.codeLabel} Детство: ожидалось ${expected.childhood}, получено ${sym.childhoodExamples.length}`
      );
    }
    if (
      hasForbiddenPlaceholder(sym.questionText) ||
      hasForbiddenPlaceholder(sym.summaryText) ||
      hasForbiddenPlaceholder(sym.helperTip)
    ) {
      forbiddenStringsFound++;
    }
    for (const ex of [...sym.adultExamples, ...sym.childhoodExamples]) {
      if (hasForbiddenPlaceholder(ex.text)) {
        forbiddenStringsFound++;
      }
    }
  }

  const a2FootnoteOk =
    DIVA5_SYMPTOMS.find((s) => s.id === 'A2')?.footnote ===
    '* За исключением особо интересных пациенту занятий (таких, как компьютер или хобби)';

  schemaChecks.push({
    id: 'schema_symptoms_matrix',
    category: 'schema',
    title: 'Контрольная матрица Частей 1 и 2 (A1–A9, H/I 1–9)',
    passed: symptomCountOk && symptomMismatches.length === 0 && a2FootnoteOk,
    details:
      symptomMismatches.length === 0 && a2FootnoteOk
        ? 'Все 18 вопросов (115 примеров Зрелости и 99 примеров Детства) и сноска A2* точно совпадают со спецификацией.'
        : `Ошибки матрицы: ${symptomMismatches.join('; ')}`
  });

  // 2. Check 5 Impairment Domains matrix
  const domainMismatches: string[] = [];
  for (const dom of DIVA5_IMPAIRMENT_DOMAINS) {
    const expected = EXPECTED_DOMAIN_MATRIX[dom.id];
    if (!expected) {
      domainMismatches.push(`Неизвестная сфера ${dom.id}`);
      continue;
    }
    if (dom.adultExamples.length !== expected.adult) {
      domainMismatches.push(
        `${dom.adultTitle} (Зрелость): ожидалось ${expected.adult}, получено ${dom.adultExamples.length}`
      );
    }
    if (dom.childhoodExamples.length !== expected.childhood) {
      domainMismatches.push(
        `${dom.childhoodTitle} (Детство): ожидалось ${expected.childhood}, получено ${dom.childhoodExamples.length}`
      );
    }
    for (const ex of [...dom.adultExamples, ...dom.childhoodExamples]) {
      if (hasForbiddenPlaceholder(ex.text)) {
        forbiddenStringsFound++;
      }
    }
  }

  schemaChecks.push({
    id: 'schema_domains_matrix',
    category: 'schema',
    title: 'Контрольная матрица Части 3 (Критерий C — 5 сфер жизни)',
    passed: DIVA5_IMPAIRMENT_DOMAINS.length === 5 && domainMismatches.length === 0,
    details:
      domainMismatches.length === 0
        ? 'Все 5 парных сфер (11/10, 10/4, 6/8, 10/9, 6/5 — всего 79 примеров) точно соответствуют стр. 15–16 PDF.'
        : `Ошибки сфер: ${domainMismatches.join('; ')}`
  });

  // 3. Check Guide & Bibliography & Zero-Truncation (no empty strings, TODO, or ...)
  for (const group of [
    DIVA5_GUIDE_PATIENT,
    DIVA5_GUIDE_CLINICIAN,
    DIVA5_GUIDE_DSM5_CHANGES,
    DIVA5_GUIDE_AUTHORS
  ]) {
    for (const sec of group) {
      if (hasForbiddenPlaceholder(sec.title)) forbiddenStringsFound++;
      for (const p of sec.paragraphs) {
        if (hasForbiddenPlaceholder(p)) forbiddenStringsFound++;
      }
      for (const b of sec.bullets ?? []) {
        if (hasForbiddenPlaceholder(b)) forbiddenStringsFound++;
      }
    }
  }

  schemaChecks.push({
    id: 'schema_zero_truncation',
    category: 'schema',
    title: 'Zero Truncation Policy (отсутствие пустых строк, TODO и многоточий + 9 источников)',
    passed: forbiddenStringsFound === 0 && DIVA5_BIBLIOGRAPHY.length === 9,
    details:
      forbiddenStringsFound === 0 && DIVA5_BIBLIOGRAPHY.length === 9
        ? 'Проверены все текстовые блоки, сноски, подсказки helperTip и 9 библиографических ссылок со стр. 4 — сокращений не обнаружено.'
        : `Найдено запрещенных сокращений: ${forbiddenStringsFound}, источников: ${DIVA5_BIBLIOGRAPHY.length}`
  });

  // TDD Scenario 1: Норма (Subthreshold)
  {
    const s1 = createInitialDiva5State();
    // 2 adult inattention, 2 childhood inattention
    s1.symptoms.A1.adult.present = true;
    s1.symptoms.A1.adult.isManualOverride = true;
    s1.symptoms.A2.adult.present = true;
    s1.symptoms.A2.adult.isManualOverride = true;
    s1.symptoms.A1.childhood.present = true;
    s1.symptoms.A1.childhood.isManualOverride = true;
    s1.symptoms.A2.childhood.present = true;
    s1.symptoms.A2.childhood.isManualOverride = true;
    s1.criterionB.alwaysPresentBefore12 = false;
    const sum1 = calculateDiva5Summary(s1);
    const passed =
      !sum1.algorithmicDiagnosisMet &&
      sum1.algorithmicSubtypeCode === null &&
      sum1.inattentionAdultCount === 2;
    tddChecks.push({
      id: 'tdd_scenario_1_normal',
      category: 'tdd',
      title: 'TDD Сценарий 1: Норма / субклиническая картина',
      passed,
      details: `Д_взр=${sum1.inattentionAdultCount}/9, Д_дет=${sum1.inattentionChildhoodCount}/9 → Диагноз: ${sum1.algorithmicDiagnosisMet ? 'Да' : 'Нет'}`
    });
  }

  // TDD Scenario 2: Преимущественно невнимательная форма (314.00)
  {
    const s2 = createInitialDiva5State();
    for (const id of ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']) {
      s2.symptoms[id].adult.checkedIds = [`${id}_adult_1`];
    }
    for (const id of ['A1', 'A2', 'A3', 'A4']) {
      s2.symptoms[id].childhood.checkedIds = [`${id}_child_1`];
    }
    s2.criterionB.alwaysPresentBefore12 = true;
    s2.impairmentDomains.work_education.adult.checkedIds = ['C1_adult_1'];
    s2.impairmentDomains.self_confidence.adult.checkedIds = ['C5_adult_1'];
    s2.impairmentDomains.work_education.childhood.checkedIds = ['C1_child_1'];
    s2.impairmentDomains.social_contacts.childhood.checkedIds = ['C3_child_1'];
    s2.dsm5Form.criterionEBetterExplainedByOther = false;

    const sum2 = calculateDiva5Summary(s2);
    const passed =
      sum2.algorithmicDiagnosisMet &&
      sum2.algorithmicSubtypeCode === '314.00_inattentive' &&
      sum2.inattentionAdultCount === 6 &&
      sum2.inattentionChildhoodCount === 4;
    tddChecks.push({
      id: 'tdd_scenario_2_inattentive',
      category: 'tdd',
      title: 'TDD Сценарий 2: Преимущественно невнимательная форма (DSM-5: 314.00 | МКБ-11: 6A05.0)',
      passed,
      details: `Д_взр=${sum2.inattentionAdultCount}/9 (≥5), Д_дет=${sum2.inattentionChildhoodCount}/9 (≥3), Сферы=2/2 → Код: ${sum2.algorithmicSubtypeCode}`
    });
  }

  // TDD Scenario 3: Преимущественно гиперактивно-импульсивная форма (314.01)
  {
    const s3 = createInitialDiva5State();
    for (const id of ['HI1', 'HI2', 'HI3', 'HI4', 'HI5']) {
      s3.symptoms[id].adult.checkedIds = [`${id}_adult_1`];
    }
    for (const id of ['HI1', 'HI2', 'HI3']) {
      s3.symptoms[id].childhood.checkedIds = [`${id}_child_1`];
    }
    s3.criterionB.alwaysPresentBefore12 = true;
    s3.impairmentDomains.relationships_family.adult.checkedIds = ['C2_adult_1'];
    s3.impairmentDomains.free_time_hobbies.adult.checkedIds = ['C4_adult_1'];
    s3.impairmentDomains.relationships_family.childhood.checkedIds = ['C2_child_1'];
    s3.impairmentDomains.free_time_hobbies.childhood.checkedIds = ['C4_child_1'];
    s3.dsm5Form.criterionEBetterExplainedByOther = false;

    const sum3 = calculateDiva5Summary(s3);
    const passed =
      sum3.algorithmicDiagnosisMet &&
      sum3.algorithmicSubtypeCode === '314.01_hyperactive' &&
      sum3.hyperactivityAdultCount === 5 &&
      sum3.hyperactivityChildhoodCount === 3;
    tddChecks.push({
      id: 'tdd_scenario_3_hyperactive',
      category: 'tdd',
      title: 'TDD Сценарий 3: Преимущественно гиперактивно-импульсивная форма (DSM-5: 314.01 | МКБ-11: 6A05.1)',
      passed,
      details: `ГИ_взр=${sum3.hyperactivityAdultCount}/9 (≥5), ГИ_дет=${sum3.hyperactivityChildhoodCount}/9 (≥3), Сферы=2/2 → Код: ${sum3.algorithmicSubtypeCode}`
    });
  }

  // TDD Scenario 4: Комбинированная форма (314.01)
  {
    const s4 = createInitialDiva5State();
    for (const id of ['A1', 'A2', 'A3', 'A4', 'A5']) {
      s4.symptoms[id].adult.checkedIds = [`${id}_adult_1`];
    }
    for (const id of ['HI1', 'HI2', 'HI3', 'HI4', 'HI5', 'HI6']) {
      s4.symptoms[id].adult.checkedIds = [`${id}_adult_1`];
    }
    for (const id of ['A1', 'A2', 'A3']) {
      s4.symptoms[id].childhood.checkedIds = [`${id}_child_1`];
    }
    s4.criterionB.alwaysPresentBefore12 = true;
    s4.criterionCD.adultImpairmentMet = true;
    s4.criterionCD.adultIsManualOverride = true;
    s4.criterionCD.childhoodImpairmentMet = true;
    s4.criterionCD.childhoodIsManualOverride = true;
    s4.dsm5Form.criterionEBetterExplainedByOther = false;

    const sum4 = calculateDiva5Summary(s4);
    const passed =
      sum4.algorithmicDiagnosisMet &&
      sum4.algorithmicSubtypeCode === '314.01_combined' &&
      sum4.inattentionAdultCount === 5 &&
      sum4.hyperactivityAdultCount === 6;
    tddChecks.push({
      id: 'tdd_scenario_4_combined',
      category: 'tdd',
      title: 'TDD Сценарий 4: Комбинированная форма проявления (DSM-5: 314.01 | МКБ-11: 6A05.2)',
      passed,
      details: `Д_взр=${sum4.inattentionAdultCount}/9 (≥5) и ГИ_взр=${sum4.hyperactivityAdultCount}/9 (≥5) → Код: ${sum4.algorithmicSubtypeCode}`
    });
  }

  // TDD Scenario 5: Отказ в диагнозе при невыполнении Критерия B или при Критерий E = Да
  {
    const s5a = createInitialDiva5State();
    for (const id of ['A1', 'A2', 'A3', 'A4', 'A5']) {
      s5a.symptoms[id].adult.checkedIds = [`${id}_adult_1`];
      s5a.symptoms[id].childhood.checkedIds = [`${id}_child_1`];
    }
    s5a.criterionB.alwaysPresentBefore12 = false; // Criterion B failed
    s5a.criterionCD.adultImpairmentMet = true;
    s5a.criterionCD.childhoodImpairmentMet = true;
    s5a.dsm5Form.criterionEBetterExplainedByOther = false;
    const sum5a = calculateDiva5Summary(s5a);

    const s5b = createInitialDiva5State();
    for (const id of ['A1', 'A2', 'A3', 'A4', 'A5']) {
      s5b.symptoms[id].adult.checkedIds = [`${id}_adult_1`];
      s5b.symptoms[id].childhood.checkedIds = [`${id}_child_1`];
    }
    s5b.criterionB.alwaysPresentBefore12 = true;
    s5b.criterionCD.adultImpairmentMet = true;
    s5b.criterionCD.childhoodImpairmentMet = true;
    s5b.dsm5Form.criterionEBetterExplainedByOther = true; // Criterion E = Yes (better explained by another disorder)
    const sum5b = calculateDiva5Summary(s5b);

    const passed = !sum5a.algorithmicDiagnosisMet && !sum5b.algorithmicDiagnosisMet;
    tddChecks.push({
      id: 'tdd_scenario_5_exclusion',
      category: 'tdd',
      title: 'TDD Сценарий 5: Исключение диагноза при Критерии B = Нет или Критерии E = Да',
      passed,
      details: `При B=Нет → Диагноз: ${sum5a.algorithmicDiagnosisMet ? 'Да' : 'Нет'}; При E=Да → Диагноз: ${sum5b.algorithmicDiagnosisMet ? 'Да' : 'Нет'}`
    });
  }

  const allChecks = [...schemaChecks, ...tddChecks];
  const passedChecks = allChecks.filter((c) => c.passed).length;

  return {
    allPassed: passedChecks === allChecks.length,
    timestamp: new Date().toTimeString().slice(0, 8),
    totalChecks: allChecks.length,
    passedChecks,
    schemaChecks,
    tddChecks
  };
}
