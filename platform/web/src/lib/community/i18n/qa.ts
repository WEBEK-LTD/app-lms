import type { CommunityDictionary } from ".";

/**
 * 231 Area B's words (Q&A, tutorials, search): what the API writes beside a
 * field it can't take ("qa.invalid.{field}"). The sections' names are kept
 * with the sections (lib/community/qa/service.ts DEFAULT_SECTIONS).
 */
export const QA_WORDS: CommunityDictionary = {
  en: {
    "error.course_locked": "This course is locked.",
    "qa.invalid.title": "Write a title of 10 to 200 characters.",
    "qa.invalid.body": "Write at least 20 characters for a question and 10 for an answer.",
    "qa.invalid.summary": "Write a summary of 10 to 400 characters.",
    "qa.invalid.section": "Choose a section.",
    "qa.invalid.tags": "Add at most 5 tags.",
    "qa.invalid.value": "A vote is up, down or none.",
    "qa.invalid.kind": "Choose an article or a video.",
    "qa.invalid.level": "Choose a level.",
    "qa.invalid.language": "Choose a language.",
    "qa.invalid.cover_url": "The cover must be an https address.",
    "qa.invalid.video_url": "Give the video's address on YouTube, Vimeo or Yallapp.",
    "qa.invalid.duration_seconds": "Give the video's length.",
  },
  ar: {
    "error.course_locked": "هذه الدورة مقفلة.",
    "qa.invalid.title": "اكتب عنوانًا من 10 إلى 200 حرف.",
    "qa.invalid.body": "اكتب 20 حرفًا على الأقل للسؤال و10 أحرف على الأقل للإجابة.",
    "qa.invalid.summary": "اكتب ملخصًا من 10 إلى 400 حرف.",
    "qa.invalid.section": "اختر قسمًا.",
    "qa.invalid.tags": "أضف 5 وسوم على الأكثر.",
    "qa.invalid.value": "التصويت إما بالتأييد أو بالرفض أو بلا تصويت.",
    "qa.invalid.kind": "اختر مقالًا أو فيديو.",
    "qa.invalid.level": "اختر مستوى.",
    "qa.invalid.language": "اختر لغة.",
    "qa.invalid.cover_url": "يجب أن يكون عنوان الغلاف عنوان https.",
    "qa.invalid.video_url": "أدخل عنوان الفيديو على YouTube أو Vimeo أو Yallapp.",
    "qa.invalid.duration_seconds": "أدخل مدة الفيديو.",
  },
  tr: {
    "error.course_locked": "Bu kurs kilitli.",
    "qa.invalid.title": "10 ile 200 karakter arasında bir başlık yazın.",
    "qa.invalid.body": "Soru için en az 20, yanıt için en az 10 karakter yazın.",
    "qa.invalid.summary": "10 ile 400 karakter arasında bir özet yazın.",
    "qa.invalid.section": "Bir bölüm seçin.",
    "qa.invalid.tags": "En fazla 5 etiket ekleyin.",
    "qa.invalid.value": "Oy artı, eksi ya da hiçbiri olabilir.",
    "qa.invalid.kind": "Bir makale ya da video seçin.",
    "qa.invalid.level": "Bir seviye seçin.",
    "qa.invalid.language": "Bir dil seçin.",
    "qa.invalid.cover_url": "Kapak adresi https ile başlamalı.",
    "qa.invalid.video_url": "Videonun YouTube, Vimeo ya da Yallapp adresini girin.",
    "qa.invalid.duration_seconds": "Videonun süresini girin.",
  },
};
