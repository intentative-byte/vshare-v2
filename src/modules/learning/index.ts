/**
 * Learning module — RESERVED. No implementation, no tables.
 *
 * Holds learning paths, modules, lessons, quizzes, quests and mastery from
 * the release after the first one. Documented here so the foundation does
 * not block it; nothing is built early.
 *
 * Planned public API:
 *   enrol(pathId)
 *   getNextStep()
 *   submitQuizAttempt(input)   graded on the server; answer keys are never
 *                              readable by any client
 *   getMastery(skillId)
 *
 * How it attaches to the foundation: lessons and quizzes are content items
 * with kind 'lesson', so the catalogue, interactions and feed memory need no
 * change. Completion events extend the existing analytics vocabulary.
 */
export {};
