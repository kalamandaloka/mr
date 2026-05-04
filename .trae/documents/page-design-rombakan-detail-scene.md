# Spesifikasi Desain Halaman (Desktop-first)

## 1) Halaman: Detail Scene (Admin)

### Layout
- Desktop-first, **2 kolom** (CSS Grid):
  - Kolom kiri: **Panel Input** (sticky, lebar ±380–420px).
  - Kolom kanan: **Panel List** + panel lain (flex/stacked).
- Grid dasar: `grid-cols-[420px_1fr]` dengan gap 20–24px.
- Breakpoint:
  - < 1024px: menjadi 1 kolom (panel input pindah ke atas sebagai accordion).

### Meta Information
- Title: `Scene Detail - {scene.title}`
- Description: `Kelola object, content blocks, interaction, practice, evaluation untuk scene.`
- Open Graph: title mengikuti meta title; url mengikuti /scenes/{id}; type `website`.

### Global Styles
- Background: gradien gelap (navy/sky) konsisten dengan GlassPanel.
- Typography:
  - Heading: 18–20px semibold.
  - Body: 14px.
  - Helper/metadata: 12px dengan opacity 60–70%.
- CTA Button:
  - Primary: border cyan + bg cyan/10, hover cyan/15.
  - Danger: border rose + bg rose/10.
- State:
  - Disabled: opacity 60%.
  - Focus: border cyan 35%.

### Page Structure
1. Header halaman (judul + breadcrumb opsional)
2. Panel ringkasan scene (status + tombol Save/Refresh)
3. Area kerja utama:
   - Kolom kiri: Panel Input (khusus content blocks)
   - Kolom kanan: Panel List per tipe + panel objects/interactions/steps/evaluation

---

## 2) Komponen Utama

### A. Header + Ringkasan Scene
- Elemen:
  - Judul “Scene Detail”
  - Baris ringkasan: orderNo, title, sceneType, slug
  - Status selector + tombol Save + Refresh
- Interaksi:
  - Save men-disable tombol saat request berjalan.
  - Refresh melakukan re-fetch seluruh data.

### B. Content Blocks — Panel Input (kiri, sticky)
**Tujuan:** memisahkan input dari list dan mendukung dynamic add.

- Container: GlassPanel “Content Block Editor”
- Bagian 1: Mode indicator
  - Badge: `Mode: Tambah` atau `Mode: Edit (id: xxx)`
  - Tombol “Batal” saat edit
- Bagian 2: Pemilih tipe (dynamic)
  - Segmented control / select: `card | instruction | hotspot | label`
  - Saat user menekan tombol “Tambah” dari panel list tipe tertentu, tipe otomatis terpilih (preselect).
- Bagian 3: Form field (tetap sesuai data saat ini)
  - Title (optional)
  - Body (RichTextEditor)
  - Order No
  - Trigger Type (optional)
  - Target Object (dropdown dari objects)
  - Active (checkbox)
- Bagian 4: Tombol aksi
  - Primary: “Tambah” atau “Simpan”
  - Secondary: “Reset” (hanya saat mode Tambah)
- Validasi & error:
  - Error backend tampil sebagai alert kecil di atas form.
  - Saat sukses, form reset dan fokus kembali ke Title agar cepat menambah berikutnya.

### C. Content Blocks — Panel List per Tipe (kanan)
**Tujuan:** list terpisah per `blockType` agar mudah dipindai.

- Container: GlassPanel “Content Blocks”
- Struktur:
  - Tab atau accordion per tipe:
    - Tab: `Card`, `Instruction`, `Hotspot`, `Label`
    - Default tab: tipe dengan item terbanyak, atau `card`.
  - Di dalam tiap tipe:
    - Header tipe + tombol “Tambah {tipe}” (mengisi Panel Input dengan tipe tsb).
    - List item (card rows) terurut `orderNo ASC, createdAt ASC`.
- Item row:
  - Title/Untitled + label tipe
  - Meta: `orderNo`, `active/inactive`, `targetObjectKey` (jika ada)
  - Actions:
    - “Edit” → mengisi Panel Input dengan data item.
    - “Enable/Disable” → toggle isActive.
    - “Delete” → konfirmasi singkat.

### D. Konsistensi Data dengan Backend (aturan UI)
- Semua aksi create/update/delete:
  1) Disable tombol yang relevan saat request berjalan.
  2) Jika sukses, update list memakai respons backend.
  3) Jalankan **re-fetch terarah** (minimal: content-blocks saja) untuk revalidasi.
- Saat berpindah `sceneId`:
  - Reset state editor (mode Tambah, form kosong) lalu load ulang data.
- Jika item yang sedang diedit terhapus/berubah dari backend setelah refresh:
  - Keluar dari mode edit dan tampilkan pesan singkat “Data berubah, editor direset.”

---

## 3) Catatan Responsif
- < 1024px:
  - Panel Input menjadi accordion di atas panel list.
  - Tombol “Tambah {tipe}” tetap mengarahkan (scroll) ke Panel Input.
