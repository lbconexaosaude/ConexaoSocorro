import { WEB_APP_URL, METRONOME_BPM, NOMINATIM_URL } from './constants.js';
import { uiLabels } from './translations.js';

// State Management
const state = {
    fullData: [],
    currentLang: 'PT',
    currentCategory: '',
    currentSubCategory: '',
    metronomeInterval: null,
    userLocation: "Localização não autorizada",
    userDevice: "",
    isSpeaking: false,
    audioCtx: null
};

// UI Elements caching
const elements = {
    navTop: document.getElementById('nav-top'),
    step2: document.getElementById('step-2'),
    step3: document.getElementById('step-3'),
    step4: document.getElementById('step-4'),
    loading: document.getElementById('loading'),
    renderArea: document.getElementById('render-area'),
    subArea: document.getElementById('subcategory-area'),
    visualMetronome: document.getElementById('visual-metronome'),
    langLabel: document.getElementById('lang-label'),
    langOptions: document.getElementById('lang-options'),
    locationCard: document.getElementById('location-display'),
    locationText: document.getElementById('location-text'),
    uiSamu: document.getElementById('ui-btn-samu'),
    uiBackTop: document.getElementById('ui-btn-back-top'),
    uiTitleCat: document.getElementById('ui-title-cat'),
    uiBtnLoc: document.getElementById('ui-btn-location'),
    uiBtnPause: document.getElementById('btn-pause-voice'),
    uiBtnPlay: document.getElementById('btn-play-voice'),
    langMenu: document.getElementById('lang-menu'),
    currentLangBtn: document.getElementById('current-lang-btn'),
    categoryBtns: document.getElementById('category-btns')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    detectDevice();
    initGeolocation();
    fetchData();
    setupEventListeners();
});

function setupEventListeners() {
    elements.currentLangBtn.addEventListener('click', toggleLangSelection);

    // Global back button listeners
    document.querySelectorAll('.btn-back, .btn-back-top').forEach(btn => {
        btn.addEventListener('click', handleBack);
    });

    // Language selection delegation
    elements.langOptions.addEventListener('click', (e) => {
        const option = e.target.closest('.lang-option');
        if (option) {
            const lang = option.dataset.lang;
            confirmLang(lang);
        }
    });

    // Voice control buttons
    elements.uiBtnPause.addEventListener('click', () => toggleVoice(true));
    elements.uiBtnPlay.addEventListener('click', () => toggleVoice(false));

    // Handle clicks for dynamically rendered buttons (Event Delegation)
    elements.categoryBtns.addEventListener('click', handleActionClick);
    elements.subArea.addEventListener('click', handleActionClick);
    elements.renderArea.addEventListener('click', handleActionClick);

    // Static buttons
    elements.uiBtnLoc.addEventListener('click', mostrarMinhaLocalizacao);
}

async function fetchData() {
    showLoading(true);
    try {
        const response = await fetch(`${WEB_APP_URL}?api=true`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        state.fullData = data;
        confirmLang('PT', true);
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao carregar dados. Verifique sua conexão.');
    } finally {
        showLoading(false);
    }
}

function detectDevice() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) state.userDevice = "Tablet";
    else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) state.userDevice = "Celular";
    else state.userDevice = "Computador";
}

function initGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            state.userLocation = `${pos.coords.latitude}, ${pos.coords.longitude}`;
        }, (err) => console.warn("Geolocalização negada."));
    }
}

function showLoading(show) {
    elements.loading.classList.toggle('hidden', !show);
}

function toggleLangSelection() {
    elements.langOptions.classList.toggle('hidden');
}

function confirmLang(l, quiet = false) {
    state.currentLang = l;
    elements.langOptions.classList.add('hidden');

    const labels = uiLabels[l] || uiLabels['PT'];
    updateUILabels(labels);

    const categories = filterCategories();
    renderCategoryMenu(categories);

    if (!quiet) {
        const msgVoice = { 'PT': 'Idioma alterado', 'ES': 'Idioma cambiado', 'EN': 'Language changed' };
        falarInstrucao(msgVoice[l] || msgVoice['PT']);
    }
}

function updateUILabels(labels) {
    if (elements.uiSamu) elements.uiSamu.innerHTML = `<i class="icon-phone">📞</i> ${labels.samu}`;
    if (elements.uiBackTop) elements.uiBackTop.innerText = labels.back;
    if (elements.uiTitleCat) elements.uiTitleCat.innerText = labels.titleCat;
    if (elements.uiBtnLoc) elements.uiBtnLoc.innerText = labels.btnLocation;
    if (elements.langLabel) elements.langLabel.innerText = labels.selectLang;
}

function filterCategories() {
    return [...new Set(
        state.fullData
            .filter((r, idx) => idx > 0 && r[1] === state.currentLang)
            .map(r => r[2])
    )].sort((a, b) => {
        if (a.includes('AULA') && !b.includes('AULA')) return 1;
        if (!a.includes('AULA') && b.includes('AULA')) return -1;
        return a.localeCompare(b);
    });
}

function renderCategoryMenu(categories) {
    elements.categoryBtns.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.dataset.category = cat;

        let label = cat.replace(/_/g, ' ').toUpperCase();
        if (cat.includes('AULA')) {
            btn.classList.add('btn-learn');
            const libTxt = uiLabels[state.currentLang].library;
            btn.innerHTML = `<span>📚 ${libTxt}: ${label}</span> <i>➜</i>`;
            btn.dataset.type = 'library';
        } else {
            btn.classList.add('btn-emergency');
            btn.innerHTML = `<span>⚠️ ${label}</span> <i>➜</i>`;
            btn.dataset.type = 'emergency';
        }
        elements.categoryBtns.appendChild(btn);
    });
}

function handleActionClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.category) {
        if (btn.dataset.type === 'library') loadLibrary(btn.dataset.category);
        else selectCategory(btn.dataset.category);
    } else if (btn.dataset.sub) {
        loadContent(state.currentCategory, btn.dataset.sub);
    } else if (btn.id === 'ui-btn-location') {
        mostrarMinhaLocalizacao();
    } else if (btn.id === 'btn-metronome') {
        toggleMetronome();
    }
}

function selectCategory(cat) {
    state.currentCategory = cat;
    const subs = [...new Set(
        state.fullData
            .filter((r, idx) => idx > 0 && r[1] === state.currentLang && r[2] === cat)
            .map(r => r[3])
    )];

    elements.subArea.innerHTML = `<h3 class="section-title">${cat.replace('_', ' ')}: Escolha</h3>`;
    subs.forEach(sub => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.dataset.sub = sub;
        btn.innerHTML = `<span>${sub}</span> <i>➜</i>`;
        elements.subArea.appendChild(btn);
    });

    switchScreen(elements.step2, elements.step3);
    elements.navTop.classList.remove('hidden');
    elements.langMenu.classList.add('hidden');
}

function loadContent(cat, sub) {
    state.currentCategory = cat;
    state.currentSubCategory = sub;
    const item = state.fullData.find((r, idx) => idx > 0 && r[1] === state.currentLang && r[2] === cat && r[3] === sub);

    if (item) {
        const videoId = getYoutubeId(item[7]);
        const isRCP = cat.toLowerCase().includes('rcp');
        const labels = uiLabels[state.currentLang];

        elements.renderArea.innerHTML = `
            <div class="video-card">
                <p class="protocol-label">${labels.protocol}</p>
                <strong>${sub}</strong>
                
                ${isRCP ? `
                <div class="metronome-box">
                    <p class="metronome-label">${labels.metronome}</p>
                    <button id="btn-metronome" class="btn-metronome">
                        ${labels.btnMetronome}
                    </button>
                </div>
                ` : ''}

                <div id="instruction-text" class="instruction-box">
                    ${item[4]}
                </div>
                
                ${videoId ? `
                <div class="video-wrapper">
                    <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
                </div>` : ''}
            </div>`;

        updateVoiceLabels(labels);
        logAcesso(cat, sub);
        falarInstrucao(item[4].replace(/<[^>]*>/g, ''));

        switchScreen(elements.step3, elements.step4);
    }
}

function updateVoiceLabels(labels) {
    if (elements.uiBtnPause) elements.uiBtnPause.innerText = labels.pause;
    if (elements.uiBtnPlay) elements.uiBtnPlay.innerText = labels.resume;
}

function loadLibrary(cat) {
    state.currentCategory = cat;
    const matches = state.fullData.filter((r, idx) => idx > 0 && r[1] === state.currentLang && r[2] === cat);
    const labels = uiLabels[state.currentLang];

    elements.renderArea.innerHTML = `<h3 class="section-title">${labels.library}</h3>`;
    matches.forEach(item => {
        const videoId = getYoutubeId(item[7]);
        elements.renderArea.innerHTML += `
            <div class="video-card">
                <strong>${item[3]}</strong>
                <p class="library-item-desc">${item[4] || ''}</p>
                <div class="video-wrapper">
                    <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
                </div>
            </div>`;
    });

    switchScreen(elements.step2, elements.step4);
    elements.navTop.classList.remove('hidden');
    elements.langMenu.classList.add('hidden');
}

function switchScreen(from, to) {
    from.classList.add('hidden');
    to.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function logAcesso(cat, sub) {
    const modulo = `${cat}/${sub}`;
    fetch(`${WEB_APP_URL}?log=true&idioma=${state.currentLang}&modulo=${modulo}&local=${encodeURIComponent(state.userLocation)}&dispositivo=${state.userDevice}`)
        .catch(() => { });
}

async function mostrarMinhaLocalizacao() {
    const labels = uiLabels[state.currentLang];
    elements.locationCard.classList.remove('hidden');
    elements.locationText.innerText = labels.searching;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;

            try {
                const response = await fetch(`${NOMINATIM_URL}?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
                const data = await response.json();
                const addr = data.address;

                const rua = addr.road || addr.pedestrian || "";
                const num = addr.house_number || "S/N";
                const bairro = addr.suburb || addr.neighbourhood || addr.village || "";
                const cidade = addr.city || addr.town || "";

                state.userLocation = `${rua}, ${num} - ${bairro}, ${cidade}`.replace(/^, /, "").replace(/ - ,/, "");
                elements.locationText.innerText = state.userLocation;
                logAcesso("BOTAO", "LOCALIZACAO_DETALHADA");
            } catch (e) {
                state.userLocation = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                elements.locationText.innerText = state.userLocation;
            }
        }, (err) => {
            let msg = "Erro ao buscar GPS.";
            if (err.code === 1) msg = "GPS negado. Ative nas configurações do navegador.";
            else if (err.code === 2) msg = "Localização indisponível.";
            else if (err.code === 3) msg = "Tempo esgotado.";
            elements.locationText.innerText = msg;
        }, { timeout: 10000 });
    } else {
        elements.locationText.innerText = "Geolocalização não suportada.";
    }
}

function falarInstrucao(texto) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        // Pequeno delay para garantir o cancelamento em alguns navegadores
        setTimeout(() => {
            const msg = new SpeechSynthesisUtterance(texto);
            const langMap = { 'ES': 'es-ES', 'EN': 'en-US', 'PT': 'pt-BR', 'LIBRAS': 'pt-BR', 'MAC': 'pt-BR' };
            msg.lang = langMap[state.currentLang] || 'pt-BR';
            msg.rate = 0.9;

            msg.onpause = () => updateVoiceButtons(true);
            msg.onresume = () => updateVoiceButtons(false);
            msg.onend = () => {
                updateVoiceButtons(false);
                state.isSpeaking = false;
            };
            msg.onerror = (e) => {
                console.error("Speech Error:", e);
                state.isSpeaking = false;
                updateVoiceButtons(false);
            };

            state.isSpeaking = true;
            window.speechSynthesis.speak(msg);
            updateVoiceButtons(false);

            // Bug fix: manter a fala ativa em alguns Chrome/Android
            const keepAlive = setInterval(() => {
                if (state.isSpeaking && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                } else {
                    clearInterval(keepAlive);
                }
            }, 10000);
        }, 100);
    }
}

function updateVoiceButtons(isPaused) {
    if (isPaused) {
        elements.uiBtnPause.classList.add('hidden');
        elements.uiBtnPlay.classList.remove('hidden');
    } else {
        elements.uiBtnPause.classList.remove('hidden');
        elements.uiBtnPlay.classList.add('hidden');
    }
}

function toggleVoice(pause) {
    if (window.speechSynthesis.speaking) {
        if (pause) {
            window.speechSynthesis.pause();
        } else {
            // Em alguns navegadores, resume() precisa de um pequeno hack
            window.speechSynthesis.resume();

            // Verificação extra para forçar o retorno se travar
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
        }
    }
}

function toggleMetronome() {
    const btn = document.getElementById('btn-metronome');
    const labels = uiLabels[state.currentLang];

    if (state.metronomeInterval) {
        clearInterval(state.metronomeInterval);
        state.metronomeInterval = null;
        btn.classList.remove('active');
        btn.innerText = labels.btnMetronome;
        elements.visualMetronome.classList.add('hidden');
    } else {
        btn.classList.add('active');
        btn.innerText = labels.metronomeStop;
        elements.visualMetronome.classList.remove('hidden');
        const interval = (60 / METRONOME_BPM) * 1000;
        playPulse();
        state.metronomeInterval = setInterval(playPulse, interval);
    }
}

function playPulse() {
    // Som de "toc" sintetizado (Web Audio API)
    if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
    }

    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, state.audioCtx.currentTime);

    gain.gain.setValueAtTime(0.5, state.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(state.audioCtx.destination);

    osc.start();
    osc.stop(state.audioCtx.currentTime + 0.05);

    // Efeito visual
    elements.visualMetronome.classList.remove('pulse-active');
    void elements.visualMetronome.offsetWidth;
    elements.visualMetronome.classList.add('pulse-active');
}

function getYoutubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function handleBack() {
    if (state.metronomeInterval) toggleMetronome();
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    if (!elements.step4.classList.contains('hidden')) {
        elements.step4.classList.add('hidden');
        if (state.currentSubCategory) elements.step3.classList.remove('hidden');
        else {
            elements.step2.classList.remove('hidden');
            elements.navTop.classList.add('hidden');
            elements.langMenu.classList.remove('hidden');
        }
    } else if (!elements.step3.classList.contains('hidden')) {
        elements.step3.classList.add('hidden');
        elements.step2.classList.remove('hidden');
        elements.navTop.classList.add('hidden');
        elements.langMenu.classList.remove('hidden');
    }
    state.currentSubCategory = "";
    window.scrollTo(0, 0);
}

// Export functions for potential testing or modular use
export { confirmLang, toggleLangSelection, handleBack, mostrarMinhaLocalizacao };
