import { calculateBalanceIndex } from "../../utils/balanceIndex.js";

/**
 * Pure HTML export builder for the results page ("حفظ صفحة النتائج كاملة").
 *
 * Lives outside the React component so the exported document is unit
 * testable: every CSS class the markup emits must have a matching rule
 * (the exact bug class that once left the gauge, scores, lists, and macro
 * bars unstyled in saved files).
 *
 * Visual identity mirrors the on-screen results page:
 * - Hero gradient + glass metric cards from PlanSummaryCard
 *   (linear-gradient(135deg,#7c3aed,#0f766e,#14b8a6)).
 * - Macro fills purple-400/amber-400/rose-400 (#c084fc/#fbbf24/#fb7185).
 * - Sub-score fills purple-500/emerald-500/amber-500 (#a855f7/#10b981/#f59e0b).
 * - Section titles in brand green #1b4d3e, Cairo/Plus Jakarta Sans type stack.
 */

const MEAL_TYPE_LABELS = {
  breakfast: "الفطور",
  lunch: "الغداء",
  dinner: "العشاء",
  snack: "وجبة خفيفة",
};

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"];

/** Sub-score bar colors, mirroring BalanceIndexDisplay SUB_SCORE_CONFIG. */
const SCORE_COLORS = {
  mental: "#a855f7",
  activity: "#10b981",
  nutrition: "#f59e0b",
};

/** Macro bar fills, mirroring PlanSummaryCard macroBars. */
const MACRO_COLORS = {
  protein: "#c084fc",
  carbs: "#fbbf24",
  fat: "#fb7185",
};

/**
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Gauge ring color thresholds, mirroring BalanceIndexDisplay getGaugeColor.
 * @param {number} score 0-100 score.
 * @returns {string} Hex color.
 */
export function gaugeColorFor(score) {
  if (score >= 75) return "#10b981";
  if (score >= 55) return "#f59e0b";
  return "#ef4444";
}

/**
 * @param {unknown} meal
 * @param {string} mealType
 * @returns {string}
 */
export function renderMealCard(meal, mealType) {
  const typeLabel = MEAL_TYPE_LABELS[mealType] ?? "وجبة";
  const ingredients = Array.isArray(meal?.ingredients) ? meal.ingredients : [];
  return `<article class="meal-card"><div class="card-heading"><div><h3>${escapeHtml(meal?.name ?? "وجبة")}</h3><p>${typeLabel} • ${escapeHtml(meal?.time ?? "")} • ${escapeHtml(meal?.prepTimeMinutes ?? "")} دقيقة</p></div><strong>${escapeHtml(meal?.calories ?? 0)} سعرة</strong></div><div class="chips">${ingredients.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div><button type="button" class="detail-button" data-detail-target>عرض طريقة التحضير</button><div class="detail-panel" hidden><h4>طريقة التحضير</h4><p>${escapeHtml(meal?.recipe ?? "لا توجد تفاصيل متاحة")}</p></div></article>`;
}

/**
 * @param {unknown} workout
 * @param {number} index
 * @returns {string}
 */
export function renderWorkout(workout, index) {
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  return `<article class="workout-panel" data-workout-panel="${index}" ${index === 0 ? "" : "hidden"}><div class="card-heading"><div><h3>${escapeHtml(workout?.day ?? `اليوم ${index + 1}`)}</h3><p>${escapeHtml(workout?.type ?? "تمرين")}</p></div><strong>${escapeHtml(workout?.durationMinutes ?? 0)} دقيقة • ${escapeHtml(workout?.caloriesBurned ?? 0)} سعرة</strong></div><p class="notice">ابدأ بـ 5 دقائق إحماء خفيف قبل التمرين</p>${exercises.map((exercise, exerciseIndex) => `<article class="exercise-card"><h4>${exerciseIndex + 1}. ${escapeHtml(exercise?.name ?? "تمرين")}</h4><div class="stats"><span>${escapeHtml(exercise?.sets ?? 0)} مجموعة</span><span>${escapeHtml(exercise?.reps ?? "")} تكرار</span><span>${escapeHtml(exercise?.restSeconds ?? 0)}ث راحة</span></div><p>${escapeHtml(exercise?.description ?? "")}</p></article>`).join("")}<p class="notice success">اختم بـ 5 دقائق تمدد وإطالة</p></article>`;
}

/**
 * @param {unknown[]} items
 * @param {boolean} [numbered=false]
 * @returns {string}
 */
export function renderListItems(items, numbered = false) {
  return items
    .map(
      (item, index) =>
        `<li>${numbered ? `<span class="list-number">${index + 1}</span>` : '<span class="list-dot"></span>'}<span>${escapeHtml(item)}</span></li>`,
    )
    .join("");
}

/**
 * @param {unknown} value
 * @returns {number} Clamped 0-100 integer.
 */
function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

/**
 * Builds the complete standalone results document.
 * @param {{
 *  nutritionPlan?: any,
 *  exercisePlan?: any,
 *  balanceIndex?: any,
 *  generatedPlan?: any,
 *  userProfile?: any
 * }} data Plan data (same shapes as the app contexts).
 * @returns {string} Full HTML document.
 */
export function buildResultsHtml(data) {
  const { nutritionPlan, exercisePlan, userProfile } = data ?? {};
  const storedBalanceIndex = data?.balanceIndex;
  const generatedPlan = data?.generatedPlan;

  const balanceIndex =
    storedBalanceIndex && typeof storedBalanceIndex.score === "number"
      ? storedBalanceIndex
      : calculateBalanceIndex(userProfile);

  const score = clampScore(balanceIndex?.score);
  const mentalScore = clampScore(balanceIndex?.mentalScore);
  const activityScore = clampScore(balanceIndex?.activityScore);
  const nutritionScore = clampScore(balanceIndex?.nutritionScore);

  const insights =
    Array.isArray(balanceIndex?.insights) && balanceIndex.insights.length > 0
      ? balanceIndex.insights
      : ["لا توجد ملاحظات كافية حالياً. أكمل بياناتك لتحليل أعمق."];
  const recommendations =
    Array.isArray(balanceIndex?.recommendations) && balanceIndex.recommendations.length > 0
      ? balanceIndex.recommendations
      : ["ابدأ بخطوة بسيطة اليوم: وجبة متوازنة + 20 دقيقة حركة خفيفة."];

  const dailyCalories = Number(nutritionPlan?.dailyCalories ?? 0);
  const proteinGrams = Number(nutritionPlan?.proteinGrams ?? 0);
  const carbsGrams = Number(nutritionPlan?.carbsGrams ?? 0);
  const fatGrams = Number(nutritionPlan?.fatGrams ?? 0);
  const proteinPercent = dailyCalories > 0 ? Math.round(((proteinGrams * 4) / dailyCalories) * 100) : 0;
  const carbsPercent = dailyCalories > 0 ? Math.round(((carbsGrams * 4) / dailyCalories) * 100) : 0;
  const fatPercent = dailyCalories > 0 ? Math.round(((fatGrams * 9) / dailyCalories) * 100) : 0;

  const weeklyMeals = Array.isArray(nutritionPlan?.weeklyPlan) ? nutritionPlan.weeklyPlan : [];
  const weeklyWorkouts = Array.isArray(exercisePlan?.weeklyWorkouts) ? exercisePlan.weeklyWorkouts : [];

  const mealDays = weeklyMeals
    .map(
      (day, index) =>
        `<section class="day-panel" data-meal-day="${index}" ${index === 0 ? "" : "hidden"}><h2>${escapeHtml(day?.day ?? `اليوم ${index + 1}`)}</h2><div class="grid">${(Array.isArray(day?.meals) ? day.meals : []).map((meal, mealIndex) => renderMealCard(meal, meal?.mealType ?? MEAL_TYPE_ORDER[mealIndex])).join("")}</div></section>`,
    )
    .join("");
  const mealDayTabs = weeklyMeals
    .map(
      (day, index) =>
        `<button type="button" class="tab meal-day-tab${index === 0 ? " active" : ""}" data-meal-day-select="${index}">${escapeHtml(day?.day ?? `اليوم ${index + 1}`)}</button>`,
    )
    .join("");
  const workoutTabs = weeklyWorkouts
    .map(
      (workout, index) =>
        `<button type="button" class="tab workout-tab${index === 0 ? " active" : ""}" data-workout-index="${index}">${escapeHtml(workout?.day ?? `اليوم ${index + 1}`)} — ${escapeHtml(workout?.type ?? "تمرين")}</button>`,
    )
    .join("");
  const workoutPanels = weeklyWorkouts.map((workout, index) => renderWorkout(workout, index)).join("");

  const scoreRows = [
    ["النتيجة النفسية", mentalScore, SCORE_COLORS.mental],
    ["النتيجة البدنية", activityScore, SCORE_COLORS.activity],
    ["الجاهزية الغذائية", nutritionScore, SCORE_COLORS.nutrition],
  ]
    .map(
      ([label, value, color]) =>
        `<div class="score-row"><div class="score-row-header"><span>${label}</span><span>${value}/100</span></div><div class="bar"><span style="width:${value}%;background:${color}"></span></div></div>`,
    )
    .join("");

  const macroRows = [
    ["البروتين", proteinGrams, proteinPercent, MACRO_COLORS.protein],
    ["الكربوهيدرات", carbsGrams, carbsPercent, MACRO_COLORS.carbs],
    ["الدهون", fatGrams, fatPercent, MACRO_COLORS.fat],
  ]
    .map(
      ([label, grams, percent, color]) =>
        `<div class="macro-row"><div class="macro-label"><span>${label}</span><span>${escapeHtml(grams)}غ (${percent}%)</span></div><div class="bar"><span style="width:${Math.min(100, percent)}%;background:${color}"></span></div></div>`,
    )
    .join("");

  const title = "خطة VITRA الصحية الكاملة";

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
:root{
  --brand-green:#1b4d3e;
  --brand-teal:#0f766e;
  --brand-teal-light:#14b8a6;
  --brand-purple:#7c3aed;
  --ink:#172033;
  --muted:#64748b;
  --line:#dbe4e0;
  --page:#f4f8f6;
  --card:#ffffff;
  --chip:#eef7f2;
  --track:#e2e8f0;
  --protein:#c084fc;
  --carbs:#fbbf24;
  --fat:#fb7185;
  --gauge-good:#10b981;
  --gauge-mid:#f59e0b;
  --gauge-bad:#ef4444;
  --notice:#fff4df;
  --notice-ink:#8a4b08;
  --success:#e6f6ed;
  --success-ink:#166534;
}
*{box-sizing:border-box}
body{margin:0;padding:24px;background:var(--page);color:var(--ink);font-family:"Plus Jakarta Sans","Cairo","Segoe UI",Tahoma,Arial,sans-serif;line-height:1.7}
main{max-width:1120px;margin:auto}
.hero{padding:28px;border-radius:24px;color:#fff;background:linear-gradient(135deg,#7c3aed 0%,#0f766e 52%,#14b8a6 100%);margin-bottom:20px}
.hero h1{margin:0 0 8px;font-size:1.6rem}
.hero p{margin:0;opacity:.85}
.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:20px}
.metric{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:16px;color:#fff}
.metric strong{display:block;font-size:1.5rem;margin-top:4px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.meal-card,.workout-panel,.exercise-card,.balance,.summary-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin:12px 0;box-shadow:0 6px 18px rgba(15,23,42,.04)}
.section-title{color:var(--brand-green);margin:30px 0 12px;font-size:1.3rem}
.card-heading{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
.card-heading h3,.exercise-card h4{margin:0;color:var(--brand-green)}
.card-heading p{margin:4px 0;color:var(--muted);font-size:.9rem}
.card-heading strong{white-space:nowrap}
.chips,.stats,.tabs{display:flex;flex-wrap:wrap;gap:8px}
.chips span,.stats span{background:var(--chip);border-radius:999px;padding:3px 10px;font-size:.85rem}
.tab,.detail-button{border:1px solid #b8d8c9;border-radius:10px;padding:9px 14px;background:#fff;color:var(--brand-green);cursor:pointer;font-weight:700;font-family:inherit}
.tab.active{background:var(--brand-green);color:#fff}
.meal-day-tab,.workout-tab{font-size:.9rem}
.detail-button{margin-top:12px}
.detail-panel{border-top:1px solid var(--line);margin-top:12px;padding-top:10px}
.detail-panel h4{margin:0 0 6px;color:var(--brand-green)}
.notice{background:var(--notice);color:var(--notice-ink);border-radius:10px;padding:10px;margin:12px 0}
.notice.success{background:var(--success);color:var(--success-ink)}
.tabs{margin:10px 0 16px}
.meal-day-tabs{margin-top:4px}
.day-panel h2{margin:6px 0 4px;color:var(--brand-green);font-size:1.1rem}
.macro-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:18px}
.macro-row{margin:10px 0}
.macro-label{display:flex;justify-content:space-between;font-size:.9rem;font-weight:700}
.bar{height:10px;background:var(--track);border-radius:99px;overflow:hidden;margin-top:5px}
.bar span{display:block;height:100%;border-radius:99px}
.balance-grid{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px;align-items:start}
.gauge{width:150px;height:150px;border-radius:50%;margin:4px auto;display:flex;align-items:center;justify-content:center;background:conic-gradient(var(--g,#10b981) calc(var(--p,0)*1%),var(--track) 0)}
.gauge-value{width:112px;height:112px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:1.8rem;font-weight:800;color:var(--ink)}
.gauge-value small{font-size:.7rem;color:var(--muted);font-weight:400}
.score-row{margin:12px 0}
.score-row-header{display:flex;justify-content:space-between;font-size:.9rem;font-weight:700}
.list{list-style:none;margin:10px 0;padding:0}
.list li{display:flex;align-items:flex-start;gap:8px;margin:8px 0}
.list-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--brand-teal-light);margin-top:8px}
.list-number{flex:none;min-width:24px;height:24px;border-radius:50%;background:var(--brand-green);color:#fff;font-size:.8rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;margin-top:2px}
.summary-card h3{margin:0 0 4px;color:var(--brand-green)}
@media (max-width:720px){
  .metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .grid,.macro-grid,.balance-grid{grid-template-columns:minmax(0,1fr)}
}
@media print{
  body{background:#fff;padding:0}
  .tabs,.detail-button{display:none !important}
  .day-panel[hidden],.workout-panel[hidden],.detail-panel[hidden]{display:block !important}
  .meal-card,.workout-panel,.balance,.summary-card{box-shadow:none}
}
</style>
</head>
<body><main>
<header class="hero"><h1>${title}</h1><p>الخطة الكاملة المنسقة والمولدة بواسطة VITRA</p><div class="metrics"><div class="metric">السعرات اليومية<strong>${escapeHtml(nutritionPlan?.dailyCalories ?? 0)}</strong></div><div class="metric">البروتين<strong>${escapeHtml(nutritionPlan?.proteinGrams ?? 0)}غ</strong></div><div class="metric">الماء<strong>${escapeHtml(nutritionPlan?.hydrationLiters ?? 0)}ل</strong></div><div class="metric">المدة<strong>${escapeHtml(generatedPlan?.planDurationWeeks ?? 4)} أسابيع</strong></div></div></header>
<section class="summary-card"><h2 class="section-title">الخطة الصحية المخصصة</h2><p>مولّدة بالذكاء الاصطناعي بناءً على بياناتك مع توزيع واضح للطاقة والبروتين والنشاط.</p><div class="macro-grid">${macroRows}</div></section>
<section class="balance"><div class="card-heading"><div><h2 class="section-title">مؤشر التوازن الصحي</h2><p>ربط علمي بين غذائك وجسدك وعقلك</p></div><strong>${escapeHtml(balanceIndex?.levelAr ?? "غير متاح")}</strong></div><div class="balance-grid"><div><div class="gauge" style="--p:${score};--g:${gaugeColorFor(score)}"><div class="gauge-value">${score}<small>من 100</small></div></div>${scoreRows}</div><div><div class="summary-card"><h3>ما يقوله مؤشرك</h3><ul class="list">${renderListItems(insights)}</ul></div><div class="summary-card"><h3>توصيات فورية</h3><ol class="list">${renderListItems(recommendations, true)}</ol></div></div></div></section>
<h2 class="section-title">الخطة الغذائية الأسبوعية</h2><div class="tabs"><button class="tab active" data-meal-view="daily">يومي</button><button class="tab" data-meal-view="weekly">أسبوعي</button></div><div class="tabs meal-day-tabs" data-daily-days>${mealDayTabs}</div><div id="meal-days">${mealDays}</div>
<div id="workout-section"><h2 class="section-title">خطة النشاط البدني</h2><div class="tabs">${workoutTabs}</div>${workoutPanels}</div>
</main>
<script>
document.querySelectorAll('[data-detail-target]').forEach(function(button){button.addEventListener('click',function(){var panel=button.parentElement.querySelector('.detail-panel');var hidden=panel.hasAttribute('hidden');if(hidden){panel.removeAttribute('hidden');button.textContent='إخفاء طريقة التحضير';}else{panel.setAttribute('hidden','');button.textContent='عرض طريقة التحضير';}});});
document.querySelectorAll('[data-meal-view]').forEach(function(button){button.addEventListener('click',function(){document.querySelectorAll('[data-meal-view]').forEach(function(item){item.classList.toggle('active',item===button);});var weekly=button.getAttribute('data-meal-view')==='weekly';document.querySelectorAll('[data-meal-day-select]').forEach(function(item){item.hidden=weekly;});document.querySelectorAll('[data-meal-day]').forEach(function(day){day.hidden=!weekly&&day.getAttribute('data-meal-day')!=='0';});});});
document.querySelectorAll('[data-meal-day-select]').forEach(function(button){button.addEventListener('click',function(){document.querySelectorAll('[data-meal-day-select]').forEach(function(item){item.classList.toggle('active',item===button);});document.querySelectorAll('[data-meal-day]').forEach(function(day){day.hidden=day.getAttribute('data-meal-day')!==button.getAttribute('data-meal-day-select');});});});
document.querySelectorAll('[data-workout-index]').forEach(function(button){button.addEventListener('click',function(){document.querySelectorAll('[data-workout-index]').forEach(function(item){item.classList.toggle('active',item===button);});document.querySelectorAll('[data-workout-panel]').forEach(function(panel){panel.hidden=panel.getAttribute('data-workout-panel')!==button.getAttribute('data-workout-index');});});});
</script>
</body>
</html>`;
}
