import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errorMessages = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        res.status(400).json({ error: errorMessages, details: err.errors });
        return;
      }
      res.status(400).json({ error: "Invalid request payload" });
    }
  };
}
