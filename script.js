// ==========================================
// 1. KONFIGURASI & DATABASE
// ==========================================
const nomorWA = "6282148252320"; // ⚠️ Nomor WA Anda
const PASSWORD_ADMIN = "Badali2011";

const produkDefault = [
    { nama: "16656131131", harga: 2000, katalog: "INDO 2K" },
    { nama: "16657777478", harga: 2000, katalog: "INDO 2K" },
    { nama: "16654101111", harga: 3000, katalog: "INDO 3K" },
    { nama: "16815933333", harga: 3000, katalog: "INDO 3K" },
    { nama: "16911456666", harga: 5000, katalog: "INDO 5K" },
    { nama: "17011111841", harga: 5000, katalog: "INDO 5K" }
];

let daftarProduk = JSON.parse(localStorage.getItem('cayaProduk')) || produkDefault;
let isAdminLoggedIn = false;

// ==========================================
// 2. NAVIGASI TAB
// ==========================================
window.switchTab = function(pageId, btnElement) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
}

// ==========================================
// 3. RENDER PRODUK & FILTER
// ==========================================
const productList = document.getElementById('product-list');

function renderProduk() {
    productList.innerHTML = ''; 
    
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    const priceFilter = document.getElementById('price-filter').value;

    let produkTampil = daftarProduk.filter(produk => {
        const matchSearch = produk.nama.toLowerCase().includes(searchQuery);
        let matchPrice = true;
        
        if (priceFilter === '2k') matchPrice = produk.harga === 2000;
        else if (priceFilter === '3k') matchPrice = produk.harga === 3000;
        else if (priceFilter === '5k') matchPrice = produk.harga === 5000;
        else if (priceFilter === '10k') matchPrice = produk.harga >= 10000;

        return matchSearch && matchPrice;
    });

    if (produkTampil.length === 0) {
        productList.innerHTML = `<p style="text-align:center; padding: 20px; color:#888;">UID tidak ditemukan.</p>`;
        return;
    }

    produkTampil.forEach((produk) => {
        const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(produk.harga);
        
        // TOMBOL HAPUS KHUSUS ADMIN
        const tombolHapus = isAdminLoggedIn 
            ? `<button onclick="hapusProdukAdmin('${produk.nama}')" style="background:#FF4D4D; color:white; border:none; padding:8px 10px; border-radius:8px; font-size:0.7rem; cursor:pointer; margin-left:8px; display:flex; align-items:center; gap:5px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Hapus</button>` 
            : '';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-info">
                <span class="katalog-label">${produk.katalog}</span>
                <h3>${produk.nama}</h3>
            </div>
            <div class="card-action">
                <span class="price">${formatHarga}</span>
                <div style="display:flex; align-items:center; justify-content:flex-end;">
                    <button class="btn-buy" onclick="beliLangsungWA('${produk.nama}', ${produk.harga})">Beli</button>
                    ${tombolHapus}
                </div>
            </div>
        `;
        productList.appendChild(card);
    });
}

// ==========================================
// 4. BELI LANGSUNG WHATSAPP
// ==========================================
window.beliLangsungWA = function(namaProduk, hargaProduk) {
    const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(hargaProduk);
    const pesan = `Halo Admin CAYA Store,%0A%0ASaya ingin membeli produk ini:%0A*Nama Produk:* ${namaProduk}%0A*Harga:* ${formatHarga}%0A%0AApakah stoknya masih tersedia?`;
    window.open(`https://wa.me/${nomorWA}?text=${pesan}`, '_blank');
}

// ==========================================
// 5. LOGIKA ADMIN (RAHASIA)
// ==========================================
const btnAdmin = document.getElementById('btn-admin');
const adminPanel = document.getElementById('admin-panel');
const btnSimpan = document.getElementById('btn-simpan');
const btnReset = document.getElementById('btn-reset');
const inputNama = document.getElementById('input-nama');
const inputHarga = document.getElementById('input-harga');
const inputKatalog = document.getElementById('input-katalog');

const logoTrigger = document.getElementById('logo-trigger');
let klikCount = 0;
let klikTimer;

logoTrigger.addEventListener('click', () => {
    klikCount++;
    if (klikCount === 5) {
        btnAdmin.style.display = 'block';
        alert("Mode Admin diaktifkan!");
        klikCount = 0;
        clearTimeout(klikTimer);
    } else {
        clearTimeout(klikTimer);
        klikTimer = setTimeout(() => { klikCount = 0; }, 1500); 
    }
});

btnAdmin.addEventListener('click', () => {
    if (adminPanel.style.display === 'none' || adminPanel.style.display === '') {
        if (!isAdminLoggedIn) {
            const masukanPassword = prompt("Masukkan Password Admin:");
            if (masukanPassword === PASSWORD_ADMIN) {
                isAdminLoggedIn = true;
                alert("Login Berhasil! Sekarang Anda bisa menghapus produk.");
                adminPanel.style.display = 'block';
                renderProduk(); 
            } else if (masukanPassword !== null) {
                alert("Password Salah!");
            }
        } else {
            adminPanel.style.display = 'block';
        }
    } else {
        adminPanel.style.display = 'none';
    }
});

btnSimpan.addEventListener('click', () => {
    const nama = inputNama.value.trim();
    const harga = parseInt(inputHarga.value);
    const katalog = inputKatalog.value.trim() || "Lainnya";

    if (nama && harga) {
        daftarProduk.push({ nama, harga, katalog });
        localStorage.setItem('cayaProduk', JSON.stringify(daftarProduk));
        
        inputNama.value = ''; inputHarga.value = ''; inputKatalog.value = '';
        renderProduk();
        alert('Produk berhasil ditambahkan!');
    } else {
        alert('Mohon isi nama dan harga dengan benar!');
    }
});

btnReset.addEventListener('click', () => {
    if (isAdminLoggedIn && confirm('Yakin ingin menghapus semua produk dan kembali ke awal?')) {
        localStorage.removeItem('cayaProduk');
        daftarProduk = [...produkDefault]; 
        renderProduk();
        alert('Produk telah di-reset.');
    }
});

window.hapusProdukAdmin = function(namaProduk) {
    if (!isAdminLoggedIn) {
        alert("Anda bukan Admin!");
        return;
    }
    if (confirm(`Yakin ingin menghapus produk UID ${namaProduk}?`)) {
        daftarProduk = daftarProduk.filter(produk => produk.nama !== namaProduk);
        localStorage.setItem('cayaProduk', JSON.stringify(daftarProduk));
        renderProduk();
        alert('Produk berhasil dihapus!');
    }
}

// ==========================================
// 6. INISIALISASI
// ==========================================
renderProduk();
