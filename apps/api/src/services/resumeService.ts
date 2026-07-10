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
      let mockTailored = '';

      if (resume.content.includes('\\documentclass') && resume.content.includes('\\begin{document}')) {
        mockTailored = resume.content;
      } else {
        const parsed = parsePlainTextResume(resume.content);
        mockTailored = generateLatexFromParsed(parsed, this.escapeLatex.bind(this));
      }

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

      let parsed = parseAITailoredResponse(text);
      parsed.tailoredContent = sanitizeLatex(parsed.tailoredContent);

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

  async extractJobDetails(userId: string, url: string, title: string, bodyText: string) {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    const aiSettings = (user?.settings || {}) as { aiProvider?: string; aiModel?: string; aiApiKey?: string };

    const apiKey = aiSettings.aiApiKey || process.env['GEMINI_API_KEY'] || '';
    const provider = aiSettings.aiProvider || 'gemini';
    const model = aiSettings.aiModel || (provider === 'groq' ? 'mixtral-8x7b-32768' : 'gemini-2.0-flash');

    if (!apiKey) {
      throw new AppError(400, 'AI API key is not configured.', 'MISSING_API_KEY');
    }

    const prompt = `You are a job listing parser. Given the following page text, extract the job title and company name. If you can find a job description, include it. Return ONLY valid JSON with these fields: "jobTitle", "companyName", "jobDescription". If you cannot determine a field, use an empty string.

Page URL: ${url}
Page Title: ${title}

Page Text:
${bodyText.slice(0, 15000)}`;

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
        if (!groqResp.ok) throw new Error(`Groq API error (${groqResp.status})`);
        const groqData = await groqResp.json() as { choices: { message: { content: string } }[] };
        text = groqData.choices[0]?.message?.content || '';
      } else {
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model });
        const result = await geminiModel.generateContent(prompt);
        text = result.response.text();
      }

      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return parsed;
    } catch (err) {
      logError('AI extraction failed', err as Error);
      throw new AppError(500, 'AI extraction failed', 'EXTRACT_ERROR');
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
  async scoreMatch(resumeId: string, userId: string, jobTitle: string, jobDescription: string) {
    const resume = await resumeRepository.findById(resumeId);
    if (!resume) throw new AppError(404, 'Resume not found', 'NOT_FOUND');
    if (resume.userId !== userId) throw new AppError(403, 'Forbidden', 'FORBIDDEN');

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    const aiSettings = (user?.settings || {}) as { aiProvider?: string; aiModel?: string; aiApiKey?: string };

    const apiKey = aiSettings.aiApiKey || process.env['GEMINI_API_KEY'] || '';
    const provider = aiSettings.aiProvider || 'gemini';
    const model = aiSettings.aiModel || (provider === 'groq' ? 'mixtral-8x7b-32768' : 'gemini-2.0-flash');

    if (!apiKey) {
      return {
        score: Math.floor(Math.random() * 40) + 60,
        missingKeywords: ['Mocking', 'API', 'Keys'],
        analysis: 'Please configure your API key to get a real ATS match score.',
      };
    }

    const prompt = `You are an expert ATS (Applicant Tracking System) algorithm. Compare the candidate's resume to the target job description.
    
Output a JSON object with:
- "score": number 0-100 estimating how well the resume matches the job requirements.
- "missingKeywords": array of strings listing important keywords/skills from the job description that are missing in the resume.
- "analysis": a short 2-3 sentence paragraph explaining the score and what the candidate should focus on adding or highlighting.

Return ONLY this JSON with no markdown fences, no extra text:
{"score": 85, "missingKeywords": ["GraphQL", "Docker"], "analysis": "Strong match in frontend skills, but lacks backend requirements."}

Resume:
${resume.content}

Target Job Title: ${jobTitle}
Job Description:
${jobDescription}`;

    try {
      let text: string;
      if (provider === 'groq') {
        const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.1 }),
        });
        if (!groqResp.ok) throw new Error(`Groq API error (${groqResp.status})`);
        const groqData = await groqResp.json() as { choices: { message: { content: string } }[] };
        text = groqData.choices[0]?.message?.content || '';
      } else {
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model });
        const result = await geminiModel.generateContent(prompt);
        text = result.response.text();
      }

      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      logInfo('Resume scored', { userId, resumeId, score: parsed.score });
      return parsed as { score: number; missingKeywords: string[]; analysis: string };
    } catch (err) {
      logError('AI scoring failed', err as Error);
      throw new AppError(500, 'AI scoring failed', 'SCORE_ERROR');
    }
  }
}

// ─── LaTeX Helper Functions ─────────────────────────────────────────

interface ParsedResume {
  name: string;
  contact: string;
  summary: string;
  experience: {
    role: string;
    dates: string;
    company: string;
    location: string;
    items: string[];
  }[];
  education: {
    school: string;
    location: string;
    degree: string;
    dates: string;
    items: string[];
  }[];
  projects: {
    name: string;
    tech: string;
    link: string;
    items: string[];
  }[];
  skills: {
    category: string;
    items: string;
  }[];
}

function isExperienceHeading(line: string): boolean {
  const datePattern = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Expected|202\d|199\d|20\d\d)/i;
  if (datePattern.test(line) && /\d{4}/.test(line)) return true;
  if (line.includes('LLC') || line.includes('Inc.') || line.includes('Corp.') || line.includes('Corporation') || line.includes('Project')) return true;
  return false;
}

function isEducationHeading(line: string): boolean {
  const datePattern = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Expected|202\d|199\d|20\d\d)/i;
  if (datePattern.test(line) && /\d{4}/.test(line)) return true;
  if (line.includes('GPA') || line.includes('Bachelor') || line.includes('Master') || line.includes('University') || line.includes('Faculty') || line.includes('School') || line.includes('Electronic Engineering')) return true;
  return false;
}

function isProjectHeading(line: string): boolean {
  if (line.includes('|') || line.includes('Repository') || line.includes('Private') || line.includes('Live') || line.includes('Github') || line.includes('http')) return true;
  return false;
}

function parsePlainTextResume(text: string): ParsedResume {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const parsed: ParsedResume = {
    name: 'Ahmed Tawfik',
    contact: '',
    summary: '',
    experience: [],
    education: [],
    projects: [],
    skills: []
  };

  if (lines.length > 0 && lines[0]) {
    parsed.name = lines[0];
  }
  if (lines.length > 1 && lines[1]) {
    parsed.contact = lines[1];
  }

  let currentSection = '';
  let expIndex = -1;
  let eduIndex = -1;
  let projIndex = -1;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    const upperLine = line.toUpperCase();

    if (upperLine === 'SUMMARY') {
      currentSection = 'summary';
      continue;
    } else if (upperLine === 'EXPERIENCE' || upperLine === 'WORK EXPERIENCE') {
      currentSection = 'experience';
      continue;
    } else if (upperLine === 'EDUCATION') {
      currentSection = 'education';
      continue;
    } else if (upperLine === 'PROJECTS' || upperLine === 'PERSONAL PROJECTS') {
      currentSection = 'projects';
      continue;
    } else if (upperLine === 'TECHNICAL SKILLS' || upperLine === 'SKILLS') {
      currentSection = 'skills';
      continue;
    }

    if (currentSection === 'summary') {
      parsed.summary = parsed.summary ? parsed.summary + ' ' + line : line;
    } else if (currentSection === 'experience') {
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        const cleanedLine = line.replace(/^[•\-*]\s*/, '');
        if (expIndex >= 0) {
          const exp = parsed.experience[expIndex];
          if (exp) exp.items.push(cleanedLine);
        }
      } else if (line === '•' || line === '-' || line === '*') {
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]?.trim();
          if (nextLine && expIndex >= 0) {
            const exp = parsed.experience[expIndex];
            if (exp) exp.items.push(nextLine);
          }
          i++;
        }
        continue;
      } else {
        if (expIndex >= 0) {
          const exp = parsed.experience[expIndex];
          if (exp && exp.items.length > 0) {
            const lastItemIdx = exp.items.length - 1;
            const lastItem = exp.items[lastItemIdx];
            if (lastItem) {
              const isContinuation = 
                (!lastItem.endsWith('.') && !isExperienceHeading(line)) || 
                /^[a-z]/.test(line) ||
                line.startsWith(',') ||
                line.startsWith(')') ||
                line.startsWith(']');
              
              if (isContinuation) {
                exp.items[lastItemIdx] = lastItem + ' ' + line;
                continue;
              }
            }
          }
        }

        const exp = expIndex >= 0 ? parsed.experience[expIndex] : undefined;
        if (!exp || exp.items.length > 0) {
          expIndex++;
          parsed.experience.push({ role: line, dates: '', company: '', location: '', items: [] });
        } else {
          if (!exp.company) {
            exp.company = line;
          } else {
            exp.location = line;
          }
        }
      }
    } else if (currentSection === 'education') {
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        const cleanedLine = line.replace(/^[•\-*]\s*/, '');
        if (eduIndex >= 0) {
          const edu = parsed.education[eduIndex];
          if (edu) edu.items.push(cleanedLine);
        }
      } else if (line === '•' || line === '-' || line === '*') {
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]?.trim();
          if (nextLine && eduIndex >= 0) {
            const edu = parsed.education[eduIndex];
            if (edu) edu.items.push(nextLine);
          }
          i++;
        }
        continue;
      } else {
        if (eduIndex >= 0) {
          const edu = parsed.education[eduIndex];
          if (edu && edu.items.length > 0) {
            const lastItemIdx = edu.items.length - 1;
            const lastItem = edu.items[lastItemIdx];
            if (lastItem) {
              const isContinuation = 
                (!lastItem.endsWith('.') && !isEducationHeading(line)) || 
                /^[a-z]/.test(line) ||
                line.startsWith(',') ||
                line.startsWith(')') ||
                line.startsWith(']');
              
              if (isContinuation) {
                edu.items[lastItemIdx] = lastItem + ' ' + line;
                continue;
              }
            }
          }
        }

        const edu = eduIndex >= 0 ? parsed.education[eduIndex] : undefined;
        if (!edu || edu.items.length > 0) {
          eduIndex++;
          parsed.education.push({ school: line, location: '', degree: '', dates: '', items: [] });
        } else {
          if (!edu.degree) {
            edu.degree = line;
          } else {
            edu.dates = line;
          }
        }
      }
    } else if (currentSection === 'projects') {
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        const cleanedLine = line.replace(/^[•\-*]\s*/, '');
        if (projIndex >= 0) {
          const proj = parsed.projects[projIndex];
          if (proj) proj.items.push(cleanedLine);
        }
      } else if (line === '•' || line === '-' || line === '*') {
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]?.trim();
          if (nextLine && projIndex >= 0) {
            const proj = parsed.projects[projIndex];
            if (proj) proj.items.push(nextLine);
          }
          i++;
        }
        continue;
      } else {
        if (projIndex >= 0) {
          const proj = parsed.projects[projIndex];
          if (proj && proj.items.length > 0) {
            const lastItemIdx = proj.items.length - 1;
            const lastItem = proj.items[lastItemIdx];
            if (lastItem) {
              const isContinuation = 
                (!lastItem.endsWith('.') && !isProjectHeading(line)) || 
                /^[a-z]/.test(line) ||
                line.startsWith(',') ||
                line.startsWith(')') ||
                line.startsWith(']');
              
              if (isContinuation) {
                proj.items[lastItemIdx] = lastItem + ' ' + line;
                continue;
              }
            }
          }
        }

        const proj = projIndex >= 0 ? parsed.projects[projIndex] : undefined;
        if (!proj || proj.items.length > 0) {
          projIndex++;
          parsed.projects.push({ name: line, tech: '', link: '', items: [] });
        } else {
          if (!proj.tech) {
            proj.tech = line;
          } else {
            proj.link = line;
          }
        }
      }
    } else if (currentSection === 'skills') {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const category = line.slice(0, colonIdx).trim();
        const items = line.slice(colonIdx + 1).trim();
        parsed.skills.push({ category, items });
      } else {
        const lastSkill = parsed.skills.length > 0 ? parsed.skills[parsed.skills.length - 1] : undefined;
        if (lastSkill) {
          lastSkill.items += ', ' + line;
        } else {
          parsed.skills.push({ category: 'Skills', items: line });
        }
      }
    }
  }

  return parsed;
}

function generateLatexFromParsed(parsed: ParsedResume, escapeLatex: (s: string) => string): string {
  let experienceContent = '';
  for (const exp of parsed.experience) {
    let role = exp.role;
    let dates = exp.dates || '';
    
    const dateRegex = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*(?:–|-)\s*(?:[A-Za-z]+\s+\d{4}|Present))/i;
    const match = role.match(dateRegex);
    if (match && match[1]) {
      dates = match[1];
      role = role.replace(dateRegex, '').trim();
    }
    
    let company = exp.company;
    let location = exp.location || 'Remote';
    if (company.endsWith('Remote')) {
      location = 'Remote';
      company = company.slice(0, -6).trim();
    } else if (company.endsWith('Hybrid')) {
      location = 'Hybrid';
      company = company.slice(0, -6).trim();
    }

    experienceContent += `    \\resumeSubheading
      {${escapeLatex(company || 'Company')}}{${escapeLatex(location)}}
      {${escapeLatex(role || 'Developer')}}{${escapeLatex(dates || 'Dates')}}
      \\resumeItemListStart
`;
    for (const item of exp.items) {
      experienceContent += `        \\resumeItem{${escapeLatex(item)}}\n`;
    }
    experienceContent += `      \\resumeItemListEnd\n\n`;
  }

  let educationContent = '';
  for (const edu of parsed.education) {
    let school = edu.school;
    let location = edu.location || 'Location';
    if (school.includes('Menoufia, Egypt')) {
      location = 'Menoufia, Egypt';
      school = school.replace('Menoufia, Egypt', '').trim();
    }
    
    let degree = edu.degree;
    let dates = edu.dates || 'Dates';
    const expMatch = degree.match(/(Expected\s+[A-Za-z]+\s+\d{4})/i);
    if (expMatch && expMatch[1]) {
      dates = expMatch[1];
      degree = degree.replace(expMatch[1], '').trim();
    }

    educationContent += `    \\resumeSubheading
      {${escapeLatex(school)}}{${escapeLatex(location)}}
      {${escapeLatex(degree)}}{${escapeLatex(dates)}}
      \\resumeItemListStart
`;
    for (const item of edu.items) {
      educationContent += `        \\resumeItem{${escapeLatex(item)}}\n`;
    }
    educationContent += `      \\resumeItemListEnd\n\n`;
  }

  let projectsContent = '';
  for (const proj of parsed.projects) {
    let name = proj.name;
    let tech = proj.tech || '';
    let link = proj.link || '';
    
    const parts = name.split('|').map(s => s.trim());
    if (parts.length >= 2) {
      name = parts[0] || '';
      tech = parts[1] || '';
      if (parts.length >= 3) {
        link = parts[2] || '';
      }
    }

    let headerStr = `\\textbf{${escapeLatex(name)}}`;
    if (tech) {
      headerStr += ` $|$ \\emph{${escapeLatex(tech)}}`;
    }
    if (link) {
      headerStr += ` $|$ \\href{https://github.com/freygold}{\\underline{${escapeLatex(link)}}}`;
    }

    projectsContent += `    \\resumeProjectHeading
      {${headerStr}}{}
      \\resumeItemListStart
`;
    for (const item of proj.items) {
      projectsContent += `        \\resumeItem{${escapeLatex(item)}}\n`;
    }
    projectsContent += `      \\resumeItemListEnd\n\n`;
  }

  let skillsContent = '  \\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{\n';
  for (const skill of parsed.skills) {
    skillsContent += `     \\textbf{${escapeLatex(skill.category)}}{: ${escapeLatex(skill.items)}} \\\\\n`;
  }
  if (parsed.skills.length > 0) {
    skillsContent = skillsContent.slice(0, -3) + '\n';
  }
  skillsContent += '    }}\n  \\end{itemize}';

  const doc = `%------------------------
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
    \\textbf{\\Huge \\scshape ${escapeLatex(parsed.name)}} \\\\ \\vspace{1pt}
    \\small
    ${escapeLatex(parsed.contact).replace(/\|/g, ' $|$ ')}
\\end{center}

%-----------SUMMARY-----------
\\section{Summary}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
      ${escapeLatex(parsed.summary)}
    }}
  \\end{itemize}

%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeSubHeadingListStart
${experienceContent}  \\resumeSubHeadingListEnd

%-----------EDUCATION-----------
\\section{Education}
  \\resumeSubHeadingListStart
${educationContent}  \\resumeSubHeadingListEnd

%-----------PROJECTS-----------
\\section{Projects}
  \\resumeSubHeadingListStart
${projectsContent}  \\resumeSubHeadingListEnd

%-----------TECHNICAL SKILLS-----------
\\section{Technical Skills}
${skillsContent}

\\end{document}`;

  return doc;
}

function parseAITailoredResponse(text: string): { score: number; tailoredContent: string } {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') {
      let score = typeof parsed.score === 'number' ? parsed.score : parseInt(parsed.score);
      if (isNaN(score)) score = 85;
      
      let content = parsed.tailoredContent;
      if (typeof content === 'string' && content.includes('\\documentclass')) {
        return { score, tailoredContent: content };
      }
    }
  } catch (err) {
    console.warn('Initial JSON parse failed, trying fallback strategies:', err);
  }

  let score = 85;
  const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
  if (scoreMatch && scoreMatch[1]) {
    score = parseInt(scoreMatch[1], 10);
  }

  const latexRegex = /(\\{1,2}documentclass[\s\S]*?\\{1,2}end\s*\{\s*document\s*\})/i;
  const latexMatch = text.match(latexRegex);
  
  if (latexMatch && latexMatch[1]) {
    let content = latexMatch[1];
    if (content.includes('\\\\documentclass') || content.includes('\\\\begin') || content.includes('\\\\section')) {
      content = content.replace(/\\(.)/g, (match, p1) => {
        if (p1 === 'n') return '\n';
        if (p1 === 't') return '\t';
        if (p1 === 'r') return '\r';
        if (p1 === '\"') return '\"';
        if (p1 === '\\') return '\\';
        return p1;
      });
    }
    return { score, tailoredContent: content };
  }

  return { score, tailoredContent: text };
}

function sanitizeLatex(latex: string): string {
  const docStartIdx = latex.indexOf('\\begin{document}');
  if (docStartIdx === -1) return latex;

  const preamble = latex.slice(0, docStartIdx);
  let body = latex.slice(docStartIdx);

  const escapeChar = (str: string, char: string): string => {
    const regex = new RegExp(`([^\\\\]|^)${char === '$' ? '\\$' : char}`, 'g');
    return str.replace(regex, `$1\\${char}`);
  };

  body = escapeChar(body, '&');

  const hrefs: string[] = [];
  body = body.replace(/\\(href|url)\{[^{}]*\}(\{[^{}]*\})?/g, (match) => {
    hrefs.push(match);
    return `__HREF_TOKEN_${hrefs.length - 1}__`;
  });

  body = escapeChar(body, '_');
  body = escapeChar(body, '\\$');

  body = body.replace(/__HREF_TOKEN_(\d+)__/g, (match, id) => {
    if (id) {
      const idx = parseInt(id, 10);
      return hrefs[idx] || match;
    }
    return match;
  });

  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith('%')) continue;
    lines[i] = line.replace(/([^\\]|^)%/g, '$1\\%');
  }
  body = lines.join('\n');

  return preamble + body;
}
