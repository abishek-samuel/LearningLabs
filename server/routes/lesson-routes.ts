import { type Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";

export function registerLessonRoutes(app: Express) {
  app.get(
    "/api/lessons/:id/summary",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const lessonId = parseInt(req.params.id);
        if (isNaN(lessonId)) {
          return res.status(400).json({ message: "Invalid lesson ID" });
        }

        const lessonSummary = await storage.getLessonSummary(lessonId);
        if (!lessonSummary) {
          return res.status(404).json({ message: "Lesson summary not found" });
        }

        res.json({ summary: lessonSummary });
      } catch (error) {
        console.error("Error fetching lesson summary:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
}
