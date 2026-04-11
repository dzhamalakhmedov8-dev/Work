import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function loadBrowserScript(relativePath, context) {
  const filePath = path.resolve(process.cwd(), relativePath);
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInContext(code, context, { filename: filePath });
}

function createContext() {
  const context = vm.createContext({
    window: {},
    console,
    setTimeout,
    clearTimeout
  });
  context.window.window = context.window;
  return context;
}

function loadModules() {
  const context = createContext();
  loadBrowserScript('js/ingredients.js', context);
  loadBrowserScript('js/compatibility.js', context);
  return {
    ingredients: context.window.CosmoIngredients,
    compatibility: context.window.CosmoCompatibility
  };
}

test('Bakuchiol is not treated as a retinoid', () => {
  const { ingredients } = loadModules();
  const found = ingredients.findIngredient('Bakuchiol');
  assert.ok(found);
  assert.equal(found.id, 'bakuchiol');
  assert.equal(found.category, 'bakuchiol');
});

test('Citric Acid is treated as pH adjuster rather than AHA conflict driver', () => {
  const { ingredients } = loadModules();
  const found = ingredients.findIngredient('Citric Acid');
  assert.ok(found);
  assert.equal(found.category, 'ph_adjuster');
});

test('Retinol with glycolic acid returns bad overall verdict', () => {
  const { compatibility } = loadModules();
  const result = compatibility.analyzeCompatibility(
    ['Aqua', 'Retinol', 'Glycerin'],
    ['Aqua', 'Glycolic Acid', 'Panthenol']
  );

  assert.equal(result.overallVerdict, 'bad');
  assert.ok(result.conflicts.some((item) => {
    const pair = item.rule.pair.slice().sort().join(':');
    return pair === ['aha', 'retinoid'].sort().join(':');
  }));
});

test('Niacinamide with Vitamin C remains good', () => {
  const { compatibility } = loadModules();
  const result = compatibility.analyzeCompatibility(
    ['Aqua', 'Niacinamide', 'Glycerin'],
    ['Aqua', 'Ascorbic Acid', 'Ferulic Acid']
  );

  assert.equal(result.overallVerdict, 'good');
  assert.ok(result.synergies.some((item) => {
    const pair = item.rule.pair.slice().sort().join(':');
    return pair === ['niacinamide', 'vitamin_c'].sort().join(':');
  }));
});

test('Unknown ingredients do not crash active ingredient detection', () => {
  const { ingredients } = loadModules();
  const result = ingredients.findActiveIngredients([
    'Mystery Extract',
    'Aqua',
    'Totally Custom Complex'
  ]);

  assert.equal(result.found.length, 0);
  assert.deepEqual(result.notFound, ['Mystery Extract', 'Aqua', 'Totally Custom Complex']);
});

test('Same-category retinoid pair falls back to caution heuristic', () => {
  const { compatibility } = loadModules();
  const result = compatibility.analyzeCompatibility(
    ['Retinol', 'Squalane'],
    ['Hydroxypinacolone Retinoate', 'Glycerin']
  );

  assert.equal(result.overallVerdict, 'caution');
  assert.ok(result.cautions.some((item) => item.rule.title.includes('Похожие активы')));
});
