import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  BULLYING_CATEGORIES,
  BullyingCategory,
  ChatMessage,
  CurhatProfile,
} from '../src/types';
import {
  buildFallbackOpening,
  buildFallbackReply,
  classifyBullyingHeuristic,
} from '../src/utils/counselingLogic';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generateOpeningPrompt(profile: CurhatProfile): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return buildFallbackOpening(profile);
  }

  try {
    const isParent = profile.role === 'Orang Tua';
    const systemInstruction = `Kamu adalah "DIPSI", teman curhat rahasia berbasis AI sekaligus ahli psikologi anak yang hangat, empatik, dan ramah untuk SDN Kotalama 3.
Tugasmu saat ini adalah menyapa dan memberikan 1 pertanyaan pembuka yang lembut dan empatik sesuai profil pelapor:
- Nama/Samaran: ${profile.reporterName} (${profile.identityMode})
- Peran: ${profile.role}
- Kelas anak: Kelas ${profile.grade}, Usia anak: ${profile.age} tahun
- Suasana hati saat ini: ${profile.mood}

Aturan bahasa:
- Gunakan bahasa Indonesia yang sangat ramah, hangat, mudah dimengerti ${isParent ? 'orang tua wali murid' : `anak SD usia ${profile.age} tahun`}.
- Jika suasana hati "Senang", ajak menceritakan hal menyenangkan/positif hari ini.
- Jika suasana hati "Sedih", "Takut", "Kesal", atau "Sakit/Tidak Nyaman", validasi perasaannya, tegaskan bahwa ruang ini aman & rahasia, lalu pancing dengan pertanyaan lembut mengenai kejadian tidak mengenakkan yang dialami.
- Panjang jawaban cukup 2–4 kalimat yang hangat dan mengundang cerita, tanpa daftar berpoin.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Buat kalimat sapaan pembuka dan pertanyaan empatik pertama untuk memulai sesi curhat aman.`,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const text = response.text?.trim();
    return text || buildFallbackOpening(profile);
  } catch (err) {
    console.warn('Gemini opening fallback:', err instanceof Error ? err.message : err);
    return buildFallbackOpening(profile);
  }
}

export interface AnalyzedCounselingTurn {
  reply: string;
  category: BullyingCategory;
  psychologicalSummary: string;
  needsUrgentTppk: boolean;
}

export async function analyzeAndRespondTurn(
  profile: CurhatProfile,
  history: ChatMessage[],
  latestUserMessage: string
): Promise<AnalyzedCounselingTurn> {
  const heuristicCategory = classifyBullyingHeuristic(
    `${history.map((m) => m.content).join(' ')} ${latestUserMessage}`
  );
  const ai = getAiClient();

  if (!ai) {
    const fallback = buildFallbackReply(heuristicCategory, profile);
    return {
      reply: fallback.reply,
      category: heuristicCategory,
      psychologicalSummary: fallback.summary,
      needsUrgentTppk: fallback.needsUrgentTppk,
    };
  }

  try {
    const transcriptText = history
      .map((m) => `${m.sender === 'dipsy' ? 'DIPSI' : profile.reporterName}: ${m.content}`)
      .join('\n');

    const systemInstruction = `Kamu adalah "DIPSI", teman curhat rahasia berbasis AI sekaligus ahli psikologi perkembangan anak di SDN Kotalama 3.
Profil Pelapor:
- Nama/Samaran: ${profile.reporterName} (Mode: ${profile.identityMode})
- Peran: ${profile.role}
- Kelas: Kelas ${profile.grade}, Usia: ${profile.age} tahun
- Suasana hati awal: ${profile.mood}

Tugasmu:
1. Deteksi secara cermat kategori curhatan ke dalam SALAH SATU kategori persis berikut:
   - "Aman/Menyenangkan"
   - "Perundungan Verbal"
   - "Perundungan Sosial"
   - "Perundungan Fisik"
   - "Perundungan Digital (Cyberbullying)"
   - "Indikasi Pelecehan Seksual"
2. Berikan respons psikologis anak yang sangat empatik, memvalidasi perasaan, tidak menyalahkan korban, serta menggunakan bahasa sesuai usia (${profile.age} tahun) atau bahasa sopan untuk Orang Tua.
3. Jika terdeteksi salah satu dari 5 kategori perundungan/pelecehan:
   - Berikan rasa aman dan penguatan emosional.
   - Berikan 1-2 langkah aman sederhana dan sarankan dengan lembut untuk melapor/berkomunikasi dengan Wali Kelas atau Bapak Fajar selaku Ketua Tim TPPK SDN Kotalama 3 (HP/WA: 082334660789).
   - Set "needsUrgentTppk" = true jika membutuhkan perhatian TPPK segera (terutama Fisik, Pelecehan Seksual, Digital berat, atau ancaman serius).
4. Tuliskan "psychologicalSummary" ringkas (1-2 kalimat) dalam bahasa Indonesia profesional untuk catatan Guru BK / Tim TPPK.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Riwayat percakapan sebelumnya:\n${transcriptText || '(belum ada)'}\n\nPesan terbaru pelapor:\n${latestUserMessage}`,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Balasan empatik DIPSI kepada siswa/orang tua dalam bahasa Indonesia (3-5 kalimat).',
            },
            category: {
              type: Type.STRING,
              enum: BULLYING_CATEGORIES,
              description: 'Kategori hasil deteksi otomatis.',
            },
            psychologicalSummary: {
              type: Type.STRING,
              description: 'Ringkasan psikologis singkat untuk rekap Tim TPPK.',
            },
            needsUrgentTppk: {
              type: Type.BOOLEAN,
              description: 'True jika terdeteksi perundungan/indikasi pelecehan yang perlu pendampingan TPPK.',
            },
          },
          required: ['reply', 'category', 'psychologicalSummary', 'needsUrgentTppk'],
        },
      },
    });

    const rawJson = (response.text ?? '').trim();
    const parsed = JSON.parse(rawJson) as Partial<AnalyzedCounselingTurn>;

    const validCategory = BULLYING_CATEGORIES.includes(parsed.category as BullyingCategory)
      ? (parsed.category as BullyingCategory)
      : heuristicCategory;

    // If heuristic caught high-severity sexual/physical cues while AI returned Aman, escalate safely
    const finalCategory =
      validCategory === 'Aman/Menyenangkan' && heuristicCategory !== 'Aman/Menyenangkan'
        ? heuristicCategory
        : validCategory;

    const fallback = buildFallbackReply(finalCategory, profile);

    return {
      reply: parsed.reply?.trim() || fallback.reply,
      category: finalCategory,
      psychologicalSummary: parsed.psychologicalSummary?.trim() || fallback.summary,
      needsUrgentTppk:
        typeof parsed.needsUrgentTppk === 'boolean'
          ? parsed.needsUrgentTppk || finalCategory !== 'Aman/Menyenangkan'
          : fallback.needsUrgentTppk,
    };
  } catch (err) {
    console.warn('Gemini turn fallback:', err instanceof Error ? err.message : err);
    const fallback = buildFallbackReply(heuristicCategory, profile);
    return {
      reply: fallback.reply,
      category: heuristicCategory,
      psychologicalSummary: fallback.summary,
      needsUrgentTppk: fallback.needsUrgentTppk,
    };
  }
}
