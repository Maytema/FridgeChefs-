class FridgeChefsApp {
    constructor() {
        this.selectedProducts = [];
        this.currentRecipes = [];
        this.currentShareRecipe = null;
        this.init();
    }

    async init() {
        await this.loadProducts();
        this.setupEventListeners();
        this.updateSelectedCount();
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            const data = await response.json();
            
            if (data.success) {
                this.renderCategories(data.categories);
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    renderCategories(categories) {
        const container = document.getElementById('categories-container');
        container.innerHTML = '';

        Object.entries(categories).forEach(([categoryName, products]) => {
            const categoryElement = this.createCategoryElement(categoryName, products);
            container.appendChild(categoryElement);
        });

        this.setupCategoryToggles();
    }

    createCategoryElement(name, products) {
        const div = document.createElement('div');
        div.className = 'category';
        div.innerHTML = `
            <div class="category-header" data-category="${name}">
                <span class="category-name">${name}</span>
                <span class="category-count">${products.length}</span>
                <span class="category-toggle">›</span>
            </div>
            <div class="products-list">
                ${products.map(product => `
                    <div class="product-item" data-id="${product.id}">
                        <span class="product-emoji">${product.icon}</span>
                        <span class="product-name">${product.name}</span>
                    </div>
                `).join('')}
            </div>
        `;
        return div;
    }

    setupCategoryToggles() {
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.classList.contains('product-item')) return;
                
                const category = header.closest('.category');
                const isActive = category.classList.contains('active');
                
                document.querySelectorAll('.category').forEach(cat => {
                    cat.classList.remove('active');
                });
                
                if (!isActive) {
                    category.classList.add('active');
                }
            });
        });

        document.querySelectorAll('.product-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleProduct(item);
            });
        });
    }

    toggleProduct(productElement) {
        const productId = parseInt(productElement.dataset.id);
        const productName = productElement.querySelector('.product-name').textContent;
        const productIcon = productElement.querySelector('.product-emoji').textContent;
        
        const existingIndex = this.selectedProducts.findIndex(p => p.id === productId);
        
        if (existingIndex >= 0) {
            this.selectedProducts.splice(existingIndex, 1);
            productElement.classList.remove('selected');
        } else {
            this.selectedProducts.push({ id: productId, name: productName, icon: productIcon });
            productElement.classList.add('selected');
        }
        
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        document.getElementById('selected-count').textContent = this.selectedProducts.length;
    }

    setupEventListeners() {
        // Поиск
        document.getElementById('search').addEventListener('input', (e) => {
            this.filterProducts(e.target.value);
        });

        // Найти рецепты
        document.getElementById('find-recipes').addEventListener('click', () => {
            this.findRecipes();
        });

        // Премиум модалка
        document.getElementById('show-premium').addEventListener('click', () => {
            this.showModal('premium-modal');
        });

        document.getElementById('close-modal').addEventListener('click', () => {
            this.hideModal('premium-modal');
        });

        document.getElementById('buy-premium').addEventListener('click', () => {
            this.buyPremium();
        });

        // Модалка отправки
        document.getElementById('cancel-share').addEventListener('click', () => {
            this.hideModal('share-modal');
        });

        document.getElementById('send-recipe').addEventListener('click', () => {
            this.sendRecipe();
        });

        // Закрытие модалок по клику вне
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    filterProducts(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        document.querySelectorAll('.category').forEach(category => {
            let hasVisibleProducts = false;
            
            category.querySelectorAll('.product-item').forEach(item => {
                const productName = item.querySelector('.product-name').textContent.toLowerCase();
                
                if (term === '' || productName.includes(term)) {
                    item.style.display = 'flex';
                    hasVisibleProducts = true;
                } else {
                    item.style.display = 'none';
                }
            });
            
            const categoryHeader = category.querySelector('.category-header');
            categoryHeader.style.display = hasVisibleProducts ? 'flex' : 'none';
            
            if (hasVisibleProducts && !category.classList.contains('active')) {
                category.classList.add('active');
            }
        });
    }

    async findRecipes() {
        if (this.selectedProducts.length === 0) {
            alert('Выберите хотя бы один продукт');
            return;
        }

        const button = document.getElementById('find-recipes');
        const originalText = button.innerHTML;
        button.innerHTML = '🔍 Ищем...';
        button.disabled = true;

        try {
            const ingredients = this.selectedProducts.map(p => p.name);
            const response = await fetch('/api/find-recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredients })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentRecipes = data.recipes;
                this.showRecipes(data.recipes);
                document.getElementById('results-count').textContent = data.count;
                document.getElementById('results-section').style.display = 'block';
            } else {
                alert('Не удалось найти рецепты');
            }
        } catch (error) {
            console.error('Error finding recipes:', error);
            alert('Ошибка соединения');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    showRecipes(recipes) {
        const container = document.getElementById('results-container');
        
        if (recipes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">😔</div>
                    <p>Не найдено рецептов для выбранных продуктов</p>
                    <p>Попробуйте выбрать другие ингредиенты</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recipes.map(recipe => `
            <div class="recipe-card" data-id="${recipe.id}">
                <div class="recipe-title">${recipe.name}</div>
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
                    <h4>Приготовление:</h4>
                    <ol>
                        ${recipe.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
                
                <div class="recipe-actions">
                    <button class="btn-small btn-share" onclick="app.shareRecipe(${recipe.id})">
                        📤 Отправить себе
                    </button>
                    <button class="btn-small btn-download" onclick="app.downloadRecipe(${recipe.id})">
                        📥 Скачать PDF
                    </button>
                </div>
            </div>
        `).join('');
    }

    shareRecipe(recipeId) {
        const recipe = this.currentRecipes.find(r => r.id === recipeId);
        if (!recipe) return;

        this.currentShareRecipe = recipe;
        this.showModal('share-modal');
    }

    sendRecipe() {
        const method = document.querySelector('#share-modal .modal-option.selected')?.dataset.method;
        if (!method || !this.currentShareRecipe) return;

        const recipe = this.currentShareRecipe;
        const text = this.formatRecipeText(recipe);

        if (method === 'whatsapp') {
            const phone = prompt('Введите номер телефона (например: +996774032150):', '+996');
            if (phone) {
                const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
                window.open(whatsappUrl, '_blank');
            }
        } else if (method === 'telegram') {
            const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
            window.open(telegramUrl, '_blank');
        }

        this.hideModal('share-modal');
    }

    formatRecipeText(recipe) {
        return `🍳 ${recipe.name}\n\n` +
               `⏱️ Время: ${recipe.time}\n` +
               `🎚️ Сложность: ${recipe.difficulty}\n\n` +
               `Ингредиенты:\n${recipe.ingredients.map(ing => `• ${ing}`).join('\n')}\n\n` +
               `Приготовление:\n${recipe.steps.map((step, i) => `${i+1}. ${step}`).join('\n')}\n\n` +
               `Найдено в FridgeChefs`;
    }

    downloadRecipe(recipeId) {
        const recipe = this.currentRecipes.find(r => r.id === recipeId);
        if (!recipe) return;

        const text = this.formatRecipeText(recipe);
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${recipe.name}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async buyPremium() {
        const selectedPlan = document.querySelector('#premium-modal .modal-option.selected')?.dataset.plan;
        if (!selectedPlan) return;

        try {
            const response = await fetch('/api/buy-recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: selectedPlan })
            });

            const data = await response.json();
            
            if (data.success) {
                alert(data.message);
                this.hideModal('premium-modal');
            } else {
                alert('Ошибка при покупке');
            }
        } catch (error) {
            console.error('Error buying premium:', error);
            alert('Ошибка соединения');
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
        
        if (modalId === 'share-modal') {
            document.querySelectorAll('#share-modal .modal-option').forEach(option => {
                option.classList.remove('selected');
                option.addEventListener('click', () => {
                    document.querySelectorAll('#share-modal .modal-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    option.classList.add('selected');
                });
            });
        }
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
}

// Инициализация приложения
const app = new FridgeChefsApp();
