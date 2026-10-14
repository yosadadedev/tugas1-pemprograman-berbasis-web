/**
 * stok.js — Halaman Informasi Stok Bahan Ajar (stok.html)
 * -----------------------------------------------------------------------------
 * Tabel bahan ajar dari dataBahanAjar: cari, filter, urutkan, detail,
 * serta tambah & hapus bahan ajar.
 * Membutuhkan data.js dan script.js (dimuat lebih dulu di HTML).
 */

// --- Helper khusus bahan ajar ----------------------------------------------

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

// --- Halaman ----------------------------------------------------------------

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

onPageReady(initStokPage);
