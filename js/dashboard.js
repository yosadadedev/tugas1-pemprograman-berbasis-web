/**
 * dashboard.js — Halaman Dashboard (dashboard.html)
 * -----------------------------------------------------------------------------
 * Satu halaman dengan 4 tampilan, dipilih lewat #hash pada URL:
 *   dashboard.html (beranda), #monitoring, #rekap, #histori
 * Membutuhkan data.js dan script.js (dimuat lebih dulu di HTML).
 */

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

onPageReady(initDashboardPage);
