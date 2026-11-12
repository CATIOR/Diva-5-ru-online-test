import {
  Diva5CalculatedSummary,
  Diva5ClinicalState,
  ImpairmentDomainAnswerState,
  PeriodDomainState,
  PeriodSymptomState,
  SubtypeCode,
  SymptomAnswerState,
  TriState
} from '../types/diva5';
import { DIVA5_SYMPTOMS } from '../data/diva5-symptoms';
import { DIVA5_IMPAIRMENT_DOMAINS, SUBTYPE_PRESENTATION_OPTIONS } from '../data/diva5-impairment';

export function generatePseudonymId(dateObj: Date = new Date()): string {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DIVA-${yyyy}${mm}${dd}-${rand}`;
}

export function createEmptyPeriodSymptomState(): PeriodSymptomState {
  return {
    checkedIds: [],
    otherChecked: false,
    otherText: '',
    present: null,
    isManualOverride: false,
    wasViewed: false
  };
}

export function createEmptyPeriodDomainState(): PeriodDomainState {
  return {
    checkedIds: [],
    otherChecked: false,
    otherText: '',
    affected: null,
    isManualOverride: false
  };
}

export function createInitialDiva5State(): Diva5ClinicalState {
  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);

  const symptoms: Record<string, SymptomAnswerState> = {};
  for (const sym of DIVA5_SYMPTOMS) {
    symptoms[sym.id] = {
      adult: createEmptyPeriodSymptomState(),
      childhood: createEmptyPeriodSymptomState()
    };
  }

  const impairmentDomains: Record<string, ImpairmentDomainAnswerState> = {};
  for (const dom of DIVA5_IMPAIRMENT_DOMAINS) {
    impairmentDomains[dom.id] = {
      adult: createEmptyPeriodDomainState(),
      childhood: createEmptyPeriodDomainState()
    };
  }

  return {
    version: 2,
    lastSavedAt: now.toTimeString().slice(0, 8),
    currentStepIndex: 0,
    patient: {
      id: generatePseudonymId(now),
      age: null,
      sex: 'Не указан',
      assessmentDate: isoDate,
      fullName: '',
      birthDate: '',
      clinicianName: '',
      regNumber: ''
    },
    settings: {
      anonymizeExport: true,
      sessionOnlyPersonalData: false,
      autoVerdictOnExampleSelect: true
    },
    symptoms,
    criterionB: {
      alwaysPresentBefore12: null,
      onsetAgeIfLater: ''
    },
    impairmentDomains,
    criterionCD: {
      adultImpairmentMet: null,
      adultIsManualOverride: false,
      childhoodImpairmentMet: null,
      childhoodIsManualOverride: false,
      specialNotes: ''
    },
    dsm5Form: {
      criterionAChildhoodOverride: null,
      criterionAAdultInattentionOverride: null,
      criterionAAdultHyperactivityOverride: null,
      criterionEBetterExplainedByOther: false,
      criterionEExplanation: '',
      collateralFamilyRole: '',
      collateralFamilyScore: 'н.и.р.',
      collateralPartnerRole: '',
      collateralPartnerScore: 'н.и.р.',
      collateralSchoolScore: 'н.и.р.',
      collateralNotes: '',
      diagnosisConfirmed: null,
      subtypeCode: null,
      inPartialRemission: false,
      severity: null
    }
  };
}

export function hasAnySymptomExampleSelected(period: PeriodSymptomState): boolean {
  return (
    period.checkedIds.length > 0 ||
    (period.otherChecked && period.otherText.trim().length > 0) ||
    period.otherText.trim().length > 0
  );
}

export function hasAnyDomainExampleSelected(period: PeriodDomainState): boolean {
  return (
    period.checkedIds.length > 0 ||
    (period.otherChecked && period.otherText.trim().length > 0) ||
    period.otherText.trim().length > 0
  );
}

export function computeEffectiveSymptomPresence(
  period: PeriodSymptomState,
  autoVerdictEnabled: boolean
): TriState {
  if (period.isManualOverride) {
    return period.present;
  }
  if (autoVerdictEnabled) {
    if (hasAnySymptomExampleSelected(period)) {
      return true;
    }
    if (period.present !== null) {
      return period.present;
    }
  }
  return period.present;
}

export function computeEffectiveDomainAffected(
  period: PeriodDomainState,
  autoVerdictEnabled: boolean
): TriState {
  if (period.isManualOverride) {
    return period.affected;
  }
  if (autoVerdictEnabled) {
    if (hasAnyDomainExampleSelected(period)) {
      return true;
    }
    if (period.affected !== null) {
      return period.affected;
    }
  }
  return period.affected;
}

export function formatVerdictLabel(
  period: PeriodSymptomState,
  autoVerdictEnabled: boolean
): 'ДА (Авто)' | 'ДА (Вручную)' | 'НЕТ (Авто)' | 'НЕТ (Вручную)' | 'НЕ ОЦЕНЕНО' {
  const effective = computeEffectiveSymptomPresence(period, autoVerdictEnabled);
  if (effective === null) return 'НЕ ОЦЕНЕНО';
  if (effective === true) {
    return period.isManualOverride ? 'ДА (Вручную)' : 'ДА (Авто)';
  }
  return period.isManualOverride ? 'НЕТ (Вручную)' : 'НЕТ (Авто)';
}

export function calculateAgeFromBirthDate(birthDateStr: string, refDateStr?: string): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (Number.isNaN(birth.getTime())) return null;
  const ref = refDateStr ? new Date(refDateStr) : new Date();
  const effectiveRef = Number.isNaN(ref.getTime()) ? new Date() : ref;
  let age = effectiveRef.getFullYear() - birth.getFullYear();
  const m = effectiveRef.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && effectiveRef.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 && age <= 125 ? age : null;
}

export function calculateDiva5Summary(state: Diva5ClinicalState): Diva5CalculatedSummary {
  const autoVerdict = state.settings.autoVerdictOnExampleSelect;

  let inattentionAdultCount = 0;
  let inattentionChildhoodCount = 0;
  let hyperactivityAdultCount = 0;
  let hyperactivityChildhoodCount = 0;
  let answeredSymptomBlocks = 0;
  const unansweredBlockLabels: string[] = [];

  for (const sym of DIVA5_SYMPTOMS) {
    const ans = state.symptoms[sym.id];
    const adultPresent = ans
      ? computeEffectiveSymptomPresence(ans.adult, autoVerdict)
      : null;
    const childPresent = ans
      ? computeEffectiveSymptomPresence(ans.childhood, autoVerdict)
      : null;

    if (adultPresent !== null) {
      answeredSymptomBlocks++;
    } else {
      unansweredBlockLabels.push(`${sym.codeLabel} (Зрелость)`);
    }

    if (childPresent !== null) {
      answeredSymptomBlocks++;
    } else {
      unansweredBlockLabels.push(`${sym.codeLabel} (Детство)`);
    }

    if (sym.part === 1) {
      if (adultPresent === true) inattentionAdultCount++;
      if (childPresent === true) inattentionChildhoodCount++;
    } else {
      if (adultPresent === true) hyperactivityAdultCount++;
      if (childPresent === true) hyperactivityChildhoodCount++;
    }
  }

  const unansweredSymptomBlocks = 36 - answeredSymptomBlocks;

  // Count affected impairment domains (0..5)
  let impairmentDomainsAdultCount = 0;
  let impairmentDomainsChildhoodCount = 0;

  for (const dom of DIVA5_IMPAIRMENT_DOMAINS) {
    const domAns = state.impairmentDomains[dom.id];
    if (domAns) {
      const adultAff = computeEffectiveDomainAffected(domAns.adult, autoVerdict);
      const childAff = computeEffectiveDomainAffected(domAns.childhood, autoVerdict);
      if (adultAff === true) impairmentDomainsAdultCount++;
      if (childAff === true) impairmentDomainsChildhoodCount++;
    }
  }

  // Criterion A checks
  const autoCriterionAChildhood =
    inattentionChildhoodCount >= 3 || hyperactivityChildhoodCount >= 3;
  const criterionAChildhoodMet =
    state.dsm5Form.criterionAChildhoodOverride !== null
      ? state.dsm5Form.criterionAChildhoodOverride
      : autoCriterionAChildhood;

  const autoCriterionAAdultInattention = inattentionAdultCount >= 5;
  const criterionAAdultInattentionMet =
    state.dsm5Form.criterionAAdultInattentionOverride !== null
      ? state.dsm5Form.criterionAAdultInattentionOverride
      : autoCriterionAAdultInattention;

  const autoCriterionAAdultHyperactivity = hyperactivityAdultCount >= 5;
  const criterionAAdultHyperactivityMet =
    state.dsm5Form.criterionAAdultHyperactivityOverride !== null
      ? state.dsm5Form.criterionAAdultHyperactivityOverride
      : autoCriterionAAdultHyperactivity;

  const criterionAMet =
    criterionAChildhoodMet &&
    (criterionAAdultInattentionMet || criterionAAdultHyperactivityMet);

  // Criterion B check
  const criterionBMet = state.criterionB.alwaysPresentBefore12 === true;

  // Criterion C & D check (impairment in >= 2 domains in both adulthood and childhood)
  const autoCDAdult = impairmentDomainsAdultCount >= 2;
  const criterionCDAdultMet =
    state.criterionCD.adultIsManualOverride && state.criterionCD.adultImpairmentMet !== null
      ? state.criterionCD.adultImpairmentMet
      : state.criterionCD.adultImpairmentMet !== null
        ? state.criterionCD.adultImpairmentMet
        : autoCDAdult;

  const autoCDChildhood = impairmentDomainsChildhoodCount >= 2;
  const criterionCDChildhoodMet =
    state.criterionCD.childhoodIsManualOverride && state.criterionCD.childhoodImpairmentMet !== null
      ? state.criterionCD.childhoodImpairmentMet
      : state.criterionCD.childhoodImpairmentMet !== null
        ? state.criterionCD.childhoodImpairmentMet
        : autoCDChildhood;

  const criterionCDMet = criterionCDAdultMet && criterionCDChildhoodMet;

  // Criterion E check: must NOT be better explained by another mental disorder (false)
  const criterionEMet = state.dsm5Form.criterionEBetterExplainedByOther === false;

  // Consistency checks
  const consistencyWarnings: string[] = [];
  if (
    state.criterionB.alwaysPresentBefore12 === true &&
    inattentionChildhoodCount < 3 &&
    hyperactivityChildhoodCount < 3
  ) {
    consistencyWarnings.push(
      `Критерий B отмечен как «Да» (симптомы до 12 лет), однако в разделе Детства набрано менее 3 симптомов в обеих шкалах (Д: ${inattentionChildhoodCount}/9, ГИ: ${hyperactivityChildhoodCount}/9).`
    );
  }
  if (
    state.criterionB.alwaysPresentBefore12 === false &&
    (inattentionChildhoodCount >= 3 || hyperactivityChildhoodCount >= 3)
  ) {
    consistencyWarnings.push(
      `Критерий B отмечен как «Нет», хотя в разделе Детства (5–12 лет) зафиксировано ≥ 3 симптомов (Д: ${inattentionChildhoodCount}/9, ГИ: ${hyperactivityChildhoodCount}/9).`
    );
  }
  if (
    state.criterionCD.adultImpairmentMet === true &&
    impairmentDomainsAdultCount < 2
  ) {
    consistencyWarnings.push(
      `Итог Критерия C (Зрелость) отмечен как «Да», но выбрано менее 2 затронутых сфер во взрослом возрасте (${impairmentDomainsAdultCount} из 5).`
    );
  }
  if (
    state.criterionCD.childhoodImpairmentMet === true &&
    impairmentDomainsChildhoodCount < 2
  ) {
    consistencyWarnings.push(
      `Итог Критерия C (Детство) отмечен как «Да», но выбрано менее 2 затронутых сфер в детстве (${impairmentDomainsChildhoodCount} из 5).`
    );
  }

  // Algorithmic diagnosis and presentation suggestion (page 19 rule **: adult presentation prevails)
  const algorithmicDiagnosisMet =
    criterionAMet && criterionBMet && criterionCDMet && criterionEMet;

  let algorithmicSubtypeCode: SubtypeCode | null = null;
  let algorithmicSuggestionLabel =
    'Условия DSM-5 для постановки диагноза СДВГ не выполнены в полном объеме';

  if (algorithmicDiagnosisMet) {
    if (criterionAAdultInattentionMet && criterionAAdultHyperactivityMet) {
      algorithmicSubtypeCode = '314.01_combined';
    } else if (criterionAAdultInattentionMet) {
      algorithmicSubtypeCode = '314.00_inattentive';
    } else if (criterionAAdultHyperactivityMet) {
      algorithmicSubtypeCode = '314.01_hyperactive';
    }
    const foundOption = SUBTYPE_PRESENTATION_OPTIONS.find(
      (o) => o.code === algorithmicSubtypeCode
    );
    if (foundOption) {
      algorithmicSuggestionLabel = foundOption.fullLabel;
    }
  } else {
    const failedReasons: string[] = [];
    if (!criterionAChildhoodMet) {
      failedReasons.push('Критерий A (Детство < 3 симптомов)');
    }
    if (!criterionAAdultInattentionMet && !criterionAAdultHyperactivityMet) {
      failedReasons.push('Критерий A (Зрелость < 5 симптомов в обеих шкалах)');
    }
    if (!criterionBMet) {
      failedReasons.push('Критерий B (нет подтверждения дебюта до 12 лет)');
    }
    if (!criterionCDMet) {
      failedReasons.push('Критерии C/D (нарушения менее чем в 2 сферах в зрелости или детстве)');
    }
    if (!criterionEMet) {
      failedReasons.push('Критерий E (симптомы объясняются другим психическим расстройством)');
    }
    algorithmicSuggestionLabel = `Диагноз СДВГ не подтверждается алгоритмически (${failedReasons.join('; ')})`;
  }

  return {
    inattentionAdultCount,
    inattentionChildhoodCount,
    hyperactivityAdultCount,
    hyperactivityChildhoodCount,
    answeredSymptomBlocks,
    unansweredSymptomBlocks,
    unansweredBlockLabels,
    impairmentDomainsAdultCount,
    impairmentDomainsChildhoodCount,
    criterionAChildhoodMet,
    criterionAAdultInattentionMet,
    criterionAAdultHyperactivityMet,
    criterionAMet,
    criterionBMet,
    criterionCDAdultMet,
    criterionCDChildhoodMet,
    criterionCDMet,
    criterionEMet,
    consistencyWarnings,
    algorithmicDiagnosisMet,
    algorithmicSubtypeCode,
    algorithmicSuggestionLabel
  };
}
