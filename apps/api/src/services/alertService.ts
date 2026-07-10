import { AppError } from '../middleware/errorHandler.js';
import { emailSubscriptionRepository } from '../repositories/EmailSubscriptionRepository.js';
import { jobRepository } from '../repositories/JobRepository.js';
import { logInfo, logError } from '../lib/logger.js';
import { EmailSubscription } from '../entities/EmailSubscription.js';
import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  const pass = process.env.SMTP_PASS;
  if (!pass || pass === 're_123456789_test') {
    throw new Error('SMTP_PASS is not configured. Please add a real SMTP password or Resend API key to your .env file.');
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.resend.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || 'resend',
      pass: pass,
    },
  });

  return transporter;
}

export class AlertService {
  async subscribe(userId: string, email: string, keywords: string[], frequency: 'daily' | 'weekly') {
    const sub = await emailSubscriptionRepository.create({
      userId,
      email,
      keywords,
      frequency: frequency as any,
      isActive: true,
    });
    logInfo('User subscribed to alerts', { userId, email, frequency });
    return sub;
  }

  async listSubscriptions(userId: string) {
    return emailSubscriptionRepository.findByUserId(userId);
  }

  async unsubscribe(id: string, userId: string) {
    const sub = await emailSubscriptionRepository.findById(id);
    if (!sub) throw new AppError(404, 'Subscription not found', 'NOT_FOUND');
    if (sub.userId !== userId) throw new AppError(403, 'Forbidden', 'FORBIDDEN');

    await emailSubscriptionRepository.update(id, { isActive: false });
    logInfo('User unsubscribed from alerts', { userId, subscriptionId: id });
  }

  async getHistory(userId: string) {
    const subs = await emailSubscriptionRepository.findByUserId(userId);
    const activeSubs = subs.filter(s => s.isActive);
    const keywords = Array.from(new Set(activeSubs.flatMap(s => s.keywords)));

    if (keywords.length === 0) return [];

    // Calculate a strictly 10-day limit
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    // Alternatively, max(10 days ago, earliest subscription date)
    const earliestSubDate = new Date(Math.min(...activeSubs.map(s => new Date(s.createdAt).getTime())));
    const dateFrom = new Date(Math.max(tenDaysAgo.getTime(), earliestSubDate.getTime()));

    const jobs = await jobRepository.findManyByKeywords(keywords, 500, dateFrom);

    // Group jobs by day and then by keyword
    // Structure: { date: string, keywords: { keyword: string, jobs: any[] }[] }
    
    const dayMap = new Map<string, any[]>();
    
    for (const job of jobs) {
      const d = job.postedAt || job.createdAt;
      const dateStr = new Date(d).toISOString().split('T')[0] as string; // YYYY-MM-DD
      
      if (!dayMap.has(dateStr)) dayMap.set(dateStr, []);
      dayMap.get(dateStr)!.push(job);
    }

    const history: any[] = [];
    
    // Sort days descending
    const sortedDays = Array.from(dayMap.keys()).sort((a, b) => b.localeCompare(a));

    for (const day of sortedDays) {
      const dayJobs = dayMap.get(day)!;
      const keywordMap = new Map<string, any[]>();

      // Check which keywords match which jobs
      for (const kw of keywords) {
        const kwLower = kw.toLowerCase();
        const matches = dayJobs.filter((j: any) => 
          (j.title && j.title.toLowerCase().includes(kwLower)) ||
          (j.company && j.company.toLowerCase().includes(kwLower))
        );
        if (matches.length > 0) {
          keywordMap.set(kw, matches);
        }
      }

      const keywordsData = Array.from(keywordMap.entries()).map(([keyword, jobs]) => ({
        keyword,
        jobs
      }));

      if (keywordsData.length > 0) {
        history.push({
          date: day,
          keywords: keywordsData,
        });
      }
    }

    return history;
  }

  async sendAlerts() {
    logInfo('Starting alert job');
    const subs = await emailSubscriptionRepository.findActiveSubscriptions();
    for (const sub of subs) {
      try {
        await this.processSubscription(sub);
      } catch (err) {
        logError(`Failed to process subscription ${sub.id}`, err as Error);
      }
    }
    logInfo('Finished alert job');
  }

  async sendTestAlert(id: string, userId: string): Promise<string | undefined> {
    const sub = await emailSubscriptionRepository.findById(id);
    if (!sub) throw new AppError(404, 'Subscription not found', 'NOT_FOUND');
    if (sub.userId !== userId) throw new AppError(403, 'Forbidden', 'FORBIDDEN');

    const previewUrl = await this.processSubscription(sub, true);
    logInfo('Sent test alert', { subscriptionId: id, userId });
    return previewUrl;
  }

  private async processSubscription(sub: EmailSubscription, force = false): Promise<string | undefined> {
    const since = force ? new Date(0) : (sub.lastSentAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    // Find jobs matching all keywords (basic search space implementation)
    const keywordsString = sub.keywords.join(' ');
    const result = await jobRepository.findMany({ 
      keyword: keywordsString, 
    } as any);

    const jobs = result.jobs;
    const recentJobs = force ? jobs : jobs.filter((j: any) => j.createdAt >= since);

    if (recentJobs.length > 0 || force) {
      const previewUrl = await this.sendEmail(sub.email, recentJobs, sub.keywords);
      if (!force) {
        await emailSubscriptionRepository.update(sub.id, { lastSentAt: new Date() });
      }
      logInfo(`Sent alert to ${sub.email} with ${recentJobs.length} jobs (force: ${force})`);
      return previewUrl;
    }
  }

  private async sendEmail(to: string, jobs: any[], keywords: string[]): Promise<string | undefined> {
    const jobListings = jobs.slice(0, 10).map(j => `- ${j.title} at ${j.company} (${j.url})`).join('\n');
    const jobListingsHtml = jobs.slice(0, 10).map(j => `
      <li style="margin-bottom: 10px;">
        <a href="${j.url}" style="color: #2563eb; text-decoration: none; font-weight: bold;">${j.title}</a> 
        <br/>
        <span style="color: #4b5563;">at <strong>${j.company}</strong></span>
      </li>
    `).join('');

    const mailOptions = {
      from: '"JobAgg Alerts" <onboarding@resend.dev>',
      to,
      subject: `New jobs matching your alert for: ${keywords.join(', ')}`,
      text: `Hello,\n\nWe found ${jobs.length} new jobs matching your keywords:\n\n${jobListings}\n\nHappy hunting!\nJobAgg Team`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #111827; margin-top: 0;">JobAgg Alerts</h2>
          <p style="color: #374151; font-size: 16px;">Hello,</p>
          <p style="color: #374151; font-size: 16px;">
            We found <strong>${jobs.length}</strong> new job${jobs.length === 1 ? '' : 's'} matching your keywords: 
            <em style="color: #2563eb;">${keywords.join(', ')}</em>
          </p>
          
          ${jobs.length > 0 ? `
            <ul style="list-style-type: none; padding-left: 0; margin-top: 20px;">
              ${jobListingsHtml}
            </ul>
          ` : `
            <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; text-align: center; color: #6b7280; margin-top: 20px;">
              No matching jobs were found during this period. We'll keep looking!
            </div>
          `}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0 20px;" />
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Happy hunting!<br/>
            <strong>The JobAgg Team</strong>
          </p>
        </div>
      `
    };

    try {
      const t = await getTransporter();
      const info = await t.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logInfo(`Ethereal Mail Preview URL: ${previewUrl}`);
        return previewUrl as string;
      }
    } catch (err) {
      logError('Failed to send email', err as Error);
    }
    return undefined;
  }
}
