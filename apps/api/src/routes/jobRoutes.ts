// ─── Job Routes ──────────────────────────────────────────────────

import { Router } from 'express';
import { JobController } from '../controllers/JobController.js';
import { JobService } from '../services/jobService.js';
import { jobRepository } from '../repositories/JobRepository.js';
import { userRepository } from '../repositories/UserRepository.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware.js';
import { jobFiltersSchema } from '../validators/job.schema.js';
import { asyncErrorWrapper } from '../utils/index.js';

const jobService = new JobService(jobRepository, userRepository);
const jobController = new JobController(jobService);

const router: Router = Router();

// Public routes (optionalAuth to detect user plan)
router.get(
  '/',
  asyncErrorWrapper(optionalAuthMiddleware as never),
  validateRequest(jobFiltersSchema, 'query'),
  asyncErrorWrapper((req, res) => jobController.listJobs(req, res)),
);

router.get(
  '/search',
  asyncErrorWrapper((req, res) => jobController.searchJobs(req, res)),
);

router.get(
  '/:id',
  asyncErrorWrapper((req, res) => jobController.getJob(req, res)),
);

// Authenticated routes — saved jobs
router.get(
  '/saved/list',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => jobController.getSavedJobs(req, res)),
);

router.post(
  '/saved/:jobId',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => jobController.saveJob(req, res)),
);

router.delete(
  '/saved/:jobId',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => jobController.unsaveJob(req, res)),
);

export { router as jobRoutes };
