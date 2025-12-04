// Основные переменные
let selectedIngredients = [];
let userId = localStorage.getItem('user_id') || 'user_' + Math.random().toString(36).substr(2, 9);
let usage = { free_left: 3, paid_left: 10 };

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async function() {
    console.log('FridgeChefs загружается...');
    
    // Сохраняем ID пользователя
    localStorage.setItem('user_id', userId);
    
    // Загружаем ингредиенты
    await loadIngredients();
    
    // Загружаем статистику
    await loadUsage();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    console.log('Приложение готово!');
});

// Загрузка ингредиентов с сервера
async function loadIngredients() {
    try {
        console.log('Загружаю ингредиенты...');
        const response = await fetch('/api/ingredients');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.ingredients) {
            renderIngredients(data.ingredients);
        } else {
            throw new Error('Неверный формат ответа');
        }
        
        console.log(`Загружено ${data.count} ингредиентов`);
    } catch (error) {
        console.error('Ошибка загрузки ингредиентов:', error);
        
        // Показываем сообщение об ошибке
        document.getElementById('ingredients-grid').innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #ef4444;">
                <p>Ошибка загрузки продуктов</p>
                <button onclick="loadIngredients()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem;">
                    Повторить загрузку
                </button>
            </div>
        `;
    }
}

// Отрисовка ингредиентов
function renderIngredients(ingredients) {
    const grid = document.getElementById('ingredients-grid');
    grid.innerHTML = '';
    
    // Показываем первые 50 продуктов для скорости
    const displayIngredients = ingredients.slice(0, 50);
    
    displayIngredients.forEach(ingredient => {
        const div = document.createElement('div');
        div.className = 'ingredient-item';
        div.innerHTML = `
            <div class="ingredient-emoji">${ingredient.icon || '🥚'}</div>
            <div class="ingredient-name">${ingredient.name}</div>
        `;
        
        div.addEventListener('click', () => toggleIngredient(ingredient, div));
        grid.appendChild(div);
    });
    
    // Кнопка "Показать еще"
    const showMoreDiv = document.createElement('div');
    showMoreDiv.className = 'ingredient-item';
    showMoreDiv.style.borderStyle = 'dashed';
    showMoreDiv.innerHTML = `
        <div class="ingredient-emoji">➕</div>
        <div class="ingredient-name">Ещё...</div>
    `;
    showMoreDiv.addEventListener('click', () => {
        alert('Всего доступно 150+ продуктов! Используйте поиск.');
    });
    grid.appendChild(showMoreDiv);
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
        const response = await fetch(`/api/usage/${userId}`);
        const data = await response.json();
        
        if (data) {
            usage = data;
            updateUsageCounters();
        }
    } catch (error) {
        console.log('Используем значения по умолчанию');
        updateUsageCounters();
    }
}

// Обновление счетчиков в интерфейсе
function updateUsageCounters() {
    document.getElementById('free-count').textContent = usage.free_left;
    document.getElementById('paid-count').textContent = usage.paid_left;
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Поиск рецептов в базе
    document.getElementById('find-btn').addEventListener('click', findRecipes);
    
    // Генерация ИИ-рецептов
    document.getElementById('ai-btn').addEventListener('click', generateAIRecipes);
    
    // Покупка рецептов
    document.getElementById('buy-btn').addEventListener('click', () => {
        document.getElementById('payment-modal').style.display = 'flex';
    });
    
    // Закрытие модального окна
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('payment-modal').style.display = 'none';
    });
    
    // Оплата
    document.getElementById('pay-btn').addEventListener('click', buyRecipes);
    
    // Поиск по ингредиентам
    document.getElementById('search-input').addEventListener('input', function(e) {
        searchIngredients(e.target.value);
    });
    
    // Теги предпочтений
    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', function() {
            document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('preferences').value = this.textContent;
        });
    });
}

// Поиск по ингредиентам
function searchIngredients(query) {
    const items = document.querySelectorAll('.ingredient-item');
    const queryLower = query.toLowerCase();
    
    items.forEach(item => {
        const name = item.querySelector('.ingredient-name').textContent.toLowerCase();
        if (name.includes(queryLower) || query === '') {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Поиск рецептов в базе
async function findRecipes() {
    if (selectedIngredients.length === 0) {
        alert('Выберите хотя бы один продукт!');
        return;
    }
    
    if (usage.free_left <= 0 && usage.paid_left <= 0) {
        document.getElementById('payment-modal').style.display = 'flex';
        return;
    }
    
    const button = document.getElementById('find-btn');
    const originalText = button.textContent;
    button.textContent = '🔍 Ищем рецепты...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/find-recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ingredients: selectedIngredients.map(i => i.name.toLowerCase()),
                userId: userId
            })
        });
        
        const data = await response.json();
        
        if (data.error && data.upgrade) {
            document.getElementById('payment-modal').style.display = 'flex';
            return;
        }
        
        if (data.success) {
            // Обновляем статистику
            if (data.usage) {
                usage = data.usage;
                updateUsageCounters();
            }
            
            // Показываем рецепты
            displayRecipes(data.recipes || []);
            
            // Показываем кнопку "Ещё варианты"
            if (data.recipes && data.recipes.length > 0) {
                showMoreButton();
            }
        } else {
            throw new Error(data.error || 'Ошибка поиска');
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при поиске рецептов. Проверьте подключение к интернету.');
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
    const customIngredients = document.getElementById('custom-ingredients').value;
    
    let allIngredients = selectedIngredients.map(i => i.name.toLowerCase());
    
    if (customIngredients) {
        const customItems = customIngredients.split(',').map(item => item.trim()).filter(item => item);
        allIngredients = [...allIngredients, ...customItems];
    }
    
    const button = document.getElementById('ai-btn');
    const originalText = button.textContent;
    
    button.textContent = '✨ ИИ придумывает...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/ai-recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ingredients: allIngredients,
                preferences: preferences
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayRecipes(data.recipes || []);
        } else {
            throw new Error(data.error || 'Ошибка генерации');
        }
        
    } catch (error) {
        console.error('Ошибка ИИ:', error);
        
        // Показываем запасной рецепт
        const fallbackRecipe = {
            id: Date.now(),
            name: "Специальный рецепт от ИИ",
            ingredients: allIngredients.slice(0, 5),
            time: "25 мин",
            difficulty: "средне",
            steps: [
                "1. Тщательно вымойте все ингредиенты",
                "2. Нарежьте на небольшие кусочки",
                "3. Обжарьте на среднем огне 10 минут",
                "4. Добавьте специи по вкусу",
                "5. Готовьте ещё 10 минут до готовности",
                "6. Подавайте горячим!"
            ],
            isAI: true
        };
        
        displayRecipes([fallbackRecipe]);
        
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Покупка дополнительных рецептов
async function buyRecipes() {
    const modal = document.getElementById('payment-modal');
    const button = document.getElementById('pay-btn');
    const originalText = button.textContent;
    
    button.textContent = 'Обработка...';
    
    try {
        const response = await fetch('/api/buy-recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                amount: 10
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message || '✅ Рецепты успешно куплены!');
            
            // Обновляем статистику
            if (data.usage) {
                usage = data.usage;
                updateUsageCounters();
            }
            
            modal.style.display = 'none';
            
            // Показываем сообщение об успехе
            const results = document.getElementById('results');
            results.innerHTML = `
                <div style="text-align: center; padding: 2rem; background: #dcfce7; border-radius: 0.75rem;">
                    <h3 style="color: #166534; margin-bottom: 1rem;">✅ Успешная покупка!</h3>
                    <p style="color: #166534;">Теперь у вас есть ${usage.paid_left} премиум-рецептов</p>
                    <button onclick="findRecipes()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem;">
                        Найти рецепты
                    </button>
                </div>
            `;
        } else {
            throw new Error(data.error || 'Ошибка оплаты');
        }
        
    } catch (error) {
        alert('Ошибка при оплате. Попробуйте снова.');
    } finally {
        button.textContent = originalText;
    }
}

// Показ рецептов
function displayRecipes(recipes) {
    const container = document.getElementById('results');
    
    if (recipes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>😔 Не нашли подходящих рецептов</p>
                <p>Попробуйте:</p>
                <ul style="text-align: left; margin-top: 1rem;">
                    <li>Выбрать другие продукты</li>
                    <li>Использовать ИИ-генерацию</li>
                    <li>Указать пожелания в поле выше</li>
                </ul>
                <button onclick="generateAIRecipes()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem;">
                    ✨ Сгенерировать ИИ-рецепт
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recipes.map(recipe => `
        <div class="recipe-card">
            <div class="recipe-header">
                <div class="recipe-title">${recipe.name}</div>
                <div style="background: ${recipe.isAI ? '#fef3c7' : '#dbeafe'}; color: ${recipe.isAI ? '#92400e' : '#1e40af'}; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 600;">
                    ${recipe.isAI ? '✨ ИИ-рецепт' : '📖 Из базы'}
                </div>
            </div>
            
            <div class="recipe-meta">
                <span>⏱️ ${recipe.time}</span>
                <span>🎚️ ${recipe.difficulty}</span>
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
            
            <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                <button onclick="shareRecipe('${recipe.name}', ${JSON.stringify(recipe.steps).replace(/'/g, "\\'")})" style="padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 0.5rem; font-size: 0.875rem;">
                    📤 Поделиться
                </button>
                <button onclick="saveRecipe(${recipe.id})" style="padding: 0.5rem 1rem; background: #8b5cf6; color: white; border: none; border-radius: 0.5rem; font-size: 0.875rem;">
                    💾 Сохранить
                </button>
            </div>
        </div>
    `).join('');
    
    // Добавляем разделитель если несколько рецептов
    if (recipes.length > 1) {
        const dividers = container.querySelectorAll('.recipe-card');
        dividers.forEach((div, index) => {
            if (index < dividers.length - 1) {
                div.style.marginBottom = '2rem';
            }
        });
    }
}

// Показ кнопки "Ещё варианты"
function showMoreButton() {
    const container = document.getElementById('results');
    const button = document.createElement('button');
    button.className = 'btn btn-secondary';
    button.innerHTML = '🔄 Показать ещё варианты';
    button.onclick = findRecipes;
    
    container.appendChild(button);
}

// Поделиться рецептом
function shareRecipe(title, steps) {
    const text = `🍳 ${title}\n\nИнгредиенты:\n${selectedIngredients.map(i => i.name).join(', ')}\n\nКак приготовить:\n${Array.isArray(steps) ? steps.join('\n') : steps}\n\nСгенерировано в FridgeChefs`;
    
    if (navigator.share) {
        navigator.share({
            title: title,
            text: text,
            url: window.location.href
        }).catch(console.error);
    } else {
        // Для десктопа или старых браузеров
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    }
}

// Сохранить рецепт
function saveRecipe(recipeId) {
    const saved = JSON.parse(localStorage.getItem('saved_recipes') || '[]');
    if (!saved.includes(recipeId)) {
        saved.push(recipeId);
        localStorage.setItem('saved_recipes', JSON.stringify(saved));
        alert('✅ Рецепт сохранен!');
    } else {
        alert('⚠️ Рецепт уже сохранен');
    }
    }
