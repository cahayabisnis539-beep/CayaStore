// ==========================================
// 1. KONFIGURASI & DATABASE
// ==========================================
const nomorWA = "6282148252320"; // ⚠️ Nomor WA Anda
// Password tidak disimpan sebagai teks biasa, hanya hash PBKDF2-SHA256 (bukan kata sandinya).
// Untuk mengganti password: hitung ulang hash dengan SALT dan ITERASI yang sama, lalu tempel di HASH_ADMIN.
const SALT_ADMIN = "caya-store-v1";
const ITER_ADMIN = 150000;
const HASH_ADMIN = "2b8f1a07fa253e8eae936efb59c3fae5c862b49bddcf6929b75b028a5da8b9aa";

async function hashPassword(pw) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(SALT_ADMIN), iterations: ITER_ADMIN, hash: 'SHA-256' },
        key, 256
    );
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const produkDefault = [
    { nama: "16656131131", harga: 2000, katalog: "INDO 2K" },
    { nama: "16657777478", harga: 2000, katalog: "INDO 2K" },
    { nama: "16654101111", harga: 3000, katalog: "INDO 3K" },
    { nama: "16815933333", harga: 3000, katalog: "INDO 3K" }
];

let daftarProduk = JSON.parse(localStorage.getItem('cayaProduk')) || produkDefault;
let isAdminLoggedIn = false;

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
        color: 0x0EA5A4, // Teal
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
// 5. RENDER PRODUK (VERTIKAL)
// ==========================================
const productList = document.getElementById('product-list');


function renderProduk() {
    productList.innerHTML = ''; 
    
    const searchQuery = document.getElementById('search-input').value.toLowerCase();

    let produkTampil = daftarProduk.filter(produk => {
        return produk.nama.toLowerCase().includes(searchQuery);
    });

    if (produkTampil.length === 0) {
        productList.innerHTML = `<div class="catalog-item"><p style="text-align:center; padding: 20px;">UID Kosong</p></div>`;
        return;
    }

    produkTampil.forEach((produk) => {
        const hargaAngka = new Intl.NumberFormat('id-ID').format(produk.harga);
        const labelKategori = produk.katalog.split(' ')[0] || "INDO";
        const badgeHarga = produk.katalog.split(' ')[1] || (produk.harga / 1000) + "K";

        const tombolHapus = isAdminLoggedIn 
            ? `<button onclick="hapusProdukAdmin('${produk.nama}')" style="background:#FF4D4D; color:white; border:2px solid #000; padding:8px 10px; border-radius:8px; font-size:0.7rem; margin-top:8px;">Hapus</button>` 
            : '';

        // Slide Swiper
        const slide = document.createElement('div');
        slide.className = 'catalog-item';
        slide.innerHTML = `
            <div class="card-pidz motion-card">
                <div class="card-top">
                    <span class="badge-kategori">${labelKategori}</span>
                    <span class="badge-harga">${badgeHarga}</span>
                </div>
                <div class="uid-box">
                    <span class="uid-label">NOMOR UID</span>
                    <h3 class="uid-number">${produk.nama}</h3>
                </div>
                <div class="price-box">
                    <span class="price-label">Harga</span>
                    <span class="price-value">RP ${hargaAngka}</span>
                </div>
                <div class="card-bottom">
                    <button class="btn-buy-pidz" onclick="beliLangsungWA('${produk.nama}', ${produk.harga})">BELI</button>
                    ${tombolHapus}
                </div>
            </div>
        `;
        productList.appendChild(slide);
    });


}

// ==========================================
// 6. BELI LANGSUNG WHATSAPP (SWEETALERT)
// ==========================================
window.beliLangsungWA = function(namaProduk, hargaProduk) {
    Swal.fire({
        title: 'Konfirmasi Pembelian',
        text: `Beli UID ${namaProduk} seharga Rp ${hargaProduk}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0EA5A4',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Beli!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(hargaProduk);
            const pesan = `Halo Admin CAYA Store,%0A%0ASaya ingin membeli UID ini:%0A*Nama:* ${namaProduk}%0A*Harga:* ${formatHarga}`;
            window.open(`https://wa.me/${nomorWA}?text=${pesan}`, '_blank');
            Swal.fire('Berhasil!', 'Anda sedang diarahkan ke WhatsApp.', 'success');
        }
    });
}

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
            confirmButtonColor: '#0EA5A4'
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

document.getElementById('btn-simpan').addEventListener('click', () => {
    const nama = document.getElementById('input-nama').value.trim();
    const harga = parseInt(document.getElementById('input-harga').value);
    const katalog = document.getElementById('input-katalog').value.trim() || "INDO";

    if (nama && harga) {
        daftarProduk.push({ nama, harga, katalog });
        localStorage.setItem('cayaProduk', JSON.stringify(daftarProduk));
        document.getElementById('input-nama').value = '';
        renderProduk();
        Swal.fire('Sukses', 'Produk berhasil ditambahkan!', 'success');
    } else {
        Swal.fire('Error', 'Isi nama dan harga!', 'error');
    }
});

window.hapusProdukAdmin = function(namaProduk) {
    if (!isAdminLoggedIn) return;
    Swal.fire({
        title: 'Hapus Produk?',
        text: "Produk akan dihapus permanen!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
        if (result.isConfirmed) {
            daftarProduk = daftarProduk.filter(p => p.nama !== namaProduk);
            localStorage.setItem('cayaProduk', JSON.stringify(daftarProduk));
            renderProduk();
            Swal.fire('Terhapus!', 'Produk berhasil dihapus.', 'success');
        }
    });
}

// ==========================================
// 8. INISIALISASI AWAL
// ==========================================
renderProduk();