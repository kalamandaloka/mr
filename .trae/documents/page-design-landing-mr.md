# Page Design Spec — Rombakan Landing & Scene Menu (Desktop-first)

## Global Styles (applies to all pages)
- Layout system: CSS Grid untuk struktur halaman + Flexbox untuk alignment komponen.
- Design tokens:
  - Background: #0B0F14 (dark)
  - Surface/Card: #121826
  - Primary accent: #4F8CFF
  - Text primary: #E6EDF7, text secondary: #9AA7B8
  - Border: rgba(255,255,255,0.08)
  - Radius: 16px (card), 10px (button)
  - Typography scale (desktop): H1 40/48, H2 28/36, Body 16/24, Caption 13/18
- Button styles:
  - Primary: background accent, text putih, hover: sedikit lebih terang, disabled: opacity 0.5
  - Secondary: outline border, hover: background surface
- Link styles: underline on hover, warna accent.
- Motion: transisi 160–220ms (opacity/transform) untuk hover card & tombol.

---

## Page 1 — Landing / Module Selection

### Layout
- Desktop-first: container max-width 1120px, center aligned, padding 48px.
- Grid 2 kolom untuk selection cards (gap 24px). Pada layar kecil turun jadi 1 kolom.

### Meta Information
- Title: "MR — Pilih Modul"
- Description: "Pilih modul pengalaman 3D (Sepeda Motor atau Mobil Listrik) dan lanjutkan ke menu scene."
- Open Graph: og:title sama dengan title, og:description sama, og:type "website".

### Page Structure
1) Top bar (ringan)
2) Hero / heading
3) Module selection cards (2 kartu)
4) Footer actions (CTA lanjut + hint input XR)

### Sections & Components
- Top bar
  - Logo/nama aplikasi di kiri.
  - Aksi kecil di kanan: indikator status XR (lihat di bawah).
- Hero
  - H1: "Pilih Modul"
  - Subtext: instruksi singkat bahwa pilihan menentukan daftar scene berikutnya.
- Module Selection Cards
  - Card “Sepeda Motor”
    - Judul + deskripsi singkat.
    - State: default / hover / selected.
  - Card “Mobil Listrik”
    - Sama seperti di atas.
  - Interaction:
    - Klik memilih (single-select).
    - Selected state menampilkan border accent + checkmark/label “Dipilih”.
- XR Input Status
  - Komponen status kecil (badge) dengan 3 kemungkinan:
    - “Controller terdeteksi”
    - “Hand tracking terdeteksi”
    - “XR tidak tersedia / belum aktif”
  - Catatan: hanya menampilkan status, tidak menambah flow baru.
- Primary CTA
  - Tombol utama: “Lanjut ke Menu Scene 3D” (disabled jika belum memilih modul).

---

## Page 2 — Scene Menu 3D

### Layout
- Full-bleed canvas 3D (mengisi viewport).
- Overlay UI (HTML) di atas canvas menggunakan position: fixed dan safe padding.
- Desktop-first overlay: panel kiri untuk daftar scene + area kanan untuk preview/status.

### Meta Information
- Title: "MR — Menu Scene 3D"
- Description: "Pilih scene dalam lingkungan 3D, lalu muat manifest untuk memulai."
- Open Graph: og:title, og:description, og:type.

### Page Structure
1) 3D Canvas (background + menu objek 3D)
2) Overlay panel: daftar scene + tombol aksi
3) Overlay status: loading / error
4) Navigation back

### Sections & Components
- 3D Canvas Area
  - Menampilkan “scene menu” 3D.
  - Interaction:
    - Seleksi item menu dengan XRController ray (laser pointer) atau hand-based pointer.
    - Fokus/hover state: highlight pada item yang diarahkan.
- Scene List Panel (overlay)
  - Judul: menampilkan modul terpilih (Sepeda Motor/Mobil Listrik).
  - Daftar scene (list atau cards kecil) sinkron dengan menu 3D.
  - Aksi: “Muat Scene” (memicu load manifest untuk scene terpilih).
- Loading State
  - Progress indicator (spinner/bar) + teks: “Memuat manifest…” dan/atau “Memuat asset…”.
  - Menonaktifkan interaksi pemilihan saat loading.
- Error State
  - Pesan error singkat (mis. manifest tidak ditemukan / gagal diparse).
  - Tombol: “Coba Lagi” (ulang load manifest) dan “Kembali” (ke landing).
- Navigation Back
  - Tombol “Ganti Modul” kembali ke Landing.

### Responsive behavior
- Di bawah 900px: panel overlay berubah menjadi drawer bawah (bottom sheet) agar canvas tetap dominan.
- Ukuran target klik minimum 44px untuk elemen overlay.
