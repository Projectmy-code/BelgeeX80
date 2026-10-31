import { supabase } from './config.js';

let quill = null;
let loadedArticles = [];

// Функция красивых уведомлений
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    toast.className = `fixed bottom-6 right-6 z-[100] bg-brand-card border ${isSuccess ? 'border-emerald-500' : 'border-red-500'} px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold text-white`;
    toast.style.animation = 'slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    toast.innerHTML = `<i class="fa-solid ${isSuccess ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-red-400'} text-xl"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

document.addEventListener('DOMContentLoaded', () => {
    loadArticlesFromDB();
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer) {
        quill = new Quill('#editor-container', {
            theme: 'snow',
            placeholder: 'Напишите здесь вашу статью...',
            modules: { toolbar: [[{ 'header': [2, 3, false] }], ['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['link', 'clean']] }
        });
    }
});

export async function loadArticlesFromDB() {
    const grid = document.getElementById('articles-grid');
    if(!grid) return;
    grid.innerHTML = '<p class="text-gray-400 col-span-3">Загрузка статей...</p>';

    try {
        const { data: articles, error } = await supabase.from('articles').select('*').eq('status', 'published').order('created_at', { ascending: false });
        if (error) throw error;
        loadedArticles = articles || [];
        renderArticles(loadedArticles);
    } catch (e) {
        grid.innerHTML = '<p class="text-red-400">Ошибка загрузки статей.</p>';
    }
}

function renderArticles(articles) {
    const grid = document.getElementById('articles-grid');
    if (!grid) return;
    if (articles.length === 0) { grid.innerHTML = '<p class="text-gray-400 col-span-3">Пока нет статей.</p>'; return; }
    
    grid.innerHTML = '';
    
    // БЕРЕМ ТОЛЬКО ПЕРВЫЕ 3 СТАТЬИ ДЛЯ ГЛАВНОЙ
    const articlesToShow = articles.slice(0, 3); 

    articlesToShow.forEach((article) => {
        const div = document.createElement('div');
        div.className = 'bg-brand-card p-6 rounded-2xl border border-brand-border card-glow cursor-pointer flex flex-col h-full';
        div.onclick = () => openArticleModal(article);
        div.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <span class="text-[11px] font-bold uppercase tracking-wider text-brand-teal bg-brand-teal/10 px-2 py-1 rounded">${article.category}</span>
                <span class="text-xs text-gray-500"><i class="fa-regular fa-clock"></i> ${article.readtime}</span>
            </div>
            <h3 class="font-bold text-lg text-white mb-2 line-clamp-2">${article.title}</h3>
            <p class="text-sm text-gray-400 line-clamp-3 mb-4 flex-1">${article.summary}</p>
            <div class="flex items-center justify-between border-t border-brand-border/60 pt-4 mt-auto">
                <span class="text-xs text-gray-300"><i class="fa-solid fa-user text-brand-teal mr-1"></i> ${article.author}</span>
                <span class="text-xs text-brand-teal">Читать <i class="fa-solid fa-arrow-right ml-1"></i></span>
            </div>
        `;
        grid.appendChild(div);
    });
}

window.handleArticlesSearch = function() {
    const query = document.getElementById('articles-search-input').value.toLowerCase();
    const filtered = loadedArticles.filter(a => a.title.toLowerCase().includes(query) || a.summary.toLowerCase().includes(query));
    renderArticles(filtered);
}

export function openArticleModal(article) {
    document.getElementById('info-modal-category').textContent = article.category;
    document.getElementById('info-modal-title').textContent = article.title;
    document.getElementById('info-modal-author').innerHTML = `<i class="fa-solid fa-user text-brand-teal mr-1"></i> ${article.author}`;
    document.getElementById('info-modal-time').innerHTML = `<i class="fa-regular fa-clock mr-1"></i> ${article.readtime}`;
    document.getElementById('info-modal-content').innerHTML = article.content;
    document.getElementById('info-modal').classList.remove('hidden');
}

export async function openSubmission() {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: settings } = await supabase.from('site_settings').select('value').eq('key', 'submission_mode').single();
    if (settings?.value === 'registered' && !session) {
        showToast("Публиковать статьи могут только зарегистрированные пользователи.", "error");
        setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        return;
    }
    if (quill) quill.root.innerHTML = '';
    document.getElementById('add-article-modal').classList.remove('hidden');
}

export async function handleAddArticleSubmit(e) {
    e.preventDefault();
    if (!quill) return;
    if (quill.getText().trim().length === 0) { showToast('Пожалуйста, напишите текст статьи.', 'error'); return; }

    const contentHTML = quill.root.innerHTML;
    const btn = e.target.querySelector('button[type="submit"]');
    
    const isConfirmed = await window.showConfirm('Отправить статью?', 'Ваша статья будет отправлена на модерацию.', 'Отправить', 'bg-brand-teal', 'hover:bg-brand-teal/80', 'text-black');
    if (!isConfirmed) return;

    btn.textContent = 'Отправка...'; btn.disabled = true;
    const { data: { session } } = await supabase.auth.getSession();

    const newArticle = {
        title: document.getElementById('new-title').value,
        category: document.getElementById('new-category').value,
        readtime: document.getElementById('new-readtime').value,
        summary: document.getElementById('new-summary').value,
        content: contentHTML,
        author: document.getElementById('new-author').value,
        status: 'pending',
        user_id: session ? session.user.id : null
    };

    try {
        const { error } = await supabase.from('articles').insert([newArticle]);
        if (error) throw error;
        showToast('Статья успешно отправлена на модерацию!');
        e.target.reset(); quill.root.innerHTML = ''; 
        document.getElementById('add-article-modal').classList.add('hidden');
    } catch (error) {
        showToast('Ошибка: ' + error.message, 'error');
    } finally {
        btn.textContent = 'Отправить на модерацию'; btn.disabled = false;
    }
}

window.openSubmission = openSubmission;
window.handleAddArticleSubmit = handleAddArticleSubmit;
