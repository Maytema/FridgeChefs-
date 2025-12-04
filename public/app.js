class FridgeChefApp {
    constructor() {
        this.selectedProducts = [];
        this.products = [];
        this.categories = {};
        this.aiLimit = 3;
        this.fuse = null;
        this.iti = null;
        this.init();
    }

    async init() {
        await this.loadProducts();
        this.setupEventListeners();
        this.renderCategories();
        this.updateAIButton();
        this.iti = window.intlTelInput(document.getElementById('phoneInput'), { initialCountry: 'tj' });
    }

    async loadProducts() {
        const res = await fetch('/api/products');
        const data = await res.json();
        this.products = data.products;
        this.categories = data.categories;
        this.fuse = new Fuse(this.products, { keys: ['name'], threshold: 0.3 }); // Fuzzy search
    }

    setupEventListeners() {
        // Поиск
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Фото
        document.getElementById('photoInput').addEventListener('change', (e) => this.handlePhoto(e.target.files[0]));

        // Выбор продукта
        document.addEventListener('click', (e) => {
            if (e.target.dataset.product) this.toggleProduct(e.target.dataset.product);
        });

        // Кнопки
        document.getElementById('clearAll').addEventListener('click', () => this.clearSelected());
        document.getElementById('findRecipes').addEventListener('click', () => this.findRecipes());
        document.getElementById('aiRecipe').addEventListener('click', () => this.generateAIRecipe());
        document.getElementById('premiumBtn').addEventListener('click', () => this.showModal('premium'));
        document.getElementById('whatsappBtn').addEventListener('click', () => this.openWhatsApp());
        document.getElementById('collapseAll').addEventListener('click', () => this.collapseAll());

        // Модалки
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) this.hideModal(modal.id); });
        });
        document.getElementById('closePremium').addEventListener('click', () => this.hideModal('premiumModal'));
        document.getElementById('buy-btns').addEventListener('click', (e) => { if (e.target.classList.contains('buy-btn')) this.buyPremium(e.target.dataset.plan); });
        // Аналогично для других модалок...

        // Share
        document.getElementById('sendShare').addEventListener('click', () => this.shareRecipe());
    }

    handleSearch(query) {
        const results = document.getElementById('searchResults');
        if (!query) return results.style.display = 'none';
        const matches = this.fuse.search(query).slice(0, 8);
        results.innerHTML = matches.map(p => `<div class="search-result" data-product="\( {p.item.id}"><span> \){p.item.emoji}</span> \( {p.item.name} <small>( \){p.item.category})</small></div>`).join('');
        results.style.display = 'block';
        // Клик вне — скрыть
        document.addEventListener('click', (e) => { if (!e.target.closest('.search-container')) results.style.display = 'none'; });
    }

    toggleProduct(id) {
        const index = this.selectedProducts.indexOf(id);
        if (index > -1) {
            this.selectedProducts.splice(index, 1);
        } else {
            this.selectedProducts.push(id);
        }
        this.renderSelected();
        this.renderCategories();
        document.getElementById('findRecipes').disabled = this.selectedProducts.length === 0;
    }

    renderSelected() {
        const container = document.getElementById('chipsContainer');
        const count = document.getElementById('selectedCount');
        container.innerHTML = this.selectedProducts.map(id => {
            const p = this.products.find(pr => pr.id === id);
            return `<div class="chip" data-product="\( {id}"><span> \){p.emoji}</span> <span>\( {p.name}</span> <button class="remove" data-product=" \){id}">×</button></div>`;
        }).join('');
        count.textContent = `Выбрано: ${this.selectedProducts.length}`;
        document.getElementById('selectedProducts').style.display = this.selectedProducts.length ? 'block' : 'none';
    }

    renderCategories() {
        const list = document.getElementById('categoriesList');
        list.innerHTML = Object.entries(this.categories).map(([cat, prods]) => {
            const selectedInCat = prods.filter(p => this.selectedProducts.includes(p.id)).length;
            return `
                <div class="category">
                    <div class="category-header" data-cat="\( {cat}"> \){cat} (${prods.length}) <span>▼</span></div>
                    <div class="products-grid" style="display: none;">
                        \( {prods.map(p => `<div class="product \){this.selectedProducts.includes(p.id) ? 'selected' : ''}" data-product="\( {p.id}"><span> \){p.emoji}</span> ${p.name}</div>`).join('')}
                    </div>
                </div>
            `;
        }).join('');
        // Аккордеон
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const grid = header.nextElementSibling;
                grid.style.display = grid.style.display === 'none' ? 'grid' : 'none';
            });
        });
    }

    async findRecipes() {
        const res = await fetch('/api/find-recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredients: this.selectedProducts }) });
        const data = await res.json();
        this.renderRecipes(data.recipes);
    }

    async generateAIRecipe() {
        if (this.aiLimit <= 0) return this.showModal('aiLimitModal');
        this.aiLimit--;
        this.updateAIButton();
        const res = await fetch('/api/generate-ai-recipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredients: this.selectedProducts }) });
        const data = await res.json();
        this.renderRecipes([data.recipe]);
    }

    renderRecipes(recipes) {
        document.getElementById('resultsTitle').textContent = `Найдено рецептов: ${recipes.length}`;
        const list = document.getElementById('recipesList');
        list.innerHTML = recipes.map(r => `
            <div class="recipe-card">
                <h3>${r.title}</h3>
                <div class="recipe-meta">
                    <span>⏱️ ${r.time} мин</span>
                    <span>🎚️ ${r.difficulty}</span>
                </div>
                <div class="recipe-ingredients">Ингредиенты: ${r.ingredients.join(', ')}</div>
                <ol class="recipe-steps">\( {r.steps.map(s => `<li> \){s}</li>`).join('')}</ol>
                <div class="recipe-actions">
                    <button onclick="app.shareRecipe('${r.id}')">📤 Отправить</button>
                    <button onclick="app.downloadRecipe('${r.id}')">📥 Скачать TXT</button>
                </div>
            </div>
        `).join('');
        document.getElementById('resultsSection').style.display = 'block';
    }

    async handlePhoto(file) {
        if (!file) return;
        const formData = new FormData();
        formData.append('photo', file);
        const res = await fetch('/api/analyze-photo', { method: 'POST', body: formData });
        const data = await res.json();
        data.products.forEach(id => this.toggleProduct(id)); // Авто-добавление
    }

    updateAIButton() {
        document.querySelector('.counter').textContent = this.aiLimit;
        document.querySelector('.badge').textContent = `${this.aiLimit} бесплатно`;
    }

    showModal(id) { document.getElementById(id).style.display = 'flex'; }
    hideModal(id) { document.getElementById(id).style.display = 'none'; }

    buyPremium(plan) {
        // DonationAlerts ссылка
        const url = plan === '10' ? 'https://www.donationalerts.com/r/your_link_99' : 'https://www.donationalerts.com/r/your_link_299';
        window.open(url, '_blank');
        this.hideModal('premiumModal');
        alert('После оплаты пришлите скрин в WhatsApp для активации!');
    }

    shareRecipe(recipeId) {
        this.showModal('shareModal');
        // Логика отправки по методу
        document.querySelectorAll('input[name="shareMethod"]').forEach(r => r.addEventListener('change', (e) => {
            document.getElementById('phoneInput').style.display = e.target.value === 'whatsapp' ? 'block' : 'none';
        }));
    }

    async downloadRecipe(recipeId) {
        const recipe = /* Получить по ID */ { title: 'Test', steps: ['Step1'] };
        const blob = new Blob([`Рецепт: \( {recipe.title}\nШаги:\n \){recipe.steps.join('\n')}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${recipe.title}.txt`;
        a.click();
    }

    openWhatsApp() {
        window.open('https://wa.me/996774032150?text=Привет! Вопрос по FridgeChef...', '_blank');
    }

    clearSelected() { this.selectedProducts = []; this.renderSelected(); this.renderCategories(); }
    collapseAll() { document.querySelectorAll('.products-grid').forEach(g => g.style.display = 'none'); }
}

const app = new FridgeChefApp();
