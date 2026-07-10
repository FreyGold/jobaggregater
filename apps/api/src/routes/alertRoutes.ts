import { Router } from 'express';
import { AlertController } from '../controllers/AlertController.js';
import { AlertService } from '../services/alertService.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncErrorWrapper } from '../utils/index.js';

const alertService = new AlertService();
const alertController = new AlertController(alertService);

const router: Router = Router();

router.post(
  '/',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => alertController.subscribe(req, res))
);

router.get(
  '/',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => alertController.list(req, res))
);

router.delete(
  '/:id',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => alertController.unsubscribe(req, res))
);

router.post(
  '/:id/test',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => alertController.testAlert(req, res))
);

router.get(
  '/history',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => alertController.getHistory(req, res))
);

export { router as alertRoutes };
