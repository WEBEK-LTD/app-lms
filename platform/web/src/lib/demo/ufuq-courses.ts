import type { AcademyPhoto } from "./academy-photos";
import { DEMO_COURSES, type DemoCourse } from "./content";

/**
 * 128.8 Ufuq Academy's courses (the premium academy demo), as its approved
 * home shows them: the academy's courses each with a real photo for its
 * cover, and the Arabic calligraphy course Sara is taking first.
 */
export type UfuqCourse = Omit<DemoCourse, "picture"> & { picture: AcademyPhoto };

const PHOTOS: Record<string, AcademyPhoto> = {
  "UX Design Fundamentals": "academy-phone",
  "Excel for Small Business Owners": "academy-graduation",
  "Product Photography with Your Phone": "academy-breakfast",
  "Social Media Marketing That Sells": "academy-live",
  "Everyday English Conversation": "academy-graduation",
  "Python for Data Analysis": "academy-desk",
};

const CALLIGRAPHY: UfuqCourse = {
  title: "Arabic Calligraphy for Beginners",
  instructor: "Leila Haddad",
  level: "Beginner",
  category: "Design",
  priceCents: 1250_00,
  picture: "academy-evening",
  description:
    "Write your first words in Naskh script with a reed pen and ink: holding the pen, the dots that measure every letter, the letters one by one and how they join.\n\nA sheet of paper a day is enough; by the end you'll write a short saying of your own.",
  topics: [
    {
      title: "The pen and the dot",
      lessons: [
        { title: "Choosing and cutting a reed pen", minutes: 9, preview: true, text: "A qalam cut at an angle gives the thick and thin strokes of Naskh. We cut one together and try it on a practice sheet." },
        { title: "The rhombic dot, your ruler", minutes: 11, text: "Every letter is measured in dots made by the pen's nib. We draw a ladder of dots and learn to read it." },
      ],
    },
    {
      title: "Letters and joins",
      lessons: [
        { title: "Alif and Ba in Naskh script", minutes: 14, text: "Alif is five dots tall and straight; Ba is a bowl on the line. We write each ten times, then side by side." },
        { title: "Joining letters into words", minutes: 13, text: "Letters change shape at the start, middle and end of a word. We join Ba, Ta and Tha into three short words." },
        { title: "Your first saying", minutes: 16, text: "Plan the line, space the words and write a short saying on a clean sheet, ready to frame." },
      ],
    },
  ],
};

export const UFUQ_COURSES: UfuqCourse[] = [CALLIGRAPHY, ...DEMO_COURSES.map((c): UfuqCourse => ({ ...c, picture: PHOTOS[c.title] ?? "academy-desk" }))];
