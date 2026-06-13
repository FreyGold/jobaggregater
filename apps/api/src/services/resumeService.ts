import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '../middleware/errorHandler.js';
import { resumeRepository } from '../repositories/ResumeRepository.js';
import { logInfo, logError } from '../lib/logger.js';
import { TAILORED_CV_LIMIT } from '@jobagg/shared';
import { AppDataSource } from '../config/data-source.js';
import { User } from '../entities/User.js';

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

    const count = await resumeRepository.countTailoredByUserId(userId);
    if (count >= TAILORED_CV_LIMIT) {
      throw new AppError(400, `Maximum ${TAILORED_CV_LIMIT} tailored CVs allowed. Delete an existing one first.`, 'LIMIT_REACHED');
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    const aiSettings = (user?.settings || {}) as { aiProvider?: string; aiModel?: string; aiApiKey?: string };

    const apiKey = aiSettings.aiApiKey || process.env['GEMINI_API_KEY'] || '';
    const provider = aiSettings.aiProvider || 'gemini';
    const model = aiSettings.aiModel || (provider === 'groq' ? 'mixtral-8x7b-32768' : 'gemini-2.0-flash');

    if (!apiKey) {
      const mockScore = Math.floor(Math.random() * 40) + 60;
      const resumeText = resume.content.slice(0, 4000);
      const lines = resumeText.split('\n').map(l => l.trim()).filter(Boolean);

      const textLines = lines.filter(l => !l.startsWith('%') && !l.startsWith('\\document') && !l.startsWith('\\usepackage') && !l.startsWith('\\begin') && !l.startsWith('\\end'));
      const name = textLines.find(l => /^[A-Za-z]/.test(l) && l.length < 60 && !l.startsWith('\\')) || 'Your Name';
      const contact = textLines.slice(0, 5).filter(l => l.includes('@') || l.includes('github') || l.includes('linkedin') || l.includes('+') || l.includes('.dev')).join(' $|$ ');

      const content = textLines.map(l => l.startsWith('\\section') || l.startsWith('\\resume') ? l : `  \\resumeItem{${this.escapeLatex(l)}}`).join('\n');

      const mockTailored = `%------------------------
% Resume in Latex
% Author : Jake Gutierrez
% Based off of: https://github.com/sb2nov/resume
% License : MIT
%------------------------

\\documentclass[letterpaper,10pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.6in}
\\addtolength{\\evensidemargin}{-0.6in}
\\addtolength{\\textwidth}{1.2in}
\\addtolength{\\topmargin}{-.65in}
\\addtolength{\\textheight}{1.3in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-6pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-6pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-3pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-9pt}
}

\\newcommand{\\resumeSubSubheading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-9pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-7pt}}

%-------------------------------------------
\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape ${this.escapeLatex(name)}} \\\\ \\vspace{1pt}
    \\small
    ${this.escapeLatex(contact)}
\\end{center}

\\resumeSubHeadingListStart
${content}
\\resumeSubHeadingListEnd
%-------------------------------------------
\\end{document}`;

      const tailored = await resumeRepository.createTailored({
        resumeId, userId,
        jobTitle: input.jobTitle, companyName: input.companyName,
        jobDescription: input.jobDescription, jobUrl: input.jobUrl,
        score: mockScore, tailoredContent: mockTailored,
      });
      return tailored;
    }

    const prompt = `You are an expert CV tailor. Given a candidate's resume and a target job listing, rewrite the resume to strongly match the job requirements. Be specific — every bullet point must describe a real accomplishment, not a generic responsibility.

Output a JSON object with:
- "score": number 0-100 estimating how well the resume matches the job
- "tailoredContent": the rewritten resume as a complete, compilable LaTeX document using the sb2nov/resume template

TAILORING RULES:
1. Analyze the job description for required skills (languages, frameworks, tools, domain expertise) — these must appear in the Skills section.
2. Rewrite each experience bullet point to highlight achievements relevant to the target role. Use metrics and concrete outcomes where possible.
3. If the resume has relevant experience, expand those entries. If it has irrelevant experience, condense or rephrase it to emphasize transferable skills.
4. Add a Projects section for any relevant personal or academic projects.
5. Never fabricate experience or skills. Rephrase and emphasize real content to match the job.

LaTeX template commands (sb2nov/resume style):
- \\resumeSubheading{Institution/Company}{Location}{Degree/Role}{Dates}
- \\resumeItem{Bullet point text}
- \\resumeProjectHeading{\\textbf{Project Name} $|$ \\emph{Tech Stack} $|$ Link}{}
- \\resumeSubHeadingListStart / \\resumeSubHeadingListEnd
- \\resumeItemListStart / \\resumeItemListEnd

Sections in order: Header (name centered, email, phone, links), Summary, Education, Experience, Projects, Technical Skills. Each bullet under Experience/Projects must be a \\resumeItem.

CRITICAL: You MUST use the EXACT sb2nov/resume preamble below. Do NOT modify it, omit packages, or substitute alternatives. Copy it verbatim:

\\documentclass[letterpaper,10pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\addtolength{\\oddsidemargin}{-0.6in}
\\addtolength{\\evensidemargin}{-0.6in}
\\addtolength{\\textwidth}{1.2in}
\\addtolength{\\topmargin}{-.65in}
\\addtolength{\\textheight}{1.3in}
\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}
\\titleformat{\\section}{\\vspace{-6pt}\\scshape\\raggedright\\large}{}{0em}{}[\\color{black}\\titlerule \\vspace{-6pt}]
\\pdfgentounicode=1
\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-3pt}}}}
\\newcommand{\\resumeSubheading}[4]{\\vspace{-2pt}\\item\\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}\\textbf{#1} & #2 \\\\\\textit{\\small#3} & \\textit{\\small #4} \\\\\\end{tabular*}\\vspace{-9pt}}
\\newcommand{\\resumeProjectHeading}[2]{\\item\\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}\\small#1 & #2 \\\\\\end{tabular*}\\vspace{-9pt}}
\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-7pt}}

LaTeX rules:
- Escape special characters: & % $ # _ { } ~ ^
- Output a complete \\documentclass...\\end{document} that compiles standalone
- The header must use \\begin{center}...\\end{center} with name \\Huge \\scshape, then contact info with $|$ separators

Return ONLY this JSON with no markdown fences, no extra text:
{"score": 85, "tailoredContent": "\\documentclass{...}...\\end{document}"}

Resume:
${resume.content}

Target Job Title: ${input.jobTitle}
Target Company: ${input.companyName}
Job Description:
${input.jobDescription}`;

    try {
      let text: string;
      if (provider === 'groq') {
        const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
          }),
        });
        if (!groqResp.ok) {
          const err = await groqResp.text();
          throw new Error(`Groq API error (${groqResp.status}): ${err}`);
        }
        const groqData = await groqResp.json() as { choices: { message: { content: string } }[] };
        text = groqData.choices[0]?.message?.content || '';
      } else {
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model });
        const result = await geminiModel.generateContent(prompt);
        text = result.response.text();
      }

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
        resumeId, userId,
        jobTitle: input.jobTitle, companyName: input.companyName,
        jobDescription: input.jobDescription, jobUrl: input.jobUrl,
        score: parsed.score, tailoredContent: parsed.tailoredContent,
      });

      logInfo('Resume tailored', { userId, resumeId, score: tailored.score, provider });
      return tailored;
    } catch (err) {
      logError('AI tailoring failed', err as Error);
      throw new AppError(500, 'AI tailoring failed', 'TAILOR_ERROR');
    }
  }

  async getTailoredById(id: string, userId: string) {
    const t = await resumeRepository.findTailoredById(id);
    if (!t) throw new AppError(404, 'Tailored CV not found', 'NOT_FOUND');
    if (t.userId !== userId) throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    return t;
  }

  async updateTailoredContent(id: string, userId: string, content: string) {
    const updated = await resumeRepository.updateTailored(id, userId, { tailoredContent: content });
    if (!updated) throw new AppError(404, 'Tailored CV not found', 'NOT_FOUND');
    logInfo('Tailored CV updated', { userId, tailoredId: id });
    return updated;
  }

  async generateCvPdf(latex: string): Promise<Buffer> {
    const response = await fetch('https://latex.ytotech.com/builds/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compiler: 'pdflatex',
        resources: [{ main: true, content: latex }],
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      logError('LaTeX compilation failed', new Error(text.slice(0, 500)));
      throw new AppError(502, `LaTeX compilation failed: ${text.slice(0, 200)}`, 'COMPILE_ERROR');
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
  }

  private escapeLatex(text: string): string {
    return text.replace(/\\/g, '\\textbackslash{}')
      .replace(/[{}&%$#_~^]/g, '\\$&')
      .replace(/\\textbackslash\{\}&/g, '\\textbackslash{}');
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
