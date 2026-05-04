# Spesifikasi Desain (Desktop-first): Glassmorphism untuk ContentCard & VideoPanel

## 1) Global Styles (Design Tokens)
**Warna & Opacity**
- Glass fill: `rgba(255,255,255,0.36)` (setara: putih opacity 0.36)
- Stroke/border: `#FFFFFF` (solid)
- Emissive intensity (stroke): `0.5`

**Kedalaman & Layering**
- `zOffsetKonten` default: `+0.002` (relative terhadap permukaan kaca)
- Prinsip: permukaan kaca selalu di belakang konten.

**Tipografi (minimum agar terbaca di kaca)**
- Font: Sans-serif aplikasi (default)
- Ukuran desktop: 14–16px untuk body; 18–24px untuk judul
- Warna teks: `#FFFFFF` dengan opacity 0.85–1.0 (hindari abu-abu redup di atas kaca)

**Interaksi**
- Hover (desktop): tingkatkan keterbacaan, bukan mengubah “preset” utama.
  - Contoh: naikkan opacity teks atau tambahkan sedikit peningkatan emissive pada stroke (maks +0.1).

## 2) Layout (Desktop-first)
- Komponen ditata dalam scene/kanvas 3D (R3F) dengan pendekatan **stacked layers**:
  1) Glass surface (plane/rounded plane)
  2) Border/stroke (opsional terpisah)
  3) Konten (group) dengan z-offset
- Spacing internal mengikuti *card padding* konsisten (mis. 16–24px ekuivalen world-unit sesuai skala scene).

## 3) Meta Information
- Title: mengikuti halaman/scene tempat komponen dipakai.
- Description/OG: tidak spesifik komponen (mengikuti halaman).

## 4) Spesifikasi Komponen

### 4.1 ContentCard
**Tujuan visual:** kartu konten dengan efek kaca/blur sesuai Figma.

**Struktur**
- `ContentCardRoot` (group)
  - `GlassSurfaceMesh` (kaca)
  - `BorderMesh` (stroke putih solid + emissive 0.5) — bila dipisah
  - `ContentGroup` (teks/ikon/CTA) dengan z-offset

**Glass Surface (kaca)**
- Fill: putih opacity 0.36
- Material: `MeshTransmissionMaterial`
  - transmission: 0.64
  - roughness: 0.2
  - thickness: 0.1

**Stroke / Border**
- Warna: putih solid
- Emissive: 0.5
- Ketebalan border: tipis dan konsisten; bila pakai mesh terpisah, scale sedikit lebih besar dari kaca.

**Z-offset konten**
- `ContentGroup.position.z = +zOffsetKonten`
- Jika ada elemen multi-layer (judul + body + icon), semua tetap berada di dalam ContentGroup agar offset konsisten.

### 4.2 VideoPanel
**Tujuan visual:** panel video/preview dengan efek kaca yang sama seperti ContentCard.

**Struktur**
- `VideoPanelRoot` (group)
  - `GlassSurfaceMesh` (kaca)
  - `BorderMesh` (stroke + emissive)
  - `VideoPlane` atau `VideoContentGroup` (konten video) dengan z-offset

**Glass Surface (kaca)**
- Menggunakan preset yang sama persis:
  - fill putih opacity 0.36
  - MeshTransmissionMaterial: transmission 0.64, roughness 0.2, thickness 0.1

**Stroke / Border**
- Putih solid + emissive 0.5 (konsisten dengan ContentCard)

**Z-offset konten video**
- `VideoPlane.position.z = +zOffsetKonten`
- Jika ada overlay (judul kecil/durasi), taruh di depan video dengan offset tambahan kecil (mis. `+0.001` di atas video) tanpa melewati batas keterbacaan.

## 5) Responsiveness (ringkas)
- Desktop-first: ukuran card/panel diperbesar dan spacing longgar.
- Di layar lebih kecil: pertahankan preset material; hanya skala dimensi komponen dan jarak antar komponen.
