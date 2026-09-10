import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildResultsHtml,
  escapeHtml,
  gaugeColorFor,
} from '../src/features/results/exportHtml.js';

function buildFixture() {
  return {
    nutritionPlan: {
      dailyCalories: 2000,
      proteinGrams: 140,
      carbsGrams: 220,
      fatGrams: 60,
      hydrationLiters: 2.5,
      weeklyPlan: [
        {
          day: 'السبت',
          meals: [
            {
              mealType: 'breakfast',
              name: 'شوفان مع لبن',
              time: '08:00',
              ingredients: ['شوفان', 'لبن'],
              calories: 420,
              prepTimeMinutes: 12,
              recipe: 'اخلط المكونات وقدمها.',
            },
          ],
        },
      ],
    },
    exercisePlan: {
      weeklyWorkouts: [
        {
          day: 'السبت',
          type: 'كارديو',
          durationMinutes: 30,
          caloriesBurned: 180,
          exercises: [
            { name: 'مشي سريع', sets: 1, reps: '20 دقيقة', restSeconds: 30, description: 'وتيرة ثابتة.' },
          ],
        },
      ],
    },
    balanceIndex: {
      score: 72,
      mentalScore: 70,
      activityScore: 65,
      nutritionScore: 80,
      levelAr: 'جيد',
      insights: ['نومك بحاجة لتنظيم.'],
      recommendations: ['امشِ 20 دقيقة يومياً.'],
    },
    generatedPlan: { planDurationWeeks: 4 },
    userProfile: {},
  };
}

function extractStyle(html) {
  const match = html.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(match, 'exported document must contain a <style> block');
  return match[1];
}

function usedClasses(html) {
  const body = html.split('</style>')[1] ?? '';
  const classes = new Set();
  for (const match of body.matchAll(/class="([^"]+)"/g)) {
    for (const token of match[1].split(/\s+/)) {
      if (token) classes.add(token);
    }
  }
  return [...classes];
}

test('every class used in the markup has a matching CSS rule (the saved-file styling bug)', () => {
  const html = buildResultsHtml(buildFixture());
  const css = extractStyle(html);
  const missing = usedClasses(html).filter(
    (cls) => !new RegExp(`\\.${cls}(?![A-Za-z0-9_-])`).test(css),
  );
  assert.deepEqual(missing, []);
});

test('the style block has balanced braces', () => {
  const css = extractStyle(buildResultsHtml(buildFixture()));
  const opens = (css.match(/\{/g) ?? []).length;
  const closes = (css.match(/\}/g) ?? []).length;
  assert.ok(opens > 10, 'expected a substantive stylesheet');
  assert.equal(opens, closes);
});

test('document is RTL Arabic with responsive and print rules', () => {
  const html = buildResultsHtml(buildFixture());
  assert.ok(html.includes('<html lang="ar" dir="rtl">'));
  assert.ok(html.includes('@media (max-width:720px)'));
  assert.ok(html.includes('@media print'));
});

test('macro percents and gauge score render with mirrored identity colors', () => {
  const html = buildResultsHtml(buildFixture());
  // 140*4/2000 = 28% protein, 220*4/2000 = 44% carbs, 60*9/2000 = 27% fat.
  assert.ok(html.includes('(28%)'));
  assert.ok(html.includes('(44%)'));
  assert.ok(html.includes('(27%)'));
  assert.ok(html.includes('--p:72'));
  assert.ok(html.includes('linear-gradient(135deg,#7c3aed'));
  assert.ok(html.includes('#c084fc'));
  assert.ok(html.includes('#fbbf24'));
  assert.ok(html.includes('#fb7185'));
});

test('user content is HTML-escaped and no extra scripts are injected', () => {
  const fixture = buildFixture();
  fixture.nutritionPlan.weeklyPlan[0].meals[0].name = '<script>alert(1)</script>';
  const html = buildResultsHtml(fixture);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.equal(html.split('<script>').length - 1, 1);
});

test('escapeHtml covers all special characters', () => {
  assert.equal(escapeHtml('<a href="x">&\'y\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#039;y&#039;&lt;/a&gt;');
});

test('gaugeColorFor follows the on-screen thresholds', () => {
  assert.equal(gaugeColorFor(90), '#10b981');
  assert.equal(gaugeColorFor(75), '#10b981');
  assert.equal(gaugeColorFor(60), '#f59e0b');
  assert.equal(gaugeColorFor(55), '#f59e0b');
  assert.equal(gaugeColorFor(40), '#ef4444');
});
