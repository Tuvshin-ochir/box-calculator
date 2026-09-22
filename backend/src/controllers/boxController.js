import {
  createBox,
  deleteBox,
  getAllBoxes,
  getBoxById,
  getVersions,
  simulateBox,
  updateBox,
  validateBoxInput,
} from "../services/boxService.js";
import { notFoundError } from "../utils/errors.js";

function sendValidationResponse(res, result) {
  return res.status(result.isValid ? 200 : 400).json({
    success: result.isValid,
    code: result.isValid ? undefined : result.errors[0]?.code,
    message: result.isValid
      ? "Box passed validation."
      : "Box validation failed.",
    ...result,
  });
}

export async function listBoxes(_req, res) {
  res.json({ success: true, data: await getAllBoxes() });
}

export async function createBoxDraft(req, res) {
  res.status(201).json({ success: true, data: await createBox(req.body) });
}

export function validateBoxDraft(req, res) {
  return sendValidationResponse(res, validateBoxInput(req.body));
}

export async function getBox(req, res) {
  const box = await getBoxById(req.params.id);
  if (!box) throw notFoundError("box");
  res.json({ success: true, data: box });
}

export async function updateBoxDraft(req, res) {
  res.json({
    success: true,
    data: await updateBox(req.params.id, req.body),
  });
}

export async function removeBox(req, res) {
  await deleteBox(req.params.id);
  res.status(204).end();
}

export async function listBoxVersions(req, res) {
  res.json({
    success: true,
    data: await getVersions(req.params.id),
  });
}

export async function createBoxVersion(req, res) {
  res.json({
    success: true,
    data: await updateBox(req.params.id, req.body),
  });
}

export async function simulateBoxOpenings(req, res) {
  res.json({
    success: true,
    data: await simulateBox(req.params.id),
  });
}
