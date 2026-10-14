/**
 * tracking.js — Halaman Tracking Pengiriman (tracking.html)
 * -----------------------------------------------------------------------------
 * Cari Delivery Order berdasarkan nomor DO dan tampilkan status pengirimannya.
 * Membutuhkan data.js dan script.js (dimuat lebih dulu di HTML).
 */

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

onPageReady(initTrackingPage);
