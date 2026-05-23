import { Router } from 'express';
import { AppDataSource } from '../config/data-source.js';
import { User } from '../entities/User.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncErrorWrapper } from '../utils/index.js';

const router: Router = Router();

router.put(
  '/ai',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper(async (req, res) => {
    const { provider, model, apiKey } = req.body;
    const repo = AppDataSource.getRepository(User);
    await repo.update(req.user!.userId, {
      settings: { aiProvider: provider, aiModel: model, aiApiKey: apiKey },
    });
    res.json({ data: { saved: true }, error: null });
  }),
);

router.get(
  '/ai',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper(async (req, res) => {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: req.user!.userId } });
    res.json({ data: user?.settings || {}, error: null });
  }),
);

export { router as settingsRoutes };
