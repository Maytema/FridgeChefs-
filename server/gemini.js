const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

const IMAGE_PROMPT_TEMPLATE = `Ты — профессиональный шеф-повар.  
Создай подробный рецепт ТОЛЬКО из этих продуктов: {{список продуктов}}  
Дополнительно можно использовать: соль, перец, растительное масло, воду, сахар, муку (до 100 г).  
Язык: русский, тон дружелюбный и понятный новичкам.  

Формат ответа (строго JSON):
{
  "title": "Название блюда",
  "portions": 2,
  "time": "25 минут",
  "difficulty": "просто | средне | сложно",
  "ingredients": ["100 г курицы", "2 яйца", ...],
  "steps": ["1. Разогрейте сковороду...", "2. ..."],
  "imagePrompt": "фотография готового блюда <title> на деревянном столе, тёплое освещение, аппетитно, 4k, реалистично"
}`;

async function generateRecipe(products) {
    try {
        const prompt = IMAGE_PROMPT_TEMPLATE.replace('{{список продуктов}}', products.join(', '));
        
        console.log('Generating recipe for:', products);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Extract JSON from response (Gemini might add markdown)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Не удалось извлечь JSON из ответа');
        }
        
        const recipe = JSON.parse(jsonMatch[0]);
        
        // Validate required fields
        const required = ['title', 'portions', 'time', 'difficulty', 'ingredients', 'steps', 'imagePrompt'];
        for (const field of required) {
            if (!recipe[field]) {
                throw new Error(`Отсутствует обязательное поле: ${field}`);
            }
        }
        
        // Generate image
        recipe.image = await generateImage(recipe.imagePrompt);
        
        return recipe;
        
    } catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    }
}

async function generateImage(prompt) {
    try {
        // For production, use Gemini's image generation
        // Since Gemini 1.5 Pro doesn't directly generate images, we'll use a placeholder
        // In production, you might use Gemini 1.5 Flash or another service
        
        console.log('Image prompt:', prompt);
        
        // Return a placeholder with recipe title for now
        // In production, replace with actual Gemini image generation
        const title = prompt.match(/<title>(.*?)<\/title>/)?.[1] || 'блюдо';
        return `https://placehold.co/600x400/6366F1/FFFFFF?text=${encodeURIComponent(title)}`;
        
    } catch (error) {
        console.error('Image generation error:', error);
        // Fallback to placeholder
        return 'https://placehold.co/600x400/6366F1/FFFFFF?text=Вкусное+блюдо';
    }
}

module.exports = { generateRecipe };
