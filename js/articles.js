import {db,currentUser,submissionMode,escapeHtml} from './api.js';
import {configured} from './config.js';
let articles=[];
const $=id=>document.getElementById(id);
function message(s){window.showToast?.(s) ?? alert(s);}
async function refresh(){
 if(!db)return;
 const {data,error}=await db.from('articles').select('id,title,category,summary,content,guest_name,created_at,author_id,status').eq('status','published').order('created_at',{ascending:false}).limit(100);
 if(error){message('Не удалось загрузить статьи: '+error.message);return;}
 articles=data||[];search();
}
function search(){const q=($('articles-search-input')?.value||'').toLowerCase();const rows=articles.filter(a=>[a.title,a.summary,a.category,a.guest_name].some(x=>String(x||'').toLowerCase().includes(q)));
 $('articles-grid').innerHTML=rows.length?rows.map(a=>`<article class="bg-brand-card rounded-2xl border border-brand-border p-6 card-glow"><div class="text-xs text-brand-teal mb-2">${escapeHtml(a.category)}</div><h3 class="text-lg font-bold text-white mb-2">${escapeHtml(a.title)}</h3><p class="text-xs text-gray-400 mb-4">${escapeHtml(a.summary)}</p><div class="flex justify-between items-center gap-2 text-xs text-gray-400"><span>${escapeHtml(a.guest_name||'Участник клуба')}</span><button data-article-id="${a.id}" class="text-brand-teal font-semibold">Читать →</button></div></article>`).join(''):'<p class="text-gray-400 col-span-full">Опубликованных статей пока нет.</p>';
}
$('articles-grid').addEventListener('click',e=>{const btn=e.target.closest('[data-article-id]');if(!btn)return;const a=articles.find(x=>x.id===btn.dataset.articleId);if(!a)return;$('info-modal-category').textContent=a.category;$('info-modal-title').textContent=a.title;$('info-modal-author').textContent='Автор: '+(a.guest_name||'Участник клуба');$('info-modal-time').textContent=new Date(a.created_at).toLocaleDateString('ru-RU');$('info-modal-content').textContent=a.content;window.toggleModal('info-modal');});
window.handleArticlesSearch=search;
window.openSubmission=async()=>{if(!configured){message('Сначала настройте подключение Supabase в js/config.js');return;}try{const mode=await submissionMode(),user=await currentUser();if(mode==='admin'){message('Приём статей временно закрыт.');return;}if(mode==='registered'&&!user){message('Для отправки статьи необходимо войти.');location.href='login.html';return;}window.toggleModal('add-article-modal');}catch(e){message(e.message);}};
window.handleAddArticleSubmit=async e=>{e.preventDefault();if(!db)return message('Сначала подключите Supabase.');const button=e.target.querySelector('[type=submit]');button.disabled=true;try{
 if($('article-website')?.value)throw Error('Не удалось отправить форму.');
 const user=await currentUser(),mode=await submissionMode();if(mode==='admin'||(mode==='registered'&&!user))throw Error('Отправка статей сейчас недоступна.');
 const title=$('new-title').value.trim(),category=$('new-category').value,summary=$('new-summary').value.trim(),content=$('new-content').value.trim(),guest_name=$('new-author').value.trim();
 if(title.length<5||title.length>180||summary.length<10||summary.length>800||content.length<30||content.length>30000||guest_name.length<2||guest_name.length>80)throw Error('Проверьте длину заголовка, описания, текста и имени.');
 const {error}=await db.from('articles').insert({title,category,summary,content,guest_name,author_id:user?.id||null,status:'pending'});
 if(error)throw error;window.toggleModal('add-article-modal');e.target.reset();message('Статья отправлена на модерацию!');
 }catch(err){message('Ошибка: '+err.message);}finally{button.disabled=false;}};
if(configured){refresh();db.auth.onAuthStateChange(()=>{});}else{$('articles-grid').innerHTML='<p class="text-gray-400 col-span-full">Подключите Supabase, чтобы загрузить статьи. Инструкция в README.md.</p>';}
window.onload=()=>{window.initStaticSections();if(configured)refresh();};
