# SITTA — Sistem Informasi Tiras & Transaksi Bahan Ajar

Aplikasi web sederhana untuk pemesanan dan pemantauan **Bahan Ajar Universitas Terbuka** oleh UT-Daerah.
Tugas Praktik 1 — Pemrograman Berbasis Web.

Aplikasi ini **front-end only**: tidak memakai back-end/database. Semua data dibaca dari file
`js/data.js`, dan data tambahan (akun baru, bahan ajar baru) disimpan di `localStorage` browser.
Tampilan mengikuti gaya **Ant Design** (warna, tombol, form, tabel, modal, notifikasi) dan
mendukung **mode gelap** serta **tampilan mobile**.

---

## Daftar Isi

1. [Cara Menjalankan](#cara-menjalankan)
2. [Akun & Data Uji](#akun--data-uji)
3. [Struktur Folder](#struktur-folder)
4. [Screenshot Tiap Halaman](#screenshot-tiap-halaman)
5. [Fitur per Kriteria Penilaian](#fitur-per-kriteria-penilaian)
6. [Catatan Teknis](#catatan-teknis)

---

## Cara Menjalankan

Tidak perlu instalasi apa pun. Pilih salah satu cara:

**Cara 1 — Buka langsung (paling mudah)**

1. Buka folder `sitta-praktik/`.
2. Klik dua kali file `index.html` (akan terbuka di browser).
3. Login dengan akun demo di bawah.

**Cara 2 — VS Code Live Server**

1. Buka folder `sitta-praktik/` di VS Code.
2. Install ekstensi **Live Server** (Ritwick Dey).
3. Klik kanan `index.html` → **Open with Live Server**.

**Cara 3 — Server lokal via terminal**

```bash
cd sitta-praktik
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

> Browser yang disarankan: Chrome, Edge, Firefox, atau Safari versi terbaru
> (aplikasi memakai elemen `<dialog>` untuk modal).

---

## Akun & Data Uji

Akun diambil dari variabel `dataPengguna` di `js/data.js`:

| Nama           | Email            | Password   | Role          |
| -------------- | ---------------- | ---------- | ------------- |
| Rina Wulandari | `rina@ut.ac.id`  | `rina123`  | UPBJJ-UT      |
| Agus Pranoto   | `agus@ut.ac.id`  | `agus123`  | UPBJJ-UT      |
| Siti Marlina   | `siti@ut.ac.id`  | `siti123`  | Puslaba       |
| Doni Setiawan  | `doni@ut.ac.id`  | `doni123`  | Fakultas      |
| Admin SITTA    | `admin@ut.ac.id` | `admin123` | Administrator |

Nomor Delivery Order (DO) untuk uji halaman Tracking:

| Nomor DO     | Mahasiswa      | Kondisi                         |
| ------------ | -------------- | ------------------------------- |
| `2023001234` | Rina Wulandari | Dalam perjalanan (progress 50%) |
| `2023005678` | Agus Pranoto   | Sudah diterima (progress 100%)  |
| `1111111111` | —              | Contoh nomor tidak ditemukan    |

---

## Struktur Folder

```
sitta-praktik/
├── index.html          → Halaman Login (+ modal Lupa Password & Daftar)
├── dashboard.html      → Dashboard / menu utama, Laporan, dan Histori Transaksi
├── tracking.html       → Tracking pengiriman berdasarkan Nomor DO
├── stok.html           → Informasi stok bahan ajar
├── css/
│   └── style.css       → Seluruh tampilan (design system ala Ant Design + mode gelap + responsive)
├── js/
│   ├── data.js         → Data dummy: dataPengguna, dataBahanAjar, dataTracking
│   └── script.js       → Seluruh logika JavaScript (DOM, validasi, modal, dll.)
├── assets/
│   ├── img/            → Gambar sampul bahan ajar
│   └── screenshots/    → Screenshot untuk README ini
└── README.md           → Dokumentasi (file ini)
```

### Penjelasan tiap file/folder

| File / Folder        | Fungsi |
| -------------------- | ------ |
| `index.html`         | Halaman pertama yang dibuka. Berisi form login (email & password), tombol **Lupa Password** dan **Daftar** yang membuka modal. Jika sudah login, otomatis diarahkan ke dashboard. |
| `dashboard.html`     | Menu utama setelah login. Menampilkan salam sesuai waktu (pagi/siang/sore/malam), ringkasan statistik, dan tombol navigasi. Halaman ini juga memuat 3 tampilan laporan yang dibuka lewat alamat `#monitoring`, `#rekap`, dan `#histori`. |
| `tracking.html`      | Form input Nomor DO. Setelah tombol **Cari** ditekan, tampil nama mahasiswa, status & tahapan pengiriman (progress bar), detail ekspedisi, tanggal kirim, jenis paket, total pembayaran, dan riwayat perjalanan. |
| `stok.html`          | Daftar bahan ajar yang dibangun dinamis dari `dataBahanAjar`. Ada pencarian, filter, pengurutan, tampilan tabel/kartu, detail, serta form tambah bahan ajar. |
| `css/style.css`      | Satu file CSS untuk semua halaman. Berisi *design token* (warna, radius, bayangan), komponen (Button, Input, Card, Table, Tag, Modal, Steps, Timeline, dll.), layout, mode gelap, dan aturan responsive/print. |
| `js/data.js`         | Data dummy pengganti database. Dimuat sebelum `script.js`. |
| `js/script.js`       | Satu file JS untuk semua halaman. Halaman aktif dikenali dari atribut `<body data-page="...">`. Isinya dibagi per modul: Storage, Ikon, Utilitas, Komponen UI (Message, Modal, Validator), Auth, Domain, Layout, dan logika tiap halaman. |
| `assets/img/`        | Sampul buku yang dipakai oleh `dataBahanAjar` (properti `cover`). |
| `assets/screenshots/`| Gambar dokumentasi; tidak dipakai oleh aplikasi. |

### Alur antar halaman

```
index.html ──(login berhasil)──► dashboard.html ──┬──► stok.html
     ▲                                            ├──► tracking.html
     │                                            ├──► dashboard.html#monitoring
     └────────────(Keluar / logout)───────────────├──► dashboard.html#rekap
                                                  └──► dashboard.html#histori
```

Halaman selain `index.html` **dilindungi**: jika dibuka tanpa login, pengguna otomatis
dikembalikan ke halaman login.

---

## Screenshot Tiap Halaman

### 1. Halaman Login — `index.html`

Tampilan awal: panel informasi di kiri, form login di kanan.

![Halaman login](assets/screenshots/01-login.png)

Validasi form — pesan error muncul di bawah setiap kolom yang kosong/salah format:

![Validasi login](assets/screenshots/02-login-validasi.png)

Pop-up ketika email/password salah:

![Login gagal](assets/screenshots/03-login-gagal.png)

Modal **Lupa Password**:

![Modal lupa password](assets/screenshots/04-lupa-password.png)

Modal **Daftar** beserta validasinya (wajib isi, format email, minimal 6 karakter, konfirmasi password, persetujuan):

![Modal daftar](assets/screenshots/05-daftar.png)

### 2. Dashboard — `dashboard.html`

Salam berdasarkan waktu lokal, jam berjalan, statistik ringkas, menu utama, pengiriman terbaru, dan stok bahan ajar.

![Dashboard](assets/screenshots/06-dashboard.png)

### 3. Laporan — Monitoring Progress DO — `dashboard.html#monitoring`

![Monitoring progress DO](assets/screenshots/07-monitoring-do.png)

### 4. Laporan — Rekap Bahan Ajar — `dashboard.html#rekap`

![Rekap bahan ajar](assets/screenshots/08-rekap-bahan-ajar.png)

### 5. Histori Transaksi — `dashboard.html#histori`

Bisa dicari dan difilter berdasarkan status, lengkap dengan total pembayaran.

![Histori transaksi](assets/screenshots/09-histori-transaksi.png)

### 6. Tracking Pengiriman — `tracking.html`

Hasil pencarian Nomor DO: tahapan pengiriman, progress bar, detail pengiriman, dan riwayat perjalanan.

![Tracking pengiriman](assets/screenshots/10-tracking.png)

Jika Nomor DO tidak ditemukan:

![Tracking tidak ditemukan](assets/screenshots/11-tracking-tidak-ditemukan.png)

### 7. Informasi Stok Bahan Ajar — `stok.html`

Tampilan tabel (dinamis dari `dataBahanAjar`):

![Stok tabel](assets/screenshots/12-stok-tabel.png)

Tampilan kartu:

![Stok kartu](assets/screenshots/13-stok-kartu.png)

Detail bahan ajar (klik baris/kartu):

![Detail bahan ajar](assets/screenshots/14-stok-detail.png)

Form **Tambah Bahan Ajar** dengan validasi:

![Tambah bahan ajar](assets/screenshots/15-stok-tambah.png)

### 8. Mode Gelap

Klik ikon bulan/matahari di header untuk berganti tema. Pilihan tema diingat browser.

![Mode gelap](assets/screenshots/16-dark-mode.png)

### 9. Tampilan Mobile

| Dashboard | Menu samping |
| --------- | ------------ |
| ![Mobile dashboard](assets/screenshots/17-mobile-dashboard.png) | ![Mobile menu](assets/screenshots/18-mobile-menu.png) |

---

## Fitur per Kriteria Penilaian

| Kriteria | Implementasi |
| -------- | ------------ |
| **1.1 HTML semantik & valid** | `<!DOCTYPE html>`, `lang="id"`, `<header>`, `<nav>`, `<main>`, `<aside>`, `<section>`, `<article>`, `<footer>`, `<dialog>`, `<dl>` untuk detail, `<table>` dengan `<thead>/<tbody>/<tfoot>` dan `scope`, `<time datetime>`, label untuk setiap input, atribut ARIA, dan *skip link*. |
| **1.2 Desain CSS** | *Design token* dengan CSS variables, komponen seragam ala Ant Design, Flexbox & Grid, animasi halus, mode gelap, responsive (desktop → tablet → mobile), dan gaya cetak (print). |
| **1.3 JavaScript DOM** | Render dinamis tabel/kartu/statistik dari `data.js`, pencarian & filter langsung, salam & jam real-time, modal, dropdown, menu samping, animasi angka/bar, perpindahan tampilan via `#hash`, serta tambah/hapus data. |
| **1.4 Validasi form & alert** | Validasi langsung saat mengetik (wajib isi, format email, panjang minimal, pola Nomor DO 10 digit, kode barang, angka min/max, konfirmasi password). Pop-up login gagal, konfirmasi logout/hapus, dan notifikasi *toast* sukses/error. |
| **1.5 Modularitas file** | Struktur folder sesuai ketentuan. Satu `style.css` dan satu `script.js` yang dibagi per modul, sementara data terpisah di `data.js`. Sider & header dirender dari satu fungsi agar seragam di semua halaman. |
| **1.6 Kreativitas** | Mode gelap, akun demo "isi otomatis", tampilan tabel/kartu, tahapan pengiriman (Steps) + timeline, tombol salin Nomor DO, tautan langsung `tracking.html?do=...`, laporan bisa dicetak, menu samping yang bisa diperkecil, tampilan mobile. |

---

## Catatan Teknis

- **Perubahan pada `data.js`** dari file yang dilampirkan:
  - Tag `<script>` pembungkus dihapus agar valid sebagai file `.js`.
  - `var` diganti `const` (sesuai soal: *"variable konstanta dataBahanAjar"*).
  - Path sampul disesuaikan ke `assets/img/...`, dan `paud_perkembangan.jpg` → `.jpeg` sesuai nama file aslinya.
  - Typo `nomorDO` pada DO `2023005678` (sebelumnya tertulis `2023001234`) diperbaiki.
- **Status DO** ditentukan dari riwayat perjalanan. Contoh: DO `2023005678` berstatus "Dikirim" di data,
  tetapi riwayat terakhirnya "Selesai Antar", sehingga ditampilkan sebagai **Diterima (100%)**.
- **Penyimpanan browser** (`localStorage`/`sessionStorage`) dipakai untuk: sesi login ("Ingat saya"),
  akun hasil daftar, bahan ajar tambahan, pilihan tema, dan mode tampilan stok.
  Untuk mengembalikan ke data awal, hapus *site data* browser atau jalankan `localStorage.clear()` di Console.
- Halaman login bernama `index.html` (bukan `login.html`) mengikuti struktur folder pada soal.
