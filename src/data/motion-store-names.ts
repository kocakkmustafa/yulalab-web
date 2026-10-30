import type { Locale } from "@/i18n/locales";

/**
 * Store listing names of the five Motion apps per locale (Choreia, Lissom, Gravita, JabLab,
 * Ostinato). The App Store and Google Play names are the same; source: each app's
 * STORE-COPY.json play[locale].title (2026-10-30; Lissom per K-7 "Yoga & Mobility").
 */
export const MOTION_STORE_NAMES: Record<Locale, readonly string[]> = {
  tr: ["Choreia: Dans Öğren", "Lissom: Yoga ve Mobilite", "Gravita: Güç ve Beceri", "JabLab: Gölge Antrenmanı", "Ostinato: Müzik Pratiği"],
  en: ["Choreia: Learn to Dance", "Lissom: Yoga & Mobility", "Gravita: Skills & Strength", "JabLab: Shadow Training", "Ostinato: Music Practice"],
  "es-419": ["Choreia: Aprende a bailar", "Lissom: Yoga y movilidad", "Gravita: Fuerza y Habilidad", "JabLab: Entrenamiento solo", "Ostinato: Práctica musical"],
  "pt-BR": ["Choreia: Aprenda a dançar", "Lissom: Yoga e mobilidade", "Gravita: Força e Habilidade", "JabLab: Treino Solo", "Ostinato: Prática musical"],
  de: ["Choreia: Tanzen lernen", "Lissom: Yoga & Mobilität", "Gravita: Kraft & Können", "JabLab: Schattentraining", "Ostinato: Musik üben"],
  fr: ["Choreia : Apprendre à danser", "Lissom: Yoga et mobilité", "Gravita : Force et Technique", "JabLab : entraînement solo", "Ostinato : pratique musicale"],
  ja: ["Choreia: ダンスを学ぶ", "Lissom: ヨガとモビリティ", "Gravita: 筋力とスキル", "JabLab: シャドートレーニング", "Ostinato: 音楽の練習"],
  ar: ["Choreia: تعلّم الرقص", "Lissom: يوغا ومرونة الحركة", "Gravita: القوة والمهارة", "JabLab: تدريب فردي", "Ostinato: تدريب موسيقي"],
  it: ["Choreia: Impara a ballare", "Lissom: Yoga e mobilità", "Gravita: Forza e Abilità", "JabLab: allenamento solo", "Ostinato: pratica musicale"],
  ko: ["Choreia: 댄스 배우기", "Lissom: 요가 & 모빌리티", "Gravita: 근력과 기술", "JabLab: 섀도 트레이닝", "Ostinato: 음악 연습"],
  id: ["Choreia: Belajar Menari", "Lissom: Yoga dan Mobilitas", "Gravita: Kekuatan & Skill", "JabLab: Latihan Solo", "Ostinato: Latihan Musik"],
  pl: ["Choreia: Nauka tańca", "Lissom: Joga i mobilność", "Gravita: Siła i Umiejętności", "JabLab: trening solo", "Ostinato: ćwiczenia muzyczne"],
  hi: ["Choreia: नृत्य सीखें", "Lissom: योग और गतिशीलता", "Gravita: ताकत और कौशल", "JabLab: शैडो ट्रेनिंग", "Ostinato: संगीत अभ्यास"],
  "zh-Hans": ["Choreia：学跳舞", "Lissom：瑜伽与灵活性", "Gravita：力量与技能", "JabLab：影子训练", "Ostinato：音乐练习"],
};
