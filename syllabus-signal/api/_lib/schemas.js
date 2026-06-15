// Canonical subject list. These slugs MUST match supabase/seed.sql and are
// used as enums so Claude can only ever return a real subject.
export const SUBJECTS = [
  'polity',
  'economy',
  'ir',
  'scitech',
  'environment',
  'geography',
  'history',
  'society',
];

// Tool schema: how an article maps onto one OR MORE subjects, each with its
// own rationale. This is the structured shape behind the "why is this filed
// under these topics" strip in the UI.
export const CATEGORIZE_TOOL = {
  name: 'submit_categorization',
  description: 'Return the exam-focused summary and subject mapping for a news article.',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'Crisp 2-3 sentence, exam-relevant summary of the article.',
      },
      subjects: {
        type: 'array',
        minItems: 1,
        description: 'Every static UPSC subject this article meaningfully touches.',
        items: {
          type: 'object',
          properties: {
            subject: { type: 'string', enum: SUBJECTS },
            is_primary: {
              type: 'boolean',
              description: 'Exactly one subject in the array must be the primary.',
            },
            subtopic: { type: 'string', description: 'Specific sub-topic within the subject.' },
            rationale: {
              type: 'string',
              description: 'One sentence: why the article belongs to this subject.',
            },
            syllabus_ref: {
              type: 'string',
              description: 'Syllabus pointer, e.g. "GS-III: monetary policy, RBI".',
            },
          },
          required: ['subject', 'is_primary', 'rationale'],
        },
      },
    },
    required: ['summary', 'subjects'],
  },
};

// Tool schema: a set of single-best-answer MCQs to gauge retention.
export const QUESTIONS_TOOL = {
  name: 'submit_questions',
  description: 'Return retention-check MCQs derived from the article.',
  input_schema: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            subject: { type: 'string', enum: SUBJECTS },
            stem: { type: 'string' },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string' },
            },
            correct_index: { type: 'integer', minimum: 0, maximum: 3 },
            explanation: { type: 'string' },
          },
          required: ['subject', 'stem', 'options', 'correct_index', 'explanation'],
        },
      },
    },
    required: ['questions'],
  },
};
