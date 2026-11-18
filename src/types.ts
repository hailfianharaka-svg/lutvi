export type IdentityMode = 'Lengkap' | 'Anonim';

export type UserRole = 'Siswa' | 'Orang Tua';

export type MoodType =
  | 'Senang'
  | 'Sedih'
  | 'Takut'
  | 'Kesal'
  | 'Sakit/Tidak Nyaman';

export type BullyingCategory =
  | 'Aman/Menyenangkan'
  | 'Perundungan Verbal'
  | 'Perundungan Sosial'
  | 'Perundungan Fisik'
  | 'Perundungan Digital (Cyberbullying)'
  | 'Indikasi Pelecehan Seksual';

export type FollowUpStatus =
  | 'Diproses'
  | 'Selesai'
  | 'Butuh Bantuan Eksternal';

export type AdminRole =
  | 'Ketua TPPK'
  | 'Kepala Sekolah'
  | 'Guru BK'
  | 'Ahli Psikologi';

export type MainMenu = 'curhat' | 'edukasi' | 'admin';

export interface CurhatProfile {
  identityMode: IdentityMode;
  reporterName: string;
  role: UserRole;
  grade: number;
  age: number;
  mood: MoodType;
}

export interface ChatMessage {
  id: number | string;
  sender: 'user' | 'dipsy';
  content: string;
  detectedCategory?: BullyingCategory;
  createdAt: string;
}

export interface CounselingReport {
  id: number;
  sessionCode: string;
  identityMode: IdentityMode;
  reporterName: string;
  role: UserRole;
  grade: number;
  age: number;
  mood: MoodType;
  detectedCategory: BullyingCategory;
  psychologicalSummary: string;
  followUpStatus: FollowUpStatus;
  tppkNote: string;
  needsUrgentTppk: boolean;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface AdminUser {
  id: number;
  username: string;
  fullName: string;
  role: AdminRole;
  createdAt: string;
}

export interface AppSettings {
  dipsyImageUrl: string;
  meadowImageUrl: string;
  tppkChairName: string;
  tppkPhone: string;
  schoolName: string;
}

export interface AdminStats {
  totalReports: number;
  bullyingDetectedCount: number;
  statusCounts: Record<FollowUpStatus, number>;
  categoryCounts: Record<BullyingCategory, number>;
  moodCounts: Record<MoodType, number>;
}

export interface SheetDbConfig {
  linkedSpreadsheetId: string;
  linkedSpreadsheetUrl: string;
  linkedSpreadsheetTitle: string;
  autoSync: boolean;
  dbInitialized: boolean;
  lastSyncAt: string;
}

export interface SheetInspectResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  existingTabs: string[];
  requiredTabs: string[];
  missingTabs: string[];
}

export interface SheetSyncResult {
  spreadsheetId: string;
  spreadsheetTitle: string;
  createdTabs: string[];
  syncedReportsCount: number;
  syncedMessagesCount: number;
  pulledUpdatesCount: number;
  lastSyncAt: string;
}

export const MOOD_OPTIONS: {
  value: MoodType;
  label: string;
  hint: string;
}[] = [
  { value: 'Senang', label: 'Senang', hint: 'Ada cerita seru atau hal baik hari ini' },
  { value: 'Sedih', label: 'Sedih', hint: 'Merasa kecewa, murung, atau ingin menangis' },
  { value: 'Takut', label: 'Takut', hint: 'Merasa cemas, khawatir, atau terancam' },
  { value: 'Kesal', label: 'Kesal', hint: 'Merasa marah atau jengkel pada seseorang' },
  {
    value: 'Sakit/Tidak Nyaman',
    label: 'Sakit/Tidak Nyaman',
    hint: 'Tubuh terasa sakit atau hati merasa tidak nyaman',
  },
];

export const BULLYING_CATEGORIES: BullyingCategory[] = [
  'Aman/Menyenangkan',
  'Perundungan Verbal',
  'Perundungan Sosial',
  'Perundungan Fisik',
  'Perundungan Digital (Cyberbullying)',
  'Indikasi Pelecehan Seksual',
];

export const FOLLOW_UP_STATUSES: FollowUpStatus[] = [
  'Diproses',
  'Selesai',
  'Butuh Bantuan Eksternal',
];

export const ADMIN_ROLES: AdminRole[] = [
  'Kepala Sekolah',
  'Guru BK',
  'Ahli Psikologi',
  'Ketua TPPK',
];

export const DEFAULT_DIPSY_IMAGE = '/src/assets/images/dipsy_mascot_1794707527030.jpg';
export const DEFAULT_MEADOW_IMAGE = '/src/assets/images/meadow_backdrop_1794707527120.jpg';
export const EDU_SCHOOL_IMAGE = '/src/assets/images/edu_sd_muslim_merah_putih_1794881255247.jpg';
