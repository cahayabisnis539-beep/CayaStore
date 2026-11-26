// ==========================================
// 1. KONFIGURASI & DATABASE
// ==========================================
const nomorWA = "6282148252320"; // ⚠️ Nomor WA Anda
// Password tidak disimpan sebagai teks biasa, hanya hash PBKDF2-SHA256 (bukan kata sandinya).
// Untuk mengganti password: hitung ulang hash dengan SALT dan ITERASI yang sama, lalu tempel di HASH_ADMIN.
const SALT_ADMIN = "caya-store-v1";
const ITER_ADMIN = 150000;
const HASH_ADMIN = "2b8f1a07fa253e8eae936efb59c3fae5c862b49bddcf6929b75b028a5da8b9aa";

// --- PBKDF2-SHA256 cadangan (JavaScript murni) untuk halaman http:// yang tidak punya crypto.subtle ---
function pbkdf2Fallback(pw, saltStr, iter) {
    const enc = new TextEncoder();
    const primes = []; for (let n = 2; primes.length < 64; n++) if (primes.every(p => n % p)) primes.push(n);
    const frac = x => ((x - Math.floor(x)) * 4294967296) >>> 0;
    const K = primes.map(p => frac(Math.cbrt(p)));
    const H0 = new Uint32Array(primes.slice(0, 8).map(p => frac(Math.sqrt(p))));
    const w = new Uint32Array(64);
    function compress(st, blk) {
        w.set(blk);
        for (let i = 16; i < 64; i++) {
            const a = w[i - 15], b = w[i - 2];
            const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
            const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }
        let a = st[0], b = st[1], c = st[2], d = st[3], e = st[4], f = st[5], g = st[6], h = st[7];
        for (let i = 0; i < 64; i++) {
            const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
            const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
            const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
            const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
            h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        return new Uint32Array([st[0] + a, st[1] + b, st[2] + c, st[3] + d, st[4] + e, st[5] + f, st[6] + g, st[7] + h]);
    }
    const toBlock = (bytes, totalLen) => { // satu blok 64 byte dengan padding SHA-256
        const buf = new Uint8Array(64); buf.set(bytes); buf[bytes.length] = 0x80;
        const bits = totalLen * 8, dv = new DataView(buf.buffer);
        dv.setUint32(60, bits >>> 0); dv.setUint32(56, Math.floor(bits / 4294967296));
        const out = new Uint32Array(16); for (let i = 0; i < 16; i++) out[i] = dv.getUint32(i * 4);
        return out;
    };
    const wordsToBytes = ws => { const o = new Uint8Array(32), dv = new DataView(o.buffer); ws.forEach((x, i) => dv.setUint32(i * 4, x)); return o; };
    let key = enc.encode(pw);
    const sha = bytes => { // SHA-256 untuk panjang bebas (dipakai bila password > 64 byte)
        const len = bytes.length, total = ((len + 9 + 63) >> 6) << 6, buf = new Uint8Array(total);
        buf.set(bytes); buf[len] = 0x80;
        const dv = new DataView(buf.buffer), bits = len * 8;
        dv.setUint32(total - 4, bits >>> 0); dv.setUint32(total - 8, Math.floor(bits / 4294967296));
        let st = H0;
        for (let o = 0; o < total; o += 64) { const blk = new Uint32Array(16); for (let i = 0; i < 16; i++) blk[i] = dv.getUint32(o + i * 4); st = compress(st, blk); }
        return wordsToBytes(st);
    };
    if (key.length > 64) key = sha(key);
    const ip = new Uint8Array(64).fill(0x36), op = new Uint8Array(64).fill(0x5c);
    key.forEach((x, i) => { ip[i] ^= x; op[i] ^= x; });
    const toWords = b => { const o = new Uint32Array(16), dv = new DataView(b.buffer); for (let i = 0; i < 16; i++) o[i] = dv.getUint32(i * 4); return o; };
    const inner = compress(H0, toWords(ip)), outer = compress(H0, toWords(op));
    const hmac = msg => compress(outer, toBlock(wordsToBytes(compress(inner, toBlock(msg, 64 + msg.length))), 64 + 32));
    const saltBytes = enc.encode(saltStr), first = new Uint8Array(saltBytes.length + 4);
    first.set(saltBytes); first[first.length - 1] = 1;
    let u = hmac(first); const t = Uint32Array.from(u);
    for (let n = 1; n < iter; n++) {
        const inW = compress(inner, (() => { const blk = new Uint32Array(16); blk.set(u); blk[8] = 0x80000000; blk[15] = (64 + 32) * 8; return blk; })());
        const outW = (() => { const blk = new Uint32Array(16); blk.set(inW); blk[8] = 0x80000000; blk[15] = (64 + 32) * 8; return compress(outer, blk); })();
        u = outW; for (let i = 0; i < 8; i++) t[i] ^= u[i];
    }
    return Array.from(wordsToBytes(t)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(pw) {
    if (window.crypto && crypto.subtle) {
        try {
            const enc = new TextEncoder();
            const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
            const bits = await crypto.subtle.deriveBits(
                { name: 'PBKDF2', salt: enc.encode(SALT_ADMIN), iterations: ITER_ADMIN, hash: 'SHA-256' },
                key, 256
            );
            return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) { /* lanjut ke cadangan */ }
    }
    return pbkdf2Fallback(pw, SALT_ADMIN, ITER_ADMIN);
}

const produkDefault = [
    { nama: "16656131131", harga: 2000, katalog: "INDO 2K" },
    { nama: "16657777478", harga: 2000, katalog: "INDO 2K" },
    { nama: "16654101111", harga: 3000, katalog: "INDO 3K" },
    { nama: "16815933333", harga: 3000, katalog: "INDO 3K" }
];

let daftarProduk = (() => { try { const saved = JSON.parse(localStorage.getItem('cayaProduk')); return Array.isArray(saved) ? saved : produkDefault; } catch { return produkDefault; } })();
let keranjang = (() => { try { const saved = JSON.parse(localStorage.getItem('cayaCart')); return Array.isArray(saved) ? saved : []; } catch { return []; } })();
let isAdminLoggedIn = false;
function simpanProduk(){ localStorage.setItem('cayaProduk', JSON.stringify(daftarProduk)); }
function simpanKeranjang(){ localStorage.setItem('cayaCart', JSON.stringify(keranjang)); updateCartCount(); }
function formatRupiah(n){ return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0); }
function updateCartCount(){ const el=document.getElementById('cart-count'); if(el) el.textContent=keranjang.reduce((a,b)=>a+(b.qty||1),0); }
function isiFilterKategori(){ const el=document.getElementById('category-filter'); if(!el)return; const selected=el.value; const cats=[...new Set(daftarProduk.map(p=>p.katalog||'Umum'))].sort(); el.innerHTML='<option value="all">Semua Kategori</option>'+cats.map(c=>`<option value="${escHtml(c)}">${escHtml(c)}</option>`).join(''); if(cats.includes(selected))el.value=selected; }

// ==========================================
// 2. INISIALISASI LIBRARY (GSAP, LENIS, LUCIDE, 3D)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // A. Lucide Icons
    lucide.createIcons();

    // B. Lenis Smooth Scroll
    const lenis = new Lenis({ duration: 1.2, smooth: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    // C. GSAP Animasi Teks Hero
    gsap.from(".gsap-title", { y: 50, opacity: 0, duration: 1, delay: 0.2 });
    gsap.from(".gsap-text", { y: 30, opacity: 0, duration: 1, delay: 0.5 });

    // D. Three.js Logo 3D Berputar
    initThreeJS();
});

// ==========================================
// 3. THREE.JS LOGO
// ==========================================
function initThreeJS() {
    const canvas = document.getElementById('logo-3d');
    if(!canvas) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(40, 40);

    const geometry = new THREE.IcosahedronGeometry(1.5, 0);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x7c5cff, // Ungu neon
        wireframe: true, 
        transparent: true,
        opacity: 0.8
    });
    const crystal = new THREE.Mesh(geometry, material);
    scene.add(crystal);
    
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    camera.position.z = 3;

    function animate3D() {
        requestAnimationFrame(animate3D);
        crystal.rotation.x += 0.01;
        crystal.rotation.y += 0.015;
        renderer.render(scene, camera);
    }
    animate3D();
}

// ==========================================
// 4. NAVIGASI TAB
// ==========================================
window.switchTab = function(pageId, btnElement) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
}

// ==========================================
// 5. RENDER PRODUK (SWIPER)
// ==========================================
const productList = document.getElementById('product-list');

function escHtml(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderProduk() {
    if (!productList) return;
    isiFilterKategori();
    const searchQuery = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    const category = document.getElementById('category-filter')?.value || 'all';
    const price = document.getElementById('price-filter')?.value || 'all';
    const produkTampil = daftarProduk.map((produk, index) => ({...produk, _index:index})).filter(produk => {
        const matchesSearch = String(produk.nama || '').toLowerCase().includes(searchQuery) || String(produk.katalog || '').toLowerCase().includes(searchQuery);
        const matchesCategory = category === 'all' || (produk.katalog || 'Umum') === category;
        const matchesPrice = price === 'all' || (price === '2k' && Number(produk.harga) <= 2000) || (price === '3k' && Number(produk.harga) > 2000 && Number(produk.harga) <= 3000) || (price === '5k' && Number(produk.harga) > 3000 && Number(produk.harga) <= 5000);
        return matchesSearch && matchesCategory && matchesPrice;
    });
    productList.innerHTML = '';
    if (!produkTampil.length) { productList.innerHTML='<p class="uid-empty">Produk tidak ditemukan. Coba kata kunci atau filter lain.</p>'; return; }
    produkTampil.forEach(produk => {
        const hargaAngka = new Intl.NumberFormat('id-ID').format(Number(produk.harga)||0);
        const kategori = String(produk.katalog || 'Umum');
        const bagianKategori = kategori.split(' ');
        const labelKategori = bagianKategori[0] || 'UID';
        const badgeHarga = bagianKategori.slice(1).join(' ') || `${Math.round((Number(produk.harga)||0)/1000)}K`;
        const slide=document.createElement('article'); slide.className='uid-item';
        slide.innerHTML=`<div class="card-pidz motion-card">
            <div class="card-top"><span class="badge-kategori">${escHtml(labelKategori)}</span><span class="badge-harga">${escHtml(badgeHarga)}</span></div>
            <div class="uid-box"><span class="uid-label">NOMOR UID</span><h3 class="uid-number">${escHtml(produk.nama)}</h3></div>
            <div class="price-box"><span class="price-label">Harga</span><span class="price-value">${formatRupiah(produk.harga)}</span></div>
            ${produk.deskripsi ? `<p class="uid-desc">${escHtml(produk.deskripsi)}</p>` : ''}
            <div class="card-bottom"><button class="btn-buy-pidz" onclick="beliLangsungWA(${produk._index})">BELI SEKARANG</button><button class="btn-cart-add" onclick="tambahKeranjang(${produk._index})">+ Keranjang</button>
            ${isAdminLoggedIn ? `<button class="btn-cart-add" onclick="hapusProdukAdmin(${produk._index})">Hapus produk</button>` : ''}</div>
        </div>`;
        productList.appendChild(slide);
    });
    if(window.lucide) lucide.createIcons();
}

window.tambahKeranjang = function(index){
    const p=daftarProduk[index]; if(!p)return;
    const item=keranjang.find(x=>x.nama===p.nama);
    if(item)item.qty=(item.qty||1)+1; else keranjang.push({nama:p.nama,harga:Number(p.harga),katalog:p.katalog||'Umum',qty:1});
    simpanKeranjang();
    if(window.Swal) Swal.fire({toast:true,position:'top',icon:'success',title:'Ditambahkan ke keranjang',showConfirmButton:false,timer:1300});
};

window.beliLangsungWA = function(index) {
    const p=typeof index==='number'?daftarProduk[index]:daftarProduk.find(x=>x.nama===index);
    if(!p)return;
    Swal.fire({title:'Konfirmasi Pembelian',html:`UID <b>${escHtml(p.nama)}</b><br>Harga <b>${formatRupiah(p.harga)}</b>`,icon:'question',showCancelButton:true,confirmButtonText:'Lanjut WhatsApp',cancelButtonText:'Batal',confirmButtonColor:'#20b981'}).then(r=>{
        if(r.isConfirmed){const pesan=`Halo Admin CAYA Store, saya ingin membeli UID berikut:\nUID: ${p.nama}\nKategori: ${p.katalog||'Umum'}\nHarga: ${formatRupiah(p.harga)}`;window.open(`https://wa.me/${nomorWA}?text=${encodeURIComponent(pesan)}`,'_blank','noopener');}
    });
};

function bukaKeranjang(){
    if(!keranjang.length){Swal.fire('Keranjang kosong','Tambahkan produk dari katalog terlebih dahulu.','info');return;}
    const total=keranjang.reduce((a,p)=>a+(Number(p.harga)||0)*(p.qty||1),0);
    const daftar=keranjang.map((p,i)=>`<div style="display:flex;justify-content:space-between;gap:12px;text-align:left;padding:9px 0;border-bottom:1px solid #294052"><span><b>${escHtml(p.nama)}</b><br><small>${p.qty} × ${formatRupiah(p.harga)}</small></span><b>${formatRupiah(p.harga*p.qty)}</b><button onclick="hapusDariKeranjang(${i})" style="border:0;background:transparent;color:#ff9eaa">×</button></div>`).join('');
    Swal.fire({title:'Keranjang CAYA',html:`${daftar}<div style="display:flex;justify-content:space-between;margin-top:16px;font-size:1.05rem"><b>Total</b><b style="color:#20e3a2">${formatRupiah(total)}</b></div>`,showCancelButton:true,showDenyButton:true,confirmButtonText:'Checkout WhatsApp',denyButtonText:'Kosongkan',cancelButtonText:'Tutup',confirmButtonColor:'#20b981',denyButtonColor:'#536579'}).then(r=>{
        if(r.isDenied){keranjang=[];simpanKeranjang();Swal.fire('Keranjang dikosongkan','','success');}
        if(r.isConfirmed){const lines=keranjang.map(p=>`• UID ${p.nama} (${p.qty}x) — ${formatRupiah(p.harga*p.qty)}`).join('\n');const msg=`Halo Admin CAYA Store, saya ingin memesan:\n\n${lines}\n\nTotal: ${formatRupiah(total)}`;window.open(`https://wa.me/${nomorWA}?text=${encodeURIComponent(msg)}`,'_blank','noopener');keranjang=[];simpanKeranjang();}
    });
}
window.hapusDariKeranjang=function(i){keranjang.splice(i,1);simpanKeranjang();bukaKeranjang();};
document.getElementById('btn-cart')?.addEventListener('click',bukaKeranjang);

// ==========================================
// 7. LOGIKA ADMIN
// ==========================================
const btnAdmin = document.getElementById('btn-admin');
const adminPanel = document.getElementById('admin-panel');
const logoTrigger = document.getElementById('logo-trigger');
let klikCount = 0;

logoTrigger.addEventListener('click', () => {
    klikCount++;
    if (klikCount === 5) {
        btnAdmin.style.display = 'flex';
        Swal.fire('Mode Admin', 'Tombol pengaturan telah muncul.', 'success');
        klikCount = 0;
    } else {
        setTimeout(() => { klikCount = 0; }, 1500); 
    }
});

btnAdmin.addEventListener('click', () => {
    if (!isAdminLoggedIn) {
        Swal.fire({
            title: 'Masukkan Password',
            input: 'password',
            inputAttributes: { autocapitalize: 'off' },
            showCancelButton: true,
            confirmButtonText: 'Login',
            confirmButtonColor: '#7c5cff'
        }).then(async (result) => {
            if (!result.value) return;
            let cocok = false;
            try { cocok = (await hashPassword(result.value)) === HASH_ADMIN; } catch (e) {}
            if (cocok) {
                isAdminLoggedIn = true;
                Swal.fire('Berhasil!', 'Anda sekarang Admin.', 'success');
                adminPanel.style.display = 'block';
                renderProduk();
            } else {
                Swal.fire('Gagal', 'Password salah!', 'error');
            }
        });
    } else {
        adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none';
    }
});

document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (!isAdminLoggedIn) return;
    Swal.fire({title:'Hapus seluruh katalog?',text:'Tindakan ini menghapus semua produk dari LocalStorage perangkat ini.',icon:'warning',showCancelButton:true,confirmButtonText:'Ya, hapus semua',cancelButtonText:'Batal',confirmButtonColor:'#dc3545'}).then(result=>{
        if(result.isConfirmed){daftarProduk=[];simpanProduk();renderProduk();Swal.fire('Selesai','Semua produk telah dihapus dari perangkat ini.','success');}
    });
});

document.getElementById('btn-simpan').addEventListener('click', () => {
    const nama = document.getElementById('input-nama').value.trim();
    const harga = parseInt(document.getElementById('input-harga').value);
    const katalog = document.getElementById('input-katalog').value.trim() || "INDO";

    if (nama && harga) {
        const deskripsi = (document.getElementById('input-deskripsi')?.value || '').trim().slice(0, 200);
        daftarProduk.push({ nama, harga, katalog, deskripsi });
        simpanProduk();
        document.getElementById('input-nama').value = '';
        const dEl = document.getElementById('input-deskripsi'); if (dEl) dEl.value = '';
        renderProduk();
        Swal.fire('Sukses', 'Produk berhasil ditambahkan!', 'success');
    } else {
        Swal.fire('Error', 'Isi nama dan harga!', 'error');
    }
});

window.hapusProdukAdmin = function(index) {
    if (!isAdminLoggedIn) return;
    const produk = typeof index === 'number' ? daftarProduk[index] : daftarProduk.find(p => p.nama === index);
    if (!produk) return;
    Swal.fire({
        title: 'Hapus Produk?',
        text: `Hapus UID ${produk.nama} dari katalog perangkat ini?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
        if (result.isConfirmed) {
            daftarProduk.splice(daftarProduk.indexOf(produk), 1);
            simpanProduk();
            renderProduk();
            Swal.fire('Terhapus!', 'Produk berhasil dihapus.', 'success');
        }
    });
}

// Backup sederhana: ekspor/impor data katalog sebagai JSON.
document.getElementById('btn-export')?.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({produk:daftarProduk,keranjang},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='caya-backup.json';a.click();URL.revokeObjectURL(url);
});
document.getElementById('input-import')?.addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{const data=JSON.parse(await file.text());const list=Array.isArray(data)?data:data.produk;if(!Array.isArray(list)||!list.every(x=>x&&typeof x.nama==='string'&&Number.isFinite(Number(x.harga))))throw new Error('Format data tidak valid');
        daftarProduk=list.map(x=>({nama:x.nama,harga:Number(x.harga),katalog:String(x.katalog||'Umum'),deskripsi:String(x.deskripsi||'')}));simpanProduk();renderProduk();Swal.fire('Berhasil','Data katalog berhasil diimpor.','success');
    }catch(err){Swal.fire('Gagal','File JSON tidak sesuai format backup CAYA.','error');}e.target.value='';
});

// ==========================================
// 8. INISIALISASI AWAL
// ==========================================
updateCartCount();
renderProduk();