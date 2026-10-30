import {db} from './api.js';
const $ = id => document.getElementById(id);
window.handleFeedbackSubmit = async event => {
 event.preventDefault();
 if (!db) { window.showToast('Сначала подключите Supabase'); return; }
 const button = event.target.querySelector('[type=submit]');
 button.disabled = true;
 try {
  if ($('feedback-website')?.value) throw new Error('Отправка недоступна');
  const name = $('feedback-name').value.trim(), message = $('feedback-message').value.trim();
  if (name.length < 2 || name.length > 80 || message.length < 10 || message.length > 4000) throw new Error('Укажите имя и сообщение от 10 символов');
  const {error} = await db.from('feedback').insert({name, message});
  if (error) throw error;
  window.toggleModal('feedback-modal'); event.target.reset(); window.showToast('Сообщение отправлено администрации');
 } catch (e) { window.showToast('Ошибка: ' + e.message); }
 finally { button.disabled = false; }
};
