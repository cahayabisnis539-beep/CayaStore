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
let keranjang = JSON.parse(localStorage.getItem('cayaKeranjang')) || [];

// ==========================================
// 2. NAVIGASI TAB (BOTTOM NAV)
// ==========================================
window.switchTab = function(pageId, btnElement) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    if (pageId === 'page-checkout') {
        renderHalamanCheckout();
    }
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
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-info">
                <span class="katalog-label">${produk.katalog}</span>
                <h3>${produk.nama}</h3>
            </div>
            <div class="card-action">
                <span class="price">${formatHarga}</span>
                <button class="btn-buy" onclick="tambahKeKeranjang('${produk.nama}', ${produk.harga})">Beli</button>
            </div>
        `;
        productList.appendChild(card);
    });
}

// ==========================================
// 4. LOGIKA KERANJANG
// ==========================================
window.tambahKeKeranjang = function(nama, harga) {
    keranjang.push({ nama, harga });
    localStorage.setItem('cayaKeranjang', JSON.stringify(keranjang));
    updateKeranjangCount();
    alert(`UID ${nama} dimasukkan ke keranjang!`);
}

function updateKeranjangCount() {
    document.getElementById('cart-count-header').innerText = keranjang.length;
}

function renderHalamanCheckout() {
    const cartItemsPage = document.getElementById('cart-items-page');
    const totalHargaPage = document.getElementById('total-harga-page');
    
    cartItemsPage.innerHTML = '';
    let total = 0;

    if (keranjang.length === 0) {
        cartItemsPage.innerHTML = '<p style="text-align:center; color:#888;">Keranjang masih kosong.</p>';
    } else {
        keranjang.forEach((item, index) => {
            total += item.harga;
            const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.harga);
            cartItemsPage.innerHTML += `
                <div class="cart-item">
                    <div>
                        <h4 style="font-family:monospace; font-size:1rem;">${item.nama}</h4>
                        <p style="color:var(--emerald); font-weight:bold; font-size:0.9rem;">${formatHarga}</p>
                    </div>
                    <button class="btn-hapus" onclick="hapusDariKeranjang(${index})">Hapus</button>
                </div>
            `;
        });
    }
    totalHargaPage.innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(total);
}

window.hapusDariKeranjang = function(index) {
    keranjang.splice(index, 1);
    localStorage.setItem('cayaKeranjang', JSON.stringify(keranjang));
    updateKeranjangCount();
    renderHalamanCheckout();
}

window.bukaKeranjang = function() {
    const checkoutBtn = document.querySelectorAll('.nav-item')[1];
    switchTab('page-checkout', checkoutBtn);
}

window.checkoutWA = function() {
    if (keranjang.length === 0) {
        alert("Keranjang masih kosong!");
        return;
    }
    
    let pesan = "Halo Admin CAYA Store,%0A%0ASaya ingin membeli UID berikut:%0A";
    let total = 0;
    
    keranjang.forEach(item => {
        const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.harga);
        pesan += `- ${item.nama} (${formatHarga})%0A`;
        total += item.harga;
    });
    
    const formatTotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(total);
    pesan += `%0A*Total: ${formatTotal}*%0A%0AApakah stoknya masih tersedia?`;
    
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

let isAdminLoggedIn = false;
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
                alert("Login Berhasil!");
                adminPanel.style.display = 'block';
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

// ==========================================
// 6. INISIALISASI
// ==========================================
renderProduk();
updateKeranjangCount();
