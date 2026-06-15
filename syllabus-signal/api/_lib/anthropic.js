import Anthropic from '@anthropic-ai/sdk';
import { CATEGORIZE_TOOL, QUESTIONS_TOOL } from './schemas.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Sonnet 4.6 gives strong rationale quality; set ANTHROPIC_MODEL=claude-haiku-4-5-20251001
// to cut ingest cost. Both support forced tool use / structured output.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

// Forcing tool_choice to a single tool guarantees the response is a tool_use
// block whose `input` already matches our schema — no JSON parsing of prose.
async function callTool(tool, system, userText) {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [{ role: 'user', content: userText }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block) throw new Error(`Model did not call ${tool.name}`);
  return block.input;
}

const SUBJECT_GUIDE = `Static UPSC subjects (use the slug):
- polity: Polity & Governance (constitution, judiciary, institutions)
- economy: Economy (monetary/fiscal policy, growth, trade, agriculture)
- ir: International Relations (bilateral/multilateral, diplomacy)
- scitech: Science & Technology (space, biotech, IT, defence tech)
- environment: Environment & Ecology (climate, conservation, pollution, EIA)
- geography: Geography (physical, climatology, resources)
- history: History & Culture (modern India, art & culture, world history)
- society: Society & Social Justice (welfare, demographics, social issues)`;

export async function categorizeArticle({ title, content }) {
  const system = `You are a UPSC current-affairs analyst. Map a news article to the
static syllabus. A single story often spans several subjects — include every
subject it meaningfully informs, mark exactly one as primary, and give a one-line
rationale for each so an aspirant understands why it sits there.
${SUBJECT_GUIDE}`;
  const userText = `Title: ${title}\n\nArticle:\n${(content || '').slice(0, 6000)}`;
  return callTool(CATEGORIZE_TOOL, system, userText);
}

export async function generateQuestions({ title, summary, subjects }) {
  const system = `You are a UPSC question setter. Write single-best-answer MCQs
(exactly four options) that test whether an aspirant retained the exam-relevant
facts and concepts in this story. Prefer Prelims-style factual or conceptual
questions. Tag each question with the most relevant subject slug.
${SUBJECT_GUIDE}`;
  const tagged = subjects.map((s) => `${s.subject}${s.is_primary ? ' (primary)' : ''}`).join(', ');
  const userText = `Title: ${title}\nSubjects: ${tagged}\nSummary: ${summary}\n\nWrite 1-2 questions.`;
  const out = await callTool(QUESTIONS_TOOL, system, userText);
  return out.questions;
}
