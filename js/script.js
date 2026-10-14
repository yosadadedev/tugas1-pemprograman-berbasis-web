/**
 * script.js — SITTA (Sistem Informasi Tiras & Transaksi Bahan Ajar)
 * --------------------------------------------------------------------------
 * Satu file JS yang dipakai semua halaman. Halaman aktif ditentukan oleh
 * atribut <body data-page="...">. Struktur modul:
 *   1. Storage & bootstrap awal (tema + proteksi halaman, sebelum render)
 *   2. Ikon (SVG sprite)
 *   3. Utilitas (DOM, format angka/tanggal)
 *   4. Komponen UI: Message, Modal, Validator
 *   5. Auth (login, register, logout)
 *   6. Domain: helper bahan ajar & tracking DO
 *   7. Layout: sider, header, breadcrumb, jam
 *   8. Halaman: login, dashboard, tracking, stok
 *   9. Inisialisasi
 * Data berasal dari js/data.js (dataPengguna, dataBahanAjar, dataTracking).
 */
(function () {
  'use strict';

  /* =======================================================================
   * 1. STORAGE & BOOTSTRAP AWAL
   * ===================================================================== */
  const KEYS = {
    theme: 'sitta-theme',
    session: 'sitta-session',
    users: 'sitta-users',
    bahan: 'sitta-bahan-ajar',
    sider: 'sitta-sider-collapsed',
    stokView: 'sitta-stok-view'
  };

  const Store = {
    get(key, fallback, storage = localStorage) {
      try {
        const raw = storage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    },
    set(key, value, storage = localStorage) {
      try {
        storage.setItem(key, JSON.stringify(value));
      } catch (err) { /* storage penuh / diblokir: abaikan */ }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (err) { /* abaikan */ }
    }
  };

  // Tema diterapkan sedini mungkin agar tidak terjadi "kedip" warna.
  const Theme = {
    current() {
      return document.documentElement.dataset.theme || 'light';
    },
    apply(theme) {
      document.documentElement.dataset.theme = theme;
      document.querySelectorAll('[data-action="toggle-theme"] use').forEach(use => {
        use.setAttribute('href', theme === 'dark' ? '#i-sun' : '#i-moon');
      });
    },
    toggle() {
      const next = Theme.current() === 'dark' ? 'light' : 'dark';
      Store.set(KEYS.theme, next);
      Theme.apply(next);
    }
  };

  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  Theme.apply(Store.get(KEYS.theme, prefersDark ? 'dark' : 'light'));

  // Gabungkan data tambahan (hasil daftar akun / tambah bahan ajar) yang disimpan di browser.
  Store.get(KEYS.users, []).forEach(u => {
    if (!dataPengguna.some(p => p.email === u.email)) dataPengguna.push(u);
  });
  Store.get(KEYS.bahan, []).forEach(b => dataBahanAjar.push(b));

  // Proteksi halaman: halaman selain login wajib punya sesi.
  // Mendukung URL dengan/tanpa ".html" (mis. hosting Netlify: "/", "/index", "/dashboard").
  const currentFile = location.pathname.split('/').pop();
  const isLoginPage = /^(index|login)?(\.html)?$/.test(currentFile);
  const getSession = () => Store.get(KEYS.session, null, sessionStorage) || Store.get(KEYS.session, null);

  if (!isLoginPage && !getSession()) {
    location.replace('index.html');
    return;
  }
  if (isLoginPage && getSession()) {
    location.replace('dashboard.html');
    return;
  }

  /* =======================================================================
   * 2. IKON (SVG sprite, dipakai via <svg><use href="#i-nama"></use></svg>)
   * ===================================================================== */
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11h5v-6h4v6h5V9"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    truck: '<path d="M1 4h14v12H1z"/><path d="M15 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17V5"/>',
    report: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    history: '<path d="M3 12a9 9 0 1 0 2.64-6.36L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    'user-plus': '<circle cx="9" cy="8" r="4"/><path d="M1 21a8 8 0 0 1 16 0"/><path d="M19 8v6M16 11h6"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="m1 1 22 22"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sunrise: '<path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 2v7M4.22 10.22l1.42 1.42M1 18h2M21 18h2M18.36 11.64l1.42-1.42M23 22H1"/><path d="m8 6 4-4 4 4"/>',
    sunset: '<path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 9V2M4.22 10.22l1.42 1.42M1 18h2M21 18h2M18.36 11.64l1.42-1.42M23 22H1"/><path d="m16 5-4 4-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
    'x-circle': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
    'alert-circle': '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    warning: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    wallet: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M16 15h2"/>',
    package: '<path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    'map-pin-check': '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><path d="m9 10 2 2 4-4"/>',
    navigation: '<path d="m3 11 19-9-9 19-2-8z"/>'
  };

  function injectIconSprite() {
    const symbols = Object.entries(ICONS)
      .map(([name, body]) => `<symbol id="i-${name}" viewBox="0 0 24 24">${body}</symbol>`)
      .join('');
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${symbols}</svg>`
    );
  }

  const LOGO = `
    <svg class="brand-logo" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#1677ff"/>
      <path d="M9 13c3.5-1.6 7.3-1.4 11 1 3.7-2.4 7.5-2.6 11-1v15c-3.5-1.6-7.3-1.4-11 1-3.7-2.4-7.5-2.6-11-1z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
      <path d="M20 14v15" stroke="#fff" stroke-width="2"/>
    </svg>`;

  /* =======================================================================
   * 3. UTILITAS
   * ===================================================================== */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const icon = (name, cls = '') =>
    `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const fmtNum = n => new Intl.NumberFormat('id-ID').format(n);
  const fmtRp = n => 'Rp ' + fmtNum(n);
  const parseRp = str => Number(String(str).replace(/[^\d]/g, '')) || 0;
  const pad = n => String(n).padStart(2, '0');
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const sum = (arr, fn) => arr.reduce((total, x) => total + fn(x), 0);

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  /** "2025-08-25" -> "25 Agustus 2025" (parsing manual agar bebas masalah zona waktu) */
  function fmtDate(str) {
    const [y, m, d] = String(str).split(' ')[0].split('-').map(Number);
    if (!y || !m || !d) return str;
    return `${d} ${BULAN[m - 1]} ${y}`;
  }

  /** "2025-08-25 10:12:20" -> "25 Agu 2025 · 10:12 WIB" */
  function fmtDateTime(str) {
    const [date, time = ''] = String(str).split(' ');
    const [y, m, d] = date.split('-').map(Number);
    if (!y) return str;
    return `${d} ${BULAN[m - 1].slice(0, 3)} ${y} · ${time.slice(0, 5)}`;
  }

  function timezoneLabel(date) {
    const offset = -date.getTimezoneOffset() / 60;
    return { 7: 'WIB', 8: 'WITA', 9: 'WIT' }[offset] || `GMT${offset >= 0 ? '+' : ''}${offset}`;
  }

  const initials = name => String(name).trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  function debounce(fn, ms = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.classList.toggle('is-loading', loading);
    btn.disabled = loading;
    btn.setAttribute('aria-busy', String(loading));
  }

  /** Lebar bar/progress dianimasikan dari 0 ke nilai data-width. */
  function animateBars(ctx = document) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('[data-width]', ctx).forEach(el => { el.style.width = el.dataset.width + '%'; });
    }));
  }

  /** Animasi angka naik (count-up) untuk statistik. */
  function animateCounts(ctx = document) {
    $$('[data-count]', ctx).forEach(el => {
      const target = Number(el.dataset.count);
      const format = el.dataset.format === 'rp' ? fmtRp : fmtNum;
      const start = performance.now();
      const duration = 900;
      const step = now => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  function emptyState(text, iconName = 'inbox') {
    return `<div class="empty"><div class="empty-icon">${icon(iconName)}</div><p>${text}</p></div>`;
  }

  /** Kartu statistik ala Ant Design <Statistic />. */
  function statCard({ title, value, unit = '', iconName, tone, foot = '', format = 'num' }) {
    const isNumber = typeof value === 'number';
    const shown = isNumber ? (format === 'rp' ? fmtRp(0) : '0') : esc(value);
    return `
      <article class="card">
        <div class="statistic">
          <span class="statistic-icon tone-${tone}">${icon(iconName)}</span>
          <div>
            <p class="statistic-title">${title}</p>
            <p class="statistic-value"><span ${isNumber ? `data-count="${value}" data-format="${format}"` : ''}>${shown}</span>${unit ? `<small>${unit}</small>` : ''}</p>
            ${foot ? `<p class="statistic-foot">${foot}</p>` : ''}
          </div>
        </div>
      </article>`;
  }

  function progressBar(percent, done, label = 'Progress pengiriman') {
    return `
      <div class="progress ${done ? 'is-success' : 'is-active'}" role="progressbar" aria-label="${label}"
           aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-track"><div class="progress-bar" data-width="${percent}"></div></div>
        <span class="progress-text">${done ? icon('check-circle') : percent + '%'}</span>
      </div>`;
  }

  /* =======================================================================
   * 4. KOMPONEN UI
   * ===================================================================== */

  /** Message — notifikasi toast di tengah atas (Ant: message.success()). */
  const Message = (() => {
    let container = null;
    const ICON_BY_TYPE = { success: 'check-circle', error: 'x-circle', warning: 'alert-circle', info: 'info' };

    function show(type, text, duration = 3000) {
      if (!container) {
        container = document.createElement('div');
        container.className = 'message-container';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
      }
      const el = document.createElement('div');
      el.className = `message message-${type}`;
      el.innerHTML = `${icon(ICON_BY_TYPE[type])}<span>${esc(text)}</span>`;
      container.appendChild(el);
      setTimeout(() => {
        el.classList.add('is-leaving');
        el.addEventListener('animationend', () => el.remove(), { once: true });
      }, duration);
    }

    return {
      success: text => show('success', text),
      error: text => show('error', text),
      warning: text => show('warning', text),
      info: text => show('info', text)
    };
  })();

  /** Modal — memakai elemen <dialog> native (fokus & tombol Esc otomatis). */
  const Modal = {
    open(target) {
      const dialog = typeof target === 'string' ? document.getElementById(target) : target;
      if (!dialog || dialog.open) return;
      dialog.classList.remove('is-closing');
      dialog.showModal();
      dialog.dispatchEvent(new CustomEvent('modal:open'));
    },

    close(dialog) {
      if (!dialog || !dialog.open || dialog.classList.contains('is-closing')) return;
      dialog.classList.add('is-closing');
      setTimeout(() => {
        dialog.classList.remove('is-closing');
        dialog.close();
      }, 170);
    },

    init() {
      let pressTarget = null;
      document.addEventListener('pointerdown', e => { pressTarget = e.target; });

      document.addEventListener('click', e => {
        const opener = e.target.closest('[data-modal-open]');
        if (opener) {
          Modal.open(opener.dataset.modalOpen);
          return;
        }
        const closer = e.target.closest('[data-modal-close]');
        if (closer) {
          Modal.close(closer.closest('dialog'));
          return;
        }
        // Klik pada area gelap (backdrop) menutup modal.
        if (e.target.matches('dialog.modal') && pressTarget === e.target) {
          Modal.close(e.target);
        }
      });

      // Tombol Esc: tutup dengan animasi.
      document.addEventListener('cancel', e => {
        if (e.target.matches('dialog.modal')) {
          e.preventDefault();
          Modal.close(e.target);
        }
      }, true);
    },

    /** Modal.confirm({type, title, content, okText, cancelText, danger}) -> Promise<boolean> */
    confirm({ type = 'info', title, content = '', okText = 'OK', cancelText = 'Batal', danger = false, showCancel = true }) {
      const ICON_BY_TYPE = { success: 'check-circle', error: 'x-circle', warning: 'alert-circle', info: 'info' };
      const titleId = 'confirm-' + Date.now();

      return new Promise(resolve => {
        const dialog = document.createElement('dialog');
        dialog.className = 'modal modal-sm';
        dialog.setAttribute('aria-labelledby', titleId);
        dialog.setAttribute('role', type === 'error' || type === 'warning' ? 'alertdialog' : 'dialog');
        dialog.innerHTML = `
          <div class="confirm">
            <span class="confirm-icon is-${type}">${icon(ICON_BY_TYPE[type])}</span>
            <div>
              <h2 class="confirm-title" id="${titleId}">${esc(title)}</h2>
              ${content ? `<p class="confirm-text">${esc(content)}</p>` : ''}
            </div>
          </div>
          <div class="confirm-footer">
            ${showCancel ? `<button type="button" class="btn" data-result="0">${esc(cancelText)}</button>` : ''}
            <button type="button" class="btn btn-primary ${danger ? 'btn-danger' : ''}" data-result="1">${esc(okText)}</button>
          </div>`;
        document.body.appendChild(dialog);

        let result = false;
        dialog.addEventListener('click', e => {
          const btn = e.target.closest('[data-result]');
          if (!btn) return;
          result = btn.dataset.result === '1';
          Modal.close(dialog);
        });
        dialog.addEventListener('close', () => {
          dialog.remove();
          resolve(result);
        });

        Modal.open(dialog);
        $('[data-result="1"]', dialog).focus();
      });
    },

    alert(options) {
      return Modal.confirm({ ...options, showCancel: false });
    }
  };

  /**
   * Validator — validasi form ala Ant Design <Form.Item>.
   * Aturan dibaca dari atribut HTML5: required, type="email", minlength,
   * pattern (+ data-pattern-msg), min/max, data-match (konfirmasi).
   */
  const Validator = {
    check(field) {
      const label = field.dataset.label || 'Field ini';
      const isCheckbox = field.type === 'checkbox';
      const value = isCheckbox ? '' : field.value.trim();

      if (field.required && (isCheckbox ? !field.checked : value === '')) {
        if (field.dataset.requiredMsg) return field.dataset.requiredMsg;
        return field.tagName === 'SELECT' ? `Silakan pilih ${label.toLowerCase()}` : `${label} wajib diisi`;
      }
      if (isCheckbox || value === '') return '';

      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        return 'Format email tidak valid (contoh: nama@ut.ac.id)';
      }
      if (field.minLength > 0 && value.length < field.minLength) {
        return `${label} minimal ${field.minLength} karakter`;
      }
      if (field.pattern && !new RegExp(`^(?:${field.pattern})$`).test(value)) {
        return field.dataset.patternMsg || `Format ${label.toLowerCase()} tidak valid`;
      }
      if (field.type === 'number') {
        const n = Number(value);
        if (!Number.isInteger(n)) return `${label} harus berupa bilangan bulat`;
        if (field.min !== '' && n < Number(field.min)) return `${label} minimal ${field.min}`;
        if (field.max !== '' && n > Number(field.max)) return `${label} maksimal ${fmtNum(field.max)}`;
      }
      if (field.dataset.match) {
        const other = document.getElementById(field.dataset.match);
        if (other && other.value !== field.value) return `${label} tidak sama dengan password`;
      }
      return '';
    },

    setError(field, message) {
      const item = field.closest('.form-item');
      if (!item) return;
      let explain = $('.form-explain', item);
      if (!explain) {
        explain = document.createElement('div');
        explain.className = 'form-explain';
        explain.id = `${field.id}-error`;
        const anchor = field.closest('.input-affix, .checkbox') || field;
        anchor.insertAdjacentElement('afterend', explain);
      }
      item.classList.toggle('has-error', Boolean(message));
      if (message) explain.textContent = message;
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (message) field.setAttribute('aria-describedby', explain.id);
      else field.removeAttribute('aria-describedby');
    },

    validateField(field) {
      const message = Validator.check(field);
      Validator.setError(field, message);
      return !message;
    },

    fields(form) {
      return $$('input, select, textarea', form).filter(f => f.name && !f.disabled && f.type !== 'hidden');
    },

    /** Validasi seluruh form, fokus ke field pertama yang salah. */
    validate(form) {
      let firstInvalid = null;
      Validator.fields(form).forEach(f => {
        f.dataset.touched = '1';
        if (!Validator.validateField(f) && !firstInvalid) firstInvalid = f;
      });
      if (firstInvalid) firstInvalid.focus();
      return !firstInvalid;
    },

    /** Validasi langsung (live) saat user mengetik / meninggalkan field. */
    bind(form) {
      form.addEventListener('input', e => {
        const f = e.target;
        if (f.dataset.touched) Validator.validateField(f);
        const dependent = f.id && $(`[data-match="${f.id}"]`, form);
        if (dependent && dependent.dataset.touched) Validator.validateField(dependent);
      });
      form.addEventListener('change', e => {
        const f = e.target;
        if (f.type === 'checkbox' || f.tagName === 'SELECT') {
          f.dataset.touched = '1';
          Validator.validateField(f);
        }
      });
      form.addEventListener('focusout', e => {
        const f = e.target;
        if (f.matches('input:not([type="checkbox"])') && f.value.trim() !== '') {
          f.dataset.touched = '1';
          Validator.validateField(f);
        }
      });
    },

    /** Error dari "server" (mis. email tidak terdaftar). */
    setFieldError(field, message) {
      field.dataset.touched = '1';
      Validator.setError(field, message);
      field.focus();
    },

    reset(form) {
      form.reset();
      $$('.form-item.has-error', form).forEach(item => item.classList.remove('has-error'));
      Validator.fields(form).forEach(f => {
        delete f.dataset.touched;
        f.removeAttribute('aria-invalid');
        f.removeAttribute('aria-describedby');
      });
    }
  };

  /* =======================================================================
   * 5. AUTH
   * ===================================================================== */
  const Auth = {
    user: getSession,

    findByEmail(email) {
      return dataPengguna.find(u => u.email.toLowerCase() === String(email).trim().toLowerCase());
    },

    login(email, password, remember) {
      const user = Auth.findByEmail(email);
      if (!user || user.password !== password) return null;
      const session = {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        lokasi: user.lokasi,
        loginAt: new Date().toISOString()
      };
      Store.set(KEYS.session, session, remember ? localStorage : sessionStorage);
      return session;
    },

    register({ nama, email, password, role, lokasi }) {
      const user = {
        id: Math.max(0, ...dataPengguna.map(u => u.id)) + 1,
        nama: nama.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        lokasi: lokasi.trim()
      };
      dataPengguna.push(user);
      Store.set(KEYS.users, [...Store.get(KEYS.users, []), user]);
      return user;
    },

    async logout() {
      const ok = await Modal.confirm({
        type: 'warning',
        title: 'Keluar dari SITTA?',
        content: 'Sesi Anda akan diakhiri dan Anda perlu login kembali untuk mengakses aplikasi.',
        okText: 'Keluar',
        danger: true
      });
      if (!ok) return;
      Store.remove(KEYS.session);
      location.replace('index.html');
    }
  };

  /* =======================================================================
   * 6. DOMAIN — BAHAN AJAR & TRACKING
   * ===================================================================== */
  const STOCK_LEVELS = [
    { key: 'aman', min: 300, label: 'Aman', tag: 'success' },
    { key: 'cukup', min: 200, label: 'Cukup', tag: 'processing' },
    { key: 'menipis', min: 0, label: 'Menipis', tag: 'warning' }
  ];

  const stockStatus = stok => STOCK_LEVELS.find(level => stok >= level.min);
  const bahanKey = b => `${b.kodeBarang}|${b.kodeLokasi}`;
  const findBahanByLokasi = kode => dataBahanAjar.find(b => b.kodeLokasi === kode);

  /** Tahapan pengiriman; dicocokkan dengan teks "keterangan" pada data perjalanan. */
  const TRACK_STEPS = [
    { title: 'Diproses', desc: 'DO dibuat', icon: 'report' },
    { title: 'Diserahkan', desc: 'Diterima loket ekspedisi', icon: 'package', match: /penerimaan di loket/i },
    { title: 'Dalam Perjalanan', desc: 'Transit antar hub', icon: 'truck', match: /tiba di hub|diteruskan/i },
    { title: 'Proses Antar', desc: 'Kurir menuju alamat', icon: 'navigation', match: /proses antar/i },
    { title: 'Diterima', desc: 'Paket sampai tujuan', icon: 'map-pin-check', match: /selesai antar/i }
  ];

  function trackingProgress(item) {
    let current = 0;
    (item.perjalanan || []).forEach(p => {
      TRACK_STEPS.forEach((step, i) => {
        if (step.match && step.match.test(p.keterangan)) current = Math.max(current, i);
      });
    });
    const last = TRACK_STEPS.length - 1;
    return { current, done: current === last, percent: Math.round((current / last) * 100) };
  }

  function trackingStatus(item, progress) {
    return progress.done
      ? { label: 'Diterima', tag: 'success', dot: 'success' }
      : { label: item.status, tag: 'processing', dot: 'processing' };
  }

  /** Daftar DO yang sudah diperkaya (progress, status, total angka, bahan ajar). */
  function trackingList() {
    return Object.entries(dataTracking)
      .map(([nomorDO, data]) => {
        const progress = trackingProgress(data);
        return {
          ...data,
          nomorDO,
          progress,
          statusInfo: trackingStatus(data, progress),
          totalNum: parseRp(data.total),
          bahan: findBahanByLokasi(data.paket),
          lastEvent: data.perjalanan && data.perjalanan[data.perjalanan.length - 1]
        };
      })
      .sort((a, b) => b.tanggalKirim.localeCompare(a.tanggalKirim) || b.nomorDO.localeCompare(a.nomorDO));
  }

  /** Cover buku; jika gambar gagal dimuat diganti placeholder (lihat handleImageError). */
  function coverImg(b, cls = '') {
    if (!b.cover) return `<span class="${cls} thumb-fallback">${icon('book')}</span>`;
    return `<img class="${cls}" src="${esc(b.cover)}" alt="Sampul ${esc(b.namaBarang)}" loading="lazy">`;
  }

  function handleImageError(container) {
    container.addEventListener('error', e => {
      const img = e.target;
      if (img.tagName !== 'IMG') return;
      if (img.classList.contains('thumb')) {
        img.outerHTML = `<span class="thumb thumb-fallback">${icon('book')}</span>`;
      } else {
        img.parentElement.classList.add('thumb-fallback');
        img.outerHTML = icon('book');
      }
    }, true);
  }

  /* =======================================================================
   * 7. LAYOUT — SIDER, HEADER, BREADCRUMB, JAM
   * ===================================================================== */
  const MENU = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'dashboard.html' },
    { key: 'stok', label: 'Informasi Bahan Ajar', icon: 'book', href: 'stok.html' },
    { key: 'tracking', label: 'Tracking Pengiriman', icon: 'truck', href: 'tracking.html' },
    {
      key: 'laporan', label: 'Laporan', icon: 'report', children: [
        { key: 'monitoring', label: 'Monitoring Progress DO', href: 'dashboard.html#monitoring' },
        { key: 'rekap', label: 'Rekap Bahan Ajar', href: 'dashboard.html#rekap' }
      ]
    },
    { key: 'histori', label: 'Histori Transaksi', icon: 'history', href: 'dashboard.html#histori' }
  ];

  const DASHBOARD_VIEWS = ['monitoring', 'rekap', 'histori'];

  function activeMenuKey() {
    const page = document.body.dataset.page;
    if (page !== 'dashboard') return page;
    const hash = location.hash.slice(1);
    return DASHBOARD_VIEWS.includes(hash) ? hash : 'dashboard';
  }

  function renderSider() {
    const sider = $('#appSider');
    if (!sider) return;
    const active = activeMenuKey();

    const link = item => {
      const isActive = item.key === active;
      return `<li>
        <a class="menu-item ${isActive ? 'is-active' : ''}" href="${item.href}" title="${item.label}" ${isActive ? 'aria-current="page"' : ''}>
          ${item.icon ? icon(item.icon) : ''}<span class="menu-label">${item.label}</span>
        </a>
      </li>`;
    };

    const items = MENU.map(item => {
      if (!item.children) return link(item);
      const open = item.children.some(c => c.key === active);
      return `<li class="submenu ${open ? 'is-open' : ''}">
        <button type="button" class="menu-item ${open ? 'is-child-active' : ''}" data-action="toggle-submenu" aria-expanded="${open}" title="${item.label}">
          ${icon(item.icon)}<span class="menu-label">${item.label}</span>${icon('down', 'menu-arrow')}
        </button>
        <div class="submenu-list"><ul>${item.children.map(link).join('')}</ul></div>
      </li>`;
    }).join('');

    sider.innerHTML = `
      <a class="sider-brand" href="dashboard.html" aria-label="SITTA — kembali ke dashboard">
        ${LOGO}
        <span class="brand-text">
          <span class="brand-name">SITTA</span>
          <span class="brand-tagline">Universitas Terbuka</span>
        </span>
      </a>
      <nav class="sider-menu" aria-label="Menu aplikasi">
        <p class="menu-group-title">Menu</p>
        <ul>${items}</ul>
      </nav>
      <div class="sider-footer"><span class="sider-footer-text">SITTA v1.0 · Front-End Only</span></div>`;
  }

  function renderHeader() {
    const header = $('#appHeader');
    if (!header) return;
    const user = Auth.user();

    header.innerHTML = `
      <div class="header-left">
        <button type="button" class="btn btn-text btn-icon btn-lg" data-action="toggle-sider" aria-label="Buka/tutup menu samping">${icon('menu')}</button>
        <span class="header-clock">${icon('clock')}<time id="headerClock"></time></span>
      </div>
      <div class="header-right">
        <button type="button" class="btn btn-text btn-icon btn-lg" data-action="toggle-theme" aria-label="Ganti tema terang/gelap" title="Ganti tema">${icon('moon')}</button>
        <div class="dropdown" id="userDropdown">
          <button type="button" class="header-user" data-action="toggle-dropdown" aria-haspopup="menu" aria-expanded="false" aria-controls="userMenu">
            <span class="avatar">${esc(initials(user.nama))}</span>
            <span class="header-user-text"><strong>${esc(user.nama)}</strong><small>${esc(user.role)}</small></span>
            ${icon('down', 'text-muted')}
          </button>
          <div class="dropdown-menu" id="userMenu" role="menu">
            <div class="dropdown-profile">
              <span class="avatar avatar-lg">${esc(initials(user.nama))}</span>
              <div>
                <div class="name">${esc(user.nama)}</div>
                <div class="meta">${esc(user.email)}</div>
                <div class="meta">${esc(user.role)} · ${esc(user.lokasi)}</div>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" role="menuitem" href="dashboard.html">${icon('dashboard')} Dashboard</a>
            <a class="dropdown-item" role="menuitem" href="dashboard.html#histori">${icon('history')} Histori Transaksi</a>
            <div class="dropdown-divider"></div>
            <button type="button" class="dropdown-item is-danger" role="menuitem" data-action="logout">${icon('logout')} Keluar</button>
          </div>
        </div>
      </div>`;
  }

  function renderBreadcrumb(trail) {
    const ol = $('#breadcrumb');
    if (!ol) return;
    const crumbs = [{ label: 'Beranda', href: 'dashboard.html', icon: 'home' }, ...trail];
    ol.innerHTML = crumbs.map((c, i) => {
      const content = `${c.icon ? icon(c.icon) : ''}${esc(c.label)}`;
      if (i === crumbs.length - 1) return `<li><span aria-current="page">${content}</span></li>`;
      return `<li>${c.href ? `<a href="${c.href}">${content}</a>` : `<span>${content}</span>`}</li>`;
    }).join('');
  }

  const isMobile = () => window.matchMedia('(max-width: 992px)').matches;

  function toggleSider() {
    if (isMobile()) {
      document.body.classList.toggle('is-sider-open');
    } else {
      const collapsed = document.body.classList.toggle('is-sider-collapsed');
      Store.set(KEYS.sider, collapsed);
    }
  }

  function closeDropdowns() {
    $$('.dropdown.is-open').forEach(d => {
      d.classList.remove('is-open');
      $('[aria-expanded]', d).setAttribute('aria-expanded', 'false');
    });
  }

  /** Jam berjalan (header & greeting dashboard). */
  const clockListeners = [];
  function onClockTick(fn) {
    clockListeners.push(fn);
    fn(new Date()); // langsung tampil tanpa menunggu detik berikutnya
  }

  function startClock() {
    const tick = () => {
      const now = new Date();
      const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const el = $('#headerClock');
      if (el) {
        el.textContent = `${HARI[now.getDay()]}, ${now.getDate()} ${BULAN[now.getMonth()].slice(0, 3)} ${now.getFullYear()} · ${hhmm} ${timezoneLabel(now)}`;
        el.setAttribute('datetime', now.toISOString());
      }
      clockListeners.forEach(fn => fn(now));
    };
    tick();
    setInterval(tick, 1000);
  }

  /** Delegasi event global untuk semua elemen ber-atribut data-action. */
  function bindGlobalActions() {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-action]');
      const dropdown = e.target.closest('.dropdown');
      if (!dropdown) closeDropdowns();
      if (!el) return;

      switch (el.dataset.action) {
        case 'toggle-theme':
          Theme.toggle();
          break;
        case 'toggle-sider':
          toggleSider();
          break;
        case 'close-sider':
          document.body.classList.remove('is-sider-open');
          break;
        case 'toggle-submenu': {
          if (document.body.classList.contains('is-sider-collapsed') && !isMobile()) {
            document.body.classList.remove('is-sider-collapsed');
            Store.set(KEYS.sider, false);
          }
          const submenu = el.closest('.submenu');
          const open = submenu.classList.toggle('is-open');
          el.setAttribute('aria-expanded', String(open));
          break;
        }
        case 'toggle-dropdown': {
          const wrap = el.closest('.dropdown');
          const open = !wrap.classList.contains('is-open');
          closeDropdowns();
          wrap.classList.toggle('is-open', open);
          el.setAttribute('aria-expanded', String(open));
          break;
        }
        case 'toggle-password': {
          const input = $('input', el.closest('.input-affix'));
          const show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          $('use', el).setAttribute('href', show ? '#i-eye' : '#i-eye-off');
          el.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
          break;
        }
        case 'logout':
          closeDropdowns();
          Auth.logout();
          break;
        case 'print':
          window.print();
          break;
        default:
          break;
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeDropdowns();
        document.body.classList.remove('is-sider-open');
      }
    });

    window.addEventListener('resize', debounce(() => {
      if (!isMobile()) document.body.classList.remove('is-sider-open');
    }, 150));

    $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  }

  /* =======================================================================
   * 8a. HALAMAN LOGIN
   * ===================================================================== */
  function initLogin() {
    const form = $('#loginForm');
    const emailInput = $('#loginEmail');
    const passwordInput = $('#loginPassword');
    Validator.bind(form);

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!Validator.validate(form)) return;

      const btn = $('[type="submit"]', form);
      setLoading(btn, true);
      await wait(600); // simulasi request ke server
      const user = Auth.login(emailInput.value.trim(), passwordInput.value, $('#loginRemember').checked);
      setLoading(btn, false);

      if (!user) {
        await Modal.alert({
          type: 'error',
          title: 'Login gagal',
          content: 'Email/password yang anda masukkan salah. Silakan periksa kembali.',
          okText: 'Coba Lagi'
        });
        passwordInput.value = '';
        passwordInput.focus();
        return;
      }

      Message.success(`Login berhasil. Selamat datang, ${user.nama}!`);
      setTimeout(() => location.replace('dashboard.html'), 900);
    });

    // Tombol "Isi otomatis" akun demo
    $('[data-action="fill-demo"]').addEventListener('click', () => {
      emailInput.value = 'rina@ut.ac.id';
      passwordInput.value = 'rina123';
      [emailInput, passwordInput].forEach(Validator.validateField);
      Message.info('Akun demo telah diisi, silakan tekan Login.');
    });

    initForgotPassword(emailInput);
    initRegister(emailInput, passwordInput);
  }

  function initForgotPassword(loginEmail) {
    const dialog = $('#forgotModal');
    const form = $('#forgotForm');
    const input = $('#forgotEmail');
    Validator.bind(form);

    dialog.addEventListener('modal:open', () => {
      if (loginEmail.value.trim()) input.value = loginEmail.value.trim();
      input.focus();
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!Validator.validate(form)) return;
      if (!Auth.findByEmail(input.value)) {
        Validator.setFieldError(input, 'Email tidak terdaftar di SITTA');
        return;
      }
      const btn = $('[type="submit"]', form);
      setLoading(btn, true);
      await wait(700);
      setLoading(btn, false);
      $('[data-forgot-email]', dialog).textContent = input.value.trim();
      $('[data-step="form"]', dialog).hidden = true;
      $('[data-step="done"]', dialog).hidden = false;
    });

    dialog.addEventListener('close', () => {
      Validator.reset(form);
      $('[data-step="form"]', dialog).hidden = false;
      $('[data-step="done"]', dialog).hidden = true;
    });
  }

  function initRegister(loginEmail, loginPassword) {
    const dialog = $('#registerModal');
    const form = $('#registerForm');
    Validator.bind(form);

    dialog.addEventListener('modal:open', () => $('#regNama').focus());
    dialog.addEventListener('close', () => Validator.reset(form));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!Validator.validate(form)) return;

      const data = Object.fromEntries(new FormData(form));
      if (Auth.findByEmail(data.email)) {
        Validator.setFieldError($('#regEmail'), 'Email sudah terdaftar, silakan login');
        return;
      }

      const btn = $('[type="submit"]', form);
      setLoading(btn, true);
      await wait(700);
      setLoading(btn, false);

      const user = Auth.register(data);
      Modal.close(dialog);
      Message.success('Pendaftaran berhasil! Silakan login dengan akun baru Anda.');
      loginEmail.value = user.email;
      loginPassword.value = '';
      setTimeout(() => loginPassword.focus(), 250);
    });
  }

  /* =======================================================================
   * 8b. HALAMAN DASHBOARD (beranda + laporan + histori)
   * ===================================================================== */
  const VIEW_META = {
    dashboard: { view: 'home', title: 'Dashboard', trail: [] },
    monitoring: { view: 'monitoring', title: 'Monitoring Progress DO', trail: [{ label: 'Laporan' }, { label: 'Monitoring Progress DO' }] },
    rekap: { view: 'rekap', title: 'Rekap Bahan Ajar', trail: [{ label: 'Laporan' }, { label: 'Rekap Bahan Ajar' }] },
    histori: { view: 'histori', title: 'Histori Transaksi', trail: [{ label: 'Histori Transaksi' }] }
  };

  function initDashboard() {
    initGreeting();

    const renderers = {
      home: renderHome,
      monitoring: renderMonitoring,
      rekap: renderRekap,
      histori: renderHistori
    };

    const showView = () => {
      const key = activeMenuKey();
      const meta = VIEW_META[key];
      $$('[data-view]').forEach(section => { section.hidden = section.dataset.view !== meta.view; });
      renderBreadcrumb(meta.trail);
      renderSider();
      document.title = `${meta.title} · SITTA Universitas Terbuka`;
      document.body.classList.remove('is-sider-open');
      renderers[meta.view]();
      window.scrollTo({ top: 0 });
    };

    $('#historiFilter').addEventListener('submit', e => e.preventDefault());
    $('#historiSearch').addEventListener('input', debounce(renderHistori, 150));
    $('#historiStatus').addEventListener('change', renderHistori);

    window.addEventListener('hashchange', showView);
    showView();
  }

  function greetingFor(hour) {
    if (hour >= 4 && hour < 11) return { key: 'pagi', label: 'Pagi', icon: 'sunrise', note: 'Awali hari dengan semangat! Yuk cek stok dan pengiriman terbaru.' };
    if (hour >= 11 && hour < 15) return { key: 'siang', label: 'Siang', icon: 'sun', note: 'Jangan lupa istirahat sejenak di sela pekerjaan.' };
    if (hour >= 15 && hour < 18) return { key: 'sore', label: 'Sore', icon: 'sunset', note: 'Saatnya meninjau progres pengiriman hari ini.' };
    return { key: 'malam', label: 'Malam', icon: 'moon', note: 'Terima kasih atas kerja kerasnya hari ini.' };
  }

  function initGreeting() {
    const user = Auth.user();
    const firstName = user.nama.split(' ')[0];
    let lastPeriod = null;

    onClockTick(now => {
      const g = greetingFor(now.getHours());
      if (g.key !== lastPeriod) {
        lastPeriod = g.key;
        $('#greeting').dataset.period = g.key;
        $('#greetingEyebrow').innerHTML = `${icon(g.icon)} Selamat ${g.label}`;
        $('#greetingTitle').textContent = `Selamat ${g.label}, ${firstName}!`;
        $('#greetingSub').textContent = `${user.role} · ${user.lokasi} — ${g.note}`;
      }
      const time = $('#greetingTime');
      time.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      time.setAttribute('datetime', now.toISOString());
      $('#greetingDate').textContent = `${HARI[now.getDay()]}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()} · ${timezoneLabel(now)}`;
    });
  }

  function renderHome() {
    const list = trackingList();
    const totalStok = sum(dataBahanAjar, b => b.stok);
    const menipis = dataBahanAjar.filter(b => stockStatus(b.stok).key === 'menipis').length;
    const selesai = list.filter(d => d.progress.done).length;
    const lokasi = new Set(dataBahanAjar.map(b => b.kodeLokasi)).size;

    const stats = $('#homeStats');
    stats.innerHTML = [
      statCard({ title: 'Judul Bahan Ajar', value: dataBahanAjar.length, unit: 'judul', iconName: 'book', tone: 'blue', foot: `Tersebar di ${lokasi} lokasi` }),
      statCard({ title: 'Total Stok', value: totalStok, unit: 'eks', iconName: 'layers', tone: 'green', foot: `${menipis} judul perlu restock` }),
      statCard({ title: 'Delivery Order', value: list.length, unit: 'DO', iconName: 'truck', tone: 'purple', foot: `${list.length - selesai} dalam pengiriman` }),
      statCard({ title: 'Nilai Transaksi', value: sum(list, d => d.totalNum), iconName: 'wallet', tone: 'orange', format: 'rp', foot: `${selesai} DO telah diterima` })
    ].join('');
    animateCounts(stats);

    $('#homeRecentDO').innerHTML = list.length
      ? list.slice(0, 5).map(d => `
          <a class="list-item" href="tracking.html?do=${d.nomorDO}">
            <span class="avatar">${esc(initials(d.nama))}</span>
            <div class="list-item-main">
              <div class="list-item-title">${esc(d.nama)} <span class="text-muted text-mono">· ${d.nomorDO}</span></div>
              <div class="list-item-desc">${esc(d.lastEvent ? d.lastEvent.keterangan : '-')}</div>
            </div>
            <div class="text-right">
              <span class="badge-dot ${d.statusInfo.dot}">${esc(d.statusInfo.label)}</span>
              <div class="cell-sub">${d.progress.percent}% · ${esc(d.ekspedisi)}</div>
            </div>
          </a>`).join('')
      : emptyState('Belum ada pengiriman');

    const stock = $('#homeStock');
    stock.innerHTML = `<div class="bar-list">${stockBars([...dataBahanAjar].sort((a, b) => b.stok - a.stok).slice(0, 5))}</div>`;
    animateBars(stock);
  }

  function stockBars(items) {
    const max = Math.max(...dataBahanAjar.map(b => b.stok), 1);
    const total = sum(dataBahanAjar, b => b.stok) || 1;
    return items.map(b => {
      const warn = stockStatus(b.stok).key === 'menipis';
      return `
        <div>
          <div class="bar-row-head">
            <span><span class="text-mono text-muted">${esc(b.kodeBarang)}</span> · ${esc(b.namaBarang)}</span>
            <span>${fmtNum(b.stok)} <span class="text-muted">(${Math.round((b.stok / total) * 100)}%)</span></span>
          </div>
          <div class="bar-track" role="presentation"><div class="bar-fill ${warn ? 'is-warning' : ''}" data-width="${(b.stok / max) * 100}"></div></div>
        </div>`;
    }).join('');
  }

  function renderMonitoring() {
    const list = trackingList();
    const selesai = list.filter(d => d.progress.done).length;
    const avg = list.length ? Math.round(sum(list, d => d.progress.percent) / list.length) : 0;

    const stats = $('#monitoringStats');
    stats.innerHTML = [
      statCard({ title: 'Total DO', value: list.length, unit: 'DO', iconName: 'package', tone: 'blue' }),
      statCard({ title: 'Dalam Proses', value: list.length - selesai, unit: 'DO', iconName: 'truck', tone: 'orange' }),
      statCard({ title: 'Selesai / Diterima', value: selesai, unit: 'DO', iconName: 'check-circle', tone: 'green' }),
      statCard({ title: 'Rata-rata Progress', value: avg, unit: '%', iconName: 'activity', tone: 'purple' })
    ].join('');
    animateCounts(stats);

    const body = $('#monitoringBody');
    body.innerHTML = list.length
      ? list.map(d => `
          <tr>
            <td class="text-mono nowrap">${d.nomorDO}</td>
            <td>
              <div class="cell-title">${esc(d.nama)}</div>
              <div class="cell-sub">${esc(d.bahan ? d.bahan.namaBarang : d.paket)}</div>
            </td>
            <td>${esc(d.ekspedisi)}</td>
            <td class="nowrap">${fmtDate(d.tanggalKirim)}</td>
            <td><span class="badge-dot ${d.statusInfo.dot} nowrap">${esc(d.statusInfo.label)}</span></td>
            <td>
              ${progressBar(d.progress.percent, d.progress.done)}
              <div class="cell-sub">Tahap: ${TRACK_STEPS[d.progress.current].title}</div>
            </td>
            <td class="no-print"><a class="btn btn-sm" href="tracking.html?do=${d.nomorDO}">${icon('search')} Lacak</a></td>
          </tr>`).join('')
      : `<tr><td colspan="7">${emptyState('Belum ada Delivery Order')}</td></tr>`;
    animateBars(body);
  }

  function renderRekap() {
    const totalStok = sum(dataBahanAjar, b => b.stok);
    const restock = dataBahanAjar.filter(b => stockStatus(b.stok).key === 'menipis');
    const top = [...dataBahanAjar].sort((a, b) => b.stok - a.stok)[0];

    const stats = $('#rekapStats');
    stats.innerHTML = [
      statCard({ title: 'Total Judul', value: dataBahanAjar.length, unit: 'judul', iconName: 'book', tone: 'blue' }),
      statCard({ title: 'Total Stok', value: totalStok, unit: 'eks', iconName: 'layers', tone: 'green' }),
      statCard({ title: 'Rata-rata Stok / Judul', value: dataBahanAjar.length ? Math.round(totalStok / dataBahanAjar.length) : 0, unit: 'eks', iconName: 'chart', tone: 'purple', foot: top ? `Tertinggi: ${esc(top.namaBarang)}` : '' }),
      statCard({ title: 'Perlu Restock', value: restock.length, unit: 'judul', iconName: 'warning', tone: 'orange', foot: 'Stok di bawah 200 eksemplar' })
    ].join('');
    animateCounts(stats);

    const bars = $('#rekapBars');
    bars.innerHTML = dataBahanAjar.length
      ? stockBars([...dataBahanAjar].sort((a, b) => b.stok - a.stok))
      : emptyState('Belum ada data bahan ajar');
    animateBars(bars);

    // Rekap per kode lokasi
    const groups = {};
    dataBahanAjar.forEach(b => {
      groups[b.kodeLokasi] = groups[b.kodeLokasi] || { judul: 0, stok: 0 };
      groups[b.kodeLokasi].judul += 1;
      groups[b.kodeLokasi].stok += b.stok;
    });
    $('#rekapLokasiBody').innerHTML = Object.entries(groups)
      .sort((a, b) => b[1].stok - a[1].stok)
      .map(([kode, g]) => `
        <tr>
          <td class="text-mono">${esc(kode)}</td>
          <td class="text-right">${g.judul}</td>
          <td class="text-right">${fmtNum(g.stok)}</td>
        </tr>`).join('');
    $('#rekapLokasiFoot').innerHTML = `
      <tr>
        <td>Total</td>
        <td class="text-right">${dataBahanAjar.length}</td>
        <td class="text-right">${fmtNum(totalStok)}</td>
      </tr>`;
  }

  function renderHistori() {
    const q = $('#historiSearch').value.trim().toLowerCase();
    const status = $('#historiStatus').value;

    const rows = trackingList().filter(d => {
      const haystack = [d.nomorDO, d.nama, d.ekspedisi, d.paket, d.bahan && d.bahan.namaBarang].join(' ').toLowerCase();
      const matchStatus = !status || (status === 'selesai' ? d.progress.done : !d.progress.done);
      return haystack.includes(q) && matchStatus;
    });

    $('#historiBody').innerHTML = rows.length
      ? rows.map(d => `
          <tr>
            <td class="nowrap">${fmtDate(d.tanggalKirim)}</td>
            <td><a class="text-mono" href="tracking.html?do=${d.nomorDO}">${d.nomorDO}</a></td>
            <td>${esc(d.nama)}</td>
            <td>
              <div class="cell-title">${esc(d.bahan ? d.bahan.namaBarang : '-')}</div>
              <div class="cell-sub text-mono">${esc(d.paket)}</div>
            </td>
            <td>${esc(d.ekspedisi)}</td>
            <td class="text-right nowrap">${fmtRp(d.totalNum)}</td>
            <td><span class="tag tag-${d.statusInfo.tag}">${esc(d.statusInfo.label)}</span></td>
          </tr>`).join('')
      : `<tr><td colspan="7">${emptyState('Tidak ada transaksi yang cocok dengan filter', 'search')}</td></tr>`;

    $('#historiFoot').innerHTML = rows.length
      ? `<tr>
          <td colspan="5">Total ${rows.length} transaksi</td>
          <td class="text-right nowrap">${fmtRp(sum(rows, d => d.totalNum))}</td>
          <td></td>
        </tr>`
      : '';
  }

  /* =======================================================================
   * 8c. HALAMAN TRACKING
   * ===================================================================== */
  function initTracking() {
    renderBreadcrumb([{ label: 'Tracking Pengiriman' }]);

    const form = $('#trackForm');
    const input = $('#doNumber');
    const result = $('#trackResult');
    const submitBtn = $('[type="submit"]', form);
    const initialResult = result.innerHTML;
    Validator.bind(form);

    // Chip contoh nomor DO
    $('#doExamples').innerHTML = Object.keys(dataTracking)
      .map(no => `<button type="button" class="tag tag-clickable" data-do="${no}">${no}</button>`)
      .join('');
    $('#doExamples').addEventListener('click', e => {
      const chip = e.target.closest('[data-do]');
      if (!chip) return;
      input.value = chip.dataset.do;
      Validator.validateField(input);
      search(chip.dataset.do);
    });

    // Hanya izinkan angka
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '');
      if (digits !== input.value) input.value = digits;
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!Validator.validate(form)) {
        Message.warning('Periksa kembali Nomor DO yang Anda masukkan');
        return;
      }
      search(input.value.trim());
    });

    form.addEventListener('reset', () => {
      setTimeout(() => {
        Validator.reset(form);
        result.innerHTML = initialResult;
        history.replaceState(null, '', location.pathname);
        input.focus();
      });
    });

    result.addEventListener('click', async e => {
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        try {
          await navigator.clipboard.writeText(copyBtn.dataset.copy);
          Message.success('Nomor DO disalin ke clipboard');
        } catch (err) {
          Message.error('Gagal menyalin nomor DO');
        }
      }
      if (e.target.closest('[data-action="focus-search"]')) {
        input.select();
        input.focus();
      }
    });

    async function search(nomor) {
      setLoading(submitBtn, true);
      await wait(450); // simulasi request
      setLoading(submitBtn, false);

      const data = dataTracking[nomor];
      history.replaceState(null, '', `?do=${encodeURIComponent(nomor)}`);

      if (!data) {
        result.innerHTML = trackingNotFound(nomor);
        Message.error(`Nomor DO ${nomor} tidak ditemukan`);
        return;
      }
      const item = trackingList().find(d => d.nomorDO === nomor);
      result.innerHTML = trackingDetail(item);
      animateBars(result);
      Message.success('Data pengiriman ditemukan');
    }

    // Mendukung tautan langsung: tracking.html?do=2023001234
    const fromUrl = new URLSearchParams(location.search).get('do');
    if (fromUrl) {
      input.value = fromUrl.replace(/\D/g, '');
      if (Validator.validate(form)) search(input.value);
    }
  }

  function trackingNotFound(nomor) {
    return `
      <div class="card fade-in">
        <div class="result">
          <div class="result-icon is-warning">${icon('alert-circle')}</div>
          <h2 class="result-title">Nomor DO tidak ditemukan</h2>
          <p class="result-subtitle">Delivery Order dengan nomor <strong class="text-mono">${esc(nomor)}</strong> tidak terdaftar. Periksa kembali nomor DO Anda atau hubungi UPBJJ terkait.</p>
          <div class="result-extra"><button type="button" class="btn btn-primary" data-action="focus-search">${icon('search')} Cari Nomor Lain</button></div>
        </div>
      </div>`;
  }

  function trackingDetail(d) {
    const { current, done, percent } = d.progress;

    const steps = TRACK_STEPS.map((s, i) => {
      const state = i < current || done ? 'is-finish' : i === current ? 'is-process' : 'is-wait';
      return `
        <li class="step ${state}" ${i === current ? 'aria-current="step"' : ''}>
          <span class="step-icon">${icon(state === 'is-finish' ? 'check' : s.icon)}</span>
          <div>
            <div class="step-title">${s.title}</div>
            <div class="step-desc">${s.desc}</div>
          </div>
        </li>`;
    }).join('');

    const events = [...(d.perjalanan || [])].reverse();
    const timeline = events.length
      ? events.map((p, i) => `
          <li class="timeline-item ${i === 0 ? 'is-latest' : ''} ${i === 0 && done ? 'is-done' : ''}">
            <span class="timeline-dot"></span>
            <div class="timeline-content">${esc(p.keterangan)}</div>
            <div class="timeline-time"><time datetime="${esc(p.waktu.replace(' ', 'T'))}">${fmtDateTime(p.waktu)}</time></div>
          </li>`).join('')
      : `<li>${emptyState('Belum ada riwayat perjalanan')}</li>`;

    const desc = (iconName, label, value, extraCls = '') => `
      <div class="descriptions-item ${extraCls}">
        <dt>${icon(iconName)} ${label}</dt>
        <dd>${value}</dd>
      </div>`;

    return `
      <article class="card fade-in">
        <div class="card-body">
          <div class="track-summary">
            <div class="track-do">
              <span class="nav-tile-icon tone-blue">${icon('package')}</span>
              <div>
                <div class="text-muted">Nomor Delivery Order</div>
                <div class="track-do-number">${d.nomorDO}</div>
              </div>
            </div>
            <div class="space">
              <span class="tag tag-${d.statusInfo.tag}">${esc(d.statusInfo.label)}</span>
              <button type="button" class="btn btn-sm" data-copy="${d.nomorDO}">${icon('copy')} Salin No. DO</button>
            </div>
          </div>
          <div class="track-progress">
            <ol class="steps" aria-label="Tahapan pengiriman">${steps}</ol>
            ${progressBar(percent, done)}
          </div>
        </div>
      </article>

      <div class="grid grid-main-side mt-16 fade-in">
        <article class="card">
          <header class="card-head">
            <h2 class="card-title">${icon('report')} Detail Pengiriman</h2>
          </header>
          <div class="card-body">
            <dl class="descriptions descriptions-single">
              ${desc('user', 'Nama Mahasiswa', `<strong>${esc(d.nama)}</strong>`)}
              ${desc('activity', 'Status', `<span class="badge-dot ${d.statusInfo.dot}">${esc(d.statusInfo.label)}</span>`)}
              ${desc('truck', 'Ekspedisi', esc(d.ekspedisi))}
              ${desc('calendar', 'Tanggal Kirim', `<time datetime="${esc(d.tanggalKirim)}">${fmtDate(d.tanggalKirim)}</time>`)}
              ${desc('package', 'Jenis Paket', `<span class="text-mono">${esc(d.paket)}</span>${d.bahan ? `<div class="cell-sub">${esc(d.bahan.kodeBarang)} · ${esc(d.bahan.namaBarang)} (${esc(d.bahan.jenisBarang)})</div>` : ''}`)}
              ${desc('wallet', 'Total Pembayaran', `<strong class="text-success">${fmtRp(d.totalNum)}</strong>`)}
            </dl>
          </div>
        </article>

        <article class="card">
          <header class="card-head">
            <h2 class="card-title">${icon('pin')} Riwayat Perjalanan</h2>
            <span class="text-muted">${events.length} aktivitas</span>
          </header>
          <div class="card-body">
            <ol class="timeline">${timeline}</ol>
          </div>
        </article>
      </div>`;
  }

  /* =======================================================================
   * 8d. HALAMAN STOK BAHAN AJAR
   * ===================================================================== */
  function initStok() {
    renderBreadcrumb([{ label: 'Informasi Bahan Ajar' }]);

    const state = {
      q: '',
      jenis: '',
      status: '',
      sort: 'nama-asc',
      view: Store.get(KEYS.stokView, 'table'),
      highlight: null
    };

    const els = {
      stats: $('#stokStats'),
      body: $('#stokBody'),
      grid: $('#stokGridView'),
      tableView: $('#stokTableView'),
      footer: $('#stokFooter'),
      search: $('#stokSearch'),
      jenis: $('#stokJenis'),
      status: $('#stokStatus'),
      sort: $('#stokSort')
    };

    handleImageError(els.body);
    handleImageError(els.grid);
    handleImageError($('#detailModal'));

    function populateJenis() {
      const jenisList = [...new Set(dataBahanAjar.map(b => b.jenisBarang))].sort();
      els.jenis.innerHTML = '<option value="">Semua jenis</option>' +
        jenisList.map(j => `<option value="${esc(j)}">${esc(j)}</option>`).join('');
      els.jenis.value = jenisList.includes(state.jenis) ? state.jenis : '';
    }

    function filtered() {
      const q = state.q.toLowerCase();
      const rows = dataBahanAjar.filter(b =>
        (!q || [b.kodeBarang, b.namaBarang, b.kodeLokasi].join(' ').toLowerCase().includes(q)) &&
        (!state.jenis || b.jenisBarang === state.jenis) &&
        (!state.status || stockStatus(b.stok).key === state.status)
      );
      const [field, dir] = state.sort.split('-');
      rows.sort((a, b) => {
        const res = field === 'stok' ? a.stok - b.stok : a.namaBarang.localeCompare(b.namaBarang, 'id');
        return dir === 'desc' ? -res : res;
      });
      return rows;
    }

    function renderStats() {
      const totalStok = sum(dataBahanAjar, b => b.stok);
      const menipis = dataBahanAjar.filter(b => stockStatus(b.stok).key === 'menipis').length;
      els.stats.innerHTML = [
        statCard({ title: 'Total Judul', value: dataBahanAjar.length, unit: 'judul', iconName: 'book', tone: 'blue' }),
        statCard({ title: 'Total Stok', value: totalStok, unit: 'eks', iconName: 'layers', tone: 'green' }),
        statCard({ title: 'Stok Menipis', value: menipis, unit: 'judul', iconName: 'warning', tone: 'orange' }),
        statCard({ title: 'Kode Lokasi', value: new Set(dataBahanAjar.map(b => b.kodeLokasi)).size, unit: 'lokasi', iconName: 'pin', tone: 'purple' })
      ].join('');
      animateCounts(els.stats);
    }

    function render() {
      const rows = filtered();
      const max = Math.max(...dataBahanAjar.map(b => b.stok), 1);
      const empty = emptyState('Tidak ada bahan ajar yang cocok dengan pencarian/filter', 'search');

      els.body.innerHTML = rows.length
        ? rows.map(b => {
          const st = stockStatus(b.stok);
          const key = bahanKey(b);
          return `
            <tr class="is-clickable ${state.highlight === key ? 'is-new' : ''}" tabindex="0" data-key="${esc(key)}" aria-label="Lihat detail ${esc(b.namaBarang)}">
              <td>
                <div class="cell-book">
                  ${coverImg(b, 'thumb')}
                  <div>
                    <div class="cell-title">${esc(b.namaBarang)}</div>
                    <div class="cell-sub text-mono">${esc(b.kodeBarang)}</div>
                  </div>
                </div>
              </td>
              <td class="text-mono">${esc(b.kodeLokasi)}</td>
              <td><span class="tag tag-purple">${esc(b.jenisBarang)}</span></td>
              <td>Edisi ${esc(b.edisi)}</td>
              <td>
                <div class="mini-bar">
                  <div class="mini-bar-track"><div class="mini-bar-fill" data-width="${(b.stok / max) * 100}" style="background: var(--${st.key === 'menipis' ? 'warning' : st.key === 'cukup' ? 'primary' : 'success'})"></div></div>
                  <span class="mini-bar-value">${fmtNum(b.stok)}</span>
                </div>
              </td>
              <td><span class="tag tag-${st.tag}">${st.label}</span></td>
            </tr>`;
        }).join('')
        : `<tr><td colspan="6">${empty}</td></tr>`;

      els.grid.innerHTML = rows.length
        ? rows.map(b => {
          const st = stockStatus(b.stok);
          return `
            <button type="button" class="card book-card" data-key="${esc(bahanKey(b))}">
              <div class="book-cover">
                ${coverImg(b)}
                <span class="tag tag-${st.tag}">${st.label}</span>
              </div>
              <div class="book-body">
                <span class="cell-sub text-mono">${esc(b.kodeBarang)} · ${esc(b.kodeLokasi)}</span>
                <span class="book-title">${esc(b.namaBarang)}</span>
                <div class="book-meta">
                  <span class="tag tag-purple">${esc(b.jenisBarang)} · Ed. ${esc(b.edisi)}</span>
                  <span class="book-stock">${fmtNum(b.stok)}</span>
                </div>
              </div>
            </button>`;
        }).join('')
        : `<div style="grid-column: 1 / -1">${empty}</div>`;

      els.footer.innerHTML = `
        <span>Menampilkan <strong>${rows.length}</strong> dari ${dataBahanAjar.length} bahan ajar · total stok ${fmtNum(sum(rows, b => b.stok))} eksemplar</span>
        <span class="space">
          <span class="badge-dot success">Aman &ge; 300</span>
          <span class="badge-dot processing">Cukup 200–299</span>
          <span class="badge-dot warning">Menipis &lt; 200</span>
        </span>`;

      applyView();
      animateBars(els.body);
      state.highlight = null;
    }

    function applyView() {
      els.tableView.hidden = state.view !== 'table';
      els.grid.hidden = state.view !== 'grid';
      $$('[data-view-mode]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.viewMode === state.view)));
    }

    // --- Filter & toolbar ---
    $('#stokFilter').addEventListener('submit', e => e.preventDefault());
    els.search.addEventListener('input', debounce(() => { state.q = els.search.value.trim(); render(); }, 150));
    els.jenis.addEventListener('change', () => { state.jenis = els.jenis.value; render(); });
    els.status.addEventListener('change', () => { state.status = els.status.value; render(); });
    els.sort.addEventListener('change', () => { state.sort = els.sort.value; render(); });
    $$('[data-view-mode]').forEach(btn => btn.addEventListener('click', () => {
      state.view = btn.dataset.viewMode;
      Store.set(KEYS.stokView, state.view);
      applyView();
    }));

    // --- Detail (klik baris tabel / kartu) ---
    const openFromEvent = e => {
      const target = e.target.closest('[data-key]');
      if (target) openDetail(target.dataset.key);
    };
    els.body.addEventListener('click', openFromEvent);
    els.grid.addEventListener('click', openFromEvent);
    els.body.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFromEvent(e);
      }
    });

    function openDetail(key) {
      const b = dataBahanAjar.find(x => bahanKey(x) === key);
      if (!b) return;
      const st = stockStatus(b.stok);
      const relatedDO = Object.entries(dataTracking).filter(([, d]) => d.paket === b.kodeLokasi).map(([no]) => no);
      const row = (iconName, label, value) => `<div class="descriptions-item"><dt>${icon(iconName)} ${label}</dt><dd>${value}</dd></div>`;

      $('#detailTitle').textContent = b.namaBarang;
      $('#detailBody').innerHTML = `
        <div class="book-detail">
          <div class="book-detail-cover">${coverImg(b)}</div>
          <div>
            ${st.key === 'menipis' ? `<div class="alert alert-warning mb-16">${icon('warning')}<div><div class="alert-title">Stok menipis</div><div class="alert-desc">Disarankan melakukan pemesanan ulang bahan ajar ini.</div></div></div>` : ''}
            <dl class="descriptions">
              ${row('hash', 'Kode Barang', `<span class="text-mono">${esc(b.kodeBarang)}</span>`)}
              ${row('book', 'Nama', esc(b.namaBarang))}
              ${row('layers', 'Jenis', `<span class="tag tag-purple">${esc(b.jenisBarang)}</span>`)}
              ${row('report', 'Edisi', `Edisi ${esc(b.edisi)}`)}
              ${row('pin', 'Kode Lokasi', `<span class="text-mono">${esc(b.kodeLokasi)}</span>`)}
              ${row('package', 'Stok', `<strong>${fmtNum(b.stok)}</strong> eksemplar <span class="tag tag-${st.tag}">${st.label}</span>`)}
              ${row('truck', 'DO Terkait', relatedDO.length
                ? relatedDO.map(no => `<a class="text-mono" href="tracking.html?do=${no}">${no}</a>`).join(', ')
                : '<span class="text-muted">Tidak ada</span>')}
            </dl>
          </div>
        </div>`;

      $('#detailFooter').innerHTML = `
        ${b.custom ? `<button type="button" class="btn btn-danger" data-delete="${esc(key)}">${icon('trash')} Hapus</button>` : ''}
        <button type="button" class="btn btn-primary" data-modal-close>Tutup</button>`;

      Modal.open('detailModal');
    }

    $('#detailFooter').addEventListener('click', async e => {
      const btn = e.target.closest('[data-delete]');
      if (!btn) return;
      const ok = await Modal.confirm({
        type: 'warning',
        title: 'Hapus bahan ajar ini?',
        content: 'Data yang dihapus tidak dapat dikembalikan.',
        okText: 'Hapus',
        danger: true
      });
      if (!ok) return;
      const idx = dataBahanAjar.findIndex(b => bahanKey(b) === btn.dataset.delete);
      if (idx > -1) dataBahanAjar.splice(idx, 1);
      Store.set(KEYS.bahan, dataBahanAjar.filter(b => b.custom));
      Modal.close($('#detailModal'));
      populateJenis();
      renderStats();
      render();
      Message.success('Bahan ajar berhasil dihapus');
    });

    // --- Tambah bahan ajar ---
    const addModal = $('#addModal');
    const addForm = $('#addForm');
    Validator.bind(addForm);

    ['#addKodeBarang', '#addKodeLokasi'].forEach(sel => {
      $(sel).addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });
    });
    addModal.addEventListener('modal:open', () => $('#addKodeBarang').focus());
    addModal.addEventListener('close', () => Validator.reset(addForm));

    addForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!Validator.validate(addForm)) return;

      const data = Object.fromEntries(new FormData(addForm));
      const item = {
        kodeLokasi: data.kodeLokasi.trim().toUpperCase(),
        kodeBarang: data.kodeBarang.trim().toUpperCase(),
        namaBarang: data.namaBarang.trim(),
        jenisBarang: data.jenisBarang,
        edisi: String(Number(data.edisi)),
        stok: Number(data.stok),
        cover: '',
        custom: true
      };

      if (dataBahanAjar.some(b => bahanKey(b) === bahanKey(item))) {
        Validator.setFieldError($('#addKodeBarang'), `Kode ${item.kodeBarang} sudah ada di lokasi ${item.kodeLokasi}`);
        return;
      }

      const btn = $('[type="submit"]', addForm);
      setLoading(btn, true);
      await wait(500);
      setLoading(btn, false);

      dataBahanAjar.push(item);
      Store.set(KEYS.bahan, dataBahanAjar.filter(b => b.custom));
      Modal.close(addModal);

      // Reset filter agar data baru terlihat
      Object.assign(state, { q: '', jenis: '', status: '', highlight: bahanKey(item) });
      els.search.value = '';
      els.status.value = '';
      populateJenis();
      renderStats();
      render();
      Message.success(`${item.namaBarang} berhasil ditambahkan`);
    });

    populateJenis();
    els.sort.value = state.sort;
    renderStats();
    render();
  }

  /* =======================================================================
   * 9. INISIALISASI
   * ===================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    injectIconSprite();
    Modal.init();
    bindGlobalActions();

    const page = document.body.dataset.page;
    if (page !== 'login') {
      if (Store.get(KEYS.sider, false)) document.body.classList.add('is-sider-collapsed');
      renderSider();
      renderHeader();
      startClock();
    }

    const pages = {
      login: initLogin,
      dashboard: initDashboard,
      tracking: initTracking,
      stok: initStok
    };
    if (pages[page]) pages[page]();

    Theme.apply(Theme.current()); // sinkronkan ikon tema setelah header dirender
  });
})();
