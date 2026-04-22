# NalarXR MR Platform – Product & Technical Blueprint

## 1. Tujuan Produk

NalarXR akan dibangun sebagai **platform pembelajaran praktik Mixed Reality berbasis WebXR** untuk SMK, dengan fokus awal pada **sepeda motor**.

Platform ini terdiri dari 3 bagian utama:

1. **Frontend Web Admin / Authoring**
   - untuk membuat modul
   - membuat scene
   - upload asset GLB
   - membuat content card, instruction, hotspot, quiz, evaluation
   - mengatur interaction binding berbasis data
   - publish modul

2. **Frontend MR Runtime / WebXR**
   - untuk siswa menggunakan Meta Quest
   - load scene dari backend
   - load asset GLB dari storage
   - render objek, HUD, info card, practice flow
   - menjalankan interaction controller
   - menyimpan progress dan hasil evaluasi

3. **Backend API**
   - Node.js + Prisma + MySQL
   - menyimpan module, scene, object, content, interaction config, progress, evaluation
   - menyajikan scene manifest ke frontend MR
   - menerima upload metadata asset dan hasil interaksi user

## 2. Keputusan Teknologi

### Backend
- Node.js
- Prisma ORM
- MySQL
- REST API
- Object storage untuk asset `.glb`, image, audio, thumbnail

### Frontend Web Admin
- Next.js
- TypeScript
- Tailwind CSS
- UI style: glassmorphism
- state management: Zustand atau TanStack Query + local UI state
- form builder untuk module, scene, content, interaction config

### Frontend MR Runtime
- Next.js atau React terpisah
- Three.js + React Three Fiber
- WebXR API
- hand tracking + controller support
- Zustand untuk runtime state
- scene manifest loader dari backend

## 3. Visual Direction UI

### Referensi visual
UI harus mengikuti gaya seperti gambar referensi:
- panel transparan
- efek glassmorphism
- garis tipis biru muda / cyan terang
- sudut rounded
- teks putih atau biru terang
- glow halus
- elemen HUD terasa futuristik tetapi tetap bersih
- tidak terlalu ramai
- fokus pada objek pembelajaran utama

### Aturan visual utama
- background UI semi-transparan
- border 1px tipis biru muda
- blur ringan di belakang panel
- ikon sederhana line style
- panel tidak menutupi objek utama
- card info dibuat modular dan konsisten antar modul

## 4. Prinsip Arsitektur Utama

### Prinsip 1 — Pisahkan data dan controller
Dalam runtime MR selalu ada 2 domain:

#### A. Content Data
Data yang berasal dari database:
- module
- scene
- object placement
- asset URL
- content card
- instruction
- hotspot
- label
- practice step
- evaluation
- interaction binding

#### B. Interaction Controller
Logic universal yang hidup di frontend MR:
- select
- hover
- grab
- release
- rotate
- snap
- trigger animation
- open content
- validate step
- calculate score
- move to next scene

**Kesimpulan:**  
database menentukan **apa yang ditampilkan**  
controller menentukan **bagaimana sistem bereaksi**

## 5. Struktur Produk Akademik

### Modul utama
1. Keselamatan & Pengenalan Sepeda Motor
2. Sistem Mesin
3. Sistem Bahan Bakar
4. Sistem Kelistrikan
5. Sistem Transmisi
6. Sistem Pengereman & Suspensi

### Struktur scene tetap untuk setiap modul
1. Orientasi
2. Overview
3. Komponen
4. Cara Kerja
5. Praktek
6. Evaluasi

## 6. Struktur Lengkap Modul dan Scene

# Modul 1 — Keselamatan & Pengenalan Sepeda Motor

## Scene 1 — Orientasi
**Tujuan**
- mengenal lingkungan bengkel virtual
- mengenal cara interaksi di Quest
- mengenal aturan dasar K3

**Materi**
- APD
- area aman vs area bahaya
- etika kerja bengkel
- pengenalan pointer, gesture, grab

**Objek**
- helm
- sarung tangan
- sepatu safety
- toolbox
- motor utuh
- meja kerja

**Output**
- user paham onboarding
- user dapat masuk ke scene berikutnya

## Scene 2 — Overview
**Tujuan**
- memahami motor sebagai satu sistem utuh

**Materi**
- sistem mesin
- sistem bahan bakar
- sistem kelistrikan
- sistem rem
- sistem suspensi
- sistem transmisi

**Objek**
- motor full assembly

**Output**
- user memahami peta utama sistem

## Scene 3 — Komponen
**Tujuan**
- mengenali bagian umum motor

**Materi**
- body
- rangka
- roda
- mesin
- rem
- lampu
- suspensi

**Output**
- user mengenal nama dan lokasi bagian utama

## Scene 4 — Cara Kerja
**Tujuan**
- memahami hubungan antar sistem

**Materi**
- alur tenaga
- peran bahan bakar
- peran listrik
- peran rem
- peran suspensi

**Output**
- user memahami gambaran besar kerja motor

## Scene 5 — Praktek
**Tujuan**
- latihan dasar identifikasi dan persiapan kerja

**Aktivitas**
- memilih APD yang benar
- menempatkan tool ke tray
- memilih bagian motor sesuai instruksi

## Scene 6 — Evaluasi
**Evaluasi**
- pilih APD benar
- identifikasi bagian motor
- pilih area kerja aman

# Modul 2 — Sistem Mesin

## Scene 1 — Orientasi
**Materi**
- fungsi mesin
- prinsip dasar pembakaran
- target belajar modul mesin

## Scene 2 — Overview
**Materi**
- posisi mesin pada motor
- blok utama mesin
- sub-sistem pelumasan dan valve train

## Scene 3 — Komponen
**Materi**
- piston
- ring piston
- silinder
- kepala silinder
- katup masuk
- katup buang
- camshaft
- crankshaft
- busi

## Scene 4 — Cara Kerja
**Materi**
- 4 langkah: hisap, kompresi, usaha, buang
- timing katup
- alur pelumasan dasar

## Scene 5 — Praktek
**Aktivitas**
- bongkar piston sederhana
- lepas kepala silinder
- pasang kembali komponen
- pilih tool yang tepat
- cek urutan kerja

## Scene 6 — Evaluasi
**Evaluasi**
- urutan bongkar pasang
- identifikasi komponen
- cocokkan fase mesin
- pilih gejala kerusakan sederhana

# Modul 3 — Sistem Bahan Bakar

## Scene 1 — Orientasi
**Materi**
- fungsi sistem bahan bakar
- tujuan modul

## Scene 2 — Overview
**Materi**
- tangki
- jalur bahan bakar
- throttle body / injector
- ruang bakar

## Scene 3 — Komponen
**Materi**
- tangki
- pompa
- filter
- injector
- throttle body
- sensor dasar
- actuator dasar

## Scene 4 — Cara Kerja
**Materi**
- aliran bahan bakar
- tekanan
- pencampuran udara dan bahan bakar
- hubungan sensor-ECU-actuator secara konsep

## Scene 5 — Praktek
**Aktivitas**
- identifikasi jalur bahan bakar
- simulasi fault sederhana
- pilih komponen yang dicurigai
- lakukan urutan troubleshooting

## Scene 6 — Evaluasi
**Evaluasi**
- cocokkan gejala dengan sumber masalah
- identifikasi sensor vs actuator
- pilih langkah pemeriksaan

# Modul 4 — Sistem Kelistrikan

## Scene 1 — Orientasi
**Materi**
- fungsi kelistrikan
- sumber tenaga listrik
- keselamatan kerja listrik

## Scene 2 — Overview
**Materi**
- baterai
- fuse
- lampu
- starter
- sistem charging

## Scene 3 — Komponen
**Materi**
- baterai
- fuse
- lampu utama
- lampu sein
- horn
- saklar
- wiring dasar
- starter relay

## Scene 4 — Cara Kerja
**Materi**
- suplai arus
- on/off circuit
- starter flow
- charging sederhana
- pengaruh fuse putus

## Scene 5 — Praktek
**Aktivitas**
- cek baterai dengan multimeter virtual
- ganti fuse
- lepas/pasang baterai
- cari penyebab lampu tidak menyala

## Scene 6 — Evaluasi
**Evaluasi**
- identifikasi komponen listrik
- cari penyebab gangguan
- susun urutan pemeriksaan aman

# Modul 5 — Sistem Transmisi

## Scene 1 — Orientasi
**Materi**
- fungsi transmisi
- tujuan modul

## Scene 2 — Overview
**Materi**
- alur tenaga mesin ke roda
- transmisi manual vs matic

## Scene 3 — Komponen
**Materi**
- kopling
- gear
- pulley
- belt
- final drive
- kabel kopling

## Scene 4 — Cara Kerja
**Materi**
- perpindahan tenaga
- kerja kopling
- perubahan rasio
- gejala slip/noise

## Scene 5 — Praktek
**Aktivitas**
- setel free play kopling
- identifikasi komponen
- pasang komponen transmisi sederhana
- susun alur tenaga

## Scene 6 — Evaluasi
**Evaluasi**
- urutkan alur tenaga
- identifikasi gejala gangguan
- tentukan setting yang benar

# Modul 6 — Sistem Pengereman & Suspensi

## Scene 1 — Orientasi
**Materi**
- fungsi rem
- fungsi suspensi
- hubungan kenyamanan dan keselamatan

## Scene 2 — Overview
**Materi**
- rem depan/belakang
- suspensi depan/belakang

## Scene 3 — Komponen
**Materi**
- master cylinder
- selang rem
- caliper
- pad
- drum brake
- shock absorber
- spring
- oil seal
- fork

## Scene 4 — Cara Kerja
**Materi**
- tekanan hidrolik
- gesekan pad/shoe
- kerja shock absorber
- gejala bocor atau free play berlebih

## Scene 5 — Praktek
**Aktivitas**
- cek minyak rem
- cek ketebalan pad/shoe
- setel free play
- cek seal shock
- bongkar pasang sederhana

## Scene 6 — Evaluasi
**Evaluasi**
- identifikasi komponen
- pilih gejala kerusakan
- tentukan langkah pemeriksaan
- setel free play ke target

## 7. Arsitektur Proyek

```text
nalarxr-platform/
├── apps/
│   ├── frontend-web-admin/
│   ├── frontend-mr-runtime/
│   └── backend-api/
├── packages/
│   ├── shared-types/
│   ├── shared-ui/
│   └── shared-config/
└── docs/
```

## 8. Struktur Frontend Web Admin

```text
frontend-web-admin/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── modules/
│   │   ├── scenes/
│   │   ├── assets/
│   │   ├── content-blocks/
│   │   ├── interactions/
│   │   ├── evaluations/
│   │   ├── publish/
│   │   └── settings/
│   ├── components/
│   ├── forms/
│   ├── services/
│   ├── stores/
│   ├── types/
│   ├── hooks/
│   └── utils/
```

### Halaman utama admin
- `/dashboard`
- `/modules`
- `/modules/[id]`
- `/scenes`
- `/scenes/[id]`
- `/assets`
- `/content-blocks`
- `/interactions`
- `/evaluations`
- `/publish`
- `/analytics`

### Fungsi admin
- create/edit/delete module
- create/edit/delete scene
- upload GLB
- assign GLB ke scene object
- buat card
- buat hotspot
- buat instruction
- buat practice steps
- buat evaluation
- mapping interaction
- preview manifest
- publish version

## 9. Struktur Frontend MR Runtime

```text
frontend-mr-runtime/
├── src/
│   ├── app/
│   ├── core/
│   ├── xr/
│   ├── renderer/
│   ├── controllers/
│   ├── services/
│   ├── stores/
│   ├── ui/
│   ├── scene-types/
│   │   ├── orientation/
│   │   ├── overview/
│   │   ├── components/
│   │   ├── mechanism/
│   │   ├── practice/
│   │   └── evaluation/
│   ├── hooks/
│   ├── types/
│   └── utils/
```

### Tujuan runtime MR
- load module manifest
- load scene manifest
- render environment dan objects
- attach interaction bindings
- render UI glassmorphism
- simpan progress
- submit hasil evaluasi

## 10. Struktur Backend API

```text
backend-api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── modules/
│   ├── scenes/
│   ├── assets/
│   ├── scene-objects/
│   ├── content-blocks/
│   ├── interactions/
│   ├── practice-steps/
│   ├── evaluations/
│   ├── progress/
│   ├── activity-logs/
│   ├── auth/
│   ├── users/
│   ├── uploads/
│   └── common/
```

### Backend responsibilities
- auth
- CRUD module
- CRUD scene
- upload asset metadata
- generate scene manifest
- save progress
- save activity logs
- save evaluation result

## 11. Desain Database Konseptual

### tables utama

```text
users
- id
- name
- email
- password_hash
- role
- created_at
- updated_at

modules
- id
- title
- slug
- description
- category
- thumbnail_url
- status
- version
- created_at
- updated_at

scenes
- id
- module_id
- title
- slug
- scene_type
- order_no
- description
- environment_preset
- status
- created_at
- updated_at

assets
- id
- name
- file_type
- file_url
- thumbnail_url
- mime_type
- size
- version
- uploaded_by
- created_at
- updated_at

scene_objects
- id
- scene_id
- asset_id
- object_key
- object_name
- position_x
- position_y
- position_z
- rotation_x
- rotation_y
- rotation_z
- scale_x
- scale_y
- scale_z
- is_interactive
- metadata_json
- created_at
- updated_at

content_blocks
- id
- scene_id
- block_type
- title
- body
- media_url
- position_json
- style_json
- trigger_type
- target_object_key
- order_no
- is_active
- created_at
- updated_at

interaction_configs
- id
- scene_id
- object_key
- interaction_type
- action_type
- target_type
- target_ref
- condition_json
- payload_json
- priority
- is_active
- created_at
- updated_at

practice_steps
- id
- scene_id
- step_no
- title
- instruction
- expected_action
- target_object_key
- target_anchor_key
- validation_rule_json
- success_feedback
- fail_feedback
- score_value
- created_at
- updated_at

evaluations
- id
- scene_id
- title
- evaluation_type
- config_json
- passing_score
- created_at
- updated_at

user_progress
- id
- user_id
- module_id
- scene_id
- current_step
- completion_percent
- last_state_json
- started_at
- updated_at

activity_logs
- id
- user_id
- module_id
- scene_id
- object_key
- interaction_type
- action_result
- payload_json
- created_at
```

## 12. Prisma Relationship Konsep

```text
User 1---n UserProgress
User 1---n ActivityLog

Module 1---n Scene
Scene 1---n SceneObject
Scene 1---n ContentBlock
Scene 1---n InteractionConfig
Scene 1---n PracticeStep
Scene 1---n Evaluation

Asset 1---n SceneObject
Module 1---n UserProgress
Scene 1---n UserProgress
```

## 13. API Endpoint Konsep

### Module
- `GET /api/modules`
- `POST /api/modules`
- `GET /api/modules/:id`
- `PATCH /api/modules/:id`
- `DELETE /api/modules/:id`

### Scene
- `GET /api/modules/:moduleId/scenes`
- `POST /api/modules/:moduleId/scenes`
- `GET /api/scenes/:id`
- `PATCH /api/scenes/:id`
- `DELETE /api/scenes/:id`

### Asset
- `POST /api/assets/upload`
- `GET /api/assets`
- `GET /api/assets/:id`
- `DELETE /api/assets/:id`

### Scene Object
- `POST /api/scenes/:sceneId/objects`
- `PATCH /api/scene-objects/:id`
- `DELETE /api/scene-objects/:id`

### Content Block
- `POST /api/scenes/:sceneId/content-blocks`
- `PATCH /api/content-blocks/:id`
- `DELETE /api/content-blocks/:id`

### Interaction Config
- `POST /api/scenes/:sceneId/interactions`
- `PATCH /api/interactions/:id`
- `DELETE /api/interactions/:id`

### Practice Step
- `POST /api/scenes/:sceneId/practice-steps`
- `PATCH /api/practice-steps/:id`

### Evaluation
- `POST /api/scenes/:sceneId/evaluations`
- `PATCH /api/evaluations/:id`

### Manifest
- `GET /api/runtime/modules/:moduleId/manifest`
- `GET /api/runtime/scenes/:sceneId/manifest`

### Progress
- `POST /api/runtime/progress`
- `POST /api/runtime/activity-log`
- `POST /api/runtime/evaluation-result`

## 14. Scene Manifest Format

```json
{
  "scene": {
    "id": "scene-engine-components",
    "title": "Komponen Mesin",
    "type": "components",
    "orderNo": 3
  },
  "environment": {
    "preset": "workshop-glass-blue",
    "spawnPoint": [0, 1.6, 0],
    "passthrough": true
  },
  "objects": [
    {
      "objectKey": "engine-main",
      "objectName": "Engine Main",
      "assetUrl": "https://cdn.example.com/assets/engine.glb",
      "position": [0, 1.2, -1.6],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "interactive": true,
      "metadata": {
        "category": "engine",
        "label": "Mesin Utama"
      }
    }
  ],
  "contentBlocks": [
    {
      "id": "card-piston",
      "type": "card",
      "title": "Piston",
      "body": "Piston menerima tekanan hasil pembakaran dan meneruskannya ke poros engkol.",
      "style": {
        "variant": "glass-blue"
      }
    }
  ],
  "interactions": [
    {
      "objectKey": "piston",
      "interactionType": "select",
      "actionType": "open_content",
      "targetType": "content_block",
      "targetRef": "card-piston"
    }
  ],
  "practiceSteps": [],
  "evaluation": null
}
```

## 15. Definisi Ulang Sistem Controller & Hand Interaction

### Prinsip
Kita tidak boleh menyamakan:
- event hardware
- event WebXR
- aksi pembelajaran

Sistem harus dibagi tiga layer:

### Layer A — Input Source Layer
Mendeteksi sumber input:
- left controller
- right controller
- left hand
- right hand

### Layer B — Input Event Layer
Mendeteksi event mentah:
- selectstart
- select
- selectend
- squeezestart
- squeeze
- squeezeend
- hand joint pose updates
- target ray hit
- pinch heuristic
- near-touch heuristic

### Layer C — App Action Layer
Mengubah event mentah menjadi aksi aplikasi:
- hover
- point
- select object
- open card
- close card
- grab object
- release object
- rotate object
- scale object
- snap object
- trigger animation
- next step
- submit answer
- reset scene

## 16. Tiga Space Input di Three.js yang Wajib Dipisah

### 1. Target Ray Space
Dipakai untuk:
- pointer
- raycast
- UI select
- jauh dari objek

### 2. Grip Space
Dipakai untuk:
- objek yang terasa dipegang di tangan
- tool virtual
- obeng, kunci, multimeter

### 3. Hand Space
Dipakai untuk:
- hand tracking
- gesture
- pinch interaction
- near interaction
- natural UI

## 17. Mapping Input yang Disarankan

### A. Controller Mapping

#### Point / Hover
- sumber: target ray
- fungsi:
  - hover button
  - highlight object
  - focus panel
  - preview card

#### Select
- sumber: `selectstart/select/selectend`
- fungsi:
  - klik button
  - buka card
  - pilih jawaban evaluasi
  - pilih komponen

#### Squeeze / Grab
- sumber: `squeezestart/squeeze/squeezeend`
- fungsi:
  - grab tool
  - grab komponen
  - tarik tuas
  - pegang object saat praktik

#### Drag
- kombinasi:
  - squeeze + controller movement
- fungsi:
  - memindahkan komponen
  - menarik slider
  - mengatur object ke target anchor

#### Rotate
- 2 mode:
  - one-hand rotate via wrist delta
  - UI rotate button
- fungsi:
  - memutar komponen saat inspeksi
  - memeriksa sisi belakang object

#### Snap
- kombinasi:
  - release object near valid anchor
- fungsi:
  - pasang piston ke cylinder
  - pasang fuse ke slot
  - pasang baterai ke tray

#### Press / Trigger Action
- fungsi:
  - play animation
  - next step
  - reset practice
  - replay explanation

### B. Hand Tracking Mapping

#### Hand Point
- fungsi:
  - pilih button
  - hover panel
  - pilih hotspot

#### Pinch Select
- fungsi:
  - klik card
  - pilih jawaban
  - aktifkan hotspot

#### Pinch Hold
- fungsi:
  - tahan object ringan
  - drag card
  - geser slider

#### Near Grab
- fungsi:
  - ambil tool
  - pegang komponen
  - pindahkan object

#### Rotate by Wrist
- fungsi:
  - inspeksi komponen
  - putar object dengan satu tangan

#### Two-Hand Scale
- fungsi:
  - zoom object
  - perbesar komponen untuk inspeksi

#### Two-Hand Rotate
- fungsi:
  - putar engine assembly
  - orientasi object besar

#### Palm Press UI
- opsional
- fungsi:
  - tekan tombol besar
  - konfirmasi langkah

## 18. Daftar Fungsi Controller yang Wajib Ada di NalarXR

### Fungsi universal
- `hover`
- `focus`
- `select`
- `deselect`
- `openContent`
- `closeContent`
- `grab`
- `release`
- `drag`
- `rotate`
- `scale`
- `snap`
- `triggerAnimation`
- `playNarration`
- `nextStep`
- `previousStep`
- `submit`
- `reset`

### Fungsi pembelajaran
- `markComponentViewed`
- `validatePracticeStep`
- `recordAttempt`
- `recordMistake`
- `completeScene`
- `completeModule`
- `saveProgress`

### Fungsi evaluasi
- `chooseAnswer`
- `checkAnswer`
- `submitEvaluation`
- `calculateScore`
- `showResult`

## 19. Rekomendasi Implementasi Teknis Interaksi

### Gunakan abstraction berikut

```text
Input Source
-> Raw XR Event
-> Normalized Interaction
-> App Action
-> Scene State Update
-> Backend Sync
```

### Contoh
```text
right hand pinch
-> normalized as SELECT
-> if target is content hotspot
-> open card
-> update ui store
-> log activity
```

Contoh lain:
```text
right controller squeeze + release near anchor
-> normalized as GRAB / RELEASE
-> if validation rule exists
-> snap object
-> validate step
-> update progress
-> send activity log
```

## 20. Sistem Scene Runtime

### Runtime flow
1. user masuk ke modul
2. app minta module manifest
3. app load scene pertama
4. app minta scene manifest
5. asset loader load GLB
6. object renderer pasang object
7. interaction controller attach rules
8. UI controller render panel
9. progress controller mulai tracking
10. activity logger kirim event ke backend

## 21. State Management MR

### runtime store
- currentModule
- currentScene
- currentSceneType
- selectedObject
- grabbedObject
- hoveredObject
- openedContentBlock
- activePracticeStep
- score
- handMode
- controllerMode
- xrSessionState

### progress store
- moduleCompletion
- sceneCompletion
- stepCompletion
- mistakes
- viewedComponents
- answeredQuestions

### ui store
- leftPanelOpen
- rightPanelOpen
- instructionOpen
- cardOpen
- resultOpen
- currentHint

## 22. UI MR yang Direkomendasikan

### Layout
- panel kiri: navigasi scene / sistem
- panel kanan: card info / langkah / evaluasi
- area tengah: objek utama
- floating HUD: hint, next, reset
- mini progress bar: tipis di bawah atau samping

### Gaya panel
- background biru transparan
- blur ringan
- border cyan tipis
- shadow glow lembut
- teks putih / cyan
- icon line minimalis

### Aturan UX
- panel tidak boleh menutupi objek utama
- jangan terlalu banyak card muncul bersamaan
- one primary action per moment
- selalu ada tombol hint dan reset
- selalu ada indicator scene dan progress

## 23. Pemisahan Frontend Web dan MR

### Frontend Web Admin
fokus pada:
- authoring
- CMS
- data entry
- asset management
- publish

### Frontend MR Runtime
fokus pada:
- rendering
- interaction
- practice flow
- evaluation flow
- progress tracking

**Jangan campur keduanya dalam satu codebase feature level.**  
Boleh monorepo, tetapi app terpisah.

## 24. Prioritas MVP

### MVP Stage 1
- auth admin
- module CRUD
- scene CRUD
- asset upload
- scene object placement
- content block CRUD
- interaction config CRUD
- runtime scene loader
- basic controller input
- basic hand select
- progress save

### MVP Stage 2
- practice step validation
- evaluation engine
- score engine
- analytics dashboard
- fault simulation
- two-hand manipulation

### MVP Stage 3
- versioning modul
- collaborative authoring
- advanced hand gesture
- adaptive assessment
- MR environment anchoring

## 25. Spesifikasi Brief untuk TRAE AI

### Yang harus dibuat terlebih dahulu
1. monorepo project structure
2. backend Node.js + Prisma + MySQL
3. frontend web admin Next.js
4. frontend MR runtime Next.js/React + Three.js + WebXR
5. shared types
6. scene manifest contract
7. glassmorphism design system
8. interaction abstraction layer

### Backend minimal deliverables
- Prisma schema
- migration
- auth
- module/scene/asset/content/interaction CRUD
- upload service
- manifest endpoint
- progress endpoint
- evaluation endpoint

### Frontend web minimal deliverables
- login
- dashboard
- module manager
- scene manager
- asset uploader
- content block form
- interaction config builder
- publish page

### Frontend MR minimal deliverables
- XR session start
- immersive-ar support
- scene manifest loader
- GLB loader
- pointer select
- controller grab
- hand pinch select
- UI HUD glassmorphism
- progress sync

## 26. Final Product Statement

NalarXR bukan sekadar aplikasi simulasi motor.

NalarXR adalah:

**Data-driven WebXR Mixed Reality Learning Platform**  
untuk pembelajaran praktik SMK,  
di mana:
- konten, asset, scene, card, instruction, dan evaluasi disimpan di backend,
- sedangkan frontend MR bertindak sebagai runtime engine yang merender scene dan mengeksekusi interaction controller secara modular.
