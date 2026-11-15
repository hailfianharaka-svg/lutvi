import {
  AdminStats,
  BULLYING_CATEGORIES,
  BullyingCategory,
  CounselingReport,
  CurhatProfile,
  FOLLOW_UP_STATUSES,
  MOOD_OPTIONS,
  MoodType,
  UserRole,
} from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: CurhatProfile;
}

const PSEUDONYM_PREFIXES = [
  'Bintang',
  'Pelangi',
  'Awan',
  'Kancil',
  'Merpati',
  'Matahari',
  'Kupu',
  'Tunas',
];

const PSEUDONYM_SUFFIXES = [
  'Ceria',
  'Pagi',
  'Hangat',
  'Damai',
  'Berani',
  'Harapan',
  'Lestari',
  'Ramah',
];

export function generateSafePseudonym(seed?: number): string {
  const idxA =
    seed !== undefined
      ? Math.abs(seed) % PSEUDONYM_PREFIXES.length
      : Math.floor(Math.random() * PSEUDONYM_PREFIXES.length);
  const idxB =
    seed !== undefined
      ? Math.abs(seed * 3 + 1) % PSEUDONYM_SUFFIXES.length
      : Math.floor(Math.random() * PSEUDONYM_SUFFIXES.length);
  const num = seed !== undefined ? (Math.abs(seed) % 89) + 10 : Math.floor(Math.random() * 89) + 10;
  return `${PSEUDONYM_PREFIXES[idxA]} ${PSEUDONYM_SUFFIXES[idxB]} #${num}`;
}

export function validateProfileInput(input: Partial<CurhatProfile>): ValidationResult {
  const errors: string[] = [];

  const identityMode = input.identityMode === 'Anonim' ? 'Anonim' : 'Lengkap';
  const role: UserRole = input.role === 'Orang Tua' ? 'Orang Tua' : 'Siswa';
  const grade = Number(input.grade);
  const age = Number(input.age);
  const mood = input.mood as MoodType;
  const rawName = (input.reporterName ?? '').trim();

  if (!rawName) {
    errors.push(
      identityMode === 'Lengkap'
        ? 'Nama lengkap wajib diisi sebelum memulai curhat.'
        : 'Nama samaran wajib diisi (atau gunakan tombol Buat Nama Samaran).'
    );
  } else if (rawName.length < 2 || rawName.length > 60) {
    errors.push('Nama harus terdiri dari 2 sampai 60 karakter.');
  }

  if (!Number.isInteger(grade) || grade < 1 || grade > 6) {
    errors.push('Pilihan kelas hanya tersedia untuk Kelas 1 sampai Kelas 6.');
  }

  if (!Number.isInteger(age) || age < 6 || age > 14) {
    errors.push('Usia harus berada pada rentang 6 sampai 14 tahun.');
  }

  const validMoods = MOOD_OPTIONS.map((m) => m.value);
  if (!validMoods.includes(mood)) {
    errors.push('Silakan pilih suasana hati terlebih dahulu.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      identityMode,
      reporterName: rawName,
      role,
      grade,
      age,
      mood,
    },
  };
}

const SEXUAL_KEYWORDS = [
  'area pribadi',
  'bagian pribadi',
  'bagian terlarang',
  'kemaluan',
  'kelamin',
  'celana dalam',
  'buka baju',
  'buka celana',
  'telanjang',
  'pegang dada',
  'pegang pantat',
  'pegang bokong',
  'sentuh dada',
  'sentuh pantat',
  'sentuh bokong',
  'sentuhan tidak boleh',
  'diraba',
  'meraba',
  'dicium paksa',
  'cium bibir',
  'dipeluk paksa',
  'pelecehan',
  'dilecehkan',
  'foto tubuh',
  'video porno',
  'jangan bilang siapa',
  'rahasia kita berdua',
];

const DIGITAL_KEYWORDS = [
  'whatsapp',
  'grup wa',
  'chat jahat',
  'komentar jahat',
  'medsos',
  'media sosial',
  'instagram',
  'tiktok',
  'facebook',
  'game online',
  'roblox',
  'mobile legends',
  'free fire',
  'sebar foto',
  'edit foto',
  'dikick dari grup',
  'dikeluarkan dari grup',
  'cyber',
  'akun palsu',
  'stiker ejekan',
  'pesan ancaman',
  'hp',
  'dm ',
  'chat',
];

const PHYSICAL_KEYWORDS = [
  'pukul',
  'dipukul',
  'memukul',
  'tonjok',
  'ditonjok',
  'tendang',
  'ditendang',
  'tampar',
  'ditampar',
  'dorong',
  'didorong',
  'jambak',
  'dijambak',
  'cubit',
  'dicubit',
  'jegal',
  'dijegal',
  'lempar',
  'dilempar',
  'lukai',
  'memar',
  'berdarah',
  'sakit badan',
  'dirusak barang',
  'tas diambil',
  'uang jajan diambil',
  'dipalak',
  'palak',
  'dicekik',
];

const SOCIAL_KEYWORDS = [
  'kucil',
  'dikucilkan',
  'mengucilkan',
  'dijauhi',
  'tidak diajak',
  'nggak diajak',
  'gak diajak',
  'ga diajak',
  'tidak boleh ikut',
  'sendirian',
  'gosip',
  'digosipkan',
  'fitnah',
  'difitnah',
  'diblokir',
  'dihasut',
  'jangan temani',
  'tidak punya teman',
  'ditinggal',
  'diabaikan',
];

const VERBAL_KEYWORDS = [
  'ejek',
  'diejek',
  'mengejek',
  'olok',
  'diolok',
  'hina',
  'dihina',
  'caci',
  'maki',
  'bentak',
  'dibentak',
  'ancam',
  'diancam',
  'julukan',
  'panggil jelek',
  'katain',
  'dikatai',
  'bodoh',
  'gendut',
  'kurus',
  'hitam',
  'miskin',
  'yatim',
  'ditertawakan',
  'ketawain',
  'teriaki',
  'diteriaki',
];

const POSITIVE_KEYWORDS = [
  'senang',
  'gembira',
  'bahagia',
  'seru',
  'asik',
  'asyik',
  'menyenangkan',
  'bermain bersama',
  'teman baik',
  'dapat nilai bagus',
  'juara',
  'pujian',
  'aman',
  'nyaman',
  'sayang',
  'rukun',
];

export function classifyBullyingHeuristic(text: string): BullyingCategory {
  const normalized = text.toLowerCase();

  if (SEXUAL_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return 'Indikasi Pelecehan Seksual';
  }
  if (PHYSICAL_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return 'Perundungan Fisik';
  }
  if (DIGITAL_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return 'Perundungan Digital (Cyberbullying)';
  }
  if (SOCIAL_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return 'Perundungan Sosial';
  }
  if (VERBAL_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return 'Perundungan Verbal';
  }
  if (POSITIVE_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return 'Aman/Menyenangkan';
  }

  return 'Aman/Menyenangkan';
}

export function isCategoryRisky(category: BullyingCategory): boolean {
  return category !== 'Aman/Menyenangkan';
}

export function buildFallbackOpening(profile: CurhatProfile): string {
  const isParent = profile.role === 'Orang Tua';
  const greetingName = profile.reporterName;

  if (isParent) {
    if (profile.mood === 'Senang') {
      return `Halo Ayah/Bunda (${greetingName}), senang sekali berjumpa! Aku DIPSI, sahabat curhat aman SDN Kotalama 3. Cerita positif atau perkembangan baik apa yang ingin Ayah/Bunda bagikan tentang ananda di Kelas ${profile.grade} hari ini?`;
    }
    return `Halo Ayah/Bunda (${greetingName}), terima kasih sudah mempercayai DIPSI sebagai ruang aman SDN Kotalama 3. Aku memahami suasana hati saat ini terasa ${profile.mood.toLowerCase()}. Boleh ceritakan kejadian tidak mengenakkan apa yang dialami ananda (Kelas ${profile.grade}, usia ${profile.age} tahun) agar kita bisa mencarikan langkah perlindungan terbaik?`;
  }

  if (profile.mood === 'Senang') {
    return `Hai ${greetingName}! Aku DIPSI, teman rahasiamu di SDN Kotalama 3 yang selalu siap mendengarkan. Wah, aku senang melihat kamu merasa bahagia hari ini! Boleh cerita kejadian seru atau hal menyenangkan apa yang baru saja kamu alami di sekolah atau di rumah?`;
  }

  if (profile.mood === 'Sedih') {
    return `Hai ${greetingName}, peluk hangat dari DIPSI untukmu. Tidak apa-apa kok kalau hari ini kamu merasa sedih—kamu aman bercerita di sini. Kalau kamu nyaman, hal apa yang membuat hatimu sedih hari ini? Pelan-pelan saja ceritanya ya, DIPSI dengarkan.`;
  }

  if (profile.mood === 'Takut') {
    return `Hai ${greetingName}, kamu sudah sangat berani mau membuka cerita ke DIPSI. Di sini kamu aman dan rahasiamu dijaga. Apa ada seseorang atau suatu kejadian yang membuatmu merasa takut atau khawatir akhir-akhir ini?`;
  }

  if (profile.mood === 'Kesal') {
    return `Hai ${greetingName}, DIPSI mengerti rasanya kesal dan jengkel itu memang bikin dada sesak. Kamu boleh luapkan ceritamu dengan aman di sini. Memangnya ada kejadian tidak adil atau sikap teman yang membuatmu kesal hari ini?`;
  }

  return `Hai ${greetingName}, terima kasih sudah memberi tahu DIPSI kalau kamu sedang merasa sakit atau tidak nyaman. Kesehatan dan rasa amanmu itu paling penting. Bagian mana yang terasa tidak nyaman atau kejadian apa yang baru saja terjadi? Ceritakan pelan-pelan ke DIPSI ya.`;
}

export function buildFallbackReply(
  category: BullyingCategory,
  profile: CurhatProfile
): { reply: string; summary: string; needsUrgentTppk: boolean } {
  const isParent = profile.role === 'Orang Tua';
  const callName = isParent ? `Ayah/Bunda ${profile.reporterName}` : profile.reporterName;

  switch (category) {
    case 'Indikasi Pelecehan Seksual':
      return {
        reply: `${callName}, terima kasih banyak karena sudah sangat berani menceritakan hal ini kepada DIPSI. Kamu sama sekali tidak bersalah atas kejadian itu. Tubuhmu adalah milikmu yang berharga dan tidak boleh ada siapa pun yang menyentuh atau memaksa melihat bagian pribadi tubuhmu. Tolong segera ceritakan hal ini kepada orang tua dan Bapak Fajar (Ketua Tim TPPK SDN Kotalama 3) di nomor 082334660789 agar kamu langsung mendapat perlindungan penuh ya.`,
        summary:
          'Terdeteksi indikasi pelecehan seksual atau sentuhan tidak aman; membutuhkan pendampingan segera oleh Tim TPPK SDN Kotalama 3 dan orang tua.',
        needsUrgentTppk: true,
      };
    case 'Perundungan Fisik':
      return {
        reply: `${callName}, DIPSI ikut prihatin mendengar hal itu. Memukul, mendorong, atau menyakiti tubuhmu bukanlah bercanda dan tidak pernah bisa dibenarkan. Kamu berhak merasa aman di sekolah! Jika kamu sedang merasa sakit, segera temui guru piket atau UKS, lalu sampaikan kejadian ini kepada wali kelas dan Bapak Fajar (Ketua Tim TPPK SDN Kotalama 3, WA: 082334660789). Boleh ceritakan siapa yang melakukan dan kapan kejadiannya terjadi?`,
        summary:
          'Terindikasi perundungan fisik terhadap siswa; perlu verifikasi keamanan fisik, pemantauan kelas, dan tindak lanjut TPPK.',
        needsUrgentTppk: true,
      };
    case 'Perundungan Digital (Cyberbullying)':
      return {
        reply: `${callName}, membaca pesan jahat, ejekan di grup, atau gangguan lewat HP/game pasti membuat hati tidak nyaman dan cemas. Kamu tidak salah ya. Langkah pertama yang bisa kamu lakukan sekarang adalah jangan membalas pesan jahatnya, minta bantuan orang tua untuk menyimpan bukti tangkapan layar (screenshot), lalu laporkan bersama ke Bapak Fajar di Tim TPPK SDN Kotalama 3 (082334660789). Di aplikasi atau grup mana kejadiannya berlangsung?`,
        summary:
          'Terindikasi perundungan digital (cyberbullying) melalui pesan/grup/game daring; disarankan simpan bukti dan koordinasi dengan wali kelas/TPPK.',
        needsUrgentTppk: true,
      };
    case 'Perundungan Sosial':
      return {
        reply: `${callName}, dijauhi atau sengaja tidak diajak bermain memang membuat hati terasa sepi dan sedih sekali. Ingat ya, kamu tetap anak yang berharga dan layak punya teman baik. Kamu tidak harus menghadapi ini sendirian. Yuk kita ceritakan juga ke wali kelas atau Bapak Fajar (TPPK SDN Kotalama 3) agar guru bisa membantu membangun suasana berteman yang rukun lagi di kelas.`,
        summary:
          'Terindikasi perundungan sosial berupa pengucilan atau penyebaran rumor di lingkungan sebaya; perlu mediasi sosial oleh guru/TPPK.',
        needsUrgentTppk: true,
      };
    case 'Perundungan Verbal':
      return {
        reply: `${callName}, kata-kata ejekan atau julukan yang menyakitkan itu memang bisa bikin hati terluka, walau orang lain bilang cuma bercanda. Perasaanmu itu valid dan penting. Kalau diejek lagi, kamu boleh bilang tegas "Aku tidak suka diejek!" lalu menjauh ke tempat guru berada. Apakah ejekan ini sering terjadi berulang kali di kelas?`,
        summary:
          'Terindikasi perundungan verbal (ejekan/julukan/intimidasi lisan); perlu pendampingan psikologis dan teguran edukatif di kelas.',
        needsUrgentTppk: true,
      };
    default:
      return {
        reply: `${callName}, senang sekali mendengarnya! DIPSI ikut tersenyum membaca ceritamu. Menjaga pertemanan yang rukun, saling menolong, dan berani bercerita seperti ini membuat SDN Kotalama 3 selalu menjadi tempat belajar yang nyaman. Ada lagi hal seru atau perasaan lain yang ingin kamu bagikan hari ini?`,
        summary:
          'Curhatan bersifat positif/aman tanpa tanda perundungan. Disarankan tetap menjaga komunikasi terbuka dengan siswa.',
        needsUrgentTppk: false,
      };
  }
}

export function computeAdminStats(reports: CounselingReport[]): AdminStats {
  const statusCounts = FOLLOW_UP_STATUSES.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<(typeof FOLLOW_UP_STATUSES)[number], number>
  );

  const categoryCounts = BULLYING_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = 0;
      return acc;
    },
    {} as Record<BullyingCategory, number>
  );

  const moodCounts = MOOD_OPTIONS.reduce(
    (acc, m) => {
      acc[m.value] = 0;
      return acc;
    },
    {} as Record<MoodType, number>
  );

  let bullyingDetectedCount = 0;

  for (const r of reports) {
    if (statusCounts[r.followUpStatus] !== undefined) {
      statusCounts[r.followUpStatus] += 1;
    }
    if (categoryCounts[r.detectedCategory] !== undefined) {
      categoryCounts[r.detectedCategory] += 1;
    }
    if (moodCounts[r.mood] !== undefined) {
      moodCounts[r.mood] += 1;
    }
    if (isCategoryRisky(r.detectedCategory)) {
      bullyingDetectedCount += 1;
    }
  }

  return {
    totalReports: reports.length,
    bullyingDetectedCount,
    statusCounts,
    categoryCounts,
    moodCounts,
  };
}
