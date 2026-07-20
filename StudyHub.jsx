// AI Exam Coach — Study tab.
// Direct port of the canonical AiStudyTool.dc.html (DCLogic class) into a plain
// React function component for this app shell. Logic/markup ported 1:1; only
// the height wrapper and file-input wiring changed to nest inside the app shell
// instead of taking the full viewport, since it already called
// window.claude.complete directly (no client-side API key, unlike the older
// "AI Study Tool.html" this replaces).
// Module-scope (not nested in StudyHub) so its identity stays stable across
// the parent's re-renders while loadingMsg rotates — otherwise this would
// remount and its 5s timer would never fire.
function LoadingHint({ t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => {
    const id = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(id);
  }, []);
  if (!slow) return null;
  return React.createElement('div', { style: { fontSize: '12px', color: 'var(--slate-400)' } }, L("Still working — usually takes about 10 seconds.","Ще працюю — зазвичай займає близько 10 секунд.","Ещё работаю — обычно занимает около 10 секунд.","Encore en cours — environ 10 secondes.","Läuft noch — dauert meist etwa 10 Sekunden."));
}

// Only the generated study set is worth surviving a reload — uploaded
// files, drag state, and chat are inherently session-scoped, but losing a
// freshly-generated flashcard/quiz set to an accidental refresh meant
// burning another AI call to get back to where you already were.
const STUDY_RESULT_KEY = 'study_result_v1';

function StudyHub({ t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const { useState } = React;

  const defaultState = {
    mode: 'upload',
    activeTab: 'flashcards',
    inputText: '',
    isDragOver: false,
    isExtractingFile: false,
    imageFile: null,
    pdfFile: null,
    docFile: null,
    youtubeData: null,
    isLoadingYT: false,
    errorMsg: '',
    loadingMsg: L('Analyzing your content…','Аналізую ваш матеріал…','Анализирую ваш материал…','Analyse de votre contenu…','Analysiere deine Inhalte…'),
    topic: '',
    topicEmoji: '📚',
    flashcards: [],
    quiz: [],
    videos: [],
    videosLoading: false,
    currentCard: 0,
    flippedCards: {},
    quizAnswers: {},
    chatInput: '',
    isChatMode: false,
    chatMessages: [], // [{ role: 'user'|'assistant', text }] — a real thread, not one overwritten answer
    isChatLoading: false,
  };

  const [state, setS] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STUDY_RESULT_KEY));
      if (saved && Array.isArray(saved.flashcards) && saved.flashcards.length) {
        return { ...defaultState, ...saved, mode: 'results', activeTab: 'flashcards' };
      }
    } catch {}
    return defaultState;
  });
  const setState = (patch) => setS(s => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));

  React.useEffect(() => {
    if (state.mode !== 'results') return;
    try {
      localStorage.setItem(STUDY_RESULT_KEY, JSON.stringify({
        topic: state.topic, topicEmoji: state.topicEmoji, flashcards: state.flashcards,
        quiz: state.quiz, videos: state.videos, currentCard: state.currentCard,
        flippedCards: state.flippedCards, quizAnswers: state.quizAnswers,
      }));
    } catch {}
  }, [state.mode, state.topic, state.flashcards, state.quiz, state.videos, state.currentCard, state.flippedCards, state.quizAnswers]);

  // Real per-topic suggestions from the student's own courses, so "Try
  // these" points at what they're actually studying for instead of random
  // trivia (England Football, Quantum Physics…) that has nothing to do with
  // their exams. Due reviews (already-studied, now decaying) come first
  // since those are the most useful thing to jump back into; topics with no
  // review history yet fill any remaining slots so a freshly-added exam
  // still gets relevant chips on day one. Never padded with generic filler —
  // if a student only has 2 real topics, they see 2 chips, not 2 real + 4 fake.
  const realTopicChips = React.useMemo(() => {
    const brain = window.getBrain ? window.getBrain() : null;
    if (!brain || !brain.examViews || !brain.examViews.length) return null;
    const seen = new Set();
    const out = [];
    for (const t of (brain.dueReviews || [])) {
      if (out.length >= 6) break;
      const key = t.topicName + '|' + t.examName;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ l: `📘 ${t.topicName}`, v: `${t.topicName} — a topic from ${t.examName}. Cover the core concepts and common exam-style questions.` });
    }
    if (out.length < 6) {
      for (const ev of brain.examViews) {
        for (const tp of ev.topics || []) {
          if (out.length >= 6) break;
          const key = tp.topicName + '|' + ev.name;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ l: `📘 ${tp.topicName}`, v: `${tp.topicName} — a topic from ${ev.name}. Cover the core concepts and common exam-style questions.` });
        }
        if (out.length >= 6) break;
      }
    }
    return out.length ? out : null;
  }, []);

  const studyProfile = window.getProfile ? window.getProfile() : {};
  const prefHint = (studyProfile.prefs && studyProfile.prefs.length) || (studyProfile.materials && studyProfile.materials.length)
    ? `\n\nStudent preferences: prefers ${(studyProfile.prefs || []).join(', ') || 'default'} learning modes, uses ${(studyProfile.materials || []).join(', ') || 'various'} materials. Tailor difficulty and examples accordingly.`
    : '';
  // Text VALUES (flashcard front/back, video title/desc, chat replies) should
  // follow the student's UI language — the JSON keys/schema stay in English,
  // that's just field names, not content.
  const langHint = window.aiLangDirective ? window.aiLangDirective() : '';
  const langHintSuffix = langHint ? `\n\n${langHint}` : '';
  const SYSTEM_CARDS = `You are a study material generator. Output ONLY valid JSON — no markdown, no fences, nothing else before { or after }.

Schema:
{"topic":"short name","emoji":"1 emoji","flashcards":[{"front":"≤12 words","back":"≤25 words"}],"quiz":[{"q":"question","o":["A","B","C","D"],"c":0,"e":"≤18 word explanation"}]}

Rules: EXACTLY 5 flashcards. EXACTLY 4 quiz questions (c = index of correct option). All content specific and educational. For images/PDFs: identify the subject first.${prefHint}${langHintSuffix}`;

  const SYSTEM_VIDEOS = `You are a study assistant. Output ONLY valid JSON — no markdown, no fences.

Schema: {"videos":[{"title":"video title","desc":"one sentence","q":"youtube search query","lvl":"Beginner"}]}${langHintSuffix}

Rules: EXACTLY 4 videos. lvl is Beginner, Intermediate, or Advanced. Make search queries specific and effective.`;

  /* ─── YOUTUBE ─────────────────────────────────────────────── */
  const ytId = (text) => {
    const m = text.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  };

  const fetchYT = async (id) => {
    setState({ isLoadingYT: true, youtubeData: null });
    try {
      const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      const d = r.ok ? await r.json() : {};
      setState({ isLoadingYT: false, youtubeData: { id, title: d.title || 'YouTube Video', channel: d.author_name || '', thumb: `https://img.youtube.com/vi/${id}/mqdefault.jpg` } });
    } catch {
      setState({ isLoadingYT: false, youtubeData: { id, title: 'YouTube Video', channel: '', thumb: `https://img.youtube.com/vi/${id}/mqdefault.jpg` } });
    }
  };

  /* ─── FILE HANDLING ───────────────────────────────────────── */
  const readFile = async (file) => {
    const name = file.name || 'file';
    const ext = name.split('.').pop().toLowerCase();
    const mime = file.type;
    setState({ errorMsg: '', isExtractingFile: true, imageFile: null, pdfFile: null, docFile: null, youtubeData: null });

    try {
      if (mime.startsWith('image/')) {
        const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(file); });
        setState({ imageFile: { base64: dataUrl.split(',')[1], mimeType: mime, dataUrl, name }, isExtractingFile: false });
        return;
      }
      if (ext === 'pdf' || mime === 'application/pdf') {
        const ab = await file.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
        setState({ pdfFile: { base64: b64, name }, isExtractingFile: false });
        return;
      }
      if (['pptx', 'ppt', 'docx', 'doc'].includes(ext) || mime.includes('presentationml') || mime.includes('wordprocessingml') || mime.includes('powerpoint') || mime.includes('msword')) {
        const JSZip = window.JSZip;
        if (!JSZip) { setState({ isExtractingFile: false, errorMsg: L('JSZip not ready — try refreshing.','JSZip не готовий — оновіть сторінку.','JSZip не готов — обновите страницу.','JSZip pas prêt — actualisez la page.','JSZip nicht bereit — Seite neu laden.') }); return; }
        const ab = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(ab);
        let text = '';
        if (['pptx', 'ppt'].includes(ext) || mime.includes('presentationml') || mime.includes('powerpoint')) {
          const slides = Object.keys(zip.files).filter(f => /ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => { const na = parseInt(a.match(/\d+/g).pop()), nb = parseInt(b.match(/\d+/g).pop()); return na - nb; });
          for (const s of slides.slice(0, 25)) { const xml = await zip.files[s].async('string'); const d = document.createElement('div'); d.innerHTML = xml.replace(/<\/a:t>/g, ' ').replace(/<[^>]+>/g, ''); text += d.textContent.replace(/\s+/g, ' ').trim() + '\n'; }
        } else {
          const doc = zip.files['word/document.xml'];
          if (doc) { const xml = await doc.async('string'); const d = document.createElement('div'); d.innerHTML = xml.replace(/<\/w:t>/g, ' ').replace(/<[^>]+>/g, ''); text = d.textContent.replace(/\s+/g, ' ').trim(); }
        }
        if (!text.trim()) { setState({ isExtractingFile: false, errorMsg: L('Could not extract text from this file. Try copy-pasting the content instead.','Не вдалося витягти текст із файлу. Спробуйте вставити вміст вручну.','Не удалось извлечь текст из файла. Попробуйте вставить содержимое вручную.','Impossible d\'extraire le texte. Essayez de coller le contenu.','Text konnte nicht extrahiert werden. Füge den Inhalt manuell ein.') }); return; }
        setState({ docFile: { text: text.substring(0, 5000), name, ext }, isExtractingFile: false });
        return;
      }
      if (mime === 'text/plain' || ext === 'txt') {
        const text = await file.text();
        setState({ docFile: { text: text.substring(0, 5000), name, ext: 'txt' }, isExtractingFile: false });
        return;
      }
      setState({ isExtractingFile: false, errorMsg: L('Unsupported file type. Try: image, PDF, PPTX, DOCX or TXT.','Непідтримуваний тип файлу. Спробуйте: зображення, PDF, PPTX, DOCX або TXT.','Неподдерживаемый тип файла. Попробуйте: изображение, PDF, PPTX, DOCX или TXT.','Type de fichier non pris en charge : image, PDF, PPTX, DOCX ou TXT.','Nicht unterstützter Dateityp: Bild, PDF, PPTX, DOCX oder TXT.') });
    } catch (err) {
      setState({ isExtractingFile: false, errorMsg: L('Could not read this file. Try another format.','Не вдалося прочитати файл. Спробуйте інший формат.','Не удалось прочитать файл. Попробуйте другой формат.','Lecture du fichier impossible. Essayez un autre format.','Datei konnte nicht gelesen werden. Anderes Format versuchen.') });
    }
  };

  const handleDrop = (e) => { setState({ isDragOver: false }); const f = e.dataTransfer.files[0]; if (f) readFile(f); };

  /* ─── CLAUDE CALLS ────────────────────────────────────────── */
  const buildUserContent = (suffix) => {
    const { imageFile, pdfFile, docFile, youtubeData, inputText } = state;
    if (imageFile) return [{ type: 'image', source: { type: 'base64', media_type: imageFile.mimeType, data: imageFile.base64 } }, { type: 'text', text: suffix || 'Generate study materials for what is shown in this image.' }];
    if (pdfFile) return [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfFile.base64 } }, { type: 'text', text: suffix || 'Generate study materials based on this document.' }];
    if (docFile) return `Generate study materials based on this document ("${docFile.name}"):\n\n${docFile.text}`;
    if (youtubeData) return `Generate study materials for a YouTube video titled: "${youtubeData.title}" by ${youtubeData.channel}. Create content about the likely topic of this video.`;
    return `Generate study materials for the topic: "${inputText.trim()}"`;
  };

  const analyze = async () => {
    const { imageFile, pdfFile, docFile, youtubeData, inputText } = state;
    if (!imageFile && !pdfFile && !docFile && !youtubeData && !inputText.trim()) return;
    setState({ mode: 'loading', loadingMsg: L('Reading your content…','Читаю ваш матеріал…','Читаю ваш материал…','Lecture de votre contenu…','Lese deine Inhalte…'), errorMsg: '' });

    const loadMsgs = [L('Identifying key concepts…','Визначаю ключові поняття…','Определяю ключевые понятия…','Identification des concepts clés…','Erkenne Schlüsselkonzepte…'), L('Creating flashcards…','Створюю картки…','Создаю карточки…','Création des cartes…','Erstelle Karteikarten…'), L('Building quiz questions…','Складаю питання квізу…','Составляю вопросы квиза…','Préparation du quiz…','Erstelle Quizfragen…'), L('Almost ready…','Майже готово…','Почти готово…','Presque prêt…','Fast fertig…')];
    let mi = 0;
    const iv = setInterval(() => { mi = (mi + 1) % loadMsgs.length; setState({ loadingMsg: loadMsgs[mi] }); }, 1800);

    try {
      const content1 = buildUserContent('Generate study materials from this content.');
      const raw1 = await window.claude.complete({ system: SYSTEM_CARDS, messages: [{ role: 'user', content: content1 }] });
      const j1 = raw1.slice(raw1.indexOf('{'), raw1.lastIndexOf('}') + 1);
      const d1 = JSON.parse(j1);

      const quiz = (d1.quiz || []).map(q => ({
        question: q.question || q.q || '',
        options: q.options || q.o || [],
        correct: q.correct !== undefined ? q.correct : (q.c !== undefined ? q.c : 0),
        explanation: q.explanation || q.e || '',
      }));

      clearInterval(iv);
      setState({
        mode: 'results', activeTab: 'flashcards',
        topic: d1.topic || 'Study Topic',
        topicEmoji: d1.emoji || '📚',
        flashcards: d1.flashcards || [],
        quiz,
        videos: [], videosLoading: true,
        currentCard: 0, flippedCards: {}, quizAnswers: {},
      });

      try {
        const topicForVideos = d1.topic || inputText.trim() || 'this topic';
        const raw2 = await window.claude.complete({ system: SYSTEM_VIDEOS, messages: [{ role: 'user', content: `Recommend YouTube study videos for: "${topicForVideos}"` }] });
        const j2 = raw2.slice(raw2.indexOf('{'), raw2.lastIndexOf('}') + 1);
        const d2 = JSON.parse(j2);
        setState({ videos: d2.videos || [], videosLoading: false });
      } catch {
        setState({ videosLoading: false, videos: [] });
      }
    } catch (err) {
      clearInterval(iv);
      setState({ mode: 'upload', errorMsg: L('Analysis failed — please try again, or use shorter text.','Аналіз не вдався — спробуйте ще раз або скоротіть текст.','Анализ не удался — попробуйте ещё раз или сократите текст.','Échec de l\'analyse — réessayez ou raccourcissez le texte.','Analyse fehlgeschlagen — erneut versuchen oder Text kürzen.') });
    }
  };

  /* ─── ELEMENT BUILDERS ────────────────────────────────────── */
  const buildDropZoneEl = (isDragOver, isExtracting, handlers) => {
    const label = isExtracting ? L('Extracting…','Витягую…','Извлекаю…','Extraction…','Extrahiere…') : isDragOver ? L('Drop it!','Відпускайте!','Отпускайте!','Lâchez !','Loslassen!') : L('Drop a file','Перетягніть файл','Перетащите файл','Déposez un fichier','Datei ablegen');
    const sub = isExtracting ? L('Reading your file…','Читаю файл…','Читаю файл…','Lecture du fichier…','Lese Datei…') : 'Image · PDF · PPTX · DOCX · TXT';
    const icon = isExtracting ? '⏳' : isDragOver ? '📂' : '☁️';
    return React.createElement('div', {
      onDragOver: handlers.onDragOver, onDragLeave: handlers.onDragLeave, onDrop: handlers.onDrop, onClick: isExtracting ? null : handlers.onClick,
      style: { border: `2px dashed ${isDragOver ? 'var(--indigo-500)' : 'var(--slate-300)'}`, background: isDragOver ? 'var(--indigo-50)' : 'var(--slate-50)', borderRadius: '18px', padding: '26px 20px', cursor: isExtracting ? 'default' : 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }
    },
      React.createElement('div', { style: { fontSize: '38px', transition: 'transform 0.2s', transform: isDragOver ? 'scale(1.2)' : 'scale(1)' } }, icon),
      React.createElement('div', { style: { textAlign: 'center' } },
        React.createElement('div', { style: { fontSize: '15px', fontWeight: 700, color: isDragOver ? 'var(--indigo-600)' : 'var(--slate-700)', marginBottom: '3px' } }, label),
        React.createElement('div', { style: { fontSize: '12px', color: 'var(--slate-400)' } }, sub)
      ),
      !isExtracting && React.createElement('div', { style: { padding: '6px 18px', background: 'var(--indigo-500)', color: 'white', borderRadius: '20px', fontSize: '12px', fontWeight: 700, boxShadow: '0 2px 8px rgba(34,124,99,0.28)' } }, '📁 ' + L('Browse Files','Огляд файлів','Обзор файлов','Parcourir','Dateien wählen'))
    );
  };

  const buildFilePreviewEl = () => {
    const { imageFile, pdfFile, docFile } = state;
    if (imageFile) {
      return React.createElement('div', { style: { marginTop: '10px', borderRadius: '14px', overflow: 'hidden', border: '2px solid var(--indigo-500)', position: 'relative', animation: 'fadeUp 0.25s ease-out both' } },
        React.createElement('img', { src: imageFile.dataUrl, style: { width: '100%', maxHeight: '160px', objectFit: 'cover', display: 'block' } }),
        React.createElement('button', { onClick: () => setState({ imageFile: null }), style: { position: 'absolute', top: '8px', right: '8px', background: 'rgba(17,24,39,0.75)', color: 'white', border: 'none', borderRadius: '20px', padding: '4px 11px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, `${imageFile.name} ✕`)
      );
    }
    const fileInfo = pdfFile ? { icon: '📄', color: 'var(--red-500)', name: pdfFile.name, preview: 'PDF ready — Claude will read the full document' }
      : docFile ? { icon: docFile.ext === 'pptx' || docFile.ext === 'ppt' ? '📊' : docFile.ext === 'txt' ? '📃' : '📝', color: docFile.ext === 'pptx' || docFile.ext === 'ppt' ? 'var(--orange-500)' : docFile.ext === 'txt' ? 'var(--slate-500)' : 'var(--sky-500)', name: docFile.name, preview: docFile.text.substring(0, 100).replace(/\n/g, ' ') + '…' }
      : null;
    if (!fileInfo) return null;
    return React.createElement('div', { style: { marginTop: '10px', borderRadius: '14px', border: `2px solid ${fileInfo.color}`, background: 'white', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '12px', animation: 'fadeUp 0.25s ease-out both' } },
      React.createElement('div', { style: { fontSize: '26px', flexShrink: 0, lineHeight: 1 } }, fileInfo.icon),
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', { style: { fontWeight: 700, fontSize: '13px', color: 'var(--slate-900)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, fileInfo.name),
        React.createElement('div', { style: { fontSize: '11px', color: 'var(--slate-400)', lineHeight: 1.5 } }, fileInfo.preview)
      ),
      React.createElement('button', { onClick: () => setState({ pdfFile: null, docFile: null }), style: { background: 'var(--slate-100)', border: 'none', borderRadius: '8px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: '13px', color: 'var(--slate-500)' } }, '✕')
    );
  };

  const buildYoutubePreviewEl = () => {
    const { youtubeData, isLoadingYT } = state;
    if (isLoadingYT) return React.createElement('div', { style: { marginTop: '10px', padding: '11px 14px', background: 'var(--red-50)', borderRadius: '12px', border: '1.5px solid var(--red-200)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--red-700)', fontWeight: 600 } },
      ...[0, 1, 2].map(i => React.createElement('div', { key: i, style: { width: '6px', height: '6px', background: 'var(--red-500)', borderRadius: '50%', animation: `loadDot 1.4s ease-in-out ${i * 0.16}s infinite` } })),
      React.createElement('span', null, L('Fetching video info…','Отримую дані відео…','Получаю данные видео…','Récupération des infos vidéo…','Lade Videoinfos…'))
    );
    if (!youtubeData) return null;
    return React.createElement('div', { style: { marginTop: '10px', borderRadius: '14px', overflow: 'hidden', border: '2px solid var(--red-500)', background: 'white', display: 'flex', animation: 'fadeUp 0.25s ease-out both' } },
      React.createElement('img', { src: youtubeData.thumb, style: { width: '88px', objectFit: 'cover', flexShrink: 0 }, onError: (e) => { e.target.style.display = 'none'; } }),
      React.createElement('div', { style: { flex: 1, padding: '10px 12px', minWidth: 0 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' } },
          React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'var(--red-500)' }, React.createElement('path', { d: 'M23 7s-.3-2-1.2-2.8c-1.1-1.2-2.4-1.2-3-1.3C16.4 2.8 12 2.8 12 2.8s-4.4 0-6.8.1c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.1.7 11.2v1.9c0 2.1.3 4.2.3 4.2s.3 2 1.2 2.8c1.1 1.2 2.6 1.1 3.3 1.2 2.4.2 10.1.3 10.1.3s4.4 0 6.8-.2c.6-.1 1.9-.1 3-1.3.9-.8 1.2-2.8 1.2-2.8s.3-2.1.3-4.2v-1.9C23.3 9.1 23 7 23 7zM9.7 14.8V8.5l6.5 3.2-6.5 3.1z' })),
          React.createElement('span', { style: { fontSize: '9px', fontWeight: 800, color: 'var(--red-500)', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'YouTube')
        ),
        React.createElement('div', { style: { fontWeight: 700, fontSize: '12px', color: 'var(--slate-900)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, youtubeData.title),
        youtubeData.channel && React.createElement('div', { style: { fontSize: '11px', color: 'var(--slate-400)', marginTop: '2px' } }, youtubeData.channel)
      ),
      React.createElement('button', { onClick: () => setState({ youtubeData: null, inputText: '' }), style: { background: 'none', border: 'none', padding: '8px 10px 8px 0', cursor: 'pointer', color: 'var(--slate-400)', fontSize: '14px', alignSelf: 'flex-start' } }, '✕')
    );
  };

  const buildErrorEl = (msg) => {
    if (!msg) return null;
    return React.createElement('div', { style: { marginTop: '10px', padding: '11px 14px', background: 'var(--red-50)', border: '1.5px solid var(--red-200)', borderRadius: '12px', fontSize: '13px', color: 'var(--red-700)', fontWeight: 600, lineHeight: 1.5 } }, '⚠️ ' + msg);
  };

  const buildStartBtnEl = (hasInput, isExtracting, onClick) => {
    const active = hasInput && !isExtracting;
    return React.createElement('button', { onClick, style: { width: '100%', padding: '15px', background: active ? 'linear-gradient(135deg,var(--indigo-500),var(--indigo-600))' : 'var(--slate-200)', color: active ? 'white' : 'var(--slate-400)', border: 'none', borderRadius: '16px', fontSize: '15px', fontWeight: 800, cursor: active ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px', boxShadow: active ? '0 4px 20px rgba(34,124,99,0.35)' : 'none', transition: 'all 0.2s' } },
      isExtracting ? L('Reading file…','Читаю файл…','Читаю файл…','Lecture…','Lese Datei…') : L('Get Started','Почати','Начать','Commencer','Loslegen'),
      !isExtracting && React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round', style: { flexShrink: 0 } }, React.createElement('line', { x1: '5', y1: '12', x2: '19', y2: '12' }), React.createElement('polyline', { points: '12 5 19 12 12 19' }))
    );
  };

  const buildExampleChips = () => {
    const chips = realTopicChips || [
      { l: '⚽ England Football', v: 'England National Football Team — history, players and major tournaments' },
      { l: '🔬 Photosynthesis', v: 'Photosynthesis — light reactions, Calvin cycle and chlorophyll' },
      { l: '∫ Calculus', v: 'Calculus — derivatives, integrals and limits' },
      { l: '🏛️ Roman Empire', v: 'Roman Empire — rise, peak and fall' },
      { l: '🧬 DNA & Genetics', v: 'DNA replication, transcription and Mendelian genetics' },
      { l: '⚛️ Quantum Physics', v: 'Quantum mechanics — wave-particle duality, Heisenberg and Schrödinger' },
    ];
    return chips.map((c, i) => React.createElement('button', { key: i, onClick: () => setState({ inputText: c.v, youtubeData: null }), style: { padding: '7px 13px', background: 'white', border: '1.5px solid var(--slate-200)', borderRadius: '20px', fontSize: '12px', color: 'var(--slate-700)', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } }, c.l));
  };

  const buildLoadingDots = () => {
    return React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, ...[0, 1, 2].map(i => React.createElement('div', { key: i, style: { width: '9px', height: '9px', background: 'var(--indigo-500)', borderRadius: '50%', animation: `loadDot 1.4s ease-in-out ${i * 0.16}s infinite` } })));
  };

  const buildTabsEl = () => {
    const { activeTab, videosLoading } = state;
    return ['flashcards', 'quiz', 'videos'].map(id => {
      const labels = { flashcards: '🃏 ' + L('Flashcards','Картки','Карточки','Cartes','Karteikarten'), quiz: '⚡ ' + L('Quiz','Квіз','Квиз','Quiz','Quiz'), videos: videosLoading ? '🎬 ' + L('Loading…','Завантаження…','Загрузка…','Chargement…','Laden…') : '🎬 ' + L('Videos','Відео','Видео','Vidéos','Videos') };
      const active = activeTab === id;
      return React.createElement('button', { key: id, onClick: () => { setState({ activeTab: id }); setTimeout(() => { const el = document.getElementById('results-scroll'); if (el) el.scrollTop = 0; }, 50); }, style: { flex: 1, padding: '11px 4px', border: 'none', borderBottom: `2px solid ${active ? 'var(--indigo-500)' : 'transparent'}`, background: 'none', fontSize: '12px', fontWeight: 700, color: active ? 'var(--indigo-500)' : 'var(--slate-500)', cursor: 'pointer', transition: 'all 0.18s' } }, labels[id]);
    });
  };

  const buildFlashCard = (card, isFlipped) => {
    const base = { position: 'absolute', inset: 0, borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '26px 22px', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', textAlign: 'center' };
    return React.createElement('div', { style: { width: '100%', height: '220px', perspective: '1000px', cursor: 'pointer' }, onClick: () => { const { currentCard, flippedCards } = state; setState({ flippedCards: { ...flippedCards, [currentCard]: !flippedCards[currentCard] } }); } },
      React.createElement('div', { style: { position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform 0.55s cubic-bezier(0.4,0,0.2,1)', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' } },
        React.createElement('div', { style: { ...base, background: 'white', border: '2px solid var(--slate-200)', boxShadow: '0 6px 28px rgba(0,0,0,0.08)' } },
          React.createElement('div', { style: { fontSize: '30px', marginBottom: '12px', opacity: 0.5 } }, '❓'),
          React.createElement('p', { style: { fontSize: '16px', fontWeight: 700, color: 'var(--slate-900)', lineHeight: 1.45, margin: '0 0 16px' } }, card.front),
          React.createElement('div', { style: { fontSize: '11px', color: 'var(--slate-400)', fontWeight: 600 } }, L('Tap to reveal','Торкніться, щоб відкрити','Нажмите, чтобы открыть','Touchez pour révéler','Zum Aufdecken tippen'))
        ),
        React.createElement('div', { style: { ...base, background: 'linear-gradient(135deg,var(--indigo-500),var(--indigo-600))', boxShadow: '0 6px 28px rgba(34,124,99,0.35)', transform: 'rotateY(180deg)' } },
          React.createElement('div', { style: { fontSize: '30px', marginBottom: '12px' } }, '✅'),
          React.createElement('p', { style: { fontSize: '16px', fontWeight: 700, color: 'white', lineHeight: 1.5, margin: 0 } }, card.back)
        )
      )
    );
  };

  const buildCardDots = (total, current) => {
    return React.createElement('div', { style: { display: 'flex', gap: '4px', alignItems: 'center' } }, ...Array.from({ length: total }, (_, i) => React.createElement('button', { key: i, onClick: (e) => { e.stopPropagation(); setState({ currentCard: i, flippedCards: {} }); }, style: { width: i === current ? '20px' : '8px', height: '8px', borderRadius: '4px', background: i === current ? 'var(--indigo-500)' : 'var(--slate-200)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.25s' } })));
  };

  const buildQuizEl = (quiz, quizAnswers) => {
    const allDone = quiz.length > 0 && quiz.every((_, i) => quizAnswers[i] !== undefined);
    if (allDone) {
      const score = quiz.filter((q, i) => quizAnswers[i] === q.correct).length;
      const pct = Math.round((score / quiz.length) * 100);
      return React.createElement('div', { style: { textAlign: 'center', padding: '36px 20px' } },
        React.createElement('div', { style: { fontSize: '56px', marginBottom: '14px' } }, pct >= 80 ? '🏆' : pct >= 60 ? '🎯' : '💪'),
        React.createElement('div', { style: { fontSize: '48px', fontWeight: 900, color: 'var(--slate-900)', lineHeight: 1, marginBottom: '6px' } }, `${pct}%`),
        React.createElement('div', { style: { fontSize: '16px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '5px' } }, pct >= 80 ? L('Excellent!','Чудово!','Отлично!','Excellent !','Ausgezeichnet!') : pct >= 60 ? L('Good job!','Гарна робота!','Хорошая работа!','Bien joué !','Gut gemacht!') : L('Keep going!','Продовжуйте!','Продолжайте!','Continuez !','Weiter so!')),
        React.createElement('div', { style: { fontSize: '13px', color: 'var(--slate-500)', marginBottom: '24px' } }, `${score} of ${quiz.length} correct`),
        React.createElement('button', { onClick: () => setState({ quizAnswers: {} }), style: { padding: '12px 28px', background: 'linear-gradient(135deg,var(--indigo-500),var(--indigo-600))', color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(34,124,99,0.3)' } }, '↺ ' + L('Try Again','Спробувати ще','Попробовать ещё','Réessayer','Nochmal'))
      );
    }
    const L = ['A', 'B', 'C', 'D'];
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '24px' } }, ...quiz.map((q, qi) => {
      const answered = quizAnswers[qi] !== undefined, selected = quizAnswers[qi];
      return React.createElement('div', { key: qi },
        React.createElement('div', { style: { marginBottom: '10px' } },
          React.createElement('span', { style: { background: 'var(--indigo-500)', color: 'white', fontSize: '10px', fontWeight: 800, padding: '3px 9px', borderRadius: '20px', letterSpacing: '0.06em', marginRight: '8px' } }, `Q${qi + 1}`),
          React.createElement('span', { style: { fontWeight: 700, fontSize: '14px', color: 'var(--slate-900)', lineHeight: 1.5 } }, q.question)
        ),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '7px' } }, ...(q.options || []).map((opt, oi) => {
          const isC = oi === q.correct, isS = oi === selected;
          let bg = 'white', bc = 'var(--slate-200)', col = 'var(--slate-700)', lb = 'var(--slate-100)', lc = 'var(--slate-400)';
          if (answered) { if (isC) { bg = 'var(--emerald-50)'; bc = 'var(--emerald-500)'; col = 'var(--emerald-700)'; lb = 'var(--emerald-500)'; lc = 'white'; } else if (isS) { bg = 'var(--red-50)'; bc = 'var(--red-500)'; col = 'var(--red-700)'; lb = 'var(--red-500)'; lc = 'white'; } else { col = 'var(--slate-300)'; bc = 'var(--slate-100)'; } }
          return React.createElement('button', { key: oi, disabled: !!answered, onClick: answered ? null : () => {
              if (oi !== q.correct && window.logMistake) {
                window.logMistake({ topic: state.topic, question: q.question, options: q.options, correctIndex: q.correct, selectedIndex: oi, explanation: q.explanation });
              }
              setState(s => ({ quizAnswers: { ...s.quizAnswers, [qi]: oi } }));
            }, style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: bg, border: `1.5px solid ${bc}`, borderRadius: '12px', color: col, fontSize: '13px', textAlign: 'left', cursor: answered ? 'default' : 'pointer', transition: 'all 0.15s', width: '100%' } },
            React.createElement('span', { style: { width: '24px', height: '24px', borderRadius: '7px', background: lb, color: lc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, transition: 'all 0.15s' } }, L[oi]),
            React.createElement('span', { style: { lineHeight: 1.45, fontWeight: 500 } }, opt)
          );
        })),
        answered && React.createElement('div', { style: { marginTop: '8px', padding: '10px 12px', background: selected === q.correct ? 'var(--emerald-50)' : 'var(--amber-50)', border: `1px solid ${selected === q.correct ? 'var(--emerald-100)' : 'var(--amber-200)'}`, borderRadius: '10px', fontSize: '12px', color: selected === q.correct ? 'var(--emerald-700)' : 'var(--amber-700)', lineHeight: 1.6 } }, (selected === q.correct ? '✅ ' : '💡 ') + q.explanation)
      );
    }));
  };

  const buildVideosEl = (videos, loading) => {
    if (loading) return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, ...[0, 1, 2, 3].map(i => React.createElement('div', { key: i, style: { background: 'white', borderRadius: '16px', height: '130px', border: '1.5px solid var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, React.createElement('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, ...[0, 1, 2].map(j => React.createElement('div', { key: j, style: { width: '7px', height: '7px', background: 'var(--indigo-500)', borderRadius: '50%', animation: `loadDot 1.4s ease-in-out ${(i * 3 + j) * 0.08}s infinite` } }))))));
    const pal = ['var(--indigo-500)', 'var(--sky-500)', 'var(--emerald-600)', 'var(--amber-600)'];
    const lBg = { Beginner: 'var(--emerald-50)', Intermediate: 'var(--amber-50)', Advanced: 'var(--red-50)' };
    const lCol = { Beginner: 'var(--emerald-700)', Intermediate: 'var(--amber-700)', Advanced: 'var(--red-700)' };
    return videos.map((v, i) => React.createElement('a', { key: i, href: `https://www.youtube.com/results?search_query=${encodeURIComponent(v.q || v.searchQuery || v.title || '')}`, target: '_blank', rel: 'noopener noreferrer', style: { textDecoration: 'none', display: 'block', background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1.5px solid var(--slate-200)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } },
      React.createElement('div', { style: { background: pal[i % pal.length], height: '66px', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, React.createElement('div', { style: { width: '38px', height: '38px', background: 'rgba(255,255,255,0.92)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' } }, React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24' }, React.createElement('polygon', { points: '6 3 20 12 6 21 6 3', fill: pal[i % pal.length] })))),
      React.createElement('div', { style: { padding: '11px 13px' } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' } },
          React.createElement('p', { style: { fontWeight: 700, fontSize: '13px', color: 'var(--slate-900)', margin: 0, lineHeight: 1.4 } }, v.title),
          React.createElement('span', { style: { background: lBg[v.lvl || v.level] || 'var(--slate-50)', color: lCol[v.lvl || v.level] || 'var(--slate-700)', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 } }, v.lvl || v.level || 'General')
        ),
        React.createElement('p', { style: { fontSize: '12px', color: 'var(--slate-500)', margin: '0 0 7px', lineHeight: 1.5 } }, v.desc || v.description),
        React.createElement('div', { style: { fontSize: '11px', color: 'var(--red-500)', fontWeight: 700 } }, '▶ ' + L('Watch on YouTube →','Дивитися на YouTube →','Смотреть на YouTube →','Voir sur YouTube →','Auf YouTube ansehen →'))
      )
    ));
  };

  const renderChatText = (text) => {
    const html = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').split('\n\n').filter(Boolean).map(p => `<p style="margin:0 0 8px;font-size:14px;line-height:1.7;">${p.replace(/\n/g, ' ')}</p>`).join('');
    return React.createElement('div', { dangerouslySetInnerHTML: { __html: html } });
  };

  const buildChatThreadEl = (chatMessages, isLoading) => {
    const typingDots = React.createElement('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 0' } }, ...[0, 1, 2].map(i => React.createElement('div', { key: i, style: { width: '7px', height: '7px', background: 'var(--indigo-500)', borderRadius: '50%', animation: `loadDot 1.4s ease-in-out ${i * 0.16}s infinite` } })));
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
      ...chatMessages.map((m, i) => m.role === 'user'
        ? React.createElement('div', { key: i, style: { alignSelf: 'flex-end', maxWidth: '85%', background: 'linear-gradient(135deg,var(--indigo-500),var(--indigo-600))', color: 'white', padding: '9px 13px', borderRadius: '14px', borderBottomRightRadius: '4px', fontSize: '13px', lineHeight: 1.5 } }, m.text)
        : React.createElement('div', { key: i, style: { alignSelf: 'flex-start', maxWidth: '90%', color: 'var(--slate-700)' } }, renderChatText(m.text))
      ),
      isLoading && React.createElement('div', { key: 'typing', style: { alignSelf: 'flex-start' } }, typingDots)
    );
  };

  const buildTabContent = () => {
    const { activeTab, flashcards, quiz, videos, videosLoading, currentCard, flippedCards, quizAnswers } = state;
    if (activeTab === 'flashcards') {
      const card = flashcards[currentCard] || { front: '—', back: '—' };
      const isFlipped = !!flippedCards[currentCard];
      return React.createElement('div', { style: { animation: 'fadeUp 0.3s ease-out both' } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
          React.createElement('span', { style: { fontSize: '12px', color: 'var(--slate-500)', fontWeight: 600 } }, `Card ${currentCard + 1} of ${flashcards.length}`),
          buildCardDots(flashcards.length, currentCard)
        ),
        React.createElement('div', { style: { marginBottom: '18px' } }, buildFlashCard(card, isFlipped)),
        React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '24px' } },
          React.createElement('button', { onClick: () => setState({ currentCard: Math.max(0, currentCard - 1), flippedCards: {} }), disabled: currentCard === 0, style: { flex: 1, padding: '12px', background: 'white', border: '1.5px solid var(--slate-200)', borderRadius: '14px', fontSize: '13px', fontWeight: 700, color: currentCard === 0 ? 'var(--slate-300)' : 'var(--slate-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: currentCard === 0 ? 'default' : 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } },
            React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, React.createElement('polyline', { points: '15 18 9 12 15 6' })), L('Prev','Назад','Назад','Préc.','Zurück')),
          React.createElement('button', { onClick: () => setState({ currentCard: Math.min(flashcards.length - 1, currentCard + 1), flippedCards: {} }), disabled: currentCard >= flashcards.length - 1, style: { flex: 1, padding: '12px', background: currentCard >= flashcards.length - 1 ? 'var(--slate-200)' : 'linear-gradient(135deg,var(--indigo-500),var(--indigo-600))', border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: currentCard >= flashcards.length - 1 ? 'default' : 'pointer', boxShadow: currentCard >= flashcards.length - 1 ? 'none' : '0 4px 12px rgba(34,124,99,0.3)' } },
            L('Next','Далі','Далее','Suiv.','Weiter'), React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, React.createElement('polyline', { points: '9 18 15 12 9 6' })))
        ),
        React.createElement('p', { style: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate-400)', margin: '0 0 10px' } }, L('All Cards','Усі картки','Все карточки','Toutes les cartes','Alle Karten')),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '7px' } }, ...flashcards.map((c, i) => React.createElement('button', { key: i, onClick: () => setState({ currentCard: i, flippedCards: {} }), style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 13px', background: i === currentCard ? 'var(--indigo-50)' : 'white', border: `1.5px solid ${i === currentCard ? 'var(--indigo-500)' : 'var(--slate-200)'}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s' } },
          React.createElement('span', { style: { width: '22px', height: '22px', borderRadius: '7px', background: i === currentCard ? 'var(--indigo-500)' : 'var(--slate-100)', color: i === currentCard ? 'white' : 'var(--slate-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 } }, i + 1),
          React.createElement('span', { style: { fontSize: '12px', fontWeight: 600, color: 'var(--slate-700)', lineHeight: 1.4 } }, c.front)
        )))
      );
    }
    if (activeTab === 'quiz') return React.createElement('div', { style: { animation: 'fadeUp 0.3s ease-out both' } }, buildQuizEl(quiz, quizAnswers));
    if (activeTab === 'videos') return React.createElement('div', { style: { animation: 'fadeUp 0.3s ease-out both' } },
      React.createElement('p', { style: { fontSize: '13px', color: 'var(--slate-500)', margin: '0 0 12px', lineHeight: 1.6 } }, React.createElement('strong', null, '🎬 ' + L('Video recommendations','Рекомендовані відео','Рекомендованные видео','Vidéos recommandées','Video-Empfehlungen')), ' — ', state.topic),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '11px' } },
        ...(videosLoading || videos.length === 0 ? buildVideosEl([], videosLoading) : buildVideosEl(videos, false))
      )
    );
    return null;
  };

  /* ─── FOLLOW-UP CHAT ──────────────────────────────────────── */
  // A real multi-turn thread: each send appends to chatMessages and sends the
  // whole running history back to Claude, so a follow-up like "what about
  // the second one?" still has the earlier question/answer for context —
  // not a single Q&A bubble that got wiped out by the next question.
  const sendChat = async () => {
    const { chatInput, topic, flashcards, isChatLoading, chatMessages } = state;
    if (!chatInput.trim() || isChatLoading) return;
    const q = chatInput.trim();
    const nextMessages = [...chatMessages, { role: 'user', text: q }];
    setState({ chatInput: '', isChatLoading: true, isChatMode: true, chatMessages: nextMessages });
    try {
      const ctx = flashcards.slice(0, 5).map(f => `• ${f.front}: ${f.back}`).join('\n');
      const history = nextMessages.map((m) => ({ role: m.role, content: m.text }));
      const chatLangHint = window.aiLangDirective ? window.aiLangDirective() : '';
      const answer = await window.claude.complete({ system: `You are a concise study assistant for "${topic}". Answer in 2-3 sentences using the key facts.\n\n${ctx}${chatLangHint ? `\n\n${chatLangHint}` : ''}`, messages: history });
      setState((s) => ({ chatMessages: [...s.chatMessages, { role: 'assistant', text: answer }], isChatLoading: false }));
    } catch {
      setState((s) => ({ chatMessages: [...s.chatMessages, { role: 'assistant', text: L('Sorry, something went wrong. Please try again.','Вибачте, щось пішло не так. Спробуйте ще раз.','Извините, что-то пошло не так. Попробуйте ещё раз.','Désolé, une erreur est survenue. Réessayez.','Entschuldigung, etwas ist schiefgelaufen. Versuche es erneut.') }], isChatLoading: false }));
    }
  };

  /* ─── RENDER ──────────────────────────────────────────────── */
  const { mode, inputText, isDragOver, isExtractingFile, imageFile, pdfFile, docFile, youtubeData, flashcards, quiz, chatInput, isChatMode, chatMessages, isChatLoading, loadingMsg, topic, topicEmoji, errorMsg } = state;

  const chatInputBarEl = React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--slate-50)', border: '1.5px solid var(--slate-200)', borderRadius: '22px', padding: '6px 6px 6px 14px' } },
    React.createElement('input', { value: chatInput, onChange: (e) => setState({ chatInput: e.target.value }), onKeyDown: (e) => { if (e.key === 'Enter') { e.preventDefault(); sendChat(); } }, placeholder: L('Ask Claude anything about this topic…','Запитайте Claude будь-що про цю тему…','Спросите Claude что угодно об этой теме…','Demandez tout à Claude sur ce sujet…','Frag Claude alles zu diesem Thema…'), style: { flex: 1, border: 'none', outline: 'none', fontSize: '13px', color: 'var(--slate-900)', background: 'none' } }),
    React.createElement('button', { onClick: sendChat, style: { width: '30px', height: '30px', background: 'linear-gradient(135deg,var(--indigo-500),var(--indigo-600))', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(34,124,99,0.3)', flexShrink: 0 } },
      React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'white', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, React.createElement('line', { x1: '22', y1: '2', x2: '11', y2: '13' }), React.createElement('polygon', { points: '22 2 15 22 11 13 2 9 22 2' })))
  );
  const hasInput = !!(inputText.trim() || imageFile || pdfFile || docFile || youtubeData);

  const uploadScreen = React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    React.createElement('div', { style: { padding: '20px 20px 14px', flexShrink: 0 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
        React.createElement('div', { style: { width: '46px', height: '46px', background: 'linear-gradient(135deg,var(--indigo-500),var(--indigo-600))', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, boxShadow: '0 4px 14px rgba(34,124,99,0.3)' } }, '🧠'),
        React.createElement('div', null,
          React.createElement('div', { style: { fontWeight: 800, fontSize: '19px', color: 'var(--slate-900)', lineHeight: 1.1 } }, L('AI Study Tool','AI-інструмент навчання','AI-инструмент обучения','Outil d\'étude IA','KI-Lernwerkzeug')),
          React.createElement('div', { style: { fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' } }, L('Powered by Claude AI','На базі Claude AI','На базе Claude AI','Propulsé par Claude AI','Unterstützt von Claude AI'))
        )
      )
    ),
    React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '0 18px 32px' } },
      React.createElement('div', { style: { marginBottom: '20px', animation: 'fadeUp 0.35s ease-out both' } },
        React.createElement('h1', { style: { fontSize: '26px', fontWeight: 900, color: 'var(--slate-900)', lineHeight: 1.2, margin: '0 0 8px', letterSpacing: '-0.5px' } }, L('Drop anything.','Закиньте будь-що.','Закиньте что угодно.','Déposez n\'importe quoi.','Leg alles ab.'), React.createElement('br'), L('Learn everything.','Вивчіть усе.','Изучите всё.','Apprenez tout.','Lerne alles.')),
        React.createElement('p', { style: { fontSize: '13px', color: 'var(--slate-500)', margin: 0, lineHeight: 1.7 } }, L('Image · PDF · PPTX · DOCX · YouTube link · or just type a topic. Claude builds your study set instantly.','Зображення · PDF · PPTX · DOCX · YouTube-посилання · або просто введіть тему. Claude миттєво збере ваш навчальний набір.','Изображение · PDF · PPTX · DOCX · ссылка YouTube · или просто введите тему. Claude мгновенно соберёт ваш учебный набор.','Image · PDF · PPTX · DOCX · lien YouTube · ou tapez un sujet. Claude crée votre kit d\'étude instantanément.','Bild · PDF · PPTX · DOCX · YouTube-Link · oder einfach ein Thema eingeben. Claude erstellt sofort dein Lernset.'))
      ),
      React.createElement('input', { type: 'file', id: 'study-file-input', accept: 'image/*,.pdf,.pptx,.ppt,.docx,.doc,.txt', onChange: (e) => { const f = e.target.files[0]; if (f) readFile(f); e.target.value = ''; }, style: { display: 'none' } }),
      buildDropZoneEl(isDragOver, isExtractingFile, {
        onDragOver: (e) => { e.preventDefault(); setState({ isDragOver: true }); },
        onDragLeave: () => setState({ isDragOver: false }),
        onDrop: (e) => { e.preventDefault(); handleDrop(e); },
        onClick: () => { const el = document.getElementById('study-file-input'); if (el) el.click(); },
      }),
      buildFilePreviewEl(),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 12px' } },
        React.createElement('div', { style: { flex: 1, height: '1px', background: 'var(--slate-200)' } }),
        React.createElement('span', { style: { fontSize: '11px', color: 'var(--slate-400)', fontWeight: 700, letterSpacing: '0.06em' } }, L('OR TYPE / PASTE','АБО ВВЕДІТЬ / ВСТАВТЕ','ИЛИ ВВЕДИТЕ / ВСТАВЬТЕ','OU TAPEZ / COLLEZ','ODER TIPPEN / EINFÜGEN')),
        React.createElement('div', { style: { flex: 1, height: '1px', background: 'var(--slate-200)' } })
      ),
      React.createElement('div', { style: { background: 'white', border: '1.5px solid var(--slate-200)', borderRadius: '16px', padding: '12px 14px' } },
        React.createElement('textarea', {
          value: inputText,
          onChange: (e) => {
            const val = e.target.value;
            setState({ inputText: val });
            const id = ytId(val);
            if (id && (!state.youtubeData || state.youtubeData.id !== id)) fetchYT(id);
            else if (!id && state.youtubeData) setState({ youtubeData: null });
          },
          onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (hasInput && !isExtractingFile) analyze(); } },
          placeholder: 'Topic, YouTube URL, or paste any text…',
          rows: 3,
          style: { width: '100%', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--slate-900)', lineHeight: 1.7, background: 'none', resize: 'none' }
        })
      ),
      buildYoutubePreviewEl(),
      buildErrorEl(errorMsg),
      buildStartBtnEl(hasInput, isExtractingFile, () => { if (hasInput && !isExtractingFile) analyze(); }),
      React.createElement('div', { style: { marginTop: '20px' } },
        React.createElement('p', { style: { fontSize: '10px', color: 'var(--slate-400)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' } }, realTopicChips ? L('From your courses','З ваших курсів','Из ваших курсов','De vos cours','Aus deinen Kursen') : L('Try these','Спробуйте ці','Попробуйте эти','Essayez ceux-ci','Probiere diese')),
        React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '7px' } }, ...buildExampleChips())
      )
    )
  );

  const loadingScreen = React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '22px', padding: '40px', textAlign: 'center', animation: 'fadeUp 0.3s ease-out both' } },
    React.createElement('div', { style: { width: '76px', height: '76px', background: 'linear-gradient(135deg,var(--indigo-500),var(--indigo-600))', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', boxShadow: '0 10px 32px rgba(34,124,99,0.35)', animation: 'pulse 2s ease-in-out infinite' } }, '🧠'),
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '8px' } }, L('Building your study set','Збираю ваш навчальний набір','Собираю ваш учебный набор','Création de votre kit d\'étude','Erstelle dein Lernset')),
      React.createElement('div', { style: { fontSize: '14px', color: 'var(--slate-500)', lineHeight: 1.65, minHeight: '42px' } }, loadingMsg)
    ),
    buildLoadingDots(),
    React.createElement(LoadingHint, null)
  );

  const resultsScreen = React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    React.createElement('div', { style: { padding: '10px 12px', background: 'white', borderBottom: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' } },
      React.createElement('button', { onClick: () => { try { localStorage.removeItem(STUDY_RESULT_KEY); } catch {} setState({ mode: 'upload', inputText: '', imageFile: null, pdfFile: null, docFile: null, youtubeData: null, errorMsg: '' }); }, style: { width: '34px', height: '34px', background: 'var(--slate-100)', border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 } },
        React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--slate-700)', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, React.createElement('polyline', { points: '15 18 9 12 15 6' }))),
      React.createElement('div', { style: { fontSize: '26px', flexShrink: 0, lineHeight: 1 } }, topicEmoji),
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', { style: { fontWeight: 800, fontSize: '14px', color: 'var(--slate-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, topic),
        React.createElement('div', { style: { fontSize: '11px', color: 'var(--slate-500)' } }, `${flashcards.length} cards · ${quiz.length} questions`)
      )
    ),
    React.createElement('div', { style: { display: 'flex', background: 'white', borderBottom: '1px solid var(--slate-200)', flexShrink: 0 } }, ...buildTabsEl()),
    React.createElement('div', { id: 'results-scroll', style: { flex: 1, overflowY: 'auto', padding: '16px 14px 10px' } }, buildTabContent()),
    // Hidden once the chat overlay is open — that overlay carries its own
    // copy of this same input bar, so there's exactly one place to type at
    // any moment instead of a second input sitting uselessly underneath it.
    !isChatMode && React.createElement('div', { style: { padding: '10px 12px 18px', background: 'white', borderTop: '1px solid var(--slate-200)', flexShrink: 0 } }, chatInputBarEl)
  );

  const chatOverlay = isChatMode && React.createElement('div', { style: { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid var(--slate-200)', borderRadius: '22px 22px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', maxHeight: '60vh', display: 'flex', flexDirection: 'column', zIndex: 200, animation: 'fadeUp 0.3s ease-out both' } },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 18px 14px', flexShrink: 0 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '9px' } },
        React.createElement('div', { style: { width: '28px', height: '28px', background: 'linear-gradient(135deg,var(--indigo-500),var(--indigo-600))', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' } }, '🧠'),
        React.createElement('span', { style: { fontSize: '14px', fontWeight: 800, color: 'var(--slate-900)' } }, L("Ask about this topic","Запитати про цю тему","Спросить об этой теме","Poser une question sur ce sujet","Zu diesem Thema fragen"))
      ),
      React.createElement('button', { onClick: () => setState({ isChatMode: false }), style: { width: '28px', height: '28px', background: 'var(--slate-100)', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-500)', fontSize: '14px', cursor: 'pointer' } }, '✕')
    ),
    React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '0 18px 14px' } }, buildChatThreadEl(chatMessages, isChatLoading)),
    React.createElement('div', { style: { padding: '0 18px 18px', flexShrink: 0 } }, chatInputBarEl)
  );

  return React.createElement('div', { style: { height: 'calc(100vh - 140px)', minHeight: 480, borderRadius: 'var(--radius-2xl)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--slate-50)', position: 'relative' } },
    mode === 'upload' && uploadScreen,
    mode === 'loading' && loadingScreen,
    mode === 'results' && resultsScreen,
    chatOverlay
  );
}

window.StudyHub = StudyHub;
