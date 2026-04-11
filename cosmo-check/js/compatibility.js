// ========================================
// CosmoCheck — Матрица совместимости
// ========================================

/**
 * Вердикты:
 * "good"    — 🟢 Отлично работают вместе
 * "caution" — 🟡 Можно, но с осторожностью
 * "bad"     — 🔴 Не совмещать в одном применении
 */

const COMPATIBILITY_RULES = [
  // ═══════════════════════════════════════
  // РЕТИНОИДЫ — конфликты
  // ═══════════════════════════════════════
  {
    pair: ["retinoid", "aha"],
    verdict: "bad",
    severity: 9,
    title: "Ретинол + AHA = Раздражение",
    reason: "Оба ингредиента активно отшелушивают кожу. Совместное использование серьёзно повреждает защитный барьер и вызывает покраснение, шелушение и ожоги.",
    advice: "Чередуйте по дням: AHA 2–3 раза в неделю, ретинол в остальные дни. Никогда не наносите в один вечер.",
    source: "Paula's Choice, Journal of Cosmetic Dermatology"
  },
  {
    pair: ["retinoid", "bha"],
    verdict: "bad",
    severity: 8,
    title: "Ретинол + BHA = Сильное раздражение",
    reason: "Салициловая кислота + ретинол = двойная нагрузка на кожу. Может вызвать сухость, покраснение и пилинг.",
    advice: "Используйте BHA утром, ретинол вечером. Или чередуйте через день.",
    source: "American Academy of Dermatology"
  },
  {
    pair: ["retinoid", "vitamin_c"],
    verdict: "caution",
    severity: 6,
    title: "Ретинол + Витамин C = Снижение эффективности",
    reason: "Ретинол работает при pH 5–6, витамин C (L-аскорбиновая кислота) при pH 2.5–3.5. Вместе они дестабилизируют друг друга.",
    advice: "Идеальная схема: витамин C утром (защита от UV), ретинол вечером (обновление). Так они дополняют друг друга!",
    source: "British Journal of Dermatology"
  },
  {
    pair: ["retinoid", "benzoyl_peroxide"],
    verdict: "bad",
    severity: 10,
    title: "Ретинол + Бензоилпероксид = Деактивация",
    reason: "Бензоилпероксид буквально разрушает молекулу ретинола, делая его бесполезным. Кроме того, оба сильно раздражают кожу.",
    advice: "Строго разделяйте: бензоилпероксид утром или точечно, ретинол вечером.",
    source: "Journal of Investigative Dermatology"
  },
  {
    pair: ["retinoid", "sulfur"],
    verdict: "bad",
    severity: 7,
    title: "Ретинол + Сера = Пересушивание",
    reason: "Оба ингредиента подсушивают кожу. Вместе могут вызвать сильное шелушение и раздражение.",
    advice: "Чередуйте по дням или наносите серу точечно, ретинол на остальную кожу."
  },

  // ═══════════════════════════════════════
  // РЕТИНОИДЫ — хорошие сочетания
  // ═══════════════════════════════════════
  {
    pair: ["retinoid", "niacinamide"],
    verdict: "good",
    severity: 0,
    title: "Ретинол + Ниацинамид = Идеальный дуэт ✨",
    reason: "Ниацинамид снижает раздражение от ретинола, укрепляет барьер и усиливает его антивозрастной эффект.",
    advice: "Наносите ниацинамид первым, затем ретинол. Или используйте средства, где они уже совмещены.",
    source: "Journal of Cosmetic Dermatology"
  },
  {
    pair: ["retinoid", "humectant"],
    verdict: "good",
    severity: 0,
    title: "Ретинол + Увлажнители = Комфорт",
    reason: "Гиалуроновая кислота и другие увлажнители компенсируют сухость от ретинола.",
    advice: "Нанесите увлажняющую сыворотку ДО ретинола для «подушки», или ПОСЛЕ для закрепления."
  },
  {
    pair: ["retinoid", "ceramide"],
    verdict: "good",
    severity: 0,
    title: "Ретинол + Церамиды = Защита барьера",
    reason: "Церамиды восстанавливают барьер кожи, который ретинол может ослаблять.",
    advice: "Используйте крем с церамидами поверх ретинола — это снизит раздражение."
  },
  {
    pair: ["retinoid", "peptides"],
    verdict: "caution",
    severity: 4,
    title: "Ретинол + Пептиды = Возможна деактивация",
    reason: "Кислая среда ретинола может разрушать некоторые пептиды (особенно медные пептиды). Эффективность обоих может снизиться.",
    advice: "Используйте в разное время суток или чередуйте через день."
  },
  {
    pair: ["retinoid", "pha"],
    verdict: "caution",
    severity: 3,
    title: "Ретинол + PHA = Мягкая комбинация",
    reason: "PHA-кислоты мягче AHA/BHA, но всё равно добавляют отшелушивание поверх ретинола.",
    advice: "Можно использовать, но вводите постепенно. Следите за реакцией кожи."
  },
  {
    pair: ["retinoid", "spf"],
    verdict: "good",
    severity: 0,
    title: "Ретинол + SPF = Обязательно!",
    reason: "Ретинол повышает фоточувствительность кожи. SPF утром — обязательное условие при использовании ретинола.",
    advice: "Ретинол вечером, SPF утром — это не просто совместимость, это необходимость! SPF 30+ минимум."
  },

  // ═══════════════════════════════════════
  // ВИТАМИН C — конфликты и сочетания
  // ═══════════════════════════════════════
  {
    pair: ["vitamin_c", "aha"],
    verdict: "caution",
    severity: 5,
    title: "Витамин C + AHA = Перегрузка кислотами",
    reason: "Оба работают в кислой среде. Вместе могут перекислить кожу и вызвать раздражение.",
    advice: "Витамин C утром, AHA вечером. Или AHA-пилинг 2–3 раза в неделю, витамин C в остальные дни."
  },
  {
    pair: ["vitamin_c", "bha"],
    verdict: "caution",
    severity: 5,
    title: "Витамин C + BHA = Кислотная перегрузка",
    reason: "Два кислых ингредиента вместе. Для некоторых типов кожи это слишком агрессивно.",
    advice: "Разделите по времени суток. BHA утром (в поры), витамин C перед SPF."
  },
  {
    pair: ["vitamin_c", "niacinamide"],
    verdict: "good",
    severity: 0,
    title: "Витамин C + Ниацинамид = Супер-пара ✨",
    reason: "Старые исследования говорили о конфликте, но современная наука подтвердила: они прекрасно работают вместе! Ниацинамид стабилизирует витамин C.",
    advice: "Наносите витамин C первым (он более кислый), затем ниацинамид.",
    source: "International Journal of Cosmetic Science, 2020"
  },
  {
    pair: ["vitamin_c", "antioxidant"],
    verdict: "good",
    severity: 0,
    title: "Витамин C + Антиоксиданты = Мощная защита ✨",
    reason: "Витамин E и феруловая кислота стабилизируют витамин C и усиливают его антиоксидантное действие в 8 раз!",
    advice: "Ищите сыворотки с формулой C+E+Ferulic — золотой стандарт антиоксидантной защиты.",
    source: "SkinCeuticals research, Journal of Investigative Dermatology"
  },
  {
    pair: ["vitamin_c", "humectant"],
    verdict: "good",
    severity: 0,
    title: "Витамин C + Увлажнители = Отлично",
    reason: "Гиалуроновая кислота не мешает работе витамина C и добавляет увлажнение.",
    advice: "Витамин C на чистую кожу, затем увлажняющая сыворотка."
  },
  {
    pair: ["vitamin_c", "spf"],
    verdict: "good",
    severity: 0,
    title: "Витамин C + SPF = Лучшая утренняя рутина ✨",
    reason: "Витамин C усиливает защиту SPF от UV-повреждений. Вместе они дают максимальную защиту.",
    advice: "Утренняя схема: очищение → витамин C → увлажнение → SPF."
  },
  {
    pair: ["vitamin_c", "benzoyl_peroxide"],
    verdict: "bad",
    severity: 8,
    title: "Витамин C + Бензоилпероксид = Окисление",
    reason: "Бензоилпероксид является мощным окислителем и разрушает витамин C, делая его бесполезным.",
    advice: "Используйте бензоилпероксид вечером, витамин C утром."
  },
  {
    pair: ["vitamin_c", "peptides"],
    verdict: "caution",
    severity: 4,
    title: "Витамин C + Пептиды = Нестабильно",
    reason: "Кислая среда витамина C (особенно L-аскорбиновой кислоты) может денатурировать пептиды.",
    advice: "Разделяйте: витамин C утром, пептиды вечером."
  },

  // ═══════════════════════════════════════
  // AHA / BHA — сочетания
  // ═══════════════════════════════════════
  {
    pair: ["aha", "bha"],
    verdict: "caution",
    severity: 6,
    title: "AHA + BHA = Двойная экфолиация",
    reason: "Два типа кислот вместе — серьёзная нагрузка на кожный барьер.",
    advice: "Если кожа опытная и некчувствительная — можно изредка. Новичкам — чередовать. Многие пилинги совмещают их в одном средстве в безопасных концентрациях."
  },
  {
    pair: ["aha", "niacinamide"],
    verdict: "good",
    severity: 0,
    title: "AHA + Ниацинамид = Отличная пара",
    reason: "Ниацинамид успокаивает кожу после отшелушивания AHA и помогает восстановить барьер.",
    advice: "AHA сначала (подождите 10–15 минут), затем ниацинамид."
  },
  {
    pair: ["bha", "niacinamide"],
    verdict: "good",
    severity: 0,
    title: "BHA + Ниацинамид = Лучшие друзья ✨",
    reason: "BHA очищает поры, ниацинамид их сужает. Идеально для жирной и проблемной кожи.",
    advice: "BHA первым, подождите впитывания, затем ниацинамид."
  },
  {
    pair: ["aha", "humectant"],
    verdict: "good",
    severity: 0,
    title: "AHA + Увлажнители = Рекомендуется",
    reason: "Кислоты подсушивают, увлажнители компенсируют. Обязательное сочетание.",
    advice: "После кислотного пилинга обязательно нанесите увлажняющую сыворотку или крем."
  },
  {
    pair: ["bha", "humectant"],
    verdict: "good",
    severity: 0,
    title: "BHA + Увлажнители = Рекомендуется",
    reason: "Салициловая кислота может подсушивать. Увлажнение после — обязательно.",
    advice: "BHA → подождите 15 минут → увлажнитель."
  },
  {
    pair: ["aha", "benzoyl_peroxide"],
    verdict: "bad",
    severity: 7,
    title: "AHA + Бензоилпероксид = Пересушивание",
    reason: "Оба активно сушат и раздражают кожу. Вместе — риск ожога.",
    advice: "Чередуйте по дням, никогда в одном применении."
  },
  {
    pair: ["bha", "benzoyl_peroxide"],
    verdict: "caution",
    severity: 5,
    title: "BHA + Бензоилпероксид = Осторожно",
    reason: "Оба борются с акне разными путями. Комбинация эффективна, но может раздражать.",
    advice: "Можно совмещать при нечувствительной коже. Начните с маленьких концентраций."
  },

  // ═══════════════════════════════════════
  // ПЕПТИДЫ — конфликты
  // ═══════════════════════════════════════
  {
    pair: ["peptides", "aha"],
    verdict: "caution",
    severity: 5,
    title: "Пептиды + AHA = Деактивация",
    reason: "Кислая среда AHA может разрушить пептидные связи, снижая их эффективность.",
    advice: "AHA вечером, пептиды утром. Или подождите 30 минут между нанесением."
  },
  {
    pair: ["peptides", "bha"],
    verdict: "caution",
    severity: 4,
    title: "Пептиды + BHA = Возможный конфликт",
    reason: "Аналогично AHA: кислая среда может влиять на стабильность пептидов.",
    advice: "Разделите по времени суток для максимальной эффективности."
  },
  {
    pair: ["peptides", "niacinamide"],
    verdict: "good",
    severity: 0,
    title: "Пептиды + Ниацинамид = Антивозрастная бомба ✨",
    reason: "Оба работают на восстановление и укрепление кожи. Прекрасно дополняют друг друга.",
    advice: "Можно наносить вместе или слоями. Их совместной эффективности ничто не мешает."
  },
  {
    pair: ["peptides", "humectant"],
    verdict: "good",
    severity: 0,
    title: "Пептиды + Увлажнители = Прекрасно",
    reason: "Увлажнители создают благоприятную среду для проникновения пептидов.",
    advice: "Увлажнитель + пептиды = классическая антивозрастная комбинация."
  },

  // ═══════════════════════════════════════
  // НИАЦИНАМИД — универсальный
  // ═══════════════════════════════════════
  {
    pair: ["niacinamide", "humectant"],
    verdict: "good",
    severity: 0,
    title: "Ниацинамид + Увлажнители = Базовый дуэт",
    reason: "Ниацинамид уменьшает потерю влаги, увлажнители добавляют воду. Идеальный базовый уход.",
    advice: "Используйте в каждой рутине без ограничений."
  },
  {
    pair: ["niacinamide", "ceramide"],
    verdict: "good",
    severity: 0,
    title: "Ниацинамид + Церамиды = Восстановление барьера ✨",
    reason: "Ниацинамид стимулирует выработку собственных церамидов. Внешние церамиды усиливают эффект.",
    advice: "Одна из лучших комбинаций для чувствительной и повреждённой кожи."
  },
  {
    pair: ["niacinamide", "spf"],
    verdict: "good",
    severity: 0,
    title: "Ниацинамид + SPF = Защита",
    reason: "Ниацинамид не влияет на SPF и добавляет антиоксидантную защиту.",
    advice: "Ниацинамид под SPF — отличная утренняя комбинация."
  },

  // ═══════════════════════════════════════
  // БЕНЗОИЛПЕРОКСИД — конфликты
  // ═══════════════════════════════════════
  {
    pair: ["benzoyl_peroxide", "humectant"],
    verdict: "good",
    severity: 0,
    title: "Бензоилпероксид + Увлажнители = Обязательно",
    reason: "БП сильно сушит, увлажнители необходимы для компенсации.",
    advice: "Подождите высыхания БП, нанесите увлажнитель поверх."
  },
  {
    pair: ["benzoyl_peroxide", "niacinamide"],
    verdict: "good",
    severity: 0,
    title: "Бензоилпероксид + Ниацинамид = Хорошая пара",
    reason: "Ниацинамид снижает раздражение и покраснение от бензоилпероксида.",
    advice: "Одна из рекомендованных дерматологами комбинаций для лечения акне."
  },

  // ═══════════════════════════════════════
  // АЗЕЛАИНОВАЯ КИСЛОТА — сочетания
  // ═══════════════════════════════════════
  {
    pair: ["azelaic_acid", "niacinamide"],
    verdict: "good",
    severity: 0,
    title: "Азелаиновая кислота + Ниацинамид = Мечта ✨",
    reason: "Оба борются с пигментацией и воспалением. Вместе дают выраженный результат при розацеа и акне.",
    advice: "Можно наносить слоями — одна из лучших комбинаций для проблемной кожи."
  },
  {
    pair: ["azelaic_acid", "retinoid"],
    verdict: "caution",
    severity: 4,
    title: "Азелаиновая кислота + Ретинол = Можно, но осторожно",
    reason: "Оба могут раздражать. Но азелаиновая кислота мягче AHA/BHA, поэтому комбинация переносится лучше.",
    advice: "Вводите постепенно. Если нет раздражения за 2 недели — безопасно."
  },
  {
    pair: ["azelaic_acid", "vitamin_c"],
    verdict: "good",
    severity: 0,
    title: "Азелаиновая кислота + Витамин C = Осветление",
    reason: "Двойной удар по пигментации с разных сторон. Отличная комбинация для борьбы с пятнами.",
    advice: "Витамин C утром, азелаиновая кислота вечером — или вместе, если кожа переносит."
  },

  // ═══════════════════════════════════════
  // СПИРТ — предупреждения
  // ═══════════════════════════════════════
  {
    pair: ["alcohol", "retinoid"],
    verdict: "bad",
    severity: 8,
    title: "Спирт + Ретинол = Высокий риск раздражения",
    reason: "Спирт разрушает барьер кожи, ретинол усиливает это разрушение.",
    advice: "Избегайте средств с денатурированным спиртом в составе, если используете ретинол."
  },
  {
    pair: ["alcohol", "aha"],
    verdict: "bad",
    severity: 7,
    title: "Спирт + AHA = Пересушивание",
    reason: "Двойная атака на барьер кожи. Особенно опасно для сухой и чувствительной кожи.",
    advice: "Выбирайте кислотные средства БЕЗ спирта в составе."
  },

  // ═══════════════════════════════════════
  // ЦЕНТЕЛЛА — успокоение
  // ═══════════════════════════════════════
  {
    pair: ["centella", "retinoid"],
    verdict: "good",
    severity: 0,
    title: "Центелла + Ретинол = Успокоение",
    reason: "Центелла снижает раздражение от ретинола и ускоряет заживление.",
    advice: "Центелла-крем поверх ретинола — отличная тактика при раздражении."
  },
  {
    pair: ["centella", "aha"],
    verdict: "good",
    severity: 0,
    title: "Центелла + AHA = Восстановление",
    reason: "Центелла помогает коже восстановиться после кислотного отшелушивания.",
    advice: "Нанесите крем или маску с центеллой после кислотного пилинга."
  }
];

// ========================================
// Демо-продукты для тестирования
// ========================================

const DEMO_PRODUCTS = {
  retinolSerum: {
    name: "Youth Renewal Retinol Serum",
    brand: "SkinPerfect",
    ingredients: ["Aqua", "Retinol", "Niacinamide", "Tocopherol", "Squalane", "Hyaluronic Acid", "Glycerin", "Dimethicone", "Phenoxyethanol"]
  },
  ahaExfoliant: {
    name: "Glow Peel AHA Toner",
    brand: "AcidGlow",
    ingredients: ["Aqua", "Glycolic Acid", "Lactic Acid", "Aloe Barbadensis Leaf Extract", "Sodium Hyaluronate", "Panthenol", "Citric Acid", "Phenoxyethanol"]
  },
  vitaminCSerum: {
    name: "Radiance Vitamin C Serum 20%",
    brand: "BrightSkin",
    ingredients: ["Aqua", "Ascorbic Acid", "Ferulic Acid", "Tocopherol", "Hyaluronic Acid", "Panthenol", "Glycerin"]
  },
  niacinamideSerum: {
    name: "Pore Control Niacinamide 10%",
    brand: "ClearFace",
    ingredients: ["Aqua", "Niacinamide", "Zinc PCA", "Hyaluronic Acid", "Glycerin", "Allantoin", "Centella Asiatica Extract", "Panthenol"]
  },
  bpoGel: {
    name: "Acne Clear BPO 5%",
    brand: "DermaClear",
    ingredients: ["Aqua", "Benzoyl Peroxide", "Glycerin", "Dimethicone", "Carbomer", "Sodium Hydroxide"]
  },
  spfCream: {
    name: "UV Shield SPF 50+",
    brand: "SunGuard",
    ingredients: ["Aqua", "Zinc Oxide", "Titanium Dioxide", "Niacinamide", "Tocopherol", "Glycerin", "Squalane", "Dimethicone"]
  }
};

const DEMO_SCENARIOS = [
  {
    id: "danger",
    name: "🔴 Опасная комбинация",
    description: "Ретинол + AHA кислоты",
    product1: DEMO_PRODUCTS.retinolSerum,
    product2: DEMO_PRODUCTS.ahaExfoliant
  },
  {
    id: "caution",
    name: "🟡 Осторожно",
    description: "Витамин C + Ретинол",
    product1: DEMO_PRODUCTS.vitaminCSerum,
    product2: DEMO_PRODUCTS.retinolSerum
  },
  {
    id: "safe",
    name: "🟢 Безопасная комбинация",
    description: "Ниацинамид + Витамин C",
    product1: DEMO_PRODUCTS.niacinamideSerum,
    product2: DEMO_PRODUCTS.vitaminCSerum
  },
  {
    id: "perfect",
    name: "🟢 Идеальная пара",
    description: "Ниацинамид + SPF",
    product1: DEMO_PRODUCTS.niacinamideSerum,
    product2: DEMO_PRODUCTS.spfCream
  }
];

const HIGH_REACTIVITY_CATEGORIES = new Set([
  "retinoid",
  "aha",
  "bha",
  "benzoyl_peroxide",
  "alcohol"
]);

const MODERATE_REACTIVITY_CATEGORIES = new Set([
  "vitamin_c",
  "pha",
  "sulfur",
  "azelaic_acid"
]);

function createHeuristicSameCategoryRule(category) {
  if (HIGH_REACTIVITY_CATEGORIES.has(category)) {
    return {
      pair: [category, category],
      verdict: "caution",
      severity: 5,
      title: "Похожие активы в обеих формулах",
      reason: "В обеих формулах есть активы одного типа, поэтому суммарная нагрузка на кожу может ощущаться сильнее, чем от одного средства.",
      advice: "Если планируете использовать их в одной рутине, начните реже и следите за комфортом кожи."
    };
  }

  if (MODERATE_REACTIVITY_CATEGORIES.has(category)) {
    return {
      pair: [category, category],
      verdict: "caution",
      severity: 3,
      title: "Повтор одного типа актива",
      reason: "Одинаковый тип активов в двух средствах не всегда конфликтует, но может сделать рутину более насыщенной.",
      advice: "Можно начать с более редкого сочетания и посмотреть, насколько комфортно коже."
    };
  }

  return null;
}

// ========================================
// Логика анализа совместимости
// ========================================

/**
 * Анализирует совместимость двух списков ингредиентов
 * @returns {Object} Результат анализа
 */
function analyzeCompatibility(product1Ingredients, product2Ingredients) {
  const { findActiveIngredients } = window.CosmoIngredients;

  const active1 = findActiveIngredients(product1Ingredients);
  const active2 = findActiveIngredients(product2Ingredients);

  const conflicts = [];
  const synergies = [];
  const cautions = [];

  // Проверяем каждую пару категорий
  const categories1 = [...new Set(active1.found.map(i => i.category))];
  const categories2 = [...new Set(active2.found.map(i => i.category))];

  for (const cat1 of categories1) {
    for (const cat2 of categories2) {
      const rule = cat1 === cat2
        ? createHeuristicSameCategoryRule(cat1)
        : findRule(cat1, cat2);
      if (!rule) continue;

      const ingredients1 = active1.found.filter(i => i.category === cat1);
      const ingredients2 = active2.found.filter(i => i.category === cat2);

      const interaction = {
        rule,
        ingredientsA: ingredients1,
        ingredientsB: ingredients2
      };

      if (rule.verdict === "bad") {
        conflicts.push(interaction);
      } else if (rule.verdict === "caution") {
        cautions.push(interaction);
      } else if (rule.verdict === "good") {
        synergies.push(interaction);
      }
    }
  }

  // Определяем общий вердикт
  let overallVerdict = "good";
  let overallSeverity = 0;

  if (conflicts.length > 0) {
    overallVerdict = "bad";
    overallSeverity = Math.max(...conflicts.map(c => c.rule.severity));
  } else if (cautions.length > 0) {
    overallVerdict = "caution";
    overallSeverity = Math.max(...cautions.map(c => c.rule.severity));
  }

  return {
    overallVerdict,
    overallSeverity,
    conflicts,
    cautions,
    synergies,
    product1Active: active1,
    product2Active: active2,
    totalInteractions: conflicts.length + cautions.length + synergies.length
  };
}

/**
 * Найти правило для пары категорий
 */
function findRule(cat1, cat2) {
  return COMPATIBILITY_RULES.find(rule => {
    return (rule.pair[0] === cat1 && rule.pair[1] === cat2) ||
           (rule.pair[0] === cat2 && rule.pair[1] === cat1);
  });
}

/**
 * Получить текст вердикта
 */
function getVerdictText(verdict) {
  switch (verdict) {
    case "good": return { text: "Можно вместе", emoji: "✅", class: "verdict-good" };
    case "caution": return { text: "Лучше с осторожностью", emoji: "⚠️", class: "verdict-caution" };
    case "bad": return { text: "Лучше развести по времени", emoji: "🚫", class: "verdict-bad" };
    default: return { text: "Нет данных", emoji: "❔", class: "verdict-unknown" };
  }
}

/**
 * Получить подробное описание вердикта
 */
function getVerdictDescription(verdict) {
  switch (verdict) {
    case "good":
      return "В этой паре не видно явных конфликтов, поэтому ее обычно можно использовать в одной рутине.";
    case "caution":
      return "Такое сочетание возможно, но лучше учитывать чувствительность кожи и рекомендации по ритму нанесения.";
    case "bad":
      return "Эту пару безопаснее развести по времени суток или по разным дням, чтобы не перегружать кожу.";
    default:
      return "Недостаточно данных для точной оценки.";
  }
}

// Экспорт
window.CosmoCompatibility = {
  COMPATIBILITY_RULES,
  DEMO_PRODUCTS,
  DEMO_SCENARIOS,
  analyzeCompatibility,
  findRule,
  getVerdictText,
  getVerdictDescription
};
