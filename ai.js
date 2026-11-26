// Fitur AI: chatbot toko, asisten Islami, pembuat deskripsi UID.
// Situs ini TIDAK menyimpan kunci NVIDIA. Semua permintaan lewat Cloudflare Worker.
(function () {
  // GANTI dengan alamat Worker Anda, contoh: https://caya-ai.namaakun.workers.dev
  const AI_URL = 'https://caya-ai.intulboti.workers.dev';

  const belumSiap = AI_URL.includes('GANTI');

  async function tanyaAI(mode, messages, context) {
    if (belumSiap) throw new Error('Fitur AI belum dihubungkan. Isi AI_URL di ai.js.');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const r = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, messages, context: context || '' }),
        signal: ctrl.signal
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Gagal (HTTP ' + r.status + ')');
      return j.reply || '';
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Waktu habis, coba lagi.');
      throw e;
    } finally { clearTimeout(timer); }
  }
  window.tanyaAI = tanyaAI;

  /* ---------- Komponen chat umum ---------- */
  function mountChat({ log, input, btn, mode, context, greeting }) {
    const history = [];
    function add(role, text, cls) {
      const d = document.createElement('div');
      d.className = 'ai-msg ' + (role === 'user' ? 'ai-user' : 'ai-bot') + (cls ? ' ' + cls : '');
      d.textContent = text; // textContent: aman dari injeksi HTML
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
      return d;
    }
    if (greeting) add('assistant', greeting);

    async function kirim() {
      const q = input.value.trim();
      if (!q || btn.disabled) return;
      input.value = '';
      add('user', q);
      history.push({ role: 'user', content: q.slice(0, 800) });
      btn.disabled = true;
      const wait = add('assistant', 'Mengetik…', 'ai-wait');
      try {
        const reply = await tanyaAI(mode, history.slice(-8), context ? context() : '');
        wait.remove();
        add('assistant', reply || '(tidak ada jawaban)');
        history.push({ role: 'assistant', content: (reply || '').slice(0, 800) });
      } catch (e) {
        wait.remove();
        add('assistant', '⚠️ ' + e.message, 'ai-err');
        history.pop();
      }
      btn.disabled = false;
      input.focus();
    }
    btn.addEventListener('click', kirim);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') kirim(); });
  }

  /* ---------- 1. Chatbot toko (tombol melayang) ---------- */
  function daftarProdukKonteks() {
    try {
      const list = (typeof daftarProduk !== 'undefined' ? daftarProduk : []).slice(0, 40)
        .map(p => `- UID ${p.nama} | Rp ${new Intl.NumberFormat('id-ID').format(p.harga)} | ${p.katalog}` + (p.deskripsi ? ` | ${p.deskripsi}` : ''));
      const wa = (typeof nomorWA !== 'undefined') ? `\nWhatsApp admin: https://wa.me/${nomorWA}` : '';
      return 'Daftar UID tersedia:\n' + (list.join('\n') || '(kosong)') + wa;
    } catch (e) { return ''; }
  }

  const widget = document.createElement('div');
  widget.id = 'ai-widget';
  widget.innerHTML = `
    <button id="ai-fab" aria-label="Chat asisten toko">💬</button>
    <div id="ai-panel" role="dialog" aria-label="Asisten CAYA Store">
      <div class="ai-head"><span>Asisten CAYA Store</span><button id="ai-close" aria-label="Tutup">✕</button></div>
      <div class="ai-log" id="ai-log"></div>
      <div class="ai-form"><input id="ai-input" placeholder="Tanya harga, cara beli…" maxlength="300"><button id="ai-send">Kirim</button></div>
    </div>`;
  document.body.appendChild(widget);

  mountChat({
    log: document.getElementById('ai-log'),
    input: document.getElementById('ai-input'),
    btn: document.getElementById('ai-send'),
    mode: 'toko',
    context: daftarProdukKonteks,
    greeting: 'Halo! Saya asisten CAYA Store. Mau tanya harga, UID, atau cara beli? 😊'
  });
  const panel = document.getElementById('ai-panel');
  document.getElementById('ai-fab').onclick = () => panel.classList.toggle('open');
  document.getElementById('ai-close').onclick = () => panel.classList.remove('open');

  // Sembunyikan chatbot toko di halaman Islami (halaman itu punya asisten sendiri)
  const switchAsli = window.switchTab;
  if (typeof switchAsli === 'function') {
    window.switchTab = function (id, el) {
      switchAsli(id, el);
      widget.classList.toggle('ai-hide', id === 'page-islami');
      if (id === 'page-islami') panel.classList.remove('open');
    };
  }

  /* ---------- 2. Asisten Islami (tab Tanya) ---------- */
  const tLog = document.getElementById('isl-aiLog');
  if (tLog) {
    mountChat({
      log: tLog,
      input: document.getElementById('isl-aiInput'),
      btn: document.getElementById('isl-aiSend'),
      mode: 'islami',
      greeting: 'Assalamu\'alaikum. Silakan bertanya seputar Islam. Untuk hukum fikih dan masalah pribadi, saya akan menyarankan bertanya kepada ustaz atau ulama.'
    });
  }

  /* ---------- 3. Deskripsi UID otomatis (panel admin) ---------- */
  const btnDesc = document.getElementById('btn-ai-desc');
  if (btnDesc) {
    btnDesc.addEventListener('click', async () => {
      const nama = document.getElementById('input-nama').value.trim();
      const harga = document.getElementById('input-harga').value.trim();
      const katalog = document.getElementById('input-katalog').value.trim() || 'INDO';
      if (!nama) { alert('Isi nomor UID dulu.'); return; }
      btnDesc.disabled = true;
      const lama = btnDesc.textContent;
      btnDesc.textContent = 'Membuat…';
      try {
        const teks = await tanyaAI('deskripsi', [{ role: 'user', content: 'Buat deskripsi.' }],
          `UID: ${nama}\nHarga: Rp ${harga || '-'}\nKategori: ${katalog}`);
        document.getElementById('input-deskripsi').value = teks.replace(/^["']|["']$/g, '').slice(0, 200);
      } catch (e) { alert(e.message); }
      btnDesc.disabled = false;
      btnDesc.textContent = lama;
    });
  }
})();
