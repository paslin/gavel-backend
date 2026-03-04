import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/AppError";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Known operational errors (our AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  // Prisma unique constraint violation
  if ((err as any).code === "P2002") {
    return res.status(409).json({
      status: "error",
      message: "A record with that value already exists.",
    });
  }

  // Prisma record not found
  if ((err as any).code === "P2025") {
    return res.status(404).json({
      status: "error",
      message: "Record not found.",
    });
  }

  // Unknown errors — log internally, hide details from client
  console.error("Unhandled error:", err);
  return res.status(500).json({
    status: "error",
    message: "Internal server error.",
  });
}

// Wrap async route handlers to catch errors automatically
export function catchAsync(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}