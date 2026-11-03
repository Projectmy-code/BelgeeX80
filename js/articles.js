import { supabase } from './config.js';

let quill = null;
let loadedArticles = [];

function showToast(message, type = 'success') {
    if (typeof window.showToast === 'function') { window.showToast(message, type); return; }
    const isSuccess = type === 'success';
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 z-[100] bg-[#161e2b] border ${isSuccess ? 'border-emerald-500' : 'border-red-500'} px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold text-white`;
    toast.innerHTML = `<i class="fa-solid ${isSuccess ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-red-400'} text-xl"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

async function showConfirm(title, msg) {
    if (typeof window.showConfirm === 'function') {
        return window.showConfirm(title, msg, 'Отправить', 'bg-brand-teal', 'hover:bg-brand-teal/80', 'text-black');
    }
    return window.confirm(`${title}\n\n${msg}`);
}

async function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) { resolve(file); return; }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let { width, height } = img;
                if (width > height) {
                    if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                } else {
                    if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                const supportsWebp = canvas.toDataURL('image/webp').startsWith('data:image/webp');
                const mime = supportsWebp ? 'image/webp' : 'image/jpeg';
                const ext = supportsWebp ? 'webp' : 'jpg';
                canvas.toBlob((blob) => {
                    if (!blob) { resolve(file); return; }
                    const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.' + ext, { type: mime, lastModified: Date.now() });
                    resolve(newFile);
                }, mime, quality);
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadArticlesFromDB();
    const editorContainer = document.getElementById('editor-container');
    
    if (editorContainer) {
        // Кастомная панель инструментов для профессионального вида
        quill = new Quill('#editor-container', {
            theme: 'snow', 
            placeholder: 'Расскажите о своем опыте, доработке или лайфхаке...',
            modules: { 
                toolbar: [
                    [{ 'header': [2, 3, 4, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['blockquote', 'code-block'],
                    ['link', 'image', 'video'],
                    ['clean']
                ] 
            }
        });

        // Автосохранение в localStorage (черновик)
        quill.on('text-change', () => {
            const draft = quill.root.innerHTML;
            localStorage.setItem('belgee_article_draft', draft);
            updateReadTime();
        });
        
        // Восстановление черновика при открытии
        const savedDraft = localStorage.getItem('belgee_article_draft');
        if (savedDraft && savedDraft !== '<p><br></p>') {
            quill.root.innerHTML = savedDraft;
            updateReadTime();
        }

        // Подсчет времени чтения
        function updateReadTime() {
            const text = quill.getText();
            const words = text.trim().split(/\s+/).length;
            const minutes = Math.max(1, Math.ceil(words / 180)); // ~180 слов в минуту
            const readtimeInput = document.getElementById('new-readtime');
            if (readtimeInput) readtimeInput.value = `${minutes} мин чтения`;
        }

        // Загрузка картинок в текст
        const toolbar = quill.getModule('toolbar');
        toolbar.addHandler('image', () => {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/*'; input.click();
            input.onchange = async () => {
                const file = input.files[0];
                if (!file) return;
                const range = quill.getSelection(true);
                const placeholder = ' [Загрузка фото...] ';
                quill.insertText(range.index, placeholder);
                try {
                    const compressedFile = await compressImage(file);
                    const ext = compressedFile.type === 'image/webp' ? 'webp' : 'jpg';
                    const fileName = `inline_${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
                    const { error } = await supabase.storage.from('images').upload(fileName, compressedFile);
                    if (error) throw error;
                    const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
                    quill.deleteText(range.index, placeholder.length);
                    quill.insertEmbed(range.index, 'image', urlData.publicUrl);
                } catch (error) {
                    showToast('Ошибка загрузки фото: ' + error.message, 'error');
                    quill.deleteText(range.index, placeholder.length);
                }
            };
        });
    }

    const imageInput = document.getElementById('new-image-file');
    if (imageInput) {
        imageInput.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('cover-preview-img').src = e.target.result;
                document.getElementById('cover-preview-container').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        });
    }
});

export async function loadArticlesFromDB() {
    const grid = document.getElementById('articles-grid');
    if (!grid) return;
    grid.innerHTML = '<p class="text-gray-400 col-span-3 text-center py-10"><i class="fa-solid fa-spinner fa-spin text-3xl mb-4 text-brand-teal"></i><br>Загрузка статей...</p>';
    try {
        const { data: articles, error } = await supabase.from('articles').select('*').eq('status', 'published').order('created_at', { ascending: false });
        if (error) throw error;
        loadedArticles = articles || [];
        renderArticles(loadedArticles);
    } catch (e) {
        grid.innerHTML = '<p class="text-red-400 text-center py-10">Ошибка загрузки статей.</p>';
    }
}

function renderArticles(articles) {
    const grid = document.getElementById('articles-grid');
    if (!grid) return;
    if (!articles || articles.length === 0) { grid.innerHTML = '<p class="text-gray-400 col-span-3 text-center py-10">Пока нет статей.</p>'; return; }
    grid.innerHTML = '';
    articles.slice(0, 3).forEach((article, index) => {
        const imgUrl = article.image_url || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=600&q=80';
        const title = article.title || 'Без названия';
        const summary = article.summary || '';
        const author = article.author || article.guest_name || 'Участник';
        const readtime = article.readtime || '5 мин';
        const category = article.category || 'Статья';
        
        const div = document.createElement('div');
        div.className = 'bg-brand-card rounded-2xl border border-brand-border premium-card cursor-pointer flex flex-col h-full overflow-hidden animate-fade-in-up';
        div.style.animationDelay = `${index * 0.1}s`;
        div.onclick = () => openArticleModal(article);
        div.innerHTML = `
            <div class="h-48 bg-slate-800 relative shrink-0 overflow-hidden">
                <img src="${imgUrl}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" alt="${title}">
                <div class="absolute top-3 left-3"><span class="text-[10px] font-bold uppercase tracking-wider text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">${category}</span></div>
            </div>
            <div class="p-5 flex-1 flex flex-col">
                <h3 class="font-bold text-lg text-white line-clamp-2 mb-2">${title}</h3>
                <p class="text-sm text-gray-400 line-clamp-2 mb-4 flex-1">${summary}</p>
                <div class="flex items-center justify-between border-t border-brand-border/60 pt-4 mt-auto">
                    <span class="text-xs text-gray-400"><i class="fa-solid fa-user text-brand-teal mr-1"></i> ${author}</span>
                    <span class="text-xs text-brand-teal"><i class="fa-regular fa-clock mr-1"></i> ${readtime}</span>
                </div>
            </div>`;
        grid.appendChild(div);
    });
}

window.handleArticlesSearch = function () {
    const input = document.getElementById('articles-search-input');
    if (!input) return;
    const query = input.value.toLowerCase().trim();
    const filtered = loadedArticles.filter(a => (a.title || '').toLowerCase().includes(query) || (a.summary || '').toLowerCase().includes(query));
    renderArticles(filtered);
};

export function openArticleModal(article) {
    const contentEl = document.getElementById('info-modal-content');
    if (!contentEl) return;
    
    document.getElementById('info-modal-category').textContent = article.category || 'Статья';
    document.getElementById('info-modal-title').textContent = article.title || 'Без названия';
    document.getElementById('info-modal-author').innerHTML = `<i class="fa-solid fa-user text-brand-teal mr-1"></i> ${article.author || article.guest_name || 'Участник'}`;
    document.getElementById('info-modal-time').innerHTML = `<i class="fa-regular fa-clock mr-1"></i> ${article.readtime || '5 мин'}`;

    let html = '';
    if (article.image_url) html += `<figure><img src="${article.image_url}" alt="${article.title || 'Обложка'}" loading="lazy"></figure>`;
    html += `<div class="content-html">${article.content || '<p class="text-gray-500 italic">Текст статьи пуст.</p>'}</div>`;

    contentEl.innerHTML = html;
    document.getElementById('info-modal')?.classList.remove('hidden');
    applyForcedStyles(contentEl);
}

function applyForcedStyles(container) {
    const fixImages = () => {
        container.querySelectorAll('img').forEach(img => {
            if (img.dataset.styled === 'true') return;
            img.style.setProperty('border-radius', '16px', 'important');
            img.style.setProperty('box-shadow', '0 10px 30px -10px rgba(0,0,0,0.8)', 'important');
            img.style.setProperty('margin', '24px auto', 'important');
            img.style.setProperty('display', 'block', 'important');
            img.style.setProperty('max-width', '100%', 'important');
            img.style.setProperty('height', 'auto', 'important');
            img.dataset.styled = 'true';
        });
    };
    fixImages();
    const observer = new MutationObserver(fixImages);
    observer.observe(container, { childList: true, subtree: true });
}

window.closeModalOnBg = function(event) {
    if (event.target.id === 'info-modal') document.getElementById('info-modal').classList.add('hidden');
};

export async function openSubmission() {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: settings } = await supabase.from('site_settings').select('value').eq('key', 'submission_mode').maybeSingle();
    if (settings?.value === 'registered' && !session) {
        showToast('Публиковать статьи могут только зарегистрированные пользователи.', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        return;
    }
    document.getElementById('add-article-modal').classList.remove('hidden');
    document.getElementById('add-article-modal').classList.add('flex');
}

// Закрытие полноэкранного редактора
window.closeEditor = function() {
    document.getElementById('add-article-modal').classList.add('hidden');
    document.getElementById('add-article-modal').classList.remove('flex');
}

export async function handleAddArticleSubmit(e) {
    e.preventDefault();
    if (!quill) return;
    if (quill.getText().trim().length === 0) { showToast('Пожалуйста, напишите текст статьи.', 'error'); return; }

    const btn = document.getElementById('submit-article-btn');
    const isConfirmed = await showConfirm('Отправить статью?', 'Ваша статья будет отправлена на модерацию.');
    if (!isConfirmed) return;

    btn.textContent = 'Сжатие и отправка...'; btn.disabled = true;

    const { data: { session } } = await supabase.auth.getSession();
    let imageUrl = null;

    try {
        const fileInput = document.getElementById('new-image-file');
        if (fileInput && fileInput.files.length > 0) {
            const compressedFile = await compressImage(fileInput.files[0]);
            const ext = compressedFile.type === 'image/webp' ? 'webp' : 'jpg';
            const fileName = `cover_${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('images').upload(fileName, compressedFile);
            if (uploadError) throw new Error('Ошибка загрузки обложки: ' + uploadError.message);
            const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
        }

        const newArticle = {
            title: document.getElementById('new-title').value,
            category: document.getElementById('new-category').value,
            readtime: document.getElementById('new-readtime').value,
            summary: document.getElementById('new-summary').value,
            image_url: imageUrl,
            content: quill.root.innerHTML,
            author: document.getElementById('new-author').value,
            status: 'pending',
            user_id: session ? session.user.id : null
        };

        const { error: dbError } = await supabase.from('articles').insert([newArticle]);
        if (dbError) throw dbError;

        showToast('Статья успешно отправлена на модерацию!');
        
        // Очищаем черновик и форму
        localStorage.removeItem('belgee_article_draft');
        e.target.reset(); 
        quill.root.innerHTML = ''; 
        document.getElementById('cover-preview-container')?.classList.add('hidden');
        window.closeEditor();

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.textContent = 'Отправить на модерацию'; 
        btn.disabled = false;
    }
}

window.openSubmission = openSubmission;
window.handleAddArticleSubmit = handleAddArticleSubmit;