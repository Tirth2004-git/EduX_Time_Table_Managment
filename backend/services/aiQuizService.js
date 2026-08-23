const path = require('path');
const officeParser = require('officeparser');
const { PDFParse } = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Extracts normalized textual content from uploaded PDF, PPT, PPTX, DOC, DOCX, or TXT file buffer.
 */
async function extractTextFromBuffer(buffer, originalname) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Uploaded document buffer is empty.');
  }

  const ext = path.extname(originalname || '').toLowerCase();
  let extractedRaw = '';

  if (ext === '.txt') {
    extractedRaw = buffer.toString('utf-8');
  } else if (ext === '.pdf') {
    try {
      const parsed = await officeParser.parseOffice(buffer, { fileType: 'pdf' });
      extractedRaw = typeof parsed === 'string' 
        ? parsed 
        : (typeof parsed?.toText === 'function' ? parsed.toText() : (parsed?.content || parsed?.toString() || ''));
    } catch (err1) {
      try {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        extractedRaw = typeof result === 'string' ? result : (result?.text || '');
      } catch (err2) {
        console.warn('PDF parser fallback warning:', err2.message);
        throw new Error('Unable to extract text from the PDF file. Please ensure it contains selectable text.');
      }
    }
  } else if (['.ppt', '.pptx', '.doc', '.docx'].includes(ext)) {
    try {
      const fileType = ext.replace('.', '');
      const parsed = await officeParser.parseOffice(buffer, { fileType });
      extractedRaw = typeof parsed === 'string' 
        ? parsed 
        : (typeof parsed?.toText === 'function' ? parsed.toText() : (parsed?.content || parsed?.toString() || ''));
    } catch (err) {
      console.error('Office document parse error:', err);
      throw new Error(`Unable to extract text from ${ext.toUpperCase()} document. Please ensure the file is not corrupted or password-protected.`);
    }
  } else {
    throw new Error(`Unsupported document extension ${ext}. Please upload a PDF, PPT, or PPTX file.`);
  }

  // Ensure extractedRaw is guaranteed to be a string
  const str = typeof extractedRaw === 'string' ? extractedRaw : String(extractedRaw || '');

  const cleaned = str
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned || cleaned.length < 30) {
    throw new Error('Extracted text is too short or empty. Please upload a document with sufficient textual lecture content.');
  }

  if (cleaned.length > 20000) {
    return cleaned.substring(0, 20000);
  }

  return cleaned;
}

const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-2.5-flash-lite',
  'gemini-pro-latest'
];

/**
 * Calls Google Gemini API with fallback models and structured JSON response enforcement.
 */
async function callGeminiAPI(systemPrompt, userPrompt, temperature = 0.2) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    const error = new Error('AI service authentication failed. Check GEMINI_API_KEY in backend environment variables.');
    error.statusCode = 401;
    throw error;
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  let lastError = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature,
          maxOutputTokens: 4000,
          responseMimeType: 'application/json'
        }
      });

      const result = await model.generateContent(userPrompt);
      const text = result?.response?.text();
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (err) {
      console.warn(`[Gemini] Model ${modelName} attempt failed:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`AI generation failed: ${lastError?.message || 'Unable to generate response from AI.'}`);
}

/**
 * Parses and strictly validates Quiz JSON structure.
 */
function parseAndValidateQuizJson(rawContent, targetCount, marksPerQuestion, fallbackTitle) {
  let cleaned = rawContent.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse AI JSON response:', cleaned);
    throw new Error('AI returned an invalid quiz JSON structure. Please try regenerating.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response is not a valid JSON object.');
  }

  const title = (parsed.title && typeof parsed.title === 'string' && parsed.title.trim())
    ? parsed.title.trim()
    : (fallbackTitle || 'Academic Quiz Assessment');

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  if (rawQuestions.length === 0) {
    throw new Error('AI could not formulate any valid questions from the provided document content.');
  }

  const validatedQuestions = rawQuestions.map((q, idx) => {
    const questionText = (q.questionText || q.question || `Question ${idx + 1}`).toString().trim();

    let options = Array.isArray(q.options) ? q.options.map(opt => String(opt).trim()) : [];
    if (options.length === 0) {
      options = ['Option A', 'Option B', 'Option C', 'Option D'];
    }

    while (options.length < 4 && options.length > 0) {
      options.push(`Option ${String.fromCharCode(65 + options.length)}`);
    }

    let correctIndex = parseInt(q.correctOptionIndex ?? q.correctAnswerIndex ?? 0, 10);
    if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      correctIndex = 0;
    }

    const marks = Number(q.marks) > 0 ? Number(q.marks) : (Number(marksPerQuestion) || 1);

    return { questionText, options, correctOptionIndex: correctIndex, marks };
  });

  return { title, questions: validatedQuestions };
}

/**
 * Generates an academic quiz using AI from extracted text.
 */
async function generateQuizFromText({
  text,
  title,
  questionCount = 10,
  difficulty = 'Medium',
  questionType = 'Multiple Choice',
  marksPerQuestion = 1,
  duration = 15
}) {
  const count = Math.max(1, Math.min(30, parseInt(questionCount, 10) || 10));
  const marks = Math.max(1, parseInt(marksPerQuestion, 10) || 1);

  const systemPrompt = `You are an expert academic quiz generator and university professor.
Generate high-quality, unambiguous, educational questions based STRICTLY on the supplied document content.
DO NOT invent facts not supported by the document text.
All options must be plausible and well-formulated.
Every question must have exactly ONE clearly correct answer.
Return a STRICT JSON object only matching the requested schema.`;

  const userPrompt = `Generate exactly ${count} academic quiz questions from the document text below.

Quiz Specifications:
- Target Topic / Title: "${title || 'Course Concept Evaluation'}"
- Number of Questions: ${count}
- Difficulty Level: ${difficulty} (Easy, Medium, Hard, or Mixed)
- Question Type: ${questionType}
- Marks per Question: ${marks}

Document Content:
"""
${text}
"""

Required JSON Output Schema:
{
  "title": "A descriptive title for this quiz",
  "questions": [
    {
      "questionText": "Precise question prompt based on document content",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 0,
      "marks": ${marks}
    }
  ]
}`;

  const rawJson = await callGeminiAPI(systemPrompt, userPrompt);
  const validated = parseAndValidateQuizJson(rawJson, count, marks, title);
  
  return {
    ...validated,
    duration: Number(duration) || 15,
    sourceTextSnippet: text.substring(0, 1000)
  };
}

/**
 * Regenerates a single replacement question from document text.
 */
async function regenerateSingleQuestion({
  text,
  existingQuestionText = '',
  difficulty = 'Medium',
  questionType = 'Multiple Choice',
  marks = 1
}) {
  const systemPrompt = `You are an expert academic quiz generator.
Generate 1 replacement question based strictly on the provided document text.
It must be distinct and different from: "${existingQuestionText}".
Return a STRICT JSON object only.`;

  const userPrompt = `Generate 1 new replacement question (${difficulty} difficulty, ${questionType}, ${marks} mark(s)) from this document:

"""
${text}
"""

Required JSON Format:
{
  "questionText": "New question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctOptionIndex": 0,
  "marks": ${marks}
}`;

  const rawJson = await callGeminiAPI(systemPrompt, userPrompt);
  let cleaned = rawJson.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  const parsed = JSON.parse(cleaned);

  const q = parsed.question || parsed.questions?.[0] || parsed;
  let options = Array.isArray(q.options) ? q.options.map(String) : ['Option A', 'Option B', 'Option C', 'Option D'];
  while (options.length < 4) options.push(`Option ${String.fromCharCode(65 + options.length)}`);

  let correctIndex = parseInt(q.correctOptionIndex ?? 0, 10);
  if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= options.length) correctIndex = 0;

  return {
    questionText: (q.questionText || 'New Question').toString().trim(),
    options,
    correctOptionIndex: correctIndex,
    marks: Number(marks) || 1
  };
}

module.exports = {
  extractTextFromBuffer,
  generateQuizFromText,
  regenerateSingleQuestion
};