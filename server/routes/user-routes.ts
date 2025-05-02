import { storage } from "../storage";
import { comparePasswords, hashPassword } from "../auth";
import { sendApproveEmail, sendRejectionEmail } from "../utils/email";

export function registerUserRoutes(app) {
  // Profile routes
  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Other user-related routes...
}
