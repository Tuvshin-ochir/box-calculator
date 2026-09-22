import express from "express";
import {
  createBoxDraft,
  createBoxVersion,
  getBox,
  listBoxVersions,
  listBoxes,
  publishBoxHandler,
  removeBox,
  simulateBoxOpenings,
  updateBoxDraft,
  validateBoxDraft,
} from "../controllers/boxController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.get("/", asyncHandler(listBoxes));
router.post("/", asyncHandler(createBoxDraft));
router.post("/validate", asyncHandler(validateBoxDraft));

router
  .route("/:id")
  .get(asyncHandler(getBox))
  .put(asyncHandler(updateBoxDraft))
  .delete(asyncHandler(removeBox));

router
  .route("/:id/versions")
  .get(asyncHandler(listBoxVersions))
  .post(asyncHandler(createBoxVersion));

router.post("/:id/simulate", asyncHandler(simulateBoxOpenings));
router.post("/:id/publish", asyncHandler(publishBoxHandler));

export default router;
