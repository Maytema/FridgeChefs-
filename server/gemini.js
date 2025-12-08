const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.genAI = null;
        this.model = null;
        
        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            console.log('Gemini API инициализирован');
        } else {
            console.log('GEMINI_API_KEY не найден, используется демо-режим');
        }
    }

    async generateRecipe(products, options = {}) {
        const { time = '30 минут', difficulty = 'средняя', servings = 4 } = options;
        
        if (!this.model) {
            return this.createDemoRecipe(products, { time, difficulty, servings });
        }
        
        try {
            const productList = products.map(p => `${p.name}`).join(', ');
            
            const prompt = `Создай рецепт на русском языке используя эти продукты: ${productList}
            
Требования:
- Время приготовления: ${time}
- Сложность: ${difficulty}
- Количество порций: ${servings}
- Верни в формате JSON:
{
  "title": "Название рецепта",
  "description": "Описание",
  "ingredients": ["ингредиент 1", "ингредиент 2"],
  "steps": ["шаг 1", "шаг 2"],
  "time": "${time}",
  "difficulty": "${difficulty}",
  "portions": ${servings},
  "isAI": true
}`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Не удалось распарсить ответ');
            }
            
        } catch (error) {
            console.error('Ошибка Gemini API:', error);
            return this.createDemoRecipe(products, { time, difficulty, servings });
        }
    }

    createDemoRecipe(products, options) {
        return {
            title: `Блюдо из ${products.length} ингредиентов`,
            description: 'Вкусный рецепт созданный ИИ',
            ingredients: [
                ...products.map(p => `300 г ${p.name}`),
                "2 ст.л. растительного масла",
                "Соль и перец по вкусу"
            ],
            steps: [
                "Подготовьте все ингредиенты",
                "Обжарьте на среднем огне",
                "Добавьте специи",
                "Подавайте горячим"
            ],
            time: options.time,
            difficulty: options.difficulty,
            portions: options.servings,
            isAI: true
        };
    }
}

module.exports = new GeminiService();
