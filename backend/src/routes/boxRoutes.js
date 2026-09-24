import express from "express";
import {
  createBoxDraft,
  createBoxVersion,
  getBox,
  listBoxVersions,
  listBoxes,
  removeBox,
  simulateBoxOpenings,
  simulateDraft,
  updateBoxDraft,
  validateBoxDraft,
} from "../controllers/boxController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.get("/", asyncHandler(listBoxes));
router.post("/", asyncHandler(createBoxDraft));
router.post("/validate", asyncHandler(validateBoxDraft));
router.post("/simulate", asyncHandler(simulateDraft));

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

export default router;
