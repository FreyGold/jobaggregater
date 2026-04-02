// ─── Job Routes ──────────────────────────────────────────────────

import { Router } from 'express';
import { JobController } from '../controllers/JobController.js';
import { JobService } from '../services/jobService.js';
import { JobDescriptionService } from '../services/jobDescriptionService.js';
import { jobRepository } from '../repositories/JobRepository.js';
import { userRepository } from '../repositories/UserRepository.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware.js';
import { tieredRateLimit } from '../middleware/rateLimitMiddleware.js';
import { jobFiltersSchema } from '../validators/job.schema.js';
import { asyncErrorWrapper } from '../utils/index.js';

const jobService = new JobService(jobRepository, userRepository);
const jobDescriptionService = new JobDescriptionService(jobRepository);
const jobController = new JobController(jobService, jobDescriptionService);

const router: Router = Router();

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: List all jobs with filtering
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *           enum: [postedAt, salary, title]
 *       - name: sortOrder
 *         in: query
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *       - name: location
 *         in: query
 *         schema:
 *           type: string
 *       - name: isRemote
 *         in: query
 *         schema:
 *           type: boolean
 *       - name: salaryMin
 *         in: query
 *         schema:
 *           type: integer
 *       - name: salaryMax
 *         in: query
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated list of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *                     plan:
 *                       type: string
 *                       enum: [FREE, PRO, ENTERPRISE]
 */
// Public routes (optionalAuth to detect user plan)
router.get(
  '/',
  asyncErrorWrapper(optionalAuthMiddleware as never),
  tieredRateLimit,
  validateRequest(jobFiltersSchema, 'query'),
  asyncErrorWrapper((req, res) => jobController.listJobs(req, res)),
);

/**
 * @swagger
 * /api/jobs/search:
 *   get:
 *     summary: Full-text search jobs
 *     tags: [Jobs]
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Job'
 */
router.get(
  '/search',
  tieredRateLimit,
  asyncErrorWrapper((req, res) => jobController.searchJobs(req, res)),
);

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       404:
 *         description: Job not found
 */
router.get(
  '/:id',
  asyncErrorWrapper((req, res) => jobController.getJob(req, res)),
);

/**
 * @swagger
 * /api/jobs/saved/list:
 *   get:
 *     summary: Get saved jobs for current user
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Job'
 *       401:
 *         description: Unauthorized
 */
// Authenticated routes — saved jobs
router.get(
  '/saved/list',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => jobController.getSavedJobs(req, res)),
);

/**
 * @swagger
 * /api/jobs/saved/{jobId}:
 *   post:
 *     summary: Save a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Job saved
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Job already saved
 */
router.post(
  '/saved/:jobId',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => jobController.saveJob(req, res)),
);

/**
 * @swagger
 * /api/jobs/saved/{jobId}:
 *   delete:
 *     summary: Remove saved job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job removed from saved
 *       401:
 *         description: Unauthorized
 */
router.delete(
  '/saved/:jobId',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => jobController.unsaveJob(req, res)),
);

/**
 * @swagger
 * /api/jobs/{id}/enrich-description:
 *   post:
 *     summary: Enrich job description by fetching from original source
 *     tags: [Jobs]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job with enriched description
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       400:
 *         description: No scraper available for this source
 *       404:
 *         description: Job not found
 *       500:
 *         description: Failed to scrape description
 */
router.post(
  '/:id/enrich-description',
  tieredRateLimit,
  asyncErrorWrapper((req, res) => jobController.enrichJobDescription(req, res)),
);

export { router as jobRoutes };
