import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { AppError } from "../lib/AppError";

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: Role };
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return next(new AppError("No token provided. Please log in.", 401));

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string; email: string; role: Role;
    };
    req.user = decoded;
    next();
  } catch {
    return next(new AppError("Invalid or expired token. Please log in again.", 401));
  }
}

export function authorize(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role))
      return next(new AppError("You do not have permission to perform this action.", 403));
    next();
  };
}