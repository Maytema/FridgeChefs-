// Основные переменные
let selectedIngredients = [];
let userId = localStorage.getItem('userId') || 'user_' + Math.random().toString(36).substr(2, 9);
let usage = { free_left: 3, paid_left: 10 };

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    loadIngredients();
    loadUsage();
    setupEventListeners();
    
    // Сохраняем ID пользователя
    localStorage.setItem('userId', userId);
});

// Загрузка ингредиентов с сервера
async function loadIngredients() {
    try {
        const response = await fetch('/api/ingredients');
        const ingredients = await response.json();
        renderIngredients(ingredients.slice(0, 150)); // 150 продуктов
    } catch (error) {
        // Запасной список ингредиентов
        const fallbackIngredients = [
            { id: 1, name: "яйца", icon: "🥚", category: "молочные" },
            { id: 2, name: "картофель", icon: "🥔", category: "овощи" },
            // ... и так далее
        ];
        renderIngredients(fallbackIngredients);
    }
}

// Отрисовка ингредиентов
function renderIngredients(ingredients) {
    const grid = document.getElementById('ingredients-grid');
    grid.innerHTML = '';
    
    ingredients.forEach(ing => {
        const div = document.createElement('div');
        div.className = 'ingredient-item';
        div.innerHTML = `
            <div class="ingredient-emoji">${ing.icon || '🍽️'}</div>
            <div class="ingredient-name">${ing.name}</div>
        `;
        
        div.addEventListener('click', () => toggleIngredient(ing, div));
        grid.appendChild(div);
    });
}

// Выбор ингредиента
function toggleIngredient(ingredient, element) {
    const index = selectedIngredients.findIndex(i => i.id === ingredient.id);
    
    if (index === -1) {
        selectedIngredients.push(ingredient);
        element.classList.add('selected');
    } else {
        selectedIngredients.splice(index, 1);
        element.classList.remove('selected');
    }
    
    updateSelectedCount();
}

// Обновление счетчика выбранных
function updateSelectedCount() {
    document.getElementById('selected-count').textContent = selectedIngredients.length;
}

// Загрузка статистики использования
async function loadUsage() {
    try {
        // В реальном приложении - запрос к серверу
        usage.free_left = Math.max(0, 3 - (parseInt(localStorage.getItem('free_used')) || 0));
        usage.paid_left = Math.max(0, 10 - (parseInt(localStorage.getItem('paid_used')) || 0));
        
        updateCounters();
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Обновление счетчиков в интерфейсе
function updateCounters() {
    document.getElementById('free-counter').textContent = usage.free_left;
    document.getElementById('paid-counter').textContent = usage.paid_left;
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Поиск рецептов в базе
    document.getElementById('find-recipes').addEventListener('click', findRecipes);
    
    // Генерация ИИ-рецептов
    document.getElementById('ai-recipes').addEventListener('click', generateAIRecipes);
    
    // Покупка рецептов
    document.getElementById('buy-recipes').addEventListener('click', () => {
        if (usage.free_left === 0 && usage.paid_left === 0) {
            document.getElementById('payment-modal').style.display = 'flex';
        } else {
            alert('У вас ещё есть доступные рецепты!');
        }
    });
    
    // Модальное окно оплаты
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('payment-modal').style.display = 'none';
    });
    
    document.getElementById('confirm-payment').addEventListener('click', buyRecipes);
}

// Поиск рецептов в базе
async function findRecipes() {
    if (selectedIngredients.length === 0) {
        alert('Выберите хотя бы один продукт!');
        return;
    }
    
    if (usage.free_left === 0 && usage.paid_left === 0) {
        document.getElementById('payment-modal').style.display = 'flex';
        return;
    }
    
    const button = document.getElementById('find-recipes');
    const originalText = button.textContent;
    button.textContent = '🔍 Ищем рецепты...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/find-recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ingredients: selectedIngredients.map(i => i.name),
                userId: userId
            })
        });
        
        const data = await response.json();
        
        if (data.error && data.upgrade) {
            document.getElementById('payment-modal').style.display = 'flex';
            return;
        }
        
        // Обновляем статистику
        if (data.usage) {
            usage = data.usage;
            updateCounters();
            localStorage.setItem('free_used', 3 - usage.free_left);
            localStorage.setItem('paid_used', 10 - usage.paid_left);
        }
        
        // Показываем рецепты
        displayRecipes(data.recipes || []);
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при поиске рецептов');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Генерация ИИ-рецептов
async function generateAIRecipes() {
    if (selectedIngredients.length === 0) {
        alert('Выберите продукты!');
        return;
    }
    
    const preferences = document.getElementById('preferences').value;
    const button = document.getElementById('ai-recipes');
    const originalText = button.textContent;
    
    button.textContent = '✨ ИИ придумывает...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/ai-recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ingredients: selectedIngredients.map(i => i.name),
                preferences: preferences
            })
        });
        
        const data = await response.json();
        displayRecipes(data.recipes || []);
        
        // Показываем кнопку "Ещё варианты"
        if (data.recipes.length > 0) {
            showMoreButton();
        }
        
    } catch (error) {
        console.error('Ошибка ИИ:', error);
        // Показываем запасные рецепты
        const fallbackRecipes = [
            {
                name: "Фантазия шефа",
                ingredients: selectedIngredients.map(i => i.name),
                time: "20 мин",
                difficulty: "средне",
                steps: [
                    "1. Тщательно вымойте все ингредиенты",
                    "2. Нарежьте на небольшие кусочки",
                    "3. Обжарьте на среднем огне 10 минут",
                    "4. Добавьте специи по вкусу",
                    "5. Подавайте горячим!"
                ],
                isAI: true
            }
        ];
        displayRecipes(fallbackRecipes);
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Покупка дополнительных рецептов
async function buyRecipes() {
    const modal = document.getElementById('payment-modal');
    const button = document.getElementById('confirm-payment');
    const originalText = button.textContent;
    
    button.textContent = 'Обработка...';
    
    try {
        // В реальном приложении здесь будет интеграция с платежной системой
        // Пока симуляция
        
        const response = await fetch('/api/buy-recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                amount: 10
            })
        });
        
        const data = await response.json();
        
        alert(data.message || '✅ Рецепты успешно куплены!');
        
        // Обновляем статистику
        usage.paid_left = 10;
        updateCounters();
        localStorage.setItem('paid_used', 0);
        
        modal.style.display = 'none';
        
    } catch (error) {
        alert('Ошибка при оплате. Попробуйте снова.');
    } finally {
        button.textContent = originalText;
    }
}

// Показ рецептов
function displayRecipes(recipes) {
    const container = document.getElementById('recipes-container');
    
    if (recipes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>😔 Не нашли подходящих рецептов в базе</p>
                <p>Попробуйте:</p>
                <ul>
                    <li>Выбрать другие продукты</li>
                    <li>Использовать ИИ-генерацию</li>
                    <li>Указать предпочтения в поле выше</li>
                </ul>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recipes.map(recipe => `
        <div class="recipe-card">
            <div class="recipe-header">
                <div class="recipe-title">${recipe.name}</div>
                <div class="recipe-time">${recipe.time}</div>
            </div>
            
            <div class="recipe-ingredients">
                ${recipe.ingredients.map(ing => `
                    <span class="ingredient-tag">${ing}</span>
                `).join('')}
            </div>
            
            <div class="recipe-steps">
                <ol>
                    ${recipe.steps.map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
            
            ${recipe.isAI ? '<div class="ai-badge">✨ Создан ИИ</div>' : ''}
        </div>
    `).join('');
}

// Показ кнопки "Ещё варианты"
function showMoreButton() {
    const container = document.getElementById('recipes-container');
    const button = document.createElement('button');
    button.className = 'btn-secondary';
    button.innerHTML = '🔄 Ещё варианты от ИИ';
    button.onclick = generateAIRecipes;
    
    container.appendChild(button);
      }
