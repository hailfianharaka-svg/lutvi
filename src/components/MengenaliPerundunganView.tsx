import { useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Hand,
  Megaphone,
  MessageSquareWarning,
  MonitorSmartphone,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  BULLYING_EDUCATION_CARDS,
  MINI_QUIZ_QUESTIONS,
  TOUCH_RULES,
} from '../data/educationData';
import { AppSettings, EDU_SCHOOL_IMAGE } from '../types';

interface MengenaliPerundunganViewProps {
  settings: AppSettings;
  onStartCurhat: () => void;
}

const CARD_ICONS: Record<string, typeof Hand> = {
  fisik: Hand,
  verbal: MessageSquareWarning,
  sosial: Users,
  digital: MonitorSmartphone,
  seksual: ShieldAlert,
};

export function MengenaliPerundunganView({
  settings,
  onStartCurhat,
}: MengenaliPerundunganViewProps) {
  const [touchFilter, setTouchFilter] = useState<'Semua' | 'Boleh' | 'Tidak Boleh'>('Semua');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [imgFailed, setImgFailed] = useState(false);

  const filteredTouchRules = TOUCH_RULES.filter((item) =>
    touchFilter === 'Semua' ? true : item.type === touchFilter
  );

  const waNumber = settings.tppkPhone.replace(/^0/, '62').replace(/\D/g, '');

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Intro Split Card */}
      <div className="bg-white/95 backdrop-blur-md border border-emerald-900/10 rounded-3xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
            <p className="text-xs font-bold text-emerald-700 mb-2">
              Edukasi Ramah Anak Usia 6–14 Tahun · {settings.schoolName}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-emerald-950 text-balance leading-tight">
              Mengenali Perundungan &amp; Cara Melindungi Diri Sejak Dini
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-700 leading-relaxed">
              Perundungan (<em>bullying</em>) adalah perbuatan menyakiti teman secara sengaja dan
              berulang kali hingga teman merasa takut, sedih, atau sakit. Yuk kenali 5 jenisnya agar
              kita bisa saling menjaga dan berani melapor!
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onStartCurhat}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Cerita ke DIPSI Sekarang
              </button>
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-sm font-semibold transition-colors"
              >
                <PhoneCall className="w-4 h-4" aria-hidden="true" />
                <span>TPPK: {settings.tppkChairName} ({settings.tppkPhone})</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 bg-emerald-50 min-h-[240px]">
            {!imgFailed ? (
              <img
                src={EDU_SCHOOL_IMAGE}
                alt="Ilustrasi anak-anak sekolah dasar bermain rukun bersama di halaman sekolah yang aman"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-emerald-100 to-sky-100">
                <ShieldCheck className="w-12 h-12 text-emerald-700 mb-2" aria-hidden="true" />
                <p className="text-sm font-semibold text-emerald-950">
                  Sekolah Aman, Teman Rukun, Belajar Gembira
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5 Bullying Type Education Cards */}
      <div>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-emerald-950">
            01. Lima Jenis Perundungan yang Perlu Kamu Ketahui
          </h3>
          <p className="text-sm text-slate-700 mt-1">
            Jika kamu atau temanmu mengalami salah satu hal di bawah ini, ingatlah kamu berhak
            mendapatkan pertolongan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {BULLYING_EDUCATION_CARDS.map((card) => {
            const Icon = CARD_ICONS[card.id] || ShieldAlert;
            return (
              <article
                key={card.id}
                className={`bg-white/95 backdrop-blur-sm border ${card.borderColor} rounded-3xl p-6 shadow-xs flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${card.surfaceBg} border ${card.borderColor} flex items-center justify-center shrink-0`}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: card.accentHex }}
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 leading-snug">
                        {card.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">{card.subtitle}</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    {card.kidExplanation}
                  </p>

                  <div className="space-y-1.5 mb-4">
                    <p className="text-xs font-bold text-slate-800">Contohnya:</p>
                    <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4 leading-relaxed">
                      {card.examples.map((ex) => (
                        <li key={ex}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border ${card.surfaceBg} ${card.borderColor}`}>
                  <p className="text-xs font-bold text-slate-900 mb-1">Apa yang harus kulakukan?</p>
                  <p className="text-xs text-slate-800 leading-relaxed">{card.whatToDo}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Sentuhan Boleh vs Tidak Boleh */}
      <div className="bg-white/95 backdrop-blur-md border border-emerald-900/10 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-emerald-950">
              02. Mengenal Sentuhan Boleh vs Sentuhan Tidak Boleh
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Tubuhmu adalah milikmu. Pahami perbedaannya agar selalu aman di mana saja.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter Jenis Sentuhan"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0"
          >
            {(['Semua', 'Boleh', 'Tidak Boleh'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setTouchFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  touchFilter === tab
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTouchRules.map((rule) => {
            const isAllowed = rule.type === 'Boleh';
            return (
              <div
                key={rule.title}
                className={`p-4 rounded-2xl border ${
                  isAllowed
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {isAllowed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  ) : (
                    <Ban className="w-4 h-4 text-rose-700 shrink-0" aria-hidden="true" />
                  )}
                  <span
                    className={`text-xs font-bold ${
                      isAllowed ? 'text-emerald-800' : 'text-rose-800'
                    }`}
                  >
                    Sentuhan {rule.type}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{rule.title}</h4>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">{rule.description}</p>
              </div>
            );
          })}
        </div>

        {/* Langkah 3B */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-base font-bold text-emerald-950 mb-3 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <span>Ingat Jurus 3B Jika Mengalami Perundungan:</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-emerald-800">Langkah 1 · BILANG</p>
              <p className="text-sm font-bold text-slate-900 mt-1">Katakan “TIDAK!” dengan tegas</p>
              <p className="text-xs text-slate-600 mt-1">
                Tatap dengan berani dan katakan kamu tidak suka diperlakukan seperti itu.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-emerald-800">Langkah 2 · BERLARI</p>
              <p className="text-sm font-bold text-slate-900 mt-1">Menjauh ke tempat ramai &amp; aman</p>
              <p className="text-xs text-slate-600 mt-1">
                Segera pergi menuju ruang guru, pos satpam, atau tempat di mana ada orang dewasa.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-emerald-800">Langkah 3 · BERITAHU</p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                Lapor ke Orang Tua, DIPSI, atau {settings.tppkChairName}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Melapor bukan berarti pengadu, melainkan cara berani melindungi diri sendiri.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Mini Quiz */}
      <div className="bg-white/95 backdrop-blur-md border border-emerald-900/10 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="mb-5">
          <h3 className="text-xl font-bold text-emerald-950">
            03. Cek Pemahaman Yuk! (Latihan Cerita Singkat)
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Pilih jawaban yang paling tepat menurutmu untuk melihat penjelasannya.
          </p>
        </div>

        <div className="space-y-5">
          {MINI_QUIZ_QUESTIONS.map((q, idx) => {
            const chosen = selectedAnswers[q.id];
            const answered = chosen !== undefined;
            const isCorrect = chosen === q.correctIndex;

            return (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3"
              >
                <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                  {idx + 1}. {q.scenario}
                </p>
                <div className="space-y-2">
                  {q.choices.map((choice, cIdx) => {
                    const isSelected = chosen === cIdx;
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() =>
                          setSelectedAnswers((prev) => ({ ...prev, [q.id]: cIdx }))
                        }
                        className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? cIdx === q.correctIndex
                              ? 'bg-emerald-100/90 border-emerald-600 ring-1 ring-emerald-600 text-emerald-950 font-semibold'
                              : 'bg-rose-100/90 border-rose-500 ring-1 ring-rose-500 text-rose-950 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                        }`}
                      >
                        <span>{choice}</span>
                        {isSelected && cIdx === q.correctIndex && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                        )}
                        {isSelected && cIdx !== q.correctIndex && (
                          <Ban className="w-4 h-4 text-rose-700 shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {answered && (
                  <p
                    className={`text-xs font-medium p-3 rounded-xl border ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}
                  >
                    {isCorrect ? 'Bagus sekali! ' : 'Hampir tepat! '}
                    {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
