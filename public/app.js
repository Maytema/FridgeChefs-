// ChefZero - Основное приложение
class ChefZeroApp {
    constructor() {
        this.selectedProducts = new Set();
        this.products = [];
        this.recipes = [];
        this.categories = [];
        
        this.init();
    }
    
    async init() {
        // Загружаем данные
        await this.loadData();
        
        // Инициализируем компоненты
        this.initSearch();
        this.initCategories();
        this.initEventListeners();
        this.updateUI();
        
        console.log('ChefZero инициализирован! 🍳');
    }
    
    async loadData() {
        try {
            // Загружаем продукты
            const productsResponse = await fetch('../data/products.json');
            this.products = await productsResponse.json();
            
            // Загружаем рецепты
            const recipesResponse = await fetch('../data/recipes.json');
            this.recipes = await recipesResponse.json();
            
            // Формируем категории из продуктов
            this.categories = this.extractCategories();
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }
    
    extractCategories() {
        const categoriesMap = new Map();
        
        this.products.forEach(product => {
            if (!categoriesMap.has(product.category)) {
                categoriesMap.set(product.category, {
                    name: product.category,
                    emoji: product.categoryEmoji || '📦',
                    products: []
                });
            }
            categoriesMap.get(product.category).products.push(product);
        });
        
        return Array.from(categoriesMap.values());
    }
    
    initSearch() {
        const searchInput = document.getElementById('searchInput');
        const liveResults = document.getElementById('liveResults');
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (query.length < 2) {
                liveResults.style.display = 'none';
                return;
            }
            
            // Поиск продуктов
            const results = this.products.filter(product => 
                product.name.toLowerCase().includes(query) ||
                product.name.toLowerCase().replace(/[^а-я]/g, '').includes(query)
            ).slice(0, 8);
            
            this.renderSearchResults(results);
            liveResults.style.display = 'block';
        });
        
        // Закрываем результаты при клике вне
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !liveResults.contains(e.target)) {
                liveResults.style.display = 'none';
            }
        });
    }
    
    renderSearchResults(results) {
        const container = document.getElementById('liveResults');
        
        if (results.length === 0) {
            container.innerHTML = `
                <div class="live-result-item">
                    <div class="emoji">😕</div>
                    <div class="name">Ничего не найдено</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = results.map(product => `
            <div class="live-result-item" data-id="${product.id}">
                <div class="emoji">${product.emoji}</div>
                <div class="name">${product.name}</div>
                <div class="action">
                    ${this.selectedProducts.has(product.id) ? '✓' : '+'}
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики кликов
        container.querySelectorAll('.live-result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const productId = parseInt(item.dataset.id);
                this.toggleProduct(productId);
                this.updateUI();
                document.getElementById('liveResults').style.display = 'none';
                document.getElementById('searchInput').value = '';
            });
        });
    }
    
    initCategories() {
        const container = document.getElementById('categoriesContainer');
        
        // Показываем только первые 5 категорий
        const visibleCategories = this.categories.slice(0, 5);
        const hiddenCategories = this.categories.slice(5);
        
        container.innerHTML = visibleCategories.map(category => `
            <div class="category" data-category="${category.name}">
                <div class="category-header">
                    <div class="emoji">${category.emoji}</div>
                    <div class="name">${category.name}</div>
                    <div class="count">(${category.products.length})</div>
                    <button class="toggle">▼</button>
                </div>
                <div class="category-items hidden">
                    ${this.renderCategoryProducts(category.products)}
                </div>
            </div>
        `).join('');
        
        // Инициализируем аккордеон
        this.initCategoryAccordion();
        
        // Кнопка "Показать все"
        const showAllBtn = document.getElementById('showAllBtn');
        showAllBtn.querySelector('.count').textContent = `(${hiddenCategories.length})`;
        
        showAllBtn.addEventListener('click', () => {
            // Показываем все категории
            container.innerHTML = this.categories.map(category => `
                <div class="category" data-category="${category.name}">
                    <div class="category-header">
                        <div class="emoji">${category.emoji}</div>
                        <div class="name">${category.name}</div>
                        <div class="count">(${category.products.length})</div>
                        <button class="toggle">▶</button>
                    </div>
                    <div class="category-items hidden">
                        ${this.renderCategoryProducts(category.products)}
                    </div>
                </div>
            `).join('');
            
            this.initCategoryAccordion();
            showAllBtn.style.display = 'none';
        });
    }
    
    renderCategoryProducts(products) {
        return products.map(product => `
            <div class="product-item ${this.selectedProducts.has(product.id) ? 'selected' : ''}" 
                 data-id="${product.id}">
                <div class="emoji">${product.emoji}</div>
                <div class="name">${product.name}</div>
            </div>
        `).join('');
    }
    
    initCategoryAccordion() {
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.classList.contains('toggle')) return;
                
                const category = header.parentElement;
                const items = category.querySelector('.category-items');
                const toggle = category.querySelector('.toggle');
                
                // Закрываем другие открытые категории
                document.querySelectorAll('.category-items').forEach(otherItems => {
                    if (otherItems !== items && !otherItems.classList.contains('hidden')) {
                        otherItems.classList.add('hidden');
                        otherItems.parentElement.querySelector('.toggle').textContent = '▶';
                    }
                });
                
                // Переключаем текущую
                if (items.classList.contains('hidden')) {
                    items.classList.remove('hidden');
                    toggle.textContent = '▼';
                } else {
                    items.classList.add('hidden');
                    toggle.textContent = '▶';
                }
            });
            
            // Обработчик кнопки toggle
            const toggleBtn = header.querySelector('.toggle');
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                header.click();
            });
        });
        
        // Обработчики для продуктов в категориях
        document.querySelectorAll('.product-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const productId = parseInt(item.dataset.id);
                this.toggleProduct(productId);
                this.updateUI();
            });
        });
    }
    
    toggleProduct(productId) {
        if (this.selectedProducts.has(productId)) {
            this.selectedProducts.delete(productId);
        } else {
            this.selectedProducts.add(productId);
        }
    }
    
    updateUI() {
        // Обновляем счетчик выбранных продуктов
        const selectedCount = document.getElementById('selectedCount');
        selectedCount.textContent = this.selectedProducts.size;
        
        // Обновляем чипсы
        this.updateChips();
        
        // Обновляем кнопку поиска рецептов
        this.updateMainButton();
        
        // Обновляем состояние продуктов в интерфейсе
        this.updateProductSelection();
        
        // Если выбраны продукты, показываем секцию рецептов
        if (this.selectedProducts.size > 0) {
            this.showRecipes();
        } else {
            this.hideRecipes();
        }
    }
    
    updateChips() {
        const container = document.getElementById('selectedChips');
        const selectedProducts = Array.from(this.selectedProducts).map(id => 
            this.products.find(p => p.id === id)
        ).filter(Boolean);
        
        container.innerHTML = selectedProducts.map(product => `
            <div class="chip" data-id="${product.id}">
                <span class="emoji">${product.emoji}</span>
                <span>${product.name}</span>
                <button class="remove">×</button>
            </div>
        `).join('');
        
        // Добавляем обработчики удаления
        container.querySelectorAll('.chip .remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chip = btn.closest('.chip');
                const productId = parseInt(chip.dataset.id);
                this.selectedProducts.delete(productId);
                this.updateUI();
            });
        });
    }
    
    updateMainButton() {
        const btn = document.getElementById('findRecipesBtn');
        const countSpan = btn.querySelector('.count');
        const textSpan = btn.querySelector('.text');
        
        if (this.selectedProducts.size === 0) {
            btn.disabled = true;
            textSpan.textContent = 'Выберите минимум 1 продукт';
            countSpan.textContent = '';
        } else {
            btn.disabled = false;
            textSpan.textContent = 'Найти рецепты';
            
            // Подсчитываем сколько рецептов можно приготовить
            const matchingRecipes = this.findMatchingRecipes();
            countSpan.textContent = `Из ${this.selectedProducts.size} продуктов → ${matchingRecipes.length} рецептов`;
        }
    }
    
    updateProductSelection() {
        // Обновляем все продукты в интерфейсе
        document.querySelectorAll('.product-item').forEach(item => {
            const productId = parseInt(item.dataset.id);
            if (this.selectedProducts.has(productId)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    findMatchingRecipes() {
        return this.recipes.filter(recipe => {
            // Проверяем, есть ли у нас все продукты для рецепта
            return recipe.products.every(productId => 
                this.selectedProducts.has(productId)
            );
        });
    }
    
    showRecipes() {
        const section = document.getElementById('recipesSection');
        section.classList.remove('hidden');
        
        const matchingRecipes = this.findMatchingRecipes();
        const countSpan = document.getElementById('recipesCount');
        countSpan.textContent = matchingRecipes.length;
        
        this.renderRecipes(matchingRecipes);
    }
    
    hideRecipes() {
        const section = document.getElementById('recipesSection');
        section.classList.add('hidden');
    }
    
    renderRecipes(recipes) {
        const container = document.getElementById('recipesGrid');
        
        if (recipes.length === 0) {
            container.innerHTML = `
                <div class="no-recipes">
                    <div style="font-size: 48px; text-align: center; margin: 40px 0;">😕</div>
                    <h3 style="text-align: center; color: var(--text-secondary);">
                        Нет рецептов для выбранных продуктов
                    </h3>
                    <p style="text-align: center; color: var(--text-secondary);">
                        Попробуйте выбрать другие продукты или создайте ИИ-рецепт
                    </p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = recipes.map(recipe => `
            <div class="recipe-card" data-id="${recipe.id}">
                <div class="recipe-header">
                    <div class="recipe-title">
                        <span>${recipe.emoji || '🍳'}</span>
                        <span>${recipe.name}</span>
                    </div>
                    <div class="recipe-meta">
                        <span>⏱️ ${recipe.time} мин</span>
                        <span>🎚️ ${this.getDifficultyText(recipe.difficulty)}</span>
                        <span>👤 ${recipe.servings || 2} порции</span>
                    </div>
                    <div class="recipe-products">
                        <strong>Ингредиенты:</strong> ${this.getRecipeProductsText(recipe)}
                    </div>
                </div>
                <div class="recipe-actions">
                    <button class="recipe-btn view-recipe" data-id="${recipe.id}">
                        👁️ Посмотреть
                    </button>
                    <button class="recipe-btn save-recipe" data-id="${recipe.id}">
                        ❤️ Сохранить
                    </button>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики для кнопок рецептов
        this.initRecipeActions();
    }
    
    getRecipeProductsText(recipe) {
        return recipe.products.map(productId => {
            const product = this.products.find(p => p.id === productId);
            return product ? product.name : 'Неизвестный продукт';
        }).join(', ');
    }
    
    getDifficultyText(difficulty) {
        const levels = {
            1: 'Легко',
            2: 'Средне',
            3: 'Сложно'
        };
        return levels[difficulty] || 'Легко';
    }
    
    initRecipeActions() {
        // Кнопка просмотра рецепта
        document.querySelectorAll('.view-recipe').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recipeId = parseInt(btn.dataset.id);
                this.showRecipeModal(recipeId);
            });
        });
        
        // Кнопка сохранения рецепта
        document.querySelectorAll('.save-recipe').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recipeId = parseInt(btn.dataset.id);
                this.saveRecipe(recipeId);
            });
        });
    }
    
    showRecipeModal(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return;
        
        const modal = document.getElementById('recipeModal');
        const content = document.getElementById('recipeContent');
        
        // Получаем названия продуктов
        const productNames = recipe.products.map(id => {
            const product = this.products.find(p => p.id === id);
            return product ? `${product.emoji} ${product.name}` : 'Неизвестный продукт';
        });
        
        content.innerHTML = `
            <div class="recipe-modal-content">
                <h2>${recipe.emoji || '🍳'} ${recipe.name}</h2>
                
                <div class="recipe-meta">
                    <div><strong>⏱️ Время:</strong> ${recipe.time} минут</div>
                    <div><strong>🎚️ Сложность:</strong> ${this.getDifficultyText(recipe.difficulty)}</div>
                    <div><strong>👤 Порции:</strong> ${recipe.servings || 2}</div>
                </div>
                
                <div class="recipe-section">
                    <h3>📋 Ингредиенты:</h3>
                    <ul>
                        ${productNames.map(name => `<li>${name}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="recipe-section">
                    <h3>👩‍🍳 Приготовление:</h3>
                    <ol>
                        ${recipe.steps.map((step, i) => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
                
                <div class="recipe-actions">
                    <button class="recipe-btn" onclick="window.print()">
                        🖨️ Распечатать рецепт
                    </button>
                    <button class="recipe-btn" onclick="alert('PDF скачивание в разработке')">
                        📥 Скачать PDF
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
        
        // Закрытие модалки
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        // Закрытие по клику вне модалки
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }
    
    saveRecipe(recipeId) {
        // Сохраняем рецепт в localStorage
        let saved = JSON.parse(localStorage.getItem('savedRecipes') || '[]');
        if (!saved.includes(recipeId)) {
            saved.push(recipeId);
            localStorage.setItem('savedRecipes', JSON.stringify(saved));
            alert('Рецепт сохранен в избранное! ❤️');
        } else {
            alert('Этот рецепт уже сохранен!');
        }
    }
    
    initEventListeners() {
        // Кнопка поиска рецептов
        document.getElementById('findRecipesBtn').addEventListener('click', () => {
            this.showRecipes();
            // Прокручиваем к результатам
            document.getElementById('recipesSection').scrollIntoView({ 
                behavior: 'smooth' 
            });
        });
        
        // Кнопка ИИ-рецепта
        document.getElementById('aiRecipeBtn').addEventListener('click', () => {
            if (this.selectedProducts.size === 0) {
                alert('Сначала выберите продукты!');
                return;
            }
            
            const aiCount = parseInt(document.querySelector('.counter').textContent);
            if (aiCount <= 0) {
                this.showPremiumModal();
                return;
            }
            
            alert('ИИ-рецепт в разработке! Пока используйте обычные рецепты 😊');
            // Обновляем счетчик
            document.querySelector('.counter').textContent = aiCount - 1;
        });
        
        // Кнопка премиума
        document.getElementById('premiumBtn').addEventListener('click', () => {
            this.showPremiumModal();
        });
        
        // Закрытие премиум-модалки
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('premiumModal').classList.add('hidden');
            });
        });
    }
    
    showPremi
