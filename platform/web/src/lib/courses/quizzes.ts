import type { CourseQuiz, CourseQuizQuestion, CourseSetup } from "../data/types";
import { withCourse } from "./edit";
import { QUIZ_LIMITS } from "./learning";

/**
 * 90.1 A quiz as the owner writes it: one question per block, `Q:` first,
 * then its answers, `*` before each right one and `-` before the others.
 * One right answer is a single choice, several a multiple choice; True and
 * False alone are a true or false question.
 *
 *   Q: Which planet is the largest?
 *   - Mars
 *   * Jupiter
 */

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

export function parseQuestions(text: string): { questions: Omit<CourseQuizQuestion, "id">[] } | { error: string } {
  const questions: Omit<CourseQuizQuestion, "id">[] = [];
  let current: { text: string; options: { text: string; correct: boolean }[] } | null = null;
  const close = (): string | null => {
    if (!current) return null;
    if (current.options.length < 2) return `“${current.text.slice(0, 60)}” needs at least two answers.`;
    if (!current.options.some((o) => o.correct)) return `Mark the right answer of “${current.text.slice(0, 60)}” with *.`;
    if (current.options.length > QUIZ_LIMITS.options) return `Give “${current.text.slice(0, 60)}” at most ${QUIZ_LIMITS.options} answers.`;
    const right = current.options.filter((o) => o.correct).length;
    const labels = current.options.map((o) => o.text.toLowerCase()).sort().join("|");
    const type = labels === "false|true" ? "true_false" : right > 1 ? "multiple_choice" : "single_choice";
    questions.push({ text: current.text, type, options: current.options.map((o, i) => ({ id: String.fromCharCode(97 + i), text: o.text, correct: o.correct })) });
    current = null;
    return null;
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const question = /^q\s*[:.)-]\s*(.+)$/i.exec(line);
    const answer = /^([*-])\s*(.+)$/.exec(line);
    if (question) {
      const problem = close();
      if (problem) return { error: problem };
      current = { text: question[1]!.slice(0, QUIZ_LIMITS.text), options: [] };
    } else if (answer && current) {
      current.options.push({ text: answer[2]!.slice(0, QUIZ_LIMITS.text), correct: answer[1] === "*" });
    } else {
      return { error: `Start each question with Q: and each answer with * (right) or - (wrong): “${line.slice(0, 60)}”.` };
    }
  }
  const problem = close();
  if (problem) return { error: problem };
  if (questions.length === 0) return { error: "Write at least one question." };
  if (questions.length > QUIZ_LIMITS.questions) return { error: `Use at most ${QUIZ_LIMITS.questions} questions.` };
  return { questions };
}

/** The quiz written back in the same format, to edit it. */
export function questionsText(quiz: Pick<CourseQuiz, "questions">): string {
  return quiz.questions.map((q) => [`Q: ${q.text}`, ...q.options.map((o) => `${o.correct ? "*" : "-"} ${o.text}`)].join("\n")).join("\n\n");
}

export function parseQuiz(v: Record<string, string>): Parsed<Omit<CourseQuiz, "id">> {
  const errors: Record<string, string> = {};
  const title = (v.title ?? "").trim();
  if (title.length < 2 || title.length > QUIZ_LIMITS.title) errors.title = `Enter a title of up to ${QUIZ_LIMITS.title} characters.`;
  const pass = Number((v.passPercent ?? "").trim() || "70");
  if (!Number.isInteger(pass) || pass < 1 || pass > 100) errors.passPercent = "Enter a pass mark from 1 to 100.";
  const attempts = (v.attemptsAllowed ?? "").trim() === "" ? null : Number(v.attemptsAllowed);
  if (attempts !== null && (!Number.isInteger(attempts) || attempts < 1 || attempts > 50)) errors.attemptsAllowed = "Enter 1 to 50 attempts, or leave it empty for no limit.";
  const minutes = (v.timeLimit ?? "").trim() === "" ? null : Number(v.timeLimit);
  if (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 600)) errors.timeLimit = "Enter 1 to 600 minutes, or leave it empty for no time limit.";
  const parsed = parseQuestions(v.questions ?? "");
  if ("error" in parsed) errors.questions = parsed.error;
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      passPercent: pass,
      attemptsAllowed: attempts,
      timeLimitMinutes: minutes,
      questions: (parsed as { questions: Omit<CourseQuizQuestion, "id">[] }).questions.map((q, i) => ({ ...q, id: i + 1 })),
    },
  };
}

export type QuizSave = { ok: true; setup: CourseSetup; quiz: CourseQuiz; added: boolean } | { ok: false; message?: string; errors?: Record<string, string> };

/** Adds a quiz at the end of a section, or with `v.id` saves one. */
export function saveQuiz(setup: CourseSetup, courseId: number, topicId: number, v: Record<string, string>): QuizSave {
  const topic = setup.courses.find((c) => c.id === courseId)?.topics.find((t) => t.id === topicId);
  if (!topic) return { ok: false, message: "This section no longer exists." };
  const parsed = parseQuiz(v);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const id = v.id ? Number(v.id) : null;
  const quizzes = topic.quizzes ?? [];
  if (id !== null && !quizzes.some((q) => q.id === id)) return { ok: false, message: "This quiz no longer exists." };
  const quiz: CourseQuiz = { id: id ?? setup.nextId, ...parsed.value };
  const next = withCourse(setup, courseId, (c) => ({
    ...c,
    topics: c.topics.map((t) => (t.id === topicId ? { ...t, quizzes: id === null ? [...quizzes, quiz] : quizzes.map((q) => (q.id === id ? quiz : q)) } : t)),
  }));
  return { ok: true, setup: id === null ? { ...next, nextId: setup.nextId + 1 } : next, quiz, added: id === null };
}

export function deleteQuiz(setup: CourseSetup, courseId: number, quizId: number): CourseSetup {
  return withCourse(setup, courseId, (c) => ({ ...c, topics: c.topics.map((t) => ({ ...t, quizzes: (t.quizzes ?? []).filter((q) => q.id !== quizId) })) }));
}
