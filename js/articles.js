import { supabase } from './js/config.js';

// Переменная для нашего редактора
let quill = null;
let loadedArticles = []; // Храним загруженные статьи для поиска

// 1. Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadArticlesFromDB();

    // Настраиваем Quill (Визуальный редактор)
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer) {
        quill = new Quill('#editor-container', {
            theme: 'snow',
            placeholder: 'Напишите здесь вашу статью. Используйте панель сверху для форматирования текста...',
            modules: {
                toolbar: [
                    [{ 'header': [2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'clean']
                ]
            }
        });
    }
});

// 2. Загрузка статей из базы на главную
export async function loadArticlesFromDB() {
    const grid = document.getElementById('articles-grid');
    if(!grid) return;
    grid.innerHTML = '<p class="text-gray-400 col-span-3">Загрузка статей...</p>';

    try {
        const { data: articles, error } = await supabase
            .from('articles')
            .select('*')
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (error) throw error;

        loadedArticles = articles || []; // Сохраняем для поиска
        renderArticles(loadedArticles);

    } catch (e) {
        console.error(e);
        grid.innerHTML = '<p class="text-red-400">Ошибка загрузки статей.</p>';
    }
}

// 3. Отрисовка карточек статей
function renderArticles(articles) {
    const grid = document.getElementById('articles-grid');
    if (!grid) return;

    if (articles.length === 0) {
        grid.innerHTML = '<p class="text-gray-400 col-span-3">Пока нет статей по вашему запросу.</p>';
        return;
    }

    grid.innerHTML = '';
    articles.forEach((article) => {
        const div = document.createElement('div');
        div.className = 'bg-brand-card p-6 rounded-2xl border border-brand-border card-glow cursor-pointer';
        div.onclick = () => openArticleModal(article);
        div.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <span class="text-[11px] font-bold uppercase tracking-wider text-brand-teal bg-brand-teal/10 px-2 py-1 rounded">${article.category}</span>
                <span class="text-xs text-gray-500"><i class="fa-regular fa-clock"></i> ${article.readtime}</span>
            </div>
            <h3 class="font-bold text-lg text-white mb-2 line-clamp-2">${article.title}</h3>
            <p class="text-sm text-gray-400 line-clamp-3 mb-4">${article.summary}</p>
            <div class="flex items-center justify-between border-t border-brand-border/60 pt-4 mt-auto">
                <span class="text-xs text-gray-300"><i class="fa-solid fa-user text-brand-teal mr-1"></i> ${article.author}</span>
            </div>
        `;
        grid.appendChild(div);
    });
}

// 4. Поиск по статьям (подключен к input на главной)
window.handleArticlesSearch = function() {
    const query = document.getElementById('articles-search-input').value.toLowerCase();
    const filtered = loadedArticles.filter(a => 
        a.title.toLowerCase().includes(query) || 
        a.summary.toLowerCase().includes(query) ||
        a.author.toLowerCase().includes(query)
    );
    renderArticles(filtered);
}

// 5. Открытие модального окна статьи
export function openArticleModal(article) {
    document.getElementById('info-modal-category').textContent = article.category;
    document.getElementById('info-modal-title').textContent = article.title;
    document.getElementById('info-modal-author').innerHTML = `<i class="fa-solid fa-user text-brand-teal mr-1"></i> ${article.author}`;
    document.getElementById('info-modal-time').innerHTML = `<i class="fa-regular fa-clock mr-1"></i> ${article.readtime}`;
    
    // Выводим красивый HTML из базы
    document.getElementById('info-modal-content').innerHTML = article.content;
    
    document.getElementById('info-modal').classList.remove('hidden');
}

// 6. Проверка прав и открытие формы
export async function openSubmission() {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: settings } = await supabase.from('site_settings').select('publish_mode').eq('id', 1).single();
    const mode = settings ? settings.publish_mode : 'all';

    if (mode === 'registered' && !session) {
        alert("Публиковать статьи могут только зарегистрированные пользователи. Пожалуйста, войдите в аккаунт.");
        window.location.href = 'login.html';
        return;
    }

    // Очищаем редактор перед открытием
    if (quill) quill.root.innerHTML = '';
    
    document.getElementById('add-article-modal').classList.remove('hidden');
}

// 7. Отправка статьи в базу
export async function handleAddArticleSubmit(e) {
    e.preventDefault();
    
    if (!quill) return;
    
    // Получаем текст из визуального редактора
    const contentHTML = quill.root.innerHTML;
    
    // Проверка на пустой текст
    if (quill.getText().trim().length === 0) {
        alert('Пожалуйста, напишите текст статьи.');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Отправка...';
    btn.disabled = true;

    const newArticle = {
        title: document.getElementById('new-title').value,
        category: document.getElementById('new-category').value,
        readtime: document.getElementById('new-readtime').value,
        summary: document.getElementById('new-summary').value,
        content: contentHTML, // <-- Сохраняем отформатированный HTML
        author: document.getElementById('new-author').value,
        status: 'pending'
    };

    try {
        const { error } = await supabase.from('articles').insert([newArticle]);
        if (error) throw error;

        alert('Статья отправлена! Она появится на сайте после проверки администратором.');
        e.target.reset();
        quill.root.innerHTML = ''; 
        document.getElementById('add-article-modal').classList.add('hidden');
    } catch (error) {
        console.error(error);
        alert('Ошибка: ' + error.message);
    } finally {
        btn.textContent = 'Отправить на модерацию';
        btn.disabled = false;
    }
}

// Глобальные привязки для HTML
window.openSubmission = openSubmission;
window.handleAddArticleSubmit = handleAddArticleSubmit;
