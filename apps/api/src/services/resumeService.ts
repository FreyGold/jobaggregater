import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/unifiedConfig.js';
import { AppError } from '../middleware/errorHandler.js';
import { resumeRepository } from '../repositories/ResumeRepository.js';
import { logInfo, logError } from '../lib/logger.js';

const genAI = config.isDev
  ? null
  : new GoogleGenerativeAI(process.env['GEMINI_API_KEY'] ?? '');

async function extractTextFromBuffer(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    try {
      const { default: pdfParse } = await import('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text as string;
    } catch (err) {
      console.error('PDF parse error, falling back to raw text:', err);
      return buffer.toString('utf-8');
    }
  }
  return buffer.toString('utf-8');
}

export class ResumeService {
  async uploadResume(file: Express.Multer.File, userId: string) {
    const content = await extractTextFromBuffer(file.buffer, file.mimetype);

    const resume = await resumeRepository.create({
      userId,
      fileName: file.originalname,
      fileType: file.mimetype,
      content,
    });

    logInfo('Resume uploaded', { userId, resumeId: resume.id, fileName: resume.fileName });
    return resume;
  }

  async listResumes(userId: string) {
    return resumeRepository.findByUserId(userId);
  }

  async deleteResume(id: string, userId: string) {
    const resume = await resumeRepository.findById(id);
    if (!resume) throw new AppError(404, 'Resume not found', 'NOT_FOUND');
    if (resume.userId !== userId) throw new AppError(403, 'Forbidden', 'FORBIDDEN');

    await resumeRepository.delete(id);
    logInfo('Resume deleted', { userId, resumeId: id });
  }

  async tailorResume(
    resumeId: string,
    userId: string,
    input: { jobTitle: string; companyName: string; jobDescription: string; jobUrl?: string },
  ) {
    const resume = await resumeRepository.findById(resumeId);
    if (!resume) throw new AppError(404, 'Resume not found', 'NOT_FOUND');
    if (resume.userId !== userId) throw new AppError(403, 'Forbidden', 'FORBIDDEN');

    if (!genAI) {
      const mockScore = Math.floor(Math.random() * 40) + 60;
      const mockTailored = `# Tailored CV for ${input.jobTitle} at ${input.companyName}\n\n${resume.content}\n\n---\nTailored for: ${input.jobTitle} @ ${input.companyName}\nMatch Score: ${mockScore}%`;

      const tailored = await resumeRepository.createTailored({
        resumeId,
        userId,
        jobTitle: input.jobTitle,
        companyName: input.companyName,
        jobDescription: input.jobDescription,
        jobUrl: input.jobUrl,
        score: mockScore,
        tailoredContent: mockTailored,
      });

      return tailored;
    }

    const prompt = `You are an expert CV tailoring assistant. Given a candidate's resume and a job description, rewrite the resume to maximize matching score. Return JSON with "score" (0-100 match percentage) and "tailoredContent" (the rewritten resume in markdown).

Resume:
${resume.content}

Job Title: ${input.jobTitle}
Company: ${input.companyName}
Job Description:
${input.jobDescription}`;

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      let parsed: { score: number; tailoredContent: string };
      try {
        parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      } catch {
        parsed = {
          score: 85,
          tailoredContent: text,
        };
      }

      const tailored = await resumeRepository.createTailored({
        resumeId,
        userId,
        jobTitle: input.jobTitle,
        companyName: input.companyName,
        jobDescription: input.jobDescription,
        jobUrl: input.jobUrl,
        score: parsed.score,
        tailoredContent: parsed.tailoredContent,
      });

      logInfo('Resume tailored', { userId, resumeId, score: tailored.score });
      return tailored;
    } catch (err) {
      logError('Gemini tailoring failed', err as Error);
      throw new AppError(500, 'AI tailoring failed', 'TAILOR_ERROR');
    }
  }

  async listTailored(userId: string) {
    return resumeRepository.findTailoredByUserId(userId);
  }

  async deleteTailored(id: string, userId: string) {
    const t = await resumeRepository.findTailoredById(id);
    if (!t) throw new AppError(404, 'Tailored CV not found', 'NOT_FOUND');
    if (t.userId !== userId) throw new AppError(403, 'Forbidden', 'FORBIDDEN');

    await resumeRepository.deleteTailored(id, userId);
    logInfo('Tailored CV deleted', { userId, tailoredId: id });
  }
}
