import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import debugRouter from "./debug";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(debugRouter);

export default router;
