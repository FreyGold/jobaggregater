// ─── Auth Routes ─────────────────────────────────────────────────
// Routes only route — zero business logic.

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { AuthService } from '../services/authService.js';
import { userRepository } from '../repositories/UserRepository.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { registerSchema, loginSchema } from '../validators/auth.schema.js';
import { asyncErrorWrapper } from '../utils/index.js';

const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

const router: Router = Router();

router.post(
  '/register',
  validateRequest(registerSchema),
  asyncErrorWrapper((req, res) => authController.register(req, res)),
);

router.post(
  '/login',
  validateRequest(loginSchema),
  asyncErrorWrapper((req, res) => authController.login(req, res)),
);

router.get(
  '/me',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper((req, res) => authController.me(req, res)),
);

export { router as authRoutes };
