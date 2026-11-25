// Halaman Islami: Sholat & Hijriah (myquran), Al-Qur'an & Hadis (gading.dev)
(function () {
  const API = {
    quran: 'https://api.quran.gading.dev',
    hadis: 'https://api.hadith.gading.dev',
    myq: 'https://api.myquran.com/v2'
  };
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  async function get(url) { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
  function showErr(sel, e) { $(sel).innerHTML = '<div class="isl-err">Gagal memuat data: ' + esc(e.message) + '. Coba lagi nanti.</div>'; }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }

  /* ---------- Sub-tab ---------- */
  const inited = {};
  document.querySelectorAll('.isl-tab').forEach(b => b.onclick = () => {
    document.querySelectorAll('.isl-tab').forEach(x => x.classList.toggle('on', x === b));
    ['isl-sholat', 'isl-quran', 'isl-hadis'].forEach(id => $('#' + id).classList.toggle('isl-hide', id !== b.dataset.s));
    if (b.dataset.s === 'isl-quran' && !inited.q) { inited.q = 1; initQuran(); }
    if (b.dataset.s === 'isl-hadis' && !inited.h) { inited.h = 1; initHadis(); }
  });

  /* ---------- Tanggal & Hijriah ---------- */
  function renderDates() {
    const d = new Date();
    $('#isl-gdate').textContent = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    let h = '';
    try { h = new Intl.DateTimeFormat('id-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(d); } catch (e) {}
    $('#isl-hdate').textContent = h ? h.replace(/ ?(AH|H)$/, '') + ' H' : '';
  }

  /* ---------- Jadwal Sholat ---------- */
  let jadwal = null, timer = null, sholatStarted = false;
  const NAMES = [['imsak', 'Imsak'], ['subuh', 'Subuh'], ['terbit', 'Terbit'], ['dhuha', 'Dhuha'], ['dzuhur', 'Dzuhur'], ['ashar', 'Ashar'], ['maghrib', 'Maghrib'], ['isya', 'Isya']];

  async function loadJadwal(id, nama) {
    $('#isl-sholatErr').innerHTML = '';
    try {
      const d = new Date();
      const j = await get(`${API.myq}/sholat/jadwal/${id}/${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`);
      const data = j.data || {};
      jadwal = data.jadwal;
      $('#isl-lokasi').textContent = '📍 ' + (data.lokasi || nama) + (data.daerah ? ', ' + data.daerah : '');
      save('islKota', { id, nama });
      renderTimes();
    } catch (e) { showErr('#isl-sholatErr', e); }
  }
  function renderTimes() {
    if (!jadwal) return;
    const now = new Date();
    const toDate = t => { const m = /(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return null; const x = new Date(); x.setHours(+m[1], +m[2], 0, 0); return x; };
    let next = null;
    for (const [k, n] of NAMES) {
      if (['imsak', 'terbit', 'dhuha'].includes(k)) continue;
      const t = toDate(jadwal[k]);
      if (t && t > now) { next = { k, n, t }; break; }
    }
    $('#isl-times').innerHTML = NAMES.map(([k, n]) => `<div class="isl-t${next && next.k === k ? ' next' : ''}"><span>${n}</span><b>${esc(jadwal[k] || '-')}</b></div>`).join('');
    clearInterval(timer);
    if (next) {
      $('#isl-nextBox').classList.remove('isl-hide');
      $('#isl-nextName').textContent = next.n;
      const tick = () => {
        const s = Math.max(0, Math.floor((next.t - new Date()) / 1000));
        $('#isl-nextCount').textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`;
        if (s <= 0) { clearInterval(timer); renderTimes(); }
      };
      tick(); timer = setInterval(tick, 1000);
    } else $('#isl-nextBox').classList.add('isl-hide');
  }
  async function cariKota() {
    const q = $('#isl-kotaQ').value.trim();
    if (!q) return;
    $('#isl-sholatErr').innerHTML = '';
    try {
      const j = await get(`${API.myq}/sholat/kota/cari/${encodeURIComponent(q.toLowerCase())}`);
      const list = j.data || [];
      if (!list.length) { $('#isl-sholatErr').innerHTML = '<div class="isl-err">Kota tidak ditemukan.</div>'; return; }
      const sel = $('#isl-kotaSel');
      sel.innerHTML = list.map(k => `<option value="${esc(k.id)}">${esc(k.lokasi)}</option>`).join('');
      sel.classList.remove('isl-hide');
      sel.onchange = () => loadJadwal(sel.value, sel.options[sel.selectedIndex].text);
      sel.onchange();
    } catch (e) { showErr('#isl-sholatErr', e); }
  }
  $('#isl-kotaBtn').onclick = cariKota;
  $('#isl-kotaQ').addEventListener('keydown', e => { if (e.key === 'Enter') cariKota(); });

  function startSholat() {
    if (sholatStarted) return;
    sholatStarted = true;
    renderDates();
    const k = load('islKota', null);
    if (k) return loadJadwal(k.id, k.nama);
    $('#isl-kotaQ').value = 'makassar';
    cariKota();
  }
  // Mulai saat tab Islami pertama kali dibuka (hemat kuota di halaman toko)
  $('#nav-islami').addEventListener('click', startSholat);

  /* ---------- Al-Qur'an ---------- */
  let surahs = [], audio = null;
  async function initQuran() {
    try {
      const j = await get(API.quran + '/surah');
      surahs = j.data || [];
      renderSurahs();
    } catch (e) { showErr('#isl-quranErr', e); }
  }
  function renderSurahs() {
    const q = $('#isl-surahQ').value.trim().toLowerCase();
    const list = surahs.filter(s => !q || String(s.number) === q ||
      (s.name.transliteration.id || '').toLowerCase().includes(q) ||
      (s.name.translation.id || '').toLowerCase().includes(q));
    $('#isl-surahList').innerHTML = list.map(s => `<div class="isl-item" data-n="${s.number}">
      <div class="isl-num">${s.number}</div>
      <div><b>${esc(s.name.transliteration.id)}</b><div class="isl-muted">${esc(s.name.translation.id)} • ${s.numberOfVerses} ayat • ${esc(s.revelation.id)}</div></div>
      <div class="ar">${esc(s.name.short)}</div></div>`).join('');
    document.querySelectorAll('#isl-surahList .isl-item').forEach(e => e.onclick = () => openSurah(e.dataset.n));
  }
  $('#isl-surahQ').oninput = renderSurahs;

  async function openSurah(n) {
    $('#isl-quranErr').innerHTML = '';
    try {
      const j = await get(`${API.quran}/surah/${n}`);
      const s = j.data;
      $('#isl-surahListBox').classList.add('isl-hide');
      $('#isl-surahView').classList.remove('isl-hide');
      $('#isl-svTitle').textContent = `${s.number}. ${s.name.transliteration.id} — ${s.name.short}`;
      $('#isl-svMeta').textContent = `${s.name.translation.id} • ${s.numberOfVerses} ayat • ${s.revelation.id}`;
      $('#isl-ayahs').innerHTML = (s.verses || []).map((v, i) => `<div class="isl-ayah">
        <span class="isl-tag">${v.number.inSurah}</span>
        ${v.audio && v.audio.primary ? `<button class="isl-btn alt" data-a="${i}" style="padding:3px 12px">▶ Audio</button>` : ''}
        <div class="isl-arab">${esc(v.text.arab)}</div>
        <div class="isl-muted"><i>${esc(v.text.transliteration?.en || '')}</i></div>
        <div>${esc(v.translation.id)}</div></div>`).join('');
      document.querySelectorAll('#isl-ayahs [data-a]').forEach(b => b.onclick = () => {
        if (audio) audio.pause();
        audio = new Audio(s.verses[b.dataset.a].audio.primary);
        audio.play();
      });
      window.scrollTo({ top: 0 });
    } catch (e) { showErr('#isl-quranErr', e); }
  }
  $('#isl-backSurah').onclick = () => {
    if (audio) audio.pause();
    $('#isl-surahView').classList.add('isl-hide');
    $('#isl-surahListBox').classList.remove('isl-hide');
  };

  /* ---------- Hadis ---------- */
  const hState = { start: 1, size: 10 };
  async function initHadis() {
    try {
      const j = await get(API.hadis + '/books');
      const books = j.data || [];
      $('#isl-bookSel').innerHTML = books.map(b => `<option value="${esc(b.id)}" data-max="${b.available}">${esc(b.name)} (${b.available})</option>`).join('');
      $('#isl-bookSel').onchange = () => { hState.start = 1; loadHadis(); };
      loadHadis();
    } catch (e) { showErr('#isl-hadisErr', e); }
  }
  async function loadHadis() {
    $('#isl-hadisErr').innerHTML = '';
    const sel = $('#isl-bookSel');
    if (!sel.value) return;
    const max = +sel.options[sel.selectedIndex].dataset.max || 1;
    const a = hState.start, b = Math.min(a + hState.size - 1, max);
    try {
      const j = await get(`${API.hadis}/books/${sel.value}?range=${a}-${b}`);
      const hs = j.data?.hadiths || [];
      $('#isl-hadisList').innerHTML = hs.map(h => `<div class="isl-card isl-hadis-item"><span class="isl-tag">No. ${h.number}</span>
        <div class="isl-arab">${esc(h.arab)}</div><div>${esc(h.id)}</div></div>`).join('') || '<div class="isl-muted">Tidak ada data.</div>';
      $('#isl-hInfo').textContent = `Hadis ${a}–${b} dari ${max}`;
      $('#isl-hPrev').disabled = a <= 1;
      $('#isl-hNext').disabled = b >= max;
      window.scrollTo({ top: 0 });
    } catch (e) { showErr('#isl-hadisErr', e); }
  }
  $('#isl-hPrev').onclick = () => { hState.start = Math.max(1, hState.start - hState.size); loadHadis(); };
  $('#isl-hNext').onclick = () => { hState.start += hState.size; loadHadis(); };
  $('#isl-hGo').onclick = () => { const n = parseInt($('#isl-hNum').value); if (n > 0) { hState.start = n; loadHadis(); } };

  // Ikon Lucide untuk tombol nav baru
  if (window.lucide) lucide.createIcons();
})();
