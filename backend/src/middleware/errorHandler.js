export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: "ROUTE_NOT_FOUND",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, _req, res, _next) {
  const isCastError = error.name === "CastError";
  const statusCode = isCastError ? 400 : error.statusCode || 500;
  const code = isCastError ? "INVALID_ID" : error.code || "INTERNAL_ERROR";
  const message = isCastError ? "Resource id is invalid." : error.message;

  if (statusCode >= 500) console.error(error);

  res.status(statusCode).json({
    success: false,
    code,
    message,
    details: error.details || {},
  });
}
