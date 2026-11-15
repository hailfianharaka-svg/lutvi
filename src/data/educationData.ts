export interface BullyingEducationCard {
  id: string;
  title: string;
  subtitle: string;
  accentHex: string;
  surfaceBg: string;
  borderColor: string;
  kidExplanation: string;
  examples: string[];
  whatToDo: string;
}

export const BULLYING_EDUCATION_CARDS: BullyingEducationCard[] = [
  {
    id: 'fisik',
    title: 'Perundungan Fisik',
    subtitle: 'Menyakiti tubuh atau merusak barang teman',
    accentHex: '#DC2626',
    surfaceBg: 'bg-rose-50/90',
    borderColor: 'border-rose-200',
    kidExplanation:
      'Ini terjadi ketika seseorang memakai tangan, kaki, atau benda untuk membuat tubuh kita sakit atau mengambil barang milik kita tanpa izin.',
    examples: [
      'Memukul, menendang, mencubit, atau mendorong dengan sengaja.',
      'Menjegal kaki teman yang sedang berjalan agar jatuh.',
      'Merusak buku, menyembunyikan tas, atau meminta uang jajan secara paksa.',
    ],
    whatToDo:
      'Segera menjauh ke tempat yang ada guru atau orang dewasa, jangan membalas memukul, lalu ceritakan ke Wali Kelas atau Bapak Fajar.',
  },
  {
    id: 'verbal',
    title: 'Perundungan Verbal',
    subtitle: 'Kata-kata yang melukai perasaan dan hati',
    accentHex: '#D97706',
    surfaceBg: 'bg-amber-50/90',
    borderColor: 'border-amber-200',
    kidExplanation:
      'Walau tidak meninggalkan luka di kulit, ucapan yang kasar atau mengejek bisa membuat hati sedih dan takut berangkat ke sekolah.',
    examples: [
      'Memberi nama julukan yang jelek atau menertawakan bentuk tubuh.',
      'Membentak, mengancam, atau menghina orang tua teman.',
      'Terus-terusan bilang "itu cuma bercanda" padahal kita sudah merasa sakit hati.',
    ],
    whatToDo:
      'Katakan dengan tegas "Aku tidak suka kata-kata itu!", tarik napas tenang, dan laporkan ke Guru atau DIPSI.',
  },
  {
    id: 'sosial',
    title: 'Perundungan Sosial',
    subtitle: 'Sengaja mengucilkan agar teman sendirian',
    accentHex: '#0284C7',
    surfaceBg: 'bg-sky-50/90',
    borderColor: 'border-sky-200',
    kidExplanation:
      'Terjadi saat ada anak atau kelompok yang sengaja membuat kita tidak punya teman, menjauhi kita, atau menyebar cerita bohong.',
    examples: [
      'Melarang teman lain bermain atau duduk bersama kita.',
      'Membisik-bisikkan gosip bohong supaya semua orang membenci kita.',
      'Sengaja meninggalkan atau menertawakan kita di depan banyak orang.',
    ],
    whatToDo:
      'Ingat bahwa kamu tetap anak yang berharga. Cari teman lain yang baik dan minta bantuan guru untuk membantu mencairkan suasana.',
  },
  {
    id: 'digital',
    title: 'Perundungan Digital (Cyber)',
    subtitle: 'Mengganggu lewat HP, chat, atau game online',
    accentHex: '#4F46E5',
    surfaceBg: 'bg-indigo-50/90',
    borderColor: 'border-indigo-200',
    kidExplanation:
      'Bully juga bisa terjadi lewat layar HP, aplikasi pesan WhatsApp, media sosial, atau ruang obrolan saat bermain game online.',
    examples: [
      'Mengirim pesan teks, stiker, atau komentar yang menghina dan mengancam.',
      'Mengambil foto atau video teman tanpa izin lalu menyebarkannya untuk bahan tertawaan.',
      'Sengaja mengeluarkan teman dari grup belajar atau grup main untuk mempermalukan.',
    ],
    whatToDo:
      'Jangan balas pesan kasarnya! Simpan bukti foto layar (screenshot), blokir akun pengganggu bersama Ayah/Bunda, dan lapor ke TPPK.',
  },
  {
    id: 'seksual',
    title: 'Pelecehan Seksual & Sentuhan Aman',
    subtitle: 'Menjaga area tubuh pribadi dari siapa pun',
    accentHex: '#BE123C',
    surfaceBg: 'bg-pink-50/90',
    borderColor: 'border-pink-200',
    kidExplanation:
      'Tubuhmu adalah milikmu yang sangat berharga. Area mulut, dada, area tertutup celana dalam (kemaluan), dan bokong adalah AREA PRIBADI yang tidak boleh disentuh, dilihat, atau difoto oleh siapa pun.',
    examples: [
      'Sentuhan BOLEH: Salaman, tos, pelukan hangat dari Ayah/Bunda yang membuat nyaman, atau pemeriksaan dokter yang ditemani orang tua.',
      'Sentuhan TIDAK BOLEH: Menyentuh area pribadi, memaksa membuka baju, mencium paksa, atau menunjukkan gambar/video tidak sopan.',
      'Jika ada yang bilang "Jangan bilang siapa-siapa ya, ini rahasia kita", itu TANDA BAHAYA!',
    ],
    whatToDo:
      'Berteriaklah "TIDAK!" atau "JANGAN!", lari segera ke tempat ramai atau orang dewasa tepercaya, dan ceritakan semuanya ke Orang Tua & Bapak Fajar TPPK.',
  },
];

export interface TouchRuleItem {
  type: 'Boleh' | 'Tidak Boleh';
  title: string;
  description: string;
}

export const TOUCH_RULES: TouchRuleItem[] = [
  {
    type: 'Boleh',
    title: 'Tos atau jabat tangan penuh semangat',
    description: 'Membuat kita merasa gembira, dihargai, dan aman bersama teman atau guru.',
  },
  {
    type: 'Boleh',
    title: 'Pelukan sayang dari orang tua saat sedih',
    description: 'Menenangkan hati tanpa menyentuh area pribadi dan membuat perasaan hangat.',
  },
  {
    type: 'Boleh',
    title: 'Pemeriksaan dokter saat sakit',
    description: 'Selalu didampingi langsung oleh Ayah, Bunda, atau wali terpercaya dengan izin kita.',
  },
  {
    type: 'Tidak Boleh',
    title: 'Menyentuh area tertutup baju & celana dalam',
    description: 'Mulut, dada, kemaluan, dan bokong tidak boleh disentuh atau difoto siapa pun.',
  },
  {
    type: 'Tidak Boleh',
    title: 'Sentuhan yang membuat takut atau jijik',
    description: 'Walau pelakunya orang dikenal atau lebih tua, perasaan tidak nyaman adalah alarm bahaya.',
  },
  {
    type: 'Tidak Boleh',
    title: 'Diminta merahasiakan sentuhan atau hadiah',
    description: 'Kejutan ulang tahun itu rahasia baik, tetapi rahasia tentang tubuh harus langsung diceritakan ke orang tua!',
  },
];

export interface MiniQuizQuestion {
  id: string;
  scenario: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export const MINI_QUIZ_QUESTIONS: MiniQuizQuestion[] = [
  {
    id: 'q1',
    scenario:
      'Saat jam istirahat, Riko berkali-kali menertawakan sepatu Budi sampai Budi hampir menangis, lalu Riko bilang "Ah, cuma bercanda kok!". Ini termasuk apa ya?',
    choices: [
      'Bercanda biasa yang wajar',
      'Perundungan Verbal karena menyakiti hati teman berulang kali',
      'Perundungan Digital',
    ],
    correctIndex: 1,
    explanation:
      'Benar! Jika teman sudah sedih atau tersakiti, itu bukan lagi bercanda melainkan Perundungan Verbal.',
  },
  {
    id: 'q2',
    scenario:
      'Sari sengaja dikeluarkan dari grup WhatsApp kelas dan foto lucunya yang memalukan disebar tanpa izin oleh teman sekelasnya. Apa langkah terbaik yang harus dilakukan Sari?',
    choices: [
      'Membalas menyebar foto jelek temannya juga',
      'Diam saja dan tidak usah masuk sekolah',
      'Simpan bukti screenshot, beri tahu orang tua, dan lapor ke DIPSI atau Bapak Fajar',
    ],
    correctIndex: 2,
    explanation:
      'Tepat sekali! Jangan membalas dengan kejahatan serupa. Simpan bukti dan minta bantuan orang dewasa tepercaya.',
  },
  {
    id: 'q3',
    scenario:
      'Ada orang dewasa yang memberi permen lalu menyentuh dada atau area celana dalam seorang anak sambil berbisik "Jangan bilang mama ya". Apa yang harus dilakukan?',
    choices: [
      'Menolak dengan tegas "JANGAN!", lari ke tempat aman, dan langsung cerita ke orang tua / Bapak Fajar',
      'Menuruti karena sudah diberi permen',
      'Menyimpannya sebagai rahasia sendiri',
    ],
    correctIndex: 0,
    explanation:
      'Hebat! Itu adalah Sentuhan Tidak Boleh. Jangan pernah merahasiakan sentuhan yang melanggar area pribadi.',
  },
];
