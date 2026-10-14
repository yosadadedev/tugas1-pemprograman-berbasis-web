/**
 * script.js — Logika aplikasi SITTA
 * -----------------------------------------------------------------------------
 * File ini dipakai oleh semua halaman. Halaman yang sedang dibuka dikenali dari
 * atribut <body data-page="login | dashboard | tracking | stok">.
 *
 * Data berasal dari js/data.js: dataPengguna, dataBahanAjar, dataTracking.
 *
 * Isi file:
 *   1. Konstanta & helper umum
 *   2. Penyimpanan & sesi login
 *   3. Komponen UI: notifikasi, modal konfirmasi, validasi form
 *   4. Layout: menu samping, header, breadcrumb
 *   5. Helper data: bahan ajar & delivery order
 *   6. Halaman Login
 *   7. Halaman Dashboard (beranda, laporan, histori)
 *   8. Halaman Tracking
 *   9. Halaman Stok
 *  10. Inisialisasi
 */

/* =============================================================================
 * 1. KONSTANTA & HELPER UMUM
 * ========================================================================== */

const STORAGE_KEY = {
  session: 'sitta-session',
  users: 'sitta-users',
  bahanAjar: 'sitta-bahan-ajar'
};

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

/** Ikon Bootstrap Icons, contoh: icon('book') -> <i class="bi bi-book"></i> */
function icon(name, extraClass = '') {
  return `<i class="bi bi-${name} ${extraClass}" aria-hidden="true"></i>`;
}

/** Mencegah teks dari pengguna terbaca sebagai HTML. */
function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatNumber(number) {
  return number.toLocaleString('id-ID');
}

function formatRupiah(number) {
  return 'Rp ' + formatNumber(number);
}

/** "Rp 180.000" -> 180000 */
function parseRupiah(text) {
  return Number(String(text).replace(/\D/g, ''));
}

function sumBy(list, getValue) {
  return list.reduce((total, item) => total + getValue(item), 0);
}

/** "2025-08-25" -> "25 Agustus 2025" */
function formatDate(text) {
  const [year, month, day] = text.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** "2025-08-25 10:12:20" -> "25 Agustus 2025, 10:12" */
function formatDateTime(text) {
  const [date, time] = text.split(' ');
  return `${formatDate(date)}, ${time.slice(0, 5)}`;
}

/** Date -> "Rabu, 14 Oktober 2026" */
function formatToday(date) {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Date -> "08:32" atau "08:32:17" */
function formatClock(date, withSeconds = false) {
  const parts = [date.getHours(), date.getMinutes()];
  if (withSeconds) parts.push(date.getSeconds());
  return parts.map(n => String(n).padStart(2, '0')).join(':');
}

/** "Rina Wulandari" -> "RW" */
function getInitials(name) {
  return name.split(' ').slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

/* =============================================================================
 * 2. PENYIMPANAN & SESI LOGIN
 * ========================================================================== */

function loadFromStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSession() {
  const saved = sessionStorage.getItem(STORAGE_KEY.session) || localStorage.getItem(STORAGE_KEY.session);
  return saved ? JSON.parse(saved) : null;
}

/** "Ingat saya" dicentang -> localStorage (tetap login), jika tidak -> sessionStorage. */
function saveSession(user, remember) {
  const { password, ...session } = user; // password tidak ikut disimpan
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(STORAGE_KEY.session, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY.session);
  sessionStorage.removeItem(STORAGE_KEY.session);
}

// --- Dijalankan langsung (sebelum halaman tampil) ---------------------------

// Gabungkan data yang ditambahkan pengguna (akun baru & bahan ajar baru).
loadFromStorage(STORAGE_KEY.users, []).forEach(user => dataPengguna.push(user));
loadFromStorage(STORAGE_KEY.bahanAjar, []).forEach(item => dataBahanAjar.push(item));

// Proteksi halaman: belum login -> ke halaman login, sudah login -> ke dashboard.
const isLoginPage = /^(index|login)?(\.html)?$/.test(location.pathname.split('/').pop());
const mustRedirect = isLoginPage ? getSession() !== null : getSession() === null;
if (mustRedirect) {
  location.replace(isLoginPage ? 'dashboard.html' : 'index.html');
}

/* =============================================================================
 * 3. KOMPONEN UI: NOTIFIKASI, MODAL KONFIRMASI, VALIDASI FORM
 * ========================================================================== */

/** Notifikasi kecil di atas layar, contoh: showMessage('success', 'Data tersimpan') */
function showMessage(type, text) {
  let container = $('.message-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'message-container';
    container.setAttribute('role', 'status');
    document.body.append(container);
  }

  const icons = {
    success: 'check-circle-fill',
    error: 'x-circle-fill',
    warning: 'exclamation-circle-fill',
    info: 'info-circle-fill'
  };
  const message = document.createElement('div');
  message.className = `message message-${type}`;
  message.innerHTML = `${icon(icons[type])}<span>${escapeHtml(text)}</span>`;
  container.append(message);

  setTimeout(() => message.remove(), 3000);
}

/**
 * Pop-up konfirmasi / peringatan. Mengembalikan Promise berisi true jika
 * tombol OK ditekan, false jika dibatalkan.
 */
function showConfirm({ type = 'warning', title, text, okText = 'OK', showCancel = true, danger = false }) {
  const icons = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'exclamation-circle',
    info: 'info-circle'
  };

  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'modal modal-sm';
    dialog.innerHTML = `
      <div class="confirm">
        <span class="confirm-icon is-${type}">${icon(icons[type])}</span>
        <div>
          <h2 class="confirm-title">${escapeHtml(title)}</h2>
          <p class="confirm-text">${escapeHtml(text)}</p>
        </div>
      </div>
      <div class="confirm-footer">
        ${showCancel ? '<button type="button" class="btn" data-answer="no">Batal</button>' : ''}
        <button type="button" class="btn btn-primary ${danger ? 'btn-danger' : ''}" data-answer="yes" autofocus>${escapeHtml(okText)}</button>
      </div>`;
    document.body.append(dialog);

    dialog.addEventListener('click', event => {
      const button = event.target.closest('[data-answer]');
      if (button) dialog.close(button.dataset.answer);
    });
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(dialog.returnValue === 'yes');
    });

    dialog.showModal();
  });
}

/*
 * Validasi form
 * Aturan dibaca dari atribut HTML pada input:
 *   required, type="email", minlength, pattern (+ data-pattern-msg),
 *   min, max, data-match (konfirmasi password), data-label (nama field).
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function getErrorMessage(field) {
  const label = field.dataset.label;
  const value = field.value.trim();

  if (field.type === 'checkbox') {
    return field.required && !field.checked ? field.dataset.requiredMsg : '';
  }
  if (field.required && value === '') {
    return field.tagName === 'SELECT' ? `Silakan pilih ${label.toLowerCase()}` : `${label} wajib diisi`;
  }
  if (value === '') return '';

  if (field.type === 'email' && !EMAIL_PATTERN.test(value)) {
    return 'Format email tidak valid (contoh: nama@ut.ac.id)';
  }
  if (field.minLength > 0 && value.length < field.minLength) {
    return `${label} minimal ${field.minLength} karakter`;
  }
  if (field.pattern && !new RegExp(`^(?:${field.pattern})$`).test(value)) {
    return field.dataset.patternMsg;
  }
  if (field.type === 'number') {
    const number = Number(value);
    if (!Number.isInteger(number)) return `${label} harus berupa bilangan bulat`;
    if (field.min && number < Number(field.min)) return `${label} minimal ${field.min}`;
    if (field.max && number > Number(field.max)) return `${label} maksimal ${formatNumber(Number(field.max))}`;
  }
  if (field.dataset.match && field.value !== $('#' + field.dataset.match).value) {
    return `${label} tidak sama dengan password`;
  }
  return '';
}

/** Menampilkan (atau menghapus jika message kosong) pesan error di bawah field. */
function setFieldError(field, message) {
  const formItem = field.closest('.form-item');
  let errorText = $('.form-explain', formItem);

  if (!errorText) {
    errorText = document.createElement('div');
    errorText.className = 'form-explain';
    errorText.id = field.id + '-error';
    (field.closest('.input-affix, .checkbox') || field).after(errorText);
  }

  errorText.textContent = message;
  formItem.classList.toggle('has-error', message !== '');
  field.setAttribute('aria-invalid', message !== '');
  field.setAttribute('aria-describedby', errorText.id);
}

function validateField(field) {
  // Field di luar .form-item (cth. checkbox "Ingat saya") tidak perlu divalidasi.
  if (!field.closest('.form-item')) return true;

  const message = getErrorMessage(field);
  setFieldError(field, message);
  return message === '';
}

/** Validasi semua field. Fokus dipindah ke field pertama yang salah. */
function validateForm(form) {
  form.dataset.submitted = 'true';
  const invalidFields = $$('[name]', form).filter(field => !validateField(field));
  if (invalidFields.length > 0) invalidFields[0].focus();
  return invalidFields.length === 0;
}

/**
 * Setelah form pernah disubmit, field dicek ulang setiap kali pengguna mengetik,
 * sehingga pesan error langsung hilang begitu isinya sudah benar.
 */
function enableLiveValidation(form) {
  form.addEventListener('input', event => {
    const field = event.target;
    if (!form.dataset.submitted || !field.name) return;
    validateField(field);

    // Password berubah -> cek ulang kolom konfirmasinya.
    const confirmField = $(`[data-match="${field.id}"]`, form);
    if (confirmField) validateField(confirmField);
  });
}

function clearFormErrors(form) {
  delete form.dataset.submitted;
  $$('.has-error', form).forEach(item => item.classList.remove('has-error'));
  $$('[aria-invalid]', form).forEach(field => field.removeAttribute('aria-invalid'));
}

function resetForm(form) {
  form.reset();
  clearFormErrors(form);
}

/* =============================================================================
 * 4. LAYOUT: MENU SAMPING, HEADER, BREADCRUMB
 * ========================================================================== */

const MENU = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-1x2', href: 'dashboard.html' },
  { key: 'stok', label: 'Informasi Bahan Ajar', icon: 'book', href: 'stok.html' },
  { key: 'tracking', label: 'Tracking Pengiriman', icon: 'truck', href: 'tracking.html' },
  {
    key: 'laporan',
    label: 'Laporan',
    icon: 'file-earmark-text',
    children: [
      { key: 'monitoring', label: 'Monitoring Progress DO', href: 'dashboard.html#monitoring' },
      { key: 'rekap', label: 'Rekap Bahan Ajar', href: 'dashboard.html#rekap' }
    ]
  },
  { key: 'histori', label: 'Histori Transaksi', icon: 'clock-history', href: 'dashboard.html#histori' }
];

/** Menu yang sedang aktif: nama halaman, atau #hash di dashboard (cth. #rekap). */
function getActiveMenu() {
  const page = document.body.dataset.page;
  const hash = location.hash.slice(1);
  if (page === 'dashboard' && ['monitoring', 'rekap', 'histori'].includes(hash)) {
    return hash;
  }
  return page;
}

function renderSider() {
  const activeKey = getActiveMenu();

  const menuLink = item => `
    <li>
      <a class="menu-item ${item.key === activeKey ? 'is-active' : ''}" href="${item.href}"
         ${item.key === activeKey ? 'aria-current="page"' : ''} title="${item.label}">
        ${item.icon ? icon(item.icon) : ''}
        <span class="menu-label">${item.label}</span>
      </a>
    </li>`;

  const subMenu = item => {
    const isOpen = item.children.some(child => child.key === activeKey);
    return `
      <li class="submenu ${isOpen ? 'is-open' : ''}">
        <button type="button" class="menu-item" data-action="toggle-submenu" aria-expanded="${isOpen}" title="${item.label}">
          ${icon(item.icon)}
          <span class="menu-label">${item.label}</span>
          ${icon('chevron-down', 'menu-arrow')}
        </button>
        <div class="submenu-list"><ul>${item.children.map(menuLink).join('')}</ul></div>
      </li>`;
  };

  $('#appSider').innerHTML = `
    <a class="sider-brand" href="dashboard.html">
      <span class="brand-logo">${icon('book-half')}</span>
      <span class="brand-text">
        <span class="brand-name">SITTA</span>
        <span class="brand-tagline">Universitas Terbuka</span>
      </span>
    </a>
    <nav class="sider-menu" aria-label="Menu aplikasi">
      <p class="menu-group-title">Menu</p>
      <ul>${MENU.map(item => (item.children ? subMenu(item) : menuLink(item))).join('')}</ul>
    </nav>
    <div class="sider-footer"><span class="sider-footer-text">SITTA v1.0 · Front-End Only</span></div>`;
}

function renderHeader() {
  const user = getSession();
  const initials = getInitials(user.nama);

  $('#appHeader').innerHTML = `
    <div class="header-left">
      <button type="button" class="btn btn-text btn-icon btn-lg header-menu-btn" data-action="open-sider" aria-label="Buka menu">${icon('list')}</button>
      <span class="header-clock">${icon('clock')}<span id="headerClock"></span></span>
    </div>
    <div class="header-right">
      <div class="dropdown">
        <button type="button" class="header-user" data-action="toggle-dropdown" aria-haspopup="menu" aria-expanded="false">
          <span class="avatar">${initials}</span>
          <span class="header-user-text"><strong>${escapeHtml(user.nama)}</strong><small>${escapeHtml(user.role)}</small></span>
          ${icon('chevron-down', 'text-muted')}
        </button>
        <div class="dropdown-menu" role="menu">
          <div class="dropdown-profile">
            <span class="avatar avatar-lg">${initials}</span>
            <div>
              <div class="name">${escapeHtml(user.nama)}</div>
              <div class="meta">${escapeHtml(user.email)}</div>
              <div class="meta">${escapeHtml(user.role)} · ${escapeHtml(user.lokasi)}</div>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <button type="button" class="dropdown-item is-danger" role="menuitem" data-action="logout">${icon('box-arrow-right')} Keluar</button>
        </div>
      </div>
    </div>`;

  const updateClock = () => {
    const now = new Date();
    $('#headerClock').textContent = `${formatToday(now)} · ${formatClock(now)}`;
  };
  updateClock();
  setInterval(updateClock, 1000);
}

/** trail: [{ label: 'Laporan' }, { label: 'Rekap Bahan Ajar' }] — "Beranda" selalu di depan. */
function renderBreadcrumb(trail) {
  const items = [{ label: 'Beranda', href: 'dashboard.html' }, ...trail];

  $('#breadcrumb').innerHTML = items.map((item, index) => {
    const isLast = index === items.length - 1;
    const content = (index === 0 ? icon('house') + ' ' : '') + item.label;
    if (isLast) return `<li><span aria-current="page">${content}</span></li>`;
    return `<li>${item.href ? `<a href="${item.href}">${content}</a>` : `<span>${content}</span>`}</li>`;
  }).join('');
}

function closeDropdown() {
  $$('.dropdown.is-open').forEach(dropdown => {
    dropdown.classList.remove('is-open');
    $('[aria-expanded]', dropdown).setAttribute('aria-expanded', 'false');
  });
}

async function logout() {
  const confirmed = await showConfirm({
    title: 'Keluar dari SITTA?',
    text: 'Sesi Anda akan diakhiri dan Anda perlu login kembali.',
    okText: 'Keluar',
    danger: true
  });
  if (!confirmed) return;
  clearSession();
  location.replace('index.html');
}

/** Aksi untuk tombol yang memiliki atribut data-action="...". */
const ACTIONS = {
  'logout': logout,

  // Menu samping versi mobile (layar <= 992px) tampil sebagai laci.
  'open-sider': () => document.body.classList.add('is-sider-open'),
  'close-sider': () => document.body.classList.remove('is-sider-open'),

  'toggle-submenu': button => {
    const isOpen = button.parentElement.classList.toggle('is-open');
    button.setAttribute('aria-expanded', isOpen);
  },

  'toggle-dropdown': button => {
    const dropdown = button.closest('.dropdown');
    const willOpen = !dropdown.classList.contains('is-open');
    dropdown.classList.toggle('is-open', willOpen);
    button.setAttribute('aria-expanded', willOpen);
  },

  'toggle-password': button => {
    const input = $('input', button.closest('.input-affix'));
    const willShow = input.type === 'password';
    input.type = willShow ? 'text' : 'password';
    $('i', button).className = `bi bi-${willShow ? 'eye' : 'eye-slash'}`;
    button.setAttribute('aria-label', willShow ? 'Sembunyikan password' : 'Tampilkan password');
  }
};

/** Satu event listener untuk semua klik: aksi tombol, buka/tutup modal & dropdown. */
function bindGlobalEvents() {
  document.addEventListener('click', event => {
    const target = event.target;

    if (!target.closest('.dropdown')) closeDropdown();

    const actionButton = target.closest('[data-action]');
    if (actionButton && ACTIONS[actionButton.dataset.action]) {
      ACTIONS[actionButton.dataset.action](actionButton);
    }

    const modalOpener = target.closest('[data-modal-open]');
    if (modalOpener) document.getElementById(modalOpener.dataset.modalOpen).showModal();

    const modalCloser = target.closest('[data-modal-close]');
    if (modalCloser) modalCloser.closest('dialog').close();

    // Klik di area gelap di luar modal -> tutup modal.
    if (target.tagName === 'DIALOG') target.close();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeDropdown();
      document.body.classList.remove('is-sider-open');
    }
  });
}

/* =============================================================================
 * 5. HELPER DATA: BAHAN AJAR & DELIVERY ORDER
 * ========================================================================== */

const STOCK_LEVELS = [
  { key: 'aman', label: 'Aman', min: 300, color: 'success' },
  { key: 'cukup', label: 'Cukup', min: 200, color: 'processing' },
  { key: 'menipis', label: 'Menipis', min: 0, color: 'warning' }
];

function getStockStatus(stok) {
  return STOCK_LEVELS.find(level => stok >= level.min);
}

/** Kode unik bahan ajar: kode barang + kode lokasi. */
function getItemKey(item) {
  return `${item.kodeBarang}-${item.kodeLokasi}`;
}

function coverImage(item, className = '') {
  if (!item.cover) {
    return `<span class="${className} thumb-fallback">${icon('book')}</span>`;
  }
  return `<img class="${className}" src="${escapeHtml(item.cover)}" alt="Sampul ${escapeHtml(item.namaBarang)}" loading="lazy">`;
}

/** Tahapan pengiriman. "keyword" dicocokkan dengan keterangan riwayat perjalanan. */
const DELIVERY_STEPS = [
  { title: 'Diproses', desc: 'DO dibuat', icon: 'file-earmark-text' },
  { title: 'Diserahkan', desc: 'Diterima loket ekspedisi', icon: 'box-seam', keyword: /penerimaan di loket/i },
  { title: 'Dalam Perjalanan', desc: 'Transit antar hub', icon: 'truck', keyword: /tiba di hub|diteruskan/i },
  { title: 'Proses Antar', desc: 'Kurir menuju alamat', icon: 'send', keyword: /proses antar/i },
  { title: 'Diterima', desc: 'Paket sampai tujuan', icon: 'house-check', keyword: /selesai antar/i }
];

function getDeliveryProgress(perjalanan) {
  let step = 0;
  perjalanan.forEach(event => {
    DELIVERY_STEPS.forEach((deliveryStep, index) => {
      if (deliveryStep.keyword && deliveryStep.keyword.test(event.keterangan)) {
        step = Math.max(step, index);
      }
    });
  });

  const lastStep = DELIVERY_STEPS.length - 1;
  return {
    step,
    done: step === lastStep,
    percent: Math.round((step / lastStep) * 100)
  };
}

/** Semua DO dari dataTracking, dilengkapi progress, status, total, dan bahan ajarnya. */
function getDeliveryOrders() {
  return Object.entries(dataTracking)
    .map(([nomorDO, order]) => {
      const progress = getDeliveryProgress(order.perjalanan);
      return {
        ...order,
        nomorDO,
        progress,
        statusLabel: progress.done ? 'Diterima' : order.status,
        statusColor: progress.done ? 'success' : 'processing',
        totalBayar: parseRupiah(order.total),
        bahanAjar: dataBahanAjar.find(item => item.kodeLokasi === order.paket),
        lastEvent: order.perjalanan[order.perjalanan.length - 1]
      };
    })
    .sort((a, b) => b.tanggalKirim.localeCompare(a.tanggalKirim));
}

// --- Potongan HTML yang dipakai di beberapa halaman --------------------------

function statCard({ title, value, unit = '', iconName, color, note = '' }) {
  return `
    <article class="card">
      <div class="statistic">
        <span class="statistic-icon tone-${color}">${icon(iconName)}</span>
        <div>
          <p class="statistic-title">${title}</p>
          <p class="statistic-value">${value}${unit ? `<small>${unit}</small>` : ''}</p>
          ${note ? `<p class="statistic-foot">${note}</p>` : ''}
        </div>
      </div>
    </article>`;
}

function progressBar({ percent, done }) {
  return `
    <div class="progress ${done ? 'is-success' : 'is-active'}" role="progressbar"
         aria-label="Progress pengiriman" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-track"><div class="progress-bar" style="width: ${percent}%"></div></div>
      <span class="progress-text">${done ? icon('check-circle-fill') : percent + '%'}</span>
    </div>`;
}

function emptyState(text, iconName = 'inbox') {
  return `<div class="empty"><div class="empty-icon">${icon(iconName)}</div><p>${text}</p></div>`;
}

/* =============================================================================
 * 6. HALAMAN LOGIN (index.html)
 * ========================================================================== */

function findUserByEmail(email) {
  return dataPengguna.find(user => user.email.toLowerCase() === email.trim().toLowerCase());
}

function initLoginPage() {
  const form = $('#loginForm');
  const emailInput = $('#loginEmail');
  const passwordInput = $('#loginPassword');
  enableLiveValidation(form);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validateForm(form)) return;

    const user = findUserByEmail(emailInput.value);
    if (!user || user.password !== passwordInput.value) {
      await showConfirm({
        type: 'error',
        title: 'Login gagal',
        text: 'Email/password yang anda masukkan salah. Silakan periksa kembali.',
        okText: 'Coba Lagi',
        showCancel: false
      });
      passwordInput.value = '';
      passwordInput.focus();
      return;
    }

    saveSession(user, $('#loginRemember').checked);
    showMessage('success', `Login berhasil. Selamat datang, ${user.nama}!`);
    setTimeout(() => location.replace('dashboard.html'), 800);
  });

  $('#fillDemo').addEventListener('click', () => {
    emailInput.value = 'rina@ut.ac.id';
    passwordInput.value = 'rina123';
    validateField(emailInput);
    validateField(passwordInput);
  });

  initForgotPasswordModal(emailInput);
  initRegisterModal(emailInput, passwordInput);
}

function initForgotPasswordModal(loginEmailInput) {
  const dialog = $('#forgotModal');
  const form = $('#forgotForm');
  const emailInput = $('#forgotEmail');
  enableLiveValidation(form);

  const showStep = step => {
    $$('[data-step]', dialog).forEach(el => { el.hidden = el.dataset.step !== step; });
  };

  // Email yang sudah diketik di form login langsung dipakai.
  $('[data-modal-open="forgotModal"]').addEventListener('click', () => {
    emailInput.value = loginEmailInput.value;
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validateForm(form)) return;

    if (!findUserByEmail(emailInput.value)) {
      setFieldError(emailInput, 'Email tidak terdaftar di SITTA');
      return;
    }
    $('#forgotSentTo').textContent = emailInput.value.trim();
    showStep('done');
  });

  dialog.addEventListener('close', () => {
    resetForm(form);
    showStep('form');
  });
}

function initRegisterModal(loginEmailInput, loginPasswordInput) {
  const dialog = $('#registerModal');
  const form = $('#registerForm');
  enableLiveValidation(form);
  dialog.addEventListener('close', () => resetForm(form));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validateForm(form)) return;

    const data = Object.fromEntries(new FormData(form));
    if (findUserByEmail(data.email)) {
      setFieldError($('#regEmail'), 'Email sudah terdaftar, silakan login');
      return;
    }

    const newUser = {
      id: dataPengguna.length + 1,
      nama: data.nama.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: data.role,
      lokasi: data.lokasi.trim()
    };
    dataPengguna.push(newUser);
    saveToStorage(STORAGE_KEY.users, [...loadFromStorage(STORAGE_KEY.users, []), newUser]);

    dialog.close();
    showMessage('success', 'Pendaftaran berhasil! Silakan login dengan akun baru Anda.');
    loginEmailInput.value = newUser.email;
    loginPasswordInput.focus();
  });
}

/* =============================================================================
 * 7. HALAMAN DASHBOARD (dashboard.html)
 *    Satu halaman dengan 4 tampilan, dipilih lewat #hash pada URL:
 *    dashboard.html, #monitoring, #rekap, #histori
 * ========================================================================== */

const DASHBOARD_VIEWS = {
  dashboard: { title: 'Dashboard', breadcrumb: [], render: renderHome },
  monitoring: {
    title: 'Monitoring Progress DO',
    breadcrumb: [{ label: 'Laporan' }, { label: 'Monitoring Progress DO' }],
    render: renderMonitoring
  },
  rekap: {
    title: 'Rekap Bahan Ajar',
    breadcrumb: [{ label: 'Laporan' }, { label: 'Rekap Bahan Ajar' }],
    render: renderRekap
  },
  histori: {
    title: 'Histori Transaksi',
    breadcrumb: [{ label: 'Histori Transaksi' }],
    render: renderHistori
  }
};

function initDashboardPage() {
  startGreeting();

  $('#historiFilter').addEventListener('submit', event => event.preventDefault());
  $('#historiSearch').addEventListener('input', renderHistori);
  $('#historiStatus').addEventListener('change', renderHistori);

  window.addEventListener('hashchange', showDashboardView);
  showDashboardView();
}

function showDashboardView() {
  const viewKey = getActiveMenu();
  const view = DASHBOARD_VIEWS[viewKey];

  $$('[data-view]').forEach(section => {
    section.hidden = section.dataset.view !== viewKey;
  });
  document.title = `${view.title} · SITTA Universitas Terbuka`;
  renderBreadcrumb(view.breadcrumb);
  renderSider();
  view.render();

  document.body.classList.remove('is-sider-open');
  window.scrollTo(0, 0);
}

// --- Greeting berdasarkan waktu lokal ---------------------------------------

function getGreeting(hour) {
  if (hour >= 4 && hour < 11) {
    return { period: 'pagi', label: 'Pagi', icon: 'sunrise', note: 'Awali hari dengan semangat! Yuk cek stok dan pengiriman terbaru.' };
  }
  if (hour >= 11 && hour < 15) {
    return { period: 'siang', label: 'Siang', icon: 'sun', note: 'Jangan lupa istirahat sejenak di sela pekerjaan.' };
  }
  if (hour >= 15 && hour < 18) {
    return { period: 'sore', label: 'Sore', icon: 'sunset', note: 'Saatnya meninjau progres pengiriman hari ini.' };
  }
  return { period: 'malam', label: 'Malam', icon: 'moon', note: 'Terima kasih atas kerja kerasnya hari ini.' };
}

function startGreeting() {
  const user = getSession();
  const firstName = user.nama.split(' ')[0];

  const update = () => {
    const now = new Date();
    const greeting = getGreeting(now.getHours());

    $('#greeting').dataset.period = greeting.period;
    $('#greetingEyebrow').innerHTML = `${icon(greeting.icon)} Selamat ${greeting.label}`;
    $('#greetingTitle').textContent = `Selamat ${greeting.label}, ${firstName}!`;
    $('#greetingSub').textContent = `${user.role} · ${user.lokasi} — ${greeting.note}`;
    $('#greetingTime').textContent = formatClock(now, true);
    $('#greetingDate').textContent = formatToday(now);
  };

  update();
  setInterval(update, 1000);
}

// --- Tampilan: Beranda -------------------------------------------------------

function renderHome() {
  const orders = getDeliveryOrders();
  const doneOrders = orders.filter(order => order.progress.done).length;
  const lowStock = dataBahanAjar.filter(item => getStockStatus(item.stok).key === 'menipis').length;
  const locations = new Set(dataBahanAjar.map(item => item.kodeLokasi)).size;

  $('#homeStats').innerHTML = [
    statCard({ title: 'Judul Bahan Ajar', value: dataBahanAjar.length, unit: 'judul', iconName: 'book', color: 'blue', note: `Tersebar di ${locations} lokasi` }),
    statCard({ title: 'Total Stok', value: formatNumber(sumBy(dataBahanAjar, item => item.stok)), unit: 'eks', iconName: 'stack', color: 'green', note: `${lowStock} judul perlu restock` }),
    statCard({ title: 'Delivery Order', value: orders.length, unit: 'DO', iconName: 'truck', color: 'purple', note: `${orders.length - doneOrders} dalam pengiriman` }),
    statCard({ title: 'Nilai Transaksi', value: formatRupiah(sumBy(orders, order => order.totalBayar)), iconName: 'credit-card', color: 'orange', note: `${doneOrders} DO telah diterima` })
  ].join('');

  $('#homeRecentDO').innerHTML = orders.map(order => `
    <a class="list-item" href="tracking.html?do=${order.nomorDO}">
      <span class="avatar">${getInitials(order.nama)}</span>
      <div class="list-item-main">
        <div class="list-item-title">${escapeHtml(order.nama)} <span class="text-muted text-mono">· ${order.nomorDO}</span></div>
        <div class="list-item-desc">${escapeHtml(order.lastEvent.keterangan)}</div>
      </div>
      <div class="text-right">
        <span class="badge-dot ${order.statusColor}">${order.statusLabel}</span>
        <div class="cell-sub">${order.progress.percent}% · ${escapeHtml(order.ekspedisi)}</div>
      </div>
    </a>`).join('');

  const topStock = [...dataBahanAjar].sort((a, b) => b.stok - a.stok).slice(0, 5);
  $('#homeStock').innerHTML = `<div class="bar-list">${renderStockBars(topStock)}</div>`;
}

/** Grafik batang horizontal stok per bahan ajar. */
function renderStockBars(items) {
  const maxStock = Math.max(...dataBahanAjar.map(item => item.stok));
  const totalStock = sumBy(dataBahanAjar, item => item.stok);

  return items.map(item => {
    const isLow = getStockStatus(item.stok).key === 'menipis';
    const share = Math.round((item.stok / totalStock) * 100);
    return `
      <div>
        <div class="bar-row-head">
          <span><span class="text-mono text-muted">${escapeHtml(item.kodeBarang)}</span> · ${escapeHtml(item.namaBarang)}</span>
          <span>${formatNumber(item.stok)} <span class="text-muted">(${share}%)</span></span>
        </div>
        <div class="bar-track">
          <div class="bar-fill ${isLow ? 'is-warning' : ''}" style="width: ${(item.stok / maxStock) * 100}%"></div>
        </div>
      </div>`;
  }).join('');
}

// --- Tampilan: Laporan Monitoring Progress DO --------------------------------

function renderMonitoring() {
  const orders = getDeliveryOrders();
  const doneOrders = orders.filter(order => order.progress.done).length;
  const averageProgress = Math.round(sumBy(orders, order => order.progress.percent) / orders.length);

  $('#monitoringStats').innerHTML = [
    statCard({ title: 'Total DO', value: orders.length, unit: 'DO', iconName: 'box-seam', color: 'blue' }),
    statCard({ title: 'Dalam Proses', value: orders.length - doneOrders, unit: 'DO', iconName: 'truck', color: 'orange' }),
    statCard({ title: 'Selesai / Diterima', value: doneOrders, unit: 'DO', iconName: 'check-circle', color: 'green' }),
    statCard({ title: 'Rata-rata Progress', value: averageProgress, unit: '%', iconName: 'activity', color: 'purple' })
  ].join('');

  $('#monitoringBody').innerHTML = orders.map(order => `
    <tr>
      <td class="text-mono nowrap">${order.nomorDO}</td>
      <td>
        <div class="cell-title">${escapeHtml(order.nama)}</div>
        <div class="cell-sub">${escapeHtml(order.bahanAjar ? order.bahanAjar.namaBarang : order.paket)}</div>
      </td>
      <td>${escapeHtml(order.ekspedisi)}</td>
      <td class="nowrap">${formatDate(order.tanggalKirim)}</td>
      <td><span class="badge-dot ${order.statusColor} nowrap">${order.statusLabel}</span></td>
      <td>
        ${progressBar(order.progress)}
        <div class="cell-sub">Tahap: ${DELIVERY_STEPS[order.progress.step].title}</div>
      </td>
      <td><a class="btn btn-sm" href="tracking.html?do=${order.nomorDO}">${icon('search')} Lacak</a></td>
    </tr>`).join('');
}

// --- Tampilan: Laporan Rekap Bahan Ajar --------------------------------------

function renderRekap() {
  const totalStock = sumBy(dataBahanAjar, item => item.stok);
  const lowStock = dataBahanAjar.filter(item => getStockStatus(item.stok).key === 'menipis');
  const sortedByStock = [...dataBahanAjar].sort((a, b) => b.stok - a.stok);

  $('#rekapStats').innerHTML = [
    statCard({ title: 'Total Judul', value: dataBahanAjar.length, unit: 'judul', iconName: 'book', color: 'blue' }),
    statCard({ title: 'Total Stok', value: formatNumber(totalStock), unit: 'eks', iconName: 'stack', color: 'green' }),
    statCard({ title: 'Rata-rata Stok / Judul', value: formatNumber(Math.round(totalStock / dataBahanAjar.length)), unit: 'eks', iconName: 'bar-chart-line', color: 'purple', note: `Tertinggi: ${escapeHtml(sortedByStock[0].namaBarang)}` }),
    statCard({ title: 'Perlu Restock', value: lowStock.length, unit: 'judul', iconName: 'exclamation-triangle', color: 'orange', note: 'Stok di bawah 200 eksemplar' })
  ].join('');

  $('#rekapBars').innerHTML = renderStockBars(sortedByStock);

  // Kelompokkan stok berdasarkan kode lokasi.
  const perLocation = {};
  dataBahanAjar.forEach(item => {
    if (!perLocation[item.kodeLokasi]) perLocation[item.kodeLokasi] = { judul: 0, stok: 0 };
    perLocation[item.kodeLokasi].judul += 1;
    perLocation[item.kodeLokasi].stok += item.stok;
  });

  $('#rekapLokasiBody').innerHTML = Object.entries(perLocation)
    .sort((a, b) => b[1].stok - a[1].stok)
    .map(([kodeLokasi, data]) => `
      <tr>
        <td class="text-mono">${escapeHtml(kodeLokasi)}</td>
        <td class="text-right">${data.judul}</td>
        <td class="text-right">${formatNumber(data.stok)}</td>
      </tr>`).join('');

  $('#rekapLokasiFoot').innerHTML = `
    <tr>
      <td>Total</td>
      <td class="text-right">${dataBahanAjar.length}</td>
      <td class="text-right">${formatNumber(totalStock)}</td>
    </tr>`;
}

// --- Tampilan: Histori Transaksi ---------------------------------------------

function renderHistori() {
  const keyword = $('#historiSearch').value.trim().toLowerCase();
  const status = $('#historiStatus').value;

  const orders = getDeliveryOrders().filter(order => {
    const searchText = [order.nomorDO, order.nama, order.ekspedisi, order.paket, order.bahanAjar?.namaBarang]
      .join(' ')
      .toLowerCase();
    const matchStatus = status === ''
      || (status === 'selesai' && order.progress.done)
      || (status === 'proses' && !order.progress.done);
    return searchText.includes(keyword) && matchStatus;
  });

  if (orders.length === 0) {
    $('#historiBody').innerHTML = `<tr><td colspan="7">${emptyState('Tidak ada transaksi yang cocok', 'search')}</td></tr>`;
    $('#historiFoot').innerHTML = '';
    return;
  }

  $('#historiBody').innerHTML = orders.map(order => `
    <tr>
      <td class="nowrap">${formatDate(order.tanggalKirim)}</td>
      <td><a class="text-mono" href="tracking.html?do=${order.nomorDO}">${order.nomorDO}</a></td>
      <td>${escapeHtml(order.nama)}</td>
      <td>
        <div class="cell-title">${escapeHtml(order.bahanAjar ? order.bahanAjar.namaBarang : '-')}</div>
        <div class="cell-sub text-mono">${escapeHtml(order.paket)}</div>
      </td>
      <td>${escapeHtml(order.ekspedisi)}</td>
      <td class="text-right nowrap">${formatRupiah(order.totalBayar)}</td>
      <td><span class="tag tag-${order.statusColor}">${order.statusLabel}</span></td>
    </tr>`).join('');

  $('#historiFoot').innerHTML = `
    <tr>
      <td colspan="5">Total ${orders.length} transaksi</td>
      <td class="text-right nowrap">${formatRupiah(sumBy(orders, order => order.totalBayar))}</td>
      <td></td>
    </tr>`;
}

/* =============================================================================
 * 8. HALAMAN TRACKING (tracking.html)
 * ========================================================================== */

function initTrackingPage() {
  renderBreadcrumb([{ label: 'Tracking Pengiriman' }]);

  const form = $('#trackForm');
  const input = $('#doNumber');
  const result = $('#trackResult');
  const emptyResult = result.innerHTML;
  enableLiveValidation(form);

  // Tombol contoh nomor DO
  $('#doExamples').innerHTML = Object.keys(dataTracking)
    .map(nomorDO => `<button type="button" class="tag tag-clickable" data-do="${nomorDO}">${nomorDO}</button>`)
    .join('');

  $('#doExamples').addEventListener('click', event => {
    const button = event.target.closest('[data-do]');
    if (!button) return;
    input.value = button.dataset.do;
    validateField(input);
    searchDeliveryOrder(input.value);
  });

  // Hanya boleh angka
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (validateForm(form)) searchDeliveryOrder(input.value);
  });

  form.addEventListener('reset', () => {
    clearFormErrors(form);
    result.innerHTML = emptyResult;
    history.replaceState(null, '', location.pathname);
  });

  result.addEventListener('click', event => {
    if (event.target.closest('#copyDO')) {
      navigator.clipboard.writeText(event.target.closest('#copyDO').dataset.do)
        .then(() => showMessage('success', 'Nomor DO disalin'))
        .catch(() => showMessage('error', 'Gagal menyalin nomor DO'));
    }
    if (event.target.closest('#searchAgain')) {
      input.select();
    }
  });

  function searchDeliveryOrder(nomorDO) {
    history.replaceState(null, '', `?do=${nomorDO}`);
    const order = getDeliveryOrders().find(item => item.nomorDO === nomorDO);

    if (!order) {
      result.innerHTML = renderTrackingNotFound(nomorDO);
      showMessage('error', `Nomor DO ${nomorDO} tidak ditemukan`);
      return;
    }
    result.innerHTML = renderTrackingResult(order);
    showMessage('success', 'Data pengiriman ditemukan');
  }

  // Bisa dibuka langsung dengan nomor DO, cth. tracking.html?do=2023001234
  const nomorFromUrl = new URLSearchParams(location.search).get('do');
  if (nomorFromUrl) {
    input.value = nomorFromUrl;
    if (validateForm(form)) searchDeliveryOrder(nomorFromUrl);
  }
}

function renderTrackingNotFound(nomorDO) {
  return `
    <div class="card fade-in">
      <div class="result">
        <div class="result-icon is-warning">${icon('exclamation-circle')}</div>
        <h2 class="result-title">Nomor DO tidak ditemukan</h2>
        <p class="result-subtitle">Delivery Order dengan nomor <strong class="text-mono">${escapeHtml(nomorDO)}</strong>
          tidak terdaftar. Periksa kembali nomor DO Anda atau hubungi UPBJJ terkait.</p>
        <div class="result-extra">
          <button type="button" class="btn btn-primary" id="searchAgain">${icon('search')} Cari Nomor Lain</button>
        </div>
      </div>
    </div>`;
}

function renderTrackingResult(order) {
  const { step: currentStep, done } = order.progress;

  const steps = DELIVERY_STEPS.map((step, index) => {
    let state = 'is-wait';
    if (index < currentStep || done) state = 'is-finish';
    else if (index === currentStep) state = 'is-process';

    return `
      <li class="step ${state}">
        <span class="step-icon">${icon(state === 'is-finish' ? 'check-lg' : step.icon)}</span>
        <div>
          <div class="step-title">${step.title}</div>
          <div class="step-desc">${step.desc}</div>
        </div>
      </li>`;
  }).join('');

  // Riwayat perjalanan: yang terbaru di paling atas.
  const timeline = [...order.perjalanan].reverse().map((event, index) => `
    <li class="timeline-item ${index === 0 ? 'is-latest' : ''} ${index === 0 && done ? 'is-done' : ''}">
      <span class="timeline-dot"></span>
      <div class="timeline-content">${escapeHtml(event.keterangan)}</div>
      <div class="timeline-time">${formatDateTime(event.waktu)}</div>
    </li>`).join('');

  const detailRow = (iconName, label, value) => `
    <div class="descriptions-item">
      <dt>${icon(iconName)} ${label}</dt>
      <dd>${value}</dd>
    </div>`;

  const bahanAjar = order.bahanAjar
    ? `<div class="cell-sub">${escapeHtml(order.bahanAjar.kodeBarang)} · ${escapeHtml(order.bahanAjar.namaBarang)} (${escapeHtml(order.bahanAjar.jenisBarang)})</div>`
    : '';

  return `
    <article class="card fade-in">
      <div class="card-body">
        <div class="track-summary">
          <div class="track-do">
            <span class="nav-tile-icon tone-blue">${icon('box-seam')}</span>
            <div>
              <div class="text-muted">Nomor Delivery Order</div>
              <div class="track-do-number">${order.nomorDO}</div>
            </div>
          </div>
          <div class="space">
            <span class="tag tag-${order.statusColor}">${order.statusLabel}</span>
            <button type="button" class="btn btn-sm" id="copyDO" data-do="${order.nomorDO}">${icon('copy')} Salin No. DO</button>
          </div>
        </div>
        <div class="track-progress">
          <ol class="steps" aria-label="Tahapan pengiriman">${steps}</ol>
          ${progressBar(order.progress)}
        </div>
      </div>
    </article>

    <div class="grid grid-main-side mt-16 fade-in">
      <article class="card">
        <header class="card-head">
          <h2 class="card-title">${icon('file-earmark-text')} Detail Pengiriman</h2>
        </header>
        <div class="card-body">
          <dl class="descriptions descriptions-single">
            ${detailRow('person', 'Nama Mahasiswa', `<strong>${escapeHtml(order.nama)}</strong>`)}
            ${detailRow('activity', 'Status', `<span class="badge-dot ${order.statusColor}">${order.statusLabel}</span>`)}
            ${detailRow('truck', 'Ekspedisi', escapeHtml(order.ekspedisi))}
            ${detailRow('calendar3', 'Tanggal Kirim', formatDate(order.tanggalKirim))}
            ${detailRow('box-seam', 'Jenis Paket', `<span class="text-mono">${escapeHtml(order.paket)}</span>${bahanAjar}`)}
            ${detailRow('credit-card', 'Total Pembayaran', `<strong class="text-success">${formatRupiah(order.totalBayar)}</strong>`)}
          </dl>
        </div>
      </article>

      <article class="card">
        <header class="card-head">
          <h2 class="card-title">${icon('geo-alt')} Riwayat Perjalanan</h2>
          <span class="text-muted">${order.perjalanan.length} aktivitas</span>
        </header>
        <div class="card-body">
          <ol class="timeline">${timeline}</ol>
        </div>
      </article>
    </div>`;
}

/* =============================================================================
 * 9. HALAMAN STOK BAHAN AJAR (stok.html)
 * ========================================================================== */

// Nilai filter yang sedang dipilih pada toolbar.
const stokFilter = { keyword: '', jenis: '', status: '', sort: 'nama-asc' };
let newItemKey = null; // baris baru yang disorot sebentar setelah ditambahkan

function initStokPage() {
  renderBreadcrumb([{ label: 'Informasi Bahan Ajar' }]);

  // Filter & urutan
  $('#stokFilter').addEventListener('submit', event => event.preventDefault());
  $('#stokSearch').addEventListener('input', event => updateStokFilter('keyword', event.target.value.trim()));
  $('#stokJenis').addEventListener('change', event => updateStokFilter('jenis', event.target.value));
  $('#stokStatus').addEventListener('change', event => updateStokFilter('status', event.target.value));
  $('#stokSort').addEventListener('change', event => updateStokFilter('sort', event.target.value));

  // Klik / Enter pada baris tabel -> buka detail
  const tableBody = $('#stokBody');
  tableBody.addEventListener('click', event => {
    const row = event.target.closest('[data-key]');
    if (row) openStokDetail(row.dataset.key);
  });
  tableBody.addEventListener('keydown', event => {
    const row = event.target.closest('[data-key]');
    if (row && event.key === 'Enter') openStokDetail(row.dataset.key);
  });

  $('#detailFooter').addEventListener('click', event => {
    const deleteButton = event.target.closest('[data-delete]');
    if (deleteButton) deleteStokItem(deleteButton.dataset.delete);
  });

  initAddStokForm();
  renderStokPage();
}

function updateStokFilter(name, value) {
  stokFilter[name] = value;
  renderStokTable();
}

function renderStokPage() {
  renderJenisOptions();
  renderStokStats();
  renderStokTable();
}

function renderJenisOptions() {
  const jenisList = [...new Set(dataBahanAjar.map(item => item.jenisBarang))].sort();
  $('#stokJenis').innerHTML = '<option value="">Semua jenis</option>'
    + jenisList.map(jenis => `<option value="${escapeHtml(jenis)}">${escapeHtml(jenis)}</option>`).join('');
  $('#stokJenis').value = stokFilter.jenis;
}

function renderStokStats() {
  const lowStock = dataBahanAjar.filter(item => getStockStatus(item.stok).key === 'menipis').length;
  const locations = new Set(dataBahanAjar.map(item => item.kodeLokasi)).size;

  $('#stokStats').innerHTML = [
    statCard({ title: 'Total Judul', value: dataBahanAjar.length, unit: 'judul', iconName: 'book', color: 'blue' }),
    statCard({ title: 'Total Stok', value: formatNumber(sumBy(dataBahanAjar, item => item.stok)), unit: 'eks', iconName: 'stack', color: 'green' }),
    statCard({ title: 'Stok Menipis', value: lowStock, unit: 'judul', iconName: 'exclamation-triangle', color: 'orange' }),
    statCard({ title: 'Kode Lokasi', value: locations, unit: 'lokasi', iconName: 'geo-alt', color: 'purple' })
  ].join('');
}

/** Bahan ajar setelah dicari, difilter, dan diurutkan sesuai toolbar. */
function getFilteredStok() {
  const keyword = stokFilter.keyword.toLowerCase();

  const items = dataBahanAjar.filter(item => {
    const searchText = `${item.kodeBarang} ${item.namaBarang} ${item.kodeLokasi}`.toLowerCase();
    return searchText.includes(keyword)
      && (stokFilter.jenis === '' || item.jenisBarang === stokFilter.jenis)
      && (stokFilter.status === '' || getStockStatus(item.stok).key === stokFilter.status);
  });

  const [field, direction] = stokFilter.sort.split('-');
  items.sort((a, b) => {
    const result = field === 'stok' ? a.stok - b.stok : a.namaBarang.localeCompare(b.namaBarang);
    return direction === 'desc' ? -result : result;
  });
  return items;
}

function renderStokTable() {
  const items = getFilteredStok();
  const maxStock = Math.max(...dataBahanAjar.map(item => item.stok));

  if (items.length === 0) {
    $('#stokBody').innerHTML = `<tr><td colspan="6">${emptyState('Tidak ada bahan ajar yang cocok dengan pencarian/filter', 'search')}</td></tr>`;
  } else {
    $('#stokBody').innerHTML = items.map(item => {
      const status = getStockStatus(item.stok);
      const key = getItemKey(item);
      return `
        <tr class="is-clickable ${key === newItemKey ? 'is-new' : ''}" tabindex="0" data-key="${escapeHtml(key)}">
          <td>
            <div class="cell-book">
              ${coverImage(item, 'thumb')}
              <div>
                <div class="cell-title">${escapeHtml(item.namaBarang)}</div>
                <div class="cell-sub text-mono">${escapeHtml(item.kodeBarang)}</div>
              </div>
            </div>
          </td>
          <td class="text-mono">${escapeHtml(item.kodeLokasi)}</td>
          <td><span class="tag tag-purple">${escapeHtml(item.jenisBarang)}</span></td>
          <td>Edisi ${escapeHtml(item.edisi)}</td>
          <td>
            <div class="mini-bar">
              <div class="mini-bar-track">
                <div class="mini-bar-fill is-${status.color}" style="width: ${(item.stok / maxStock) * 100}%"></div>
              </div>
              <span class="mini-bar-value">${formatNumber(item.stok)}</span>
            </div>
          </td>
          <td><span class="tag tag-${status.color}">${status.label}</span></td>
        </tr>`;
    }).join('');
  }

  $('#stokFooter').innerHTML = `
    <span>Menampilkan <strong>${items.length}</strong> dari ${dataBahanAjar.length} bahan ajar
      · total stok ${formatNumber(sumBy(items, item => item.stok))} eksemplar</span>
    <span class="space">
      <span class="badge-dot success">Aman &ge; 300</span>
      <span class="badge-dot processing">Cukup 200–299</span>
      <span class="badge-dot warning">Menipis &lt; 200</span>
    </span>`;

  newItemKey = null;
}

function openStokDetail(key) {
  const item = dataBahanAjar.find(bahan => getItemKey(bahan) === key);
  const status = getStockStatus(item.stok);
  const relatedDO = Object.keys(dataTracking).filter(nomorDO => dataTracking[nomorDO].paket === item.kodeLokasi);

  const detailRow = (iconName, label, value) => `
    <div class="descriptions-item"><dt>${icon(iconName)} ${label}</dt><dd>${value}</dd></div>`;

  const lowStockAlert = status.key === 'menipis'
    ? `<div class="alert alert-warning mb-16">
         ${icon('exclamation-triangle')}
         <div>
           <div class="alert-title">Stok menipis</div>
           <div class="alert-desc">Disarankan melakukan pemesanan ulang bahan ajar ini.</div>
         </div>
       </div>`
    : '';

  const relatedLinks = relatedDO.length > 0
    ? relatedDO.map(nomorDO => `<a class="text-mono" href="tracking.html?do=${nomorDO}">${nomorDO}</a>`).join(', ')
    : '<span class="text-muted">Tidak ada</span>';

  $('#detailTitle').textContent = item.namaBarang;
  $('#detailBody').innerHTML = `
    <div class="book-detail">
      <div class="book-detail-cover">${coverImage(item)}</div>
      <div>
        ${lowStockAlert}
        <dl class="descriptions">
          ${detailRow('hash', 'Kode Barang', `<span class="text-mono">${escapeHtml(item.kodeBarang)}</span>`)}
          ${detailRow('book', 'Nama', escapeHtml(item.namaBarang))}
          ${detailRow('layers', 'Jenis', `<span class="tag tag-purple">${escapeHtml(item.jenisBarang)}</span>`)}
          ${detailRow('file-earmark-text', 'Edisi', `Edisi ${escapeHtml(item.edisi)}`)}
          ${detailRow('geo-alt', 'Kode Lokasi', `<span class="text-mono">${escapeHtml(item.kodeLokasi)}</span>`)}
          ${detailRow('box-seam', 'Stok', `<strong>${formatNumber(item.stok)}</strong> eksemplar <span class="tag tag-${status.color}">${status.label}</span>`)}
          ${detailRow('truck', 'DO Terkait', relatedLinks)}
        </dl>
      </div>
    </div>`;

  // Hanya bahan ajar yang ditambahkan pengguna yang boleh dihapus.
  $('#detailFooter').innerHTML = `
    ${item.custom ? `<button type="button" class="btn btn-danger" data-delete="${escapeHtml(key)}">${icon('trash')} Hapus</button>` : ''}
    <button type="button" class="btn btn-primary" data-modal-close>Tutup</button>`;

  $('#detailModal').showModal();
}

async function deleteStokItem(key) {
  const confirmed = await showConfirm({
    title: 'Hapus bahan ajar ini?',
    text: 'Data yang dihapus tidak dapat dikembalikan.',
    okText: 'Hapus',
    danger: true
  });
  if (!confirmed) return;

  const index = dataBahanAjar.findIndex(item => getItemKey(item) === key);
  dataBahanAjar.splice(index, 1);
  saveToStorage(STORAGE_KEY.bahanAjar, dataBahanAjar.filter(item => item.custom));

  $('#detailModal').close();
  renderStokPage();
  showMessage('success', 'Bahan ajar berhasil dihapus');
}

function initAddStokForm() {
  const dialog = $('#addModal');
  const form = $('#addForm');
  enableLiveValidation(form);
  dialog.addEventListener('close', () => resetForm(form));

  // Kode barang & kode lokasi otomatis huruf kapital.
  $$('#addKodeBarang, #addKodeLokasi').forEach(input => {
    input.addEventListener('input', () => { input.value = input.value.toUpperCase(); });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validateForm(form)) return;

    const data = Object.fromEntries(new FormData(form));
    const newItem = {
      kodeLokasi: data.kodeLokasi.trim(),
      kodeBarang: data.kodeBarang.trim(),
      namaBarang: data.namaBarang.trim(),
      jenisBarang: data.jenisBarang,
      edisi: data.edisi,
      stok: Number(data.stok),
      cover: '',
      custom: true // penanda: ditambahkan pengguna, bukan dari data.js
    };

    const isDuplicate = dataBahanAjar.some(item => getItemKey(item) === getItemKey(newItem));
    if (isDuplicate) {
      setFieldError($('#addKodeBarang'), `Kode ${newItem.kodeBarang} sudah ada di lokasi ${newItem.kodeLokasi}`);
      return;
    }

    dataBahanAjar.push(newItem);
    saveToStorage(STORAGE_KEY.bahanAjar, dataBahanAjar.filter(item => item.custom));
    dialog.close();

    // Kosongkan filter agar data baru langsung terlihat & disorot.
    Object.assign(stokFilter, { keyword: '', jenis: '', status: '' });
    $('#stokSearch').value = '';
    $('#stokStatus').value = '';
    newItemKey = getItemKey(newItem);
    renderStokPage();
    showMessage('success', `${newItem.namaBarang} berhasil ditambahkan`);
  });
}

/* =============================================================================
 * 10. INISIALISASI
 * ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (mustRedirect) return; // halaman sedang dialihkan

  bindGlobalEvents();

  const page = document.body.dataset.page;
  if (page !== 'login') {
    renderSider();
    renderHeader();
  }

  const pageInitializers = {
    login: initLoginPage,
    dashboard: initDashboardPage,
    tracking: initTrackingPage,
    stok: initStokPage
  };
  pageInitializers[page]();
});
