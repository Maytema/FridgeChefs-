import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Группированные продукты по категориям
const PRODUCTS_BY_CATEGORY = {
    "Базовые": [
        {id: 1, name: "яйца", icon: "🥚"},
        {id: 2, name: "мука", icon: "🌾"},
        {id: 3, name: "сахар", icon: "🍬"},
        {id: 4, name: "соль", icon: "🧂"},
        {id: 5, name: "масло растительное", icon: "🫒"},
        {id: 6, name: "масло сливочное", icon: "🧈"},
        {id: 7, name: "вода", icon: "💧"},
        {id: 8, name: "уксус", icon: "🍶"},
        {id: 9, name: "сода", icon: "🧂"},
        {id: 10, name: "дрожжи", icon: "🧫"}
    ],
    "Овощи": [
        {id: 11, name: "картофель", icon: "🥔"},
        {id: 12, name: "лук", icon: "🧅"},
        {id: 13, name: "морковь", icon: "🥕"},
        {id: 14, name: "помидоры", icon: "🍅"},
        {id: 15, name: "огурцы", icon: "🥒"},
        {id: 16, name: "капуста", icon: "🥬"},
        {id: 17, name: "чеснок", icon: "🧄"},
        {id: 18, name: "перец", icon: "🫑"},
        {id: 19, name: "зелень", icon: "🌿"},
        {id: 20, name: "баклажаны", icon: "🍆"}
    ],
    "Молочные": [
        {id: 21, name: "молоко", icon: "🥛"},
        {id: 22, name: "сметана", icon: "🥣"},
        {id: 23, name: "сыр", icon: "🧀"},
        {id: 24, name: "творог", icon: "🥣"},
        {id: 25, name: "кефир", icon: "🥛"},
        {id: 26, name: "йогурт", icon: "🥄"},
        {id: 27, name: "сливки", icon: "🍶"},
        {id: 28, name: "майонез", icon: "🍶"},
        {id: 29, name: "сгущенка", icon: "🥫"}
    ],
    "Мясо и птица": [
        {id: 30, name: "курица", icon: "🍗"},
        {id: 31, name: "говядина", icon: "🥩"},
        {id: 32, name: "свинина", icon: "🐷"},
        {id: 33, name: "индейка", icon: "🦃"},
        {id: 34, name: "фарш", icon: "🥩"},
        {id: 35, name: "колбаса", icon: "🌭"},
        {id: 36, name: "сосиски", icon: "🌭"},
        {id: 37, name: "бекон", icon: "🥓"}
    ],
    "Рыба и морепродукты": [
        {id: 38, name: "рыба", icon: "🐟"},
        {id: 39, name: "лосось", icon: "🐟"},
        {id: 40, name: "тунец", icon: "🐟"},
        {id: 41, name: "креветки", icon: "🦐"},
        {id: 42, name: "кальмары", icon: "🦑"},
        {id: 43, name: "мидии", icon: "🦪"},
        {id: 44, name: "икра", icon: "🥫"}
    ],
    "Крупы и макароны": [
        {id: 45, name: "рис", icon: "🍚"},
        {id: 46, name: "гречка", icon: "🌾"},
        {id: 47, name: "макароны", icon: "🍝"},
        {id: 48, name: "овсянка", icon: "🥣"},
        {id: 49, name: "пшено", icon: "🌾"},
        {id: 50, name: "перловка", icon: "🌾"},
        {id: 51, name: "манка", icon: "🌾"},
        {id: 52, name: "кускус", icon: "🍚"}
    ],
    "Фрукты и ягоды": [
        {id: 53, name: "яблоки", icon: "🍎"},
        {id: 54, name: "бананы", icon: "🍌"},
        {id: 55, name: "апельсины", icon: "🍊"},
        {id: 56, name: "лимон", icon: "🍋"},
        {id: 57, name: "клубника", icon: "🍓"},
        {id: 58, name: "виноград", icon: "🍇"},
        {id: 59, name: "персики", icon: "🍑"},
        {id: 60, name: "киви", icon: "🥝"},
        {id: 61, name: "ананас", icon: "🍍"},
        {id: 62, name: "арбуз", icon: "🍉"}
    ],
    "Соусы и специи": [
        {id: 63, name: "кетчуп", icon: "🍅"},
        {id: 64, name: "горчица", icon: "🌭"},
        {id: 65, name: "соус соевый", icon: "🍶"},
        {id: 66, name: "перец черный", icon: "⚫"},
        {id: 67, name: "паприка", icon: "🌶️"},
        {id: 68, name: "лавровый лист", icon: "🌿"},
        {id: 69, name: "карри", icon: "🟡"},
        {id: 70, name: "имбирь", icon: "🌿"}
    ],
    "Хлеб и выпечка": [
        {id: 71, name: "хлеб", icon: "🍞"},
        {id: 72, name: "батон", icon: "🥖"},
        {id: 73, name: "лаваш", icon: "🫓"},
        {id: 74, name: "булочки", icon: "🥐"},
        {id: 75, name: "сухари", icon: "🍞"},
        {id: 76, name: "печенье", icon: "🍪"}
    ]
};

// Рецепты
const RECIPES_DB = [
    {
        id: 1,
        name: "Омлет с овощами",
        ingredients: ["яйца", "помидоры", "лук", "сыр"],
        time: "15 мин",
        difficulty: "легко",
        steps: [
            "Взбейте яйца в миске",
            "Нарежьте помидоры и лук",
            "Обжарьте лук 2 минуты",
            "Добавьте помидоры, жарьте 3 минуты",
            "Залейте яйцами, готовьте 5 минут",
            "Посыпьте сыром перед подачей"
        ]
    },
    {
        id: 2,
        name: "Картофель с курицей в духовке",
        ingredients: ["картофель", "курица", "лук", "морковь", "сметана"],
        time: "45 мин",
        difficulty: "средне",
        steps: [
            "Нарежьте картофель, курицу и овощи",
            "Обжарьте лук и морковь 5 минут",
            "Смешайте все со сметаной",
            "Выложите в форму для запекания",
            "Запекайте 30 минут при 180°C"
        ]
    },
    {
        id: 3,
        name: "Салат из свежих овощей",
        ingredients: ["помидоры", "огурцы", "перец", "лук", "масло растительное"],
        time: "10 мин",
        difficulty: "очень легко",
        steps: [
            "Нарежьте все овощи",
            "Смешайте в салатнице",
            "Заправьте маслом и солью",
            "Подавайте сразу"
        ]
    },
    {
        id: 4,
        name: "Паста с сыром",
        ingredients: ["макароны", "сыр", "сливки", "чеснок"],
        time: "20 мин",
        difficulty: "легко",
        steps: [
            "Отварите макароны",
            "Натрите сыр на терке",
            "Разогрейте сливки с чесноком",
            "Смешайте макароны с соусом",
            "Посыпьте сыром"
        ]
    }
];

// API: Получить все продукты
app.get('/api/products', (req, res) => {
    res.json({ success: true, categories: PRODUCTS_BY_CATEGORY });
});

// API: Поиск рецептов
app.post('/api/find-recipes', (req, res) => {
    const { ingredients } = req.body;
    
    if (!ingredients || !Array.isArray(ingredients)) {
        return res.json({ success: false, error: "Нет ингредиентов" });
    }
    
    const matchedRecipes = RECIPES_DB.filter(recipe => {
        const matches = recipe.ingredients.filter(ing => 
            ingredients.some(userIng => {
                const userIngLower = userIng.toLowerCase();
                const recipeIngLower = ing.toLowerCase();
                return recipeIngLower.includes(userIngLower) || 
                       userIngLower.includes(recipeIngLower);
            })
        ).length;
        return matches >= Math.min(2, recipe.ingredients.length);
    });
    
    res.json({ 
        success: true, 
        recipes: matchedRecipes.slice(0, 4),
        count: matchedRecipes.length 
    });
});

// API: Купить рецепты
app.post('/api/buy-recipes', (req, res) => {
    const { plan } = req.body;
    
    if (plan === 'monthly') {
        res.json({ 
            success: true, 
            message: "Подписка активирована на 30 дней",
            plan: "monthly"
        });
    } else {
        res.json({ 
            success: true, 
            message: "10 рецептов добавлены",
            plan: "one-time"
        });
    }
});

// API: Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
}); 
