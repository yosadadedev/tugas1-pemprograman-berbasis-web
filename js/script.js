/**
 * script.js — Kode bersama aplikasi SITTA
 * -----------------------------------------------------------------------------
 * Dipakai oleh semua halaman. Kode khusus tiap halaman ada di file terpisah:
 *   login.js (index.html), dashboard.js, tracking.js, stok.js
 *
 * Urutan pemuatan di setiap HTML:
 *   data.js -> script.js -> <file halaman>.js
 *
 * Data berasal dari js/data.js: dataPengguna, dataBahanAjar, dataTracking.
 *
 * Isi file:
 *   1. Konstanta & helper umum
 *   2. Penyimpanan & sesi login
 *   3. Komponen UI: notifikasi, modal konfirmasi, validasi form
 *   4. Layout: menu samping, header, breadcrumb
 *   5. Helper data: bahan ajar & delivery order
 *   6. Inisialisasi
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
 * 6. INISIALISASI
 * ========================================================================== */

// Bagian yang sama di semua halaman: event global, menu samping & header.
document.addEventListener('DOMContentLoaded', () => {
  if (mustRedirect) return; // halaman sedang dialihkan

  bindGlobalEvents();
  if (document.body.dataset.page !== 'login') {
    renderSider();
    renderHeader();
  }
});

/**
 * Dipanggil oleh file khusus halaman (cth. onPageReady(initLoginPage)) untuk
 * menjalankan fungsi awal halaman tersebut setelah HTML selesai dimuat.
 */
function onPageReady(initPage) {
  document.addEventListener('DOMContentLoaded', () => {
    if (!mustRedirect) initPage();
  });
}
