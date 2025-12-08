const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const geminiService = require('./gemini');
const paymentService = require('./payment');

let products = [];
let recipes = [];
let users = [];

async function loadData() {
    try {
        const [prods, recs] = await Promise.all([
            fs.readFile(path.join(__dirname, '../data/products.json'), 'utf8'),
            fs.readFile(path.join(__dirname, '../data/recipes.json'), 'utf8')
        ]);
        
        products = JSON.parse(prods);
        recipes = JSON.parse(recs);
        
        console.log(`Данные загружены: ${products.length} продуктов, ${recipes.length} рецептов`);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

loadData();

router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

router.get('/products', async (req, res) => {
    try {
        const categoriesMap = {};
        
        products.forEach(product => {
            if (!categoriesMap[product.category]) {
                categoriesMap[product.category] = {
                    name: product.category,
                    emoji: getCategoryEmoji(product.category),
                    products: []
                };
            }
            categoriesMap[product.category].products.push(product);
        });
        
        const categories = Object.values(categoriesMap);
        
        res.json({ products, categories });
        
    } catch (error) {
        console.error('Ошибка получения продуктов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/products/search', (req, res) => {
    const query = req.query.q?.toLowerCase() || '';
    
    if (query.length < 2) {
        return res.json([]);
    }
    
    const results = products.filter(product => 
        product.name.toLowerCase().includes(query)
    ).slice(0, 10);
    
    res.json(results);
});

router.get('/recipes/popular', (req, res) => {
    const popular = recipes.slice(0, 6);
    res.json(popular);
});

router.post('/recipes/find', (req, res) => {
    try {
        const { products: selectedIds } = req.body;
        
        if (!selectedIds || !Array.isArray(selectedIds)) {
            return res.status(400).json({ error: 'Необходим массив продуктов' });
        }
        
        if (selectedIds.length < 2) {
            return res.status(400).json({ error: 'Выберите минимум 2 продукта' });
        }
        
        const matchingRecipes = recipes.filter(recipe => {
            const matchCount = selectedIds.filter(id => 
                recipe.products.includes(id)
            ).length;
            return matchCount >= 2;
        });
        
        matchingRecipes.sort((a, b) => {
            const aMatches = selectedIds.filter(id => a.products.includes(id)).length;
            const bMatches = selectedIds.filter(id => b.products.includes(id)).length;
            return bMatches - aMatches;
        });
        
        const results = matchingRecipes.slice(0, 12);
        
        res.json(results);
        
    } catch (error) {
        console.error('Ошибка поиска рецептов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/ai/generate', async (req, res) => {
    try {
        const { products: productList, time, difficulty, servings } = req.body;
        
        if (!productList || productList.length < 2) {
            return res.status(400).json({ error: 'Выберите минимум 2 продукта' });
        }
        
        const recipe = await geminiService.generateRecipe(productList, { time, difficulty, servings });
        
        res.json(recipe);
        
    } catch (error) {
        console.error('Ошибка генерации ИИ-рецепта:', error);
        res.status(500).json({ error: 'Ошибка генерации рецепта' });
    }
});

router.get('/user/limits', async (req, res) => {
    try {
        const userId = req.query.userId || 'anonymous';
        
        const usersData = await fs.readFile(
            path.join(__dirname, '../data/users.json'),
            'utf8'
        ).then(JSON.parse).catch(() => []);
        
        let user = usersData.find(u => u.id === userId);
        
        if (!user) {
            user = {
                id: userId,
                aiLimit: 3,
                aiTotal: 3,
                premium: false,
                resetDate: new Date().toISOString().split('T')[0]
            };
            
            usersData.push(user);
            await fs.writeFile(
                path.join(__dirname, '../data/users.json'),
                JSON.stringify(usersData, null, 2)
            );
        }
        
        res.json({
            aiRemaining: user.aiLimit,
            aiTotal: user.aiTotal,
            premium: user.premium
        });
        
    } catch (error) {
        console.error('Ошибка получения лимитов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/user/limits', async (req, res) => {
    try {
        const { userId, aiRemaining, premium } = req.body;
        
        const usersData = await fs.readFile(
            path.join(__dirname, '../data/users.json'),
            'utf8'
        ).then(JSON.parse).catch(() => []);
        
        let user = usersData.find(u => u.id === userId);
        
        if (user) {
            if (aiRemaining !== undefined) user.aiLimit = aiRemaining;
            if (premium !== undefined) user.premium = premium;
            
            await fs.writeFile(
                path.join(__dirname, '../data/users.json'),
                JSON.stringify(usersData, null, 2)
            );
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Ошибка обновления лимитов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/payment/create', async (req, res) => {
    try {
        const { plan, amount, currency = 'RUB' } = req.body;
        
        const payment = await paymentService.createPayment({
            amount,
            currency,
            description: `ChefZero ${plan === 'monthly' ? 'Премиум месяц' : 'Пакет 10 рецептов'}`
        });
        
        res.json(payment);
        
    } catch (error) {
        console.error('Ошибка создания платежа:', error);
        res.status(500).json({ error: 'Ошибка при создании платежа' });
    }
});

router.get('/payment/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const status = await paymentService.checkPaymentStatus(id);
        
        res.json({ status });
        
    } catch (error) {
        console.error('Ошибка проверки статуса платежа:', error);
        res.status(500).json({ error: 'Ошибка при проверке статуса' });
    }
});

function getCategoryEmoji(category) {
    const emojiMap = {
        'Овощи': '🥦',
        'Фрукты': '🍎',
        'Мясо': '🥩',
        'Рыба': '🐟',
        'Молочные': '🧀',
        'Крупы': '🍚',
        'Специи': '🧂',
        'Напитки': '🥤',
        'Бакалея': '🥫',
        'Яйца': '🥚',
        'Хлеб': '🍞',
        'Соусы': '🥫'
    };
    
    return emojiMap[category] || '🍳';
}

module.exports = router;
