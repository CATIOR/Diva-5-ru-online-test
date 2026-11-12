export type TriState = boolean | null;

export type CollateralScore = 'н.и.р.' | '0' | '1' | '2';

export type SubtypeCode =
  | '314.01_combined'
  | '314.00_inattentive'
  | '314.01_hyperactive'
  | '314.01_other_specified'
  | '314.01_unspecified';

export type SeverityLevel = 'легкая' | 'умеренная' | 'тяжелая' | null;

export interface SymptomExample {
  id: string;
  text: string;
  hasAsterisk?: boolean;
}

export interface SymptomQuestionData {
  id: string; // 'A1'..'A9', 'HI1'..'HI9'
  dsmCode: string; // 'A1a'..'A1i', 'A2a'..'A2i'
  codeLabel: string; // 'A1'..'A9', 'H/I 1'..'H/I 9'
  part: 1 | 2;
  page: number;
  questionText: string;
  summaryText: string; // Text from page 18 summary table
  footnote?: string;
  helperTip: string;
  adultExamples: SymptomExample[];
  childhoodExamples: SymptomExample[];
}

export interface ImpairmentDomainData {
  id: string; // 'work_education' | 'relationships_family' | 'social_contacts' | 'free_time_hobbies' | 'self_confidence'
  adultTitle: string;
  childhoodTitle: string;
  page: number;
  helperTip: string;
  adultExamples: SymptomExample[];
  childhoodExamples: SymptomExample[];
}

export interface PeriodSymptomState {
  checkedIds: string[];
  otherChecked: boolean;
  otherText: string;
  present: TriState;
  isManualOverride: boolean;
  wasViewed: boolean;
}

export interface SymptomAnswerState {
  adult: PeriodSymptomState;
  childhood: PeriodSymptomState;
}

export interface PeriodDomainState {
  checkedIds: string[];
  otherChecked: boolean;
  otherText: string;
  affected: TriState;
  isManualOverride: boolean;
}

export interface ImpairmentDomainAnswerState {
  adult: PeriodDomainState;
  childhood: PeriodDomainState;
}

export interface PatientInfoState {
  id: string;
  age: number | null;
  sex: 'М' | 'Ж' | 'Не указан';
  assessmentDate: string;
  // Sensitive PDn fields:
  fullName: string;
  birthDate: string;
  clinicianName: string;
  regNumber: string;
}

export interface AppSettingsState {
  anonymizeExport: boolean;
  sessionOnlyPersonalData: boolean;
  autoVerdictOnExampleSelect: boolean;
}

export interface CriterionBState {
  alwaysPresentBefore12: TriState;
  onsetAgeIfLater: string;
}

export interface CriterionCDManualState {
  adultImpairmentMet: TriState;
  adultIsManualOverride: boolean;
  childhoodImpairmentMet: TriState;
  childhoodIsManualOverride: boolean;
  specialNotes: string; // Page 17 "Особенности можно указать здесь:"
}

export interface DSM5FormState {
  // Manual overrides on page 19 if clinician wants to override auto-calculated criteria A
  criterionAChildhoodOverride: TriState;
  criterionAAdultInattentionOverride: TriState;
  criterionAAdultHyperactivityOverride: TriState;
  // Criterion E
  criterionEBetterExplainedByOther: TriState; // false = Нет, true = Да, null = Не оценено
  criterionEExplanation: string;
  // Collateral history (Гетероанамнез)
  collateralFamilyRole: string;
  collateralFamilyScore: CollateralScore;
  collateralPartnerRole: string;
  collateralPartnerScore: CollateralScore;
  collateralSchoolScore: CollateralScore;
  collateralNotes: string;
  // Final decision
  diagnosisConfirmed: TriState; // true = Да, false = Нет, null = Не вынесено
  subtypeCode: SubtypeCode | null;
  inPartialRemission: boolean;
  severity: SeverityLevel;
}

export interface Diva5ClinicalState {
  version: number;
  lastSavedAt: string;
  currentStepIndex: number;
  patient: PatientInfoState;
  settings: AppSettingsState;
  symptoms: Record<string, SymptomAnswerState>;
  criterionB: CriterionBState;
  impairmentDomains: Record<string, ImpairmentDomainAnswerState>;
  criterionCD: CriterionCDManualState;
  dsm5Form: DSM5FormState;
}

export interface Diva5CalculatedSummary {
  // Raw counts (0..9)
  inattentionAdultCount: number;
  inattentionChildhoodCount: number;
  hyperactivityAdultCount: number;
  hyperactivityChildhoodCount: number;
  // Completion counts
  answeredSymptomBlocks: number; // out of 36
  unansweredSymptomBlocks: number;
  unansweredBlockLabels: string[];
  // Domain counts (0..5)
  impairmentDomainsAdultCount: number;
  impairmentDomainsChildhoodCount: number;
  // Effective DSM-5 criteria booleans
  criterionAChildhoodMet: boolean; // >= 3 in A or HI in childhood (or manual override)
  criterionAAdultInattentionMet: boolean; // >= 5 in A in adulthood (or manual override)
  criterionAAdultHyperactivityMet: boolean; // >= 5 in HI in adulthood (or manual override)
  criterionAMet: boolean; // childhood met AND (adult A met OR adult HI met)
  criterionBMet: boolean; // alwaysPresentBefore12 === true
  criterionCDAdultMet: boolean; // >= 2 domains in adult (or manual override on page 17)
  criterionCDChildhoodMet: boolean; // >= 2 domains in childhood (or manual override on page 17)
  criterionCDMet: boolean; // both adult and childhood >= 2 domains
  criterionEMet: boolean; // criterionEBetterExplainedByOther === false (i.e. NOT explained by another disorder)
  // Consistency warnings
  consistencyWarnings: string[];
  // Algorithmic recommendation
  algorithmicDiagnosisMet: boolean;
  algorithmicSubtypeCode: SubtypeCode | null;
  algorithmicSuggestionLabel: string;
}
