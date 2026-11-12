import test from 'node:test';
import assert from 'node:assert/strict';
import { runSelfVerification } from './selfVerification';
import { calculateDiva5Summary, createInitialDiva5State } from './scoring';
import { stripPersonalData, validateAndHydrateState } from './storage';
import { generateDiva5Markdown } from './markdownExport';

test('Self-verification Schema Check and 5 TDD scenarios pass 100%', () => {
  const report = runSelfVerification();
  assert.equal(report.allPassed, true, `Failed checks: ${JSON.stringify(report)}`);
  assert.equal(report.schemaChecks.length, 3);
  assert.equal(report.tddChecks.length, 5);
});

test('stripPersonalData removes all 4 sensitive PDn fields while keeping safe fields', () => {
  const state = createInitialDiva5State();
  state.patient.fullName = 'Иванов Иван Иванович';
  state.patient.birthDate = '1995-05-15';
  state.patient.clinicianName = 'Д-р Смирнова А.В.';
  state.patient.regNumber = 'REG-998877';
  state.patient.age = 31;
  state.patient.sex = 'М';

  const stripped = stripPersonalData(state);
  assert.equal(stripped.patient.fullName, '');
  assert.equal(stripped.patient.birthDate, '');
  assert.equal(stripped.patient.clinicianName, '');
  assert.equal(stripped.patient.regNumber, '');
  assert.equal(stripped.patient.age, 31);
  assert.equal(stripped.patient.sex, 'М');
  assert.equal(stripped.patient.id, state.patient.id);
});

test('Consistency warning triggers when Criterion B is Yes but childhood symptoms < 3', () => {
  const state = createInitialDiva5State();
  state.criterionB.alwaysPresentBefore12 = true;
  state.symptoms.A1.childhood.checkedIds = ['A1_child_1'];
  const summary = calculateDiva5Summary(state);
  assert.equal(summary.consistencyWarnings.length, 1);
  assert.equal(summary.criterionBMet, true);
  assert.equal(summary.criterionAChildhoodMet, false);
});

test('Markdown export generates valid YAML frontmatter and escapes quotes properly', () => {
  const state = createInitialDiva5State();
  state.patient.fullName = 'Петров "Кавычки" Петр';
  state.settings.anonymizeExport = false;
  state.symptoms.A1.adult.otherText = 'Теряю "важные" ключи';
  state.symptoms.A1.adult.otherChecked = true;

  const md = generateDiva5Markdown(state, 'compact_ai');
  assert.ok(md.startsWith('---\ndocument: "DIVA-5 Clinical Assessment Report"'));
  assert.ok(md.includes('full_name: "Петров \\"Кавычки\\" Петр"'));
  assert.ok(md.includes('## 1. Сводная таблица подсчета симптомов и критериев DSM-5 (Стр. 18–19)'));
  assert.ok(md.includes('## 2. Сводка всех свободных комментариев и анамнеза'));
  assert.ok(md.includes('Теряю "важные" ключи'));
});

test('validateAndHydrateState rejects corrupted objects and hydrates partial valid drafts', () => {
  assert.equal(validateAndHydrateState(null), null);
  assert.equal(validateAndHydrateState('corrupted'), null);
  assert.equal(validateAndHydrateState({}), null);

  const valid = createInitialDiva5State();
  const hydrated = validateAndHydrateState(valid);
  assert.ok(hydrated !== null);
  assert.equal(hydrated?.patient.id, valid.patient.id);
});
