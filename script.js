// ==========================================
// 1. DATABASE PRODUK & LOCAL STORAGE
// ==========================================
const produkDefault = [
    { nama: "ID RAPI 7 SAME", harga: 5000 },
    { nama: "ID UNIK MIROR", harga: 3000 },
    { nama: "AKUN FF POLOS 2JT", harga: 30000 }
];

let daftarProduk = JSON.parse(localStorage.getItem('cayaProduk')) || produkDefault;
const nomorWA = "62895384341845"; // ⚠️ GANTI DENGAN NOMOR WA ANDA (Awali 62)
const productList = document.getElementById('product-list');

// ==========================================
// 2. RENDER PRODUK KE HTML
// ==========================================
function renderProduk() {
    productList.innerHTML = ''; 
    daftarProduk.forEach((produk) => {
        const formatHarga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(produk.harga);
        const card = document.createElement('div');
        card.className = 'card tilt-effect';
        card.innerHTML = `
            <div class="card-inner">
                <h3>${produk.nama}</h3>
                <p class="price">${formatHarga}</p>
                <button class="btn-buy" data-product="${produk.nama}" data-price="${produk.harga}">Beli via WA</button>
            </div>
        `;
        productList.appendChild(card);
    });
    initCardInteractions();
}

// ==========================================
// 3. LOGIKA PANEL ADMIN (DENGAN PASSWORD)
// ==========================================
const btnAdmin = document.getElementById('btn-admin');
const adminPanel = document.getElementById('admin-panel');
const btnSimpan = document.getElementById('btn-simpan');
const btnReset = document.getElementById('btn-reset');
const inputNama = document.getElementById('input-nama');
const inputHarga = document.getElementById('input-harga');

const PASSWORD_ADMIN = "Badali2011"; 
let isAdminLoggedIn = false;

btnAdmin.addEventListener('click', () => {
    if (adminPanel.style.display === 'none' || adminPanel.style.display === '') {
        if (!isAdminLoggedIn) {
            const masukanPassword = prompt("Masukkan Password Admin:");
            if (masukanPassword === PASSWORD_ADMIN) {
                isAdminLoggedIn = true;
                alert("Login Berhasil! Selamat datang Admin.");
                adminPanel.style.display = 'block';
            } else if (masukanPassword !== null) {
                alert("Password Salah! Akses Ditolak.");
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

    if (nama && harga) {
        daftarProduk.push({ nama: nama, harga: harga });
        localStorage.setItem('cayaProduk', JSON.stringify(daftarProduk));
        inputNama.value = ''; inputHarga.value = '';
        renderProduk();
        playClickSound();
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
        playClickSound();
        alert('Semua produk telah di-reset.');
    }
});

// ==========================================
// 4. INTERAKSI CARD, WHATSAPP & SUARA
// ==========================================
function initCardInteractions() {
    const cards = document.querySelectorAll('.tilt-effect');
    const tombolBeli = document.querySelectorAll('.btn-buy');

    // Efek Tilt 3D pada Card
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -15;
            const rotateY = ((x - centerX) / centerX) * 15;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });

    // Tombol WhatsApp & Suara Klik
    tombolBeli.forEach(tombol => {
        tombol.addEventListener('mousedown', playClickSound);
        tombol.addEventListener('click', function() {
            const namaProduk = this.getAttribute('data-product');
            const hargaProduk = this.getAttribute('data-price');
            const pesan = `Halo Admin CAYA Store,%0A%0ASaya ingin membeli produk ini:%0A*Nama Produk:* ${namaProduk}%0A*Harga:* Rp ${hargaProduk}%0A%0AApakah stoknya masih tersedia?`;
            window.open(`https://wa.me/${nomorWA}?text=${pesan}`, '_blank');
        });
    });
}

// Web Audio API (Suara Klik Premium)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
function playClickSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); 
    oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}

// ==========================================
// 5. THREE.JS BACKGROUND & SMOOTH SCROLL
// ==========================================
const lenis = new Lenis({ duration: 1.2, smooth: true });
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);

const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const geometry = new THREE.IcosahedronGeometry(2, 0);
const material = new THREE.MeshStandardMaterial({ color: 0x00C853, emissive: 0x063D25, wireframe: true, transparent: true, opacity: 0.3 });
const crystal = new THREE.Mesh(geometry, material);
scene.add(crystal);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const pointLight = new THREE.PointLight(0x39FF14, 2, 100); 
pointLight.position.set(5, 5, 5); scene.add(pointLight);
camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);
    crystal.rotation.x += 0.002; crystal.rotation.y += 0.003;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Mulai Render Pertama Kali
renderProduk();
