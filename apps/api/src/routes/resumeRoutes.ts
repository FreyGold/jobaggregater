import { Router } from 'express';
import multer from 'multer';
import { ResumeController } from '../controllers/ResumeController.js';
import { ResumeService } from '../services/resumeService.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { tailorResumeSchema } from '../validators/resume.schema.js';
import { asyncErrorWrapper } from '../utils/index.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const resumeService = new ResumeService();
const resumeController = new ResumeController(resumeService);

const router: Router = Router();

router.get(
  '/tailored',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => resumeController.listTailored(req, res)),
);

router.delete(
  '/tailored/:id',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => resumeController.deleteTailored(req, res)),
);

router.get(
  '/',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => resumeController.list(req, res)),
);

router.post(
  '/upload',
  asyncErrorWrapper(authMiddleware as never),
  upload.single('file'),
  asyncErrorWrapper((req, res) => resumeController.upload(req, res)),
);

router.post(
  '/:id/tailor',
  asyncErrorWrapper(authMiddleware as never),
  validateRequest(tailorResumeSchema),
  asyncErrorWrapper((req, res) => resumeController.tailor(req, res)),
);

router.delete(
  '/:id',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => resumeController.delete(req, res)),
);

export { router as resumeRoutes };
