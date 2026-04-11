// ========================================
// CosmoCheck — База данных ингредиентов
// ========================================

const INGREDIENT_CATEGORIES = {
  retinoid: {
    id: "retinoid",
    name: "Ретиноиды",
    nameEn: "Retinoids",
    icon: "🔬",
    color: "#e74c3c",
    description: "Производные витамина А. Стимулируют обновление клеток, борются с морщинами и акне.",
    irritation: "high",
    bestTime: "pm",
    phRange: [5.0, 6.0]
  },
  vitamin_c: {
    id: "vitamin_c",
    name: "Витамин C",
    nameEn: "Vitamin C",
    icon: "🍊",
    color: "#f39c12",
    description: "Мощный антиоксидант. Осветляет, защищает от UV-повреждений, стимулирует коллаген.",
    irritation: "medium",
    bestTime: "am",
    phRange: [2.5, 3.5]
  },
  aha: {
    id: "aha",
    name: "AHA-кислоты",
    nameEn: "AHA Acids",
    icon: "⚗️",
    color: "#e91e63",
    description: "Альфа-гидроксикислоты. Отшелушивают поверхность кожи, выравнивают тон.",
    irritation: "medium",
    bestTime: "pm",
    phRange: [3.0, 4.0]
  },
  bha: {
    id: "bha",
    name: "BHA-кислоты",
    nameEn: "BHA Acids",
    icon: "🧪",
    color: "#9c27b0",
    description: "Бета-гидроксикислоты. Проникают в поры, борются с акне и чёрными точками.",
    irritation: "medium",
    bestTime: "pm",
    phRange: [3.0, 4.0]
  },
  pha: {
    id: "pha",
    name: "PHA-кислоты",
    nameEn: "PHA Acids",
    icon: "💧",
    color: "#00bcd4",
    description: "Полигидроксикислоты. Мягкое отшелушивание, подходят для чувствительной кожи.",
    irritation: "low",
    bestTime: "any",
    phRange: [3.5, 4.5]
  },
  niacinamide: {
    id: "niacinamide",
    name: "Ниацинамид",
    nameEn: "Niacinamide (B3)",
    icon: "✨",
    color: "#4caf50",
    description: "Витамин B3. Универсальный ингредиент: сужает поры, укрепляет барьер, выравнивает тон.",
    irritation: "low",
    bestTime: "any",
    phRange: [5.0, 7.0]
  },
  peptides: {
    id: "peptides",
    name: "Пептиды",
    nameEn: "Peptides",
    icon: "🧬",
    color: "#3f51b5",
    description: "Цепочки аминокислот. Стимулируют выработку коллагена и заживление.",
    irritation: "low",
    bestTime: "any",
    phRange: [5.0, 7.0]
  },
  antioxidant: {
    id: "antioxidant",
    name: "Антиоксиданты",
    nameEn: "Antioxidants",
    icon: "🛡️",
    color: "#8bc34a",
    description: "Защищают от свободных радикалов и окислительного стресса.",
    irritation: "low",
    bestTime: "am",
    phRange: [4.0, 7.0]
  },
  humectant: {
    id: "humectant",
    name: "Увлажнители",
    nameEn: "Humectants",
    icon: "💦",
    color: "#03a9f4",
    description: "Притягивают и удерживают влагу в коже.",
    irritation: "low",
    bestTime: "any",
    phRange: [4.0, 7.0]
  },
  ceramide: {
    id: "ceramide",
    name: "Церамиды",
    nameEn: "Ceramides",
    icon: "🧱",
    color: "#795548",
    description: "Восстанавливают защитный барьер кожи.",
    irritation: "low",
    bestTime: "any",
    phRange: [4.0, 7.0]
  },
  brightening: {
    id: "brightening",
    name: "Осветлители",
    nameEn: "Brightening Agents",
    icon: "💡",
    color: "#ffc107",
    description: "Подавляют выработку меланина, осветляют пигментацию.",
    irritation: "low",
    bestTime: "pm",
    phRange: [4.0, 7.0]
  },
  bakuchiol: {
    id: "bakuchiol",
    name: "Бакучиол",
    nameEn: "Bakuchiol",
    icon: "🌿",
    color: "#7cb342",
    description: "Мягкий растительный актив с антиоксидантным и разглаживающим профилем. Не относится к ретиноидам.",
    irritation: "low",
    bestTime: "any",
    phRange: [4.0, 7.0]
  },
  ph_adjuster: {
    id: "ph_adjuster",
    name: "Корректор pH",
    nameEn: "pH Adjusters",
    icon: "⚗️",
    color: "#b0bec5",
    description: "Кислоты, которые часто служат регуляторами pH и не всегда работают как основной эксфолиант.",
    irritation: "low",
    bestTime: "any",
    phRange: [3.0, 7.0]
  },
  spf: {
    id: "spf",
    name: "Солнцезащитные фильтры",
    nameEn: "SPF Filters",
    icon: "☀️",
    color: "#ff9800",
    description: "Защищают кожу от UVA/UVB излучения.",
    irritation: "low",
    bestTime: "am",
    phRange: [5.0, 8.0]
  },
  benzoyl_peroxide: {
    id: "benzoyl_peroxide",
    name: "Бензоилпероксид",
    nameEn: "Benzoyl Peroxide",
    icon: "💥",
    color: "#ff5722",
    description: "Мощный антибактериальный агент для борьбы с акне.",
    irritation: "high",
    bestTime: "pm",
    phRange: [4.0, 6.0]
  },
  azelaic_acid: {
    id: "azelaic_acid",
    name: "Азелаиновая кислота",
    nameEn: "Azelaic Acid",
    icon: "🌿",
    color: "#009688",
    description: "Лечит акне, розацеа и гиперпигментацию. Мягкий эксфолиант.",
    irritation: "low",
    bestTime: "any",
    phRange: [4.0, 5.0]
  },
  centella: {
    id: "centella",
    name: "Центелла азиатская",
    nameEn: "Centella Asiatica",
    icon: "🌱",
    color: "#66bb6a",
    description: "Успокаивает раздражение, ускоряет заживление, укрепляет барьер.",
    irritation: "low",
    bestTime: "any",
    phRange: [4.0, 7.0]
  },
  zinc: {
    id: "zinc",
    name: "Цинк",
    nameEn: "Zinc",
    icon: "⚪",
    color: "#90a4ae",
    description: "Противовоспалительный, себорегулирующий. Используется в SPF и лечении акне.",
    irritation: "low",
    bestTime: "any",
    phRange: [5.0, 8.0]
  },
  sulfur: {
    id: "sulfur",
    name: "Сера",
    nameEn: "Sulfur",
    icon: "🟡",
    color: "#cddc39",
    description: "Антибактериальное и подсушивающее действие. Борьба с акне.",
    irritation: "medium",
    bestTime: "pm",
    phRange: [3.0, 6.0]
  },
  alcohol: {
    id: "alcohol",
    name: "Спирт (денатурированный)",
    nameEn: "Denatured Alcohol",
    icon: "⚠️",
    color: "#f44336",
    description: "Растворитель. Может сушить и раздражать кожу при высокой концентрации.",
    irritation: "medium",
    bestTime: "any",
    phRange: [4.0, 8.0]
  },
  essential_oils: {
    id: "essential_oils",
    name: "Эфирные масла",
    nameEn: "Essential Oils",
    icon: "🌸",
    color: "#e1bee7",
    description: "Натуральные масла. Могут быть раздражителями для чувствительной кожи.",
    irritation: "medium",
    bestTime: "any",
    phRange: [4.0, 7.0]
  }
};

// ========================================
// Конкретные ингредиенты (INCI-имена)
// ========================================

const INGREDIENTS_DB = [
  // --- РЕТИНОИДЫ ---
  { id: "retinol", names: ["Retinol", "Ретинол"], category: "retinoid", strength: "medium" },
  { id: "retinal", names: ["Retinal", "Retinaldehyde", "Ретиналь"], category: "retinoid", strength: "high" },
  { id: "tretinoin", names: ["Tretinoin", "Retinoic Acid", "Третиноин"], category: "retinoid", strength: "very_high" },
  { id: "adapalene", names: ["Adapalene", "Адапален"], category: "retinoid", strength: "high" },
  { id: "retinyl_palmitate", names: ["Retinyl Palmitate", "Ретинилпальмитат"], category: "retinoid", strength: "low" },
  { id: "retinyl_acetate", names: ["Retinyl Acetate", "Ретинилацетат"], category: "retinoid", strength: "low" },
  { id: "hpr", names: ["Hydroxypinacolone Retinoate", "Granactive Retinoid", "HPR"], category: "retinoid", strength: "medium" },
  { id: "bakuchiol", names: ["Bakuchiol", "Бакучиол"], category: "bakuchiol", strength: "low" },

  // --- ВИТАМИН C ---
  { id: "ascorbic_acid", names: ["L-Ascorbic Acid", "Ascorbic Acid", "Аскорбиновая кислота"], category: "vitamin_c", strength: "very_high" },
  { id: "ascorbyl_glucoside", names: ["Ascorbyl Glucoside", "AA2G"], category: "vitamin_c", strength: "medium" },
  { id: "map", names: ["Magnesium Ascorbyl Phosphate", "MAP"], category: "vitamin_c", strength: "medium" },
  { id: "sap", names: ["Sodium Ascorbyl Phosphate", "SAP"], category: "vitamin_c", strength: "medium" },
  { id: "ascorbyl_tetraisopalmitate", names: ["Ascorbyl Tetraisopalmitate", "ATIP"], category: "vitamin_c", strength: "medium" },
  { id: "ethyl_ascorbic_acid", names: ["3-O-Ethyl Ascorbic Acid", "Ethyl Ascorbic Acid"], category: "vitamin_c", strength: "high" },

  // --- AHA КИСЛОТЫ ---
  { id: "glycolic_acid", names: ["Glycolic Acid", "Гликолевая кислота"], category: "aha", strength: "high" },
  { id: "lactic_acid", names: ["Lactic Acid", "Молочная кислота"], category: "aha", strength: "medium" },
  { id: "mandelic_acid", names: ["Mandelic Acid", "Миндальная кислота"], category: "aha", strength: "low" },
  { id: "tartaric_acid", names: ["Tartaric Acid", "Винная кислота"], category: "aha", strength: "low" },
  { id: "citric_acid", names: ["Citric Acid", "Лимонная кислота"], category: "ph_adjuster", strength: "low" },
  { id: "malic_acid", names: ["Malic Acid", "Яблочная кислота"], category: "aha", strength: "low" },

  // --- BHA КИСЛОТЫ ---
  { id: "salicylic_acid", names: ["Salicylic Acid", "Салициловая кислота"], category: "bha", strength: "high" },
  { id: "betaine_salicylate", names: ["Betaine Salicylate", "Бетаин салицилат"], category: "bha", strength: "low" },
  { id: "willow_bark", names: ["Salix Alba Bark Extract", "Willow Bark Extract", "Экстракт коры ивы"], category: "bha", strength: "low" },

  // --- PHA КИСЛОТЫ ---
  { id: "gluconolactone", names: ["Gluconolactone", "Глюконолактон"], category: "pha", strength: "low" },
  { id: "lactobionic_acid", names: ["Lactobionic Acid", "Лактобионовая кислота"], category: "pha", strength: "low" },

  // --- НИАЦИНАМИД ---
  { id: "niacinamide", names: ["Niacinamide", "Nicotinamide", "Ниацинамид", "Никотинамид", "Vitamin B3"], category: "niacinamide", strength: "medium" },

  // --- ПЕПТИДЫ ---
  { id: "copper_peptides", names: ["Copper Tripeptide-1", "GHK-Cu", "Медные пептиды"], category: "peptides", strength: "high" },
  { id: "matrixyl", names: ["Palmitoyl Pentapeptide-4", "Matrixyl", "Матриксил"], category: "peptides", strength: "medium" },
  { id: "matrixyl_3000", names: ["Palmitoyl Tripeptide-1", "Palmitoyl Tetrapeptide-7", "Matrixyl 3000"], category: "peptides", strength: "medium" },
  { id: "argireline", names: ["Acetyl Hexapeptide-3", "Acetyl Hexapeptide-8", "Argireline", "Аргирелин"], category: "peptides", strength: "medium" },
  { id: "buffet", names: ["Palmitoyl Tripeptide-38", "Syn-Ake"], category: "peptides", strength: "medium" },
  { id: "egf", names: ["sh-Oligopeptide-1", "EGF", "Epidermal Growth Factor"], category: "peptides", strength: "high" },

  // --- АНТИОКСИДАНТЫ ---
  { id: "vitamin_e", names: ["Tocopherol", "Tocopheryl Acetate", "Vitamin E", "Витамин E", "Токоферол"], category: "antioxidant", strength: "medium" },
  { id: "ferulic_acid", names: ["Ferulic Acid", "Феруловая кислота"], category: "antioxidant", strength: "medium" },
  { id: "resveratrol", names: ["Resveratrol", "Ресвератрол"], category: "antioxidant", strength: "medium" },
  { id: "green_tea", names: ["Camellia Sinensis Leaf Extract", "Green Tea Extract", "EGCG", "Экстракт зелёного чая"], category: "antioxidant", strength: "low" },
  { id: "coq10", names: ["Ubiquinone", "Coenzyme Q10", "CoQ10", "Коэнзим Q10"], category: "antioxidant", strength: "low" },
  { id: "astaxanthin", names: ["Astaxanthin", "Астаксантин"], category: "antioxidant", strength: "high" },

  // --- УВЛАЖНИТЕЛИ ---
  { id: "hyaluronic_acid", names: ["Hyaluronic Acid", "Sodium Hyaluronate", "Гиалуроновая кислота"], category: "humectant", strength: "medium" },
  { id: "glycerin", names: ["Glycerin", "Glycerol", "Глицерин"], category: "humectant", strength: "low" },
  { id: "squalane", names: ["Squalane", "Сквалан"], category: "humectant", strength: "low" },
  { id: "urea", names: ["Urea", "Мочевина"], category: "humectant", strength: "medium" },
  { id: "panthenol", names: ["Panthenol", "D-Panthenol", "Provitamin B5", "Пантенол"], category: "humectant", strength: "low" },
  { id: "aloe_vera", names: ["Aloe Barbadensis Leaf Extract", "Aloe Vera", "Алоэ вера"], category: "humectant", strength: "low" },
  { id: "betaine", names: ["Betaine", "Trimethylglycine", "Бетаин"], category: "humectant", strength: "low" },
  { id: "allantoin", names: ["Allantoin", "Аллантоин"], category: "humectant", strength: "low" },

  // --- ЦЕРАМИДЫ ---
  { id: "ceramide_np", names: ["Ceramide NP", "Ceramide 3", "Церамид NP"], category: "ceramide", strength: "medium" },
  { id: "ceramide_ap", names: ["Ceramide AP", "Ceramide 6 II", "Церамид AP"], category: "ceramide", strength: "medium" },
  { id: "ceramide_eop", names: ["Ceramide EOP", "Ceramide 1", "Церамид EOP"], category: "ceramide", strength: "medium" },
  { id: "cholesterol", names: ["Cholesterol", "Холестерол"], category: "ceramide", strength: "low" },
  { id: "phytosphingosine", names: ["Phytosphingosine", "Фитосфингозин"], category: "ceramide", strength: "low" },

  // --- ОСВЕТЛИТЕЛИ ---
  { id: "arbutin", names: ["Arbutin", "Alpha-Arbutin", "Арбутин"], category: "brightening", strength: "medium" },
  { id: "kojic_acid", names: ["Kojic Acid", "Койевая кислота"], category: "brightening", strength: "medium" },
  { id: "tranexamic_acid", names: ["Tranexamic Acid", "Транексамовая кислота"], category: "brightening", strength: "medium" },
  { id: "licorice_root", names: ["Glycyrrhiza Glabra Root Extract", "Licorice Root Extract", "Экстракт солодки"], category: "brightening", strength: "low" },
  { id: "glutathione", names: ["Glutathione", "Глутатион"], category: "brightening", strength: "medium" },

  // --- SPF ---
  { id: "zinc_oxide", names: ["Zinc Oxide", "Оксид цинка"], category: "spf", strength: "high" },
  { id: "titanium_dioxide", names: ["Titanium Dioxide", "Диоксид титана"], category: "spf", strength: "high" },
  { id: "avobenzone", names: ["Avobenzone", "Butyl Methoxydibenzoylmethane", "Авобензон"], category: "spf", strength: "high" },
  { id: "octinoxate", names: ["Ethylhexyl Methoxycinnamate", "Octinoxate", "Октиноксат"], category: "spf", strength: "medium" },
  { id: "homosalate", names: ["Homosalate", "Гомосалат"], category: "spf", strength: "medium" },
  { id: "tinosorb_s", names: ["Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine", "Tinosorb S"], category: "spf", strength: "high" },

  // --- БЕНЗОИЛПЕРОКСИД ---
  { id: "benzoyl_peroxide", names: ["Benzoyl Peroxide", "Бензоилпероксид", "BPO"], category: "benzoyl_peroxide", strength: "high" },

  // --- АЗЕЛАИНОВАЯ КИСЛОТА ---
  { id: "azelaic_acid", names: ["Azelaic Acid", "Азелаиновая кислота"], category: "azelaic_acid", strength: "medium" },

  // --- ЦЕНТЕЛЛА ---
  { id: "centella_asiatica", names: ["Centella Asiatica Extract", "Экстракт центеллы"], category: "centella", strength: "medium" },
  { id: "madecassoside", names: ["Madecassoside", "Мадекассозид"], category: "centella", strength: "medium" },
  { id: "asiaticoside", names: ["Asiaticoside", "Азиатикозид"], category: "centella", strength: "medium" },

  // --- ЦИНК ---
  { id: "zinc_pca", names: ["Zinc PCA", "Цинк PCA"], category: "zinc", strength: "medium" },
  { id: "zinc_sulfate", names: ["Zinc Sulfate", "Сульфат цинка"], category: "zinc", strength: "medium" },

  // --- СЕРА ---
  { id: "sulfur", names: ["Sulfur", "Сера"], category: "sulfur", strength: "medium" },

  // --- СПИРТ ---
  { id: "denat_alcohol", names: ["Alcohol Denat", "Alcohol Denat.", "Denatured Alcohol", "Денатурированный спирт"], category: "alcohol", strength: "high" },
  { id: "ethanol", names: ["Ethanol", "Этанол"], category: "alcohol", strength: "high" },

  // --- ЭФИРНЫЕ МАСЛА ---
  { id: "tea_tree", names: ["Melaleuca Alternifolia Leaf Oil", "Tea Tree Oil", "Масло чайного дерева"], category: "essential_oils", strength: "medium" },
  { id: "lavender_oil", names: ["Lavandula Angustifolia Oil", "Lavender Oil", "Масло лаванды"], category: "essential_oils", strength: "low" },
  { id: "eucalyptus_oil", names: ["Eucalyptus Globulus Leaf Oil", "Eucalyptus Oil", "Масло эвкалипта"], category: "essential_oils", strength: "medium" }
];

// ========================================
// Функции поиска ингредиентов
// ========================================

/**
 * Найти ингредиент по имени (нечёткий поиск)
 */
function normalizeIngredientText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b\d+([.,]\d+)?\s*%/g, " ")
    .replace(/[®™]/g, " ")
    .replace(/[_/]+/g, " ")
    .replace(/[^a-zа-я0-9+\-\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isBoundaryMatch(input, alias) {
  if (!input || !alias) {
    return false;
  }

  return new RegExp(`(^|[^a-zа-я0-9])${escapeRegex(alias)}([^a-zа-я0-9]|$)`, "i").test(input);
}

function findIngredient(name) {
  const normalizedName = normalizeIngredientText(name);
  if (!normalizedName) {
    return null;
  }

  let bestMatch = null;

  for (const ingredient of INGREDIENTS_DB) {
    for (const alias of ingredient.names) {
      const normalizedAlias = normalizeIngredientText(alias);
      if (!normalizedAlias) {
        continue;
      }

      if (normalizedAlias === normalizedName) {
        return ingredient;
      }

      const aliasLength = normalizedAlias.length;
      const strongBoundaryMatch =
        aliasLength >= 4 &&
        normalizedName.length >= aliasLength &&
        isBoundaryMatch(normalizedName, normalizedAlias);
      const prefixMatch =
        aliasLength >= 8 &&
        normalizedName.startsWith(`${normalizedAlias} `);
      const nearExactMatch =
        aliasLength >= 8 &&
        normalizedAlias.startsWith(normalizedName) &&
        normalizedAlias.length - normalizedName.length <= 4;

      if (strongBoundaryMatch || prefixMatch || nearExactMatch) {
        if (!bestMatch || normalizedAlias.length > bestMatch.aliasLength) {
          bestMatch = {
            ingredient,
            aliasLength: normalizedAlias.length
          };
        }
      }
    }
  }

  return bestMatch ? bestMatch.ingredient : null;
}

/**
 * Найти все активные ингредиенты в списке
 */
function findActiveIngredients(ingredientsList) {
  const found = [];
  const notFound = [];

  for (const name of ingredientsList) {
    const ingredient = findIngredient(name);
    if (ingredient) {
      // Не добавлять дубликаты
      if (!found.find(f => f.id === ingredient.id)) {
        found.push({
          ...ingredient,
          originalName: name,
          categoryInfo: INGREDIENT_CATEGORIES[ingredient.category]
        });
      }
    } else {
      notFound.push(name);
    }
  }

  return { found, notFound };
}

/**
 * Получить категорию ингредиента
 */
function getCategory(categoryId) {
  return INGREDIENT_CATEGORIES[categoryId] || null;
}

// Экспорт для использования в других модулях
window.CosmoIngredients = {
  INGREDIENT_CATEGORIES,
  INGREDIENTS_DB,
  findIngredient,
  findActiveIngredients,
  getCategory
};
