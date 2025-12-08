const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

const apiRoutes = require('./api');
app.use('/api', apiRoutes);

app.get('/service.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/service.js'));
});

app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/manifest.json'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

async function initData() {
    try {
        const dataPath = path.join(__dirname, '../data');
        const files = ['products.json', 'recipes.json', 'users.json'];
        
        for (const file of files) {
            try {
                await fs.access(path.join(dataPath, file));
            } catch {
                console.log(`Создаём файл: ${file}`);
                await fs.writeFile(
                    path.join(dataPath, file),
                    '[]'
                );
            }
        }
    } catch (error) {
        console.error('Ошибка инициализации данных:', error);
    }
}

async function startServer() {
    await initData();
    
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
    });
}

startServer();
