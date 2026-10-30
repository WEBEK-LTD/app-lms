import type { DataStore } from "../data/store";
import type { App, Teacher } from "../data/types";
import { SAMPLE_COURSES, SAMPLE_TEACHERS, START_TOPIC, type SampleCourse } from "../samples/content";
import { samplePrice } from "../samples/money";
import { DEMO_RETENTION_HOURS, DEMO_SIGN_IN } from "./constants";
import type { PictureName } from "./pictures";

/**
 * 110.5 Rawaq Academy, Studio's academy with many teachers (105.3): seven
 * teachers with their profiles and their own published courses (the sample
 * entries' teachers and courses, lib/samples/content.ts, in English and
 * Egyptian pounds), and the demo number as one more teacher, "Demo teacher",
 * whose Teacher tab makes courses and sends them to the academy for review.
 * Students never see the demo teacher (it is the store review account's
 * teacher, lib/teachers/review.ts); what the visitor made as it is deleted
 * after a day.
 */

export const TEACHERS_CURRENCY = "EGP";

export interface DemoTeacher {
  name: string;
  bio: string;
  subjects: string[];
  picture: PictureName;
  featured: boolean;
}

const sample = (name: string, picture: PictureName): DemoTeacher => {
  const t = SAMPLE_TEACHERS.find((x) => x.name.en === name)!;
  return { name: t.name.en, bio: t.bio.en, subjects: [...t.subjects.en], picture, featured: t.featured };
};

export const ACADEMY_TEACHERS: DemoTeacher[] = [
  sample("Deniz Kaya", "staff-deniz"),
  {
    name: "Hannah Clarke",
    bio: "An English teacher who has taught adults at work for twelve years. Her lessons are the conversations you have every day: meetings, phone calls and small talk.",
    subjects: ["English", "Speaking"],
    picture: "teacher-hannah",
    featured: true,
  },
  sample("Omar Farouk", "teacher-omar"),
  sample("Yasmin Adel", "teacher-yasmin"),
  {
    name: "Emre Aydın",
    bio: "A photographer who shoots for small shops and their websites. Shows how far a phone, a window and a sheet of white card can go.",
    subjects: ["Photography", "Product photos"],
    picture: "teacher-emre",
    featured: false,
  },
  sample("Mert Şahin", "teacher-mert"),
  {
    name: "Salma Nasser",
    bio: "Teaches Arabic to beginners of every age, with short lessons, a lot of listening and the words people need first.",
    subjects: ["Arabic", "Beginners"],
    picture: "teacher-salma",
    featured: false,
  },
];

/** The demo number's teacher: the visitor's own Teacher tab. */
export const DEMO_ACADEMY_TEACHER = {
  name: "Demo teacher",
  bio: "This is you: the demo number is also one of the academy's teachers. Make a course in the Teacher tab and send it to the academy for review.",
  subjects: ["Your subject"],
};

/** Each teacher's share of their courses' sales. */
export const ACADEMY_SHARE_BP = 7000;

export interface AcademyCourse {
  title: string;
  description: string;
  teacher: string;
  level: string;
  category: string;
  priceCents: number;
  picture: PictureName;
  topics: SampleCourse["topics"];
}

/** The sample courses, each the course of the teacher with its instructor's name. */
export const ACADEMY_COURSES: AcademyCourse[] = SAMPLE_COURSES.courses.map((c) => ({
  title: c.title.en,
  description: c.description.en,
  teacher: c.instructor.en,
  level: c.level.en,
  category: c.category,
  priceCents: samplePrice(c.priceCents, SAMPLE_COURSES.currency, TEACHERS_CURRENCY),
  picture: c.picture,
  topics: c.topics.length ? c.topics : START_TOPIC.en,
}));

export const ACADEMY_CATEGORIES = Object.keys(SAMPLE_COURSES.categories);

/**
 * The academy's teachers by name (photos given by the caller), updated in
 * place; the demo teacher with the demo number. Teachers no longer in the
 * demo are removed. Returns the teachers' IDs by name.
 */
export async function syncAcademyTeachers(store: DataStore, app: Pick<App, "id">, photos: Map<string, string>, now: Date): Promise<Map<string, number>> {
  const saved = await store.listTeachers(app.id);
  const ids = new Map<string, number>();
  for (const t of ACADEMY_TEACHERS) {
    const fields = { name: t.name, phone: null, email: null, photoAssetId: photos.get(t.name) ?? null, bio: t.bio, subjects: [...t.subjects], status: "active" as const, shareBp: ACADEMY_SHARE_BP, featured: t.featured };
    const found = saved.find((x) => x.name === t.name && x.phone === null);
    if (found) {
      await store.updateTeacher(app.id, found.id, fields, now);
      ids.set(t.name, found.id);
    } else {
      const made = await store.createTeacher({ appId: app.id, userId: null, ...fields }, now);
      if (made.ok) ids.set(t.name, made.teacher.id);
    }
  }
  const demo = await resetDemoTeacher(store, app, now);
  const kept = new Set([...ids.values(), demo.id]);
  for (const x of saved) if (!kept.has(x.id)) await store.deleteTeacher(app.id, x.id);
  return ids;
}

/** The demo teacher as the demo made it: its name, profile and share, whatever the visitor changed. */
async function resetDemoTeacher(store: DataStore, app: Pick<App, "id">, now: Date): Promise<Teacher> {
  const who = { phone: DEMO_SIGN_IN.e164, email: null };
  const fields = { name: DEMO_ACADEMY_TEACHER.name, photoAssetId: null, bio: DEMO_ACADEMY_TEACHER.bio, subjects: [...DEMO_ACADEMY_TEACHER.subjects], status: "active" as const, shareBp: ACADEMY_SHARE_BP, featured: false };
  const found = await store.findTeacher(app.id, who);
  if (found) {
    const same = found.name === fields.name && found.bio === fields.bio && found.photoAssetId === null && found.status === "active" && found.shareBp === fields.shareBp && found.subjects.join("\n") === fields.subjects.join("\n");
    if (!same) await store.updateTeacher(app.id, found.id, fields, now);
    return { ...found, ...fields };
  }
  const made = await store.createTeacher({ appId: app.id, ...who, userId: null, ...fields }, now);
  if (!made.ok) throw new Error("The demo teacher couldn't be added.");
  return made.teacher;
}

/**
 * The daily job's part for the academy: the courses the visitor made as the
 * demo teacher more than a day ago are deleted (their count returned), and
 * the demo teacher's profile goes back to the demo's.
 */
export async function cleanDemoTeacher(store: DataStore, app: App, now: Date): Promise<number> {
  const before = now.getTime() - DEMO_RETENTION_HOURS * 3_600_000;
  const teacher = await resetDemoTeacher(store, app, now);
  const setup = app.courseSetup;
  if (!setup) return 0;
  const old = setup.courses.filter((c) => c.teacherId === teacher.id && Date.parse(c.createdAt) < before);
  if (old.length === 0) return 0;
  await store.updateApp(app.id, { courseSetup: { ...setup, courses: setup.courses.filter((c) => !old.includes(c)) } }, now);
  return old.length;
}
