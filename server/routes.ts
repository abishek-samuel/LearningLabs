import { type Express, Request, Response, NextFunction } from "express"; // Keep original import
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { comparePasswords, hashPassword, setupAuth } from "./auth";
import { Prisma } from "@prisma/client"; // Import Prisma namespace
import multer from "multer"; // Import multer
import path from "path"; // Import path for handling file paths
import fs from "fs"; // Import fs for creating directories
import { fileURLToPath } from "url"; // Import fileURLToPath
import {
  sendApproveEmail,
  sendGroupAssignmentEmail,
  sendRejectionEmail,
} from "./utils/email";

// Zod validation removed for now, can be added back based on Prisma types
// import { z } from "zod";
// Drizzle schema imports removed
// import { ... } from "@shared/schema";
import type {
  User,
  Course,
  Module,
  Lesson,
  Enrollment,
  Assessment,
  Question,
  AssessmentAttempt,
  Group,
  GroupMember,
  CourseAccess,
  LessonProgress,
  ActivityLog,
} from ".prisma/client"; // Import Prisma types
import axios from "axios";

// --- Multer Configuration for Video Uploads ---
const projectRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const videoUploadDir = path.join(projectRoot, "uploads", "videos");
const imageUploadDir = path.join(projectRoot, "uploads", "course-images");
const resourceUploadDir = path.join(projectRoot, "uploads", "resources");

if (!fs.existsSync(videoUploadDir)) {
  fs.mkdirSync(videoUploadDir, { recursive: true });
}
if (!fs.existsSync(imageUploadDir)) {
  fs.mkdirSync(imageUploadDir, { recursive: true });
}
if (!fs.existsSync(resourceUploadDir)) {
  fs.mkdirSync(resourceUploadDir, { recursive: true });
}

const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, videoUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imageUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // Increased to 500 MB
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const resourceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, resourceUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const uploadResource = multer({
  storage: resourceStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for resources (PDFs, docs, etc.)
});
// --- End Multer Configuration ---

async function updateCourseDuration(courseId: number) {
  const modules = await storage.getModulesByCourse(courseId);
  let totalDuration = 0;
  for (const module of modules) {
    const lessons = await storage.getLessonsByModule(module.id);
    for (const lesson of lessons) {
      // Only add duration if it's not null
      if (lesson.duration != null) {
        totalDuration += lesson.duration;
      }
    }
  }
  const totalMinutes = Math.ceil(totalDuration / 60);
  await storage.updateCourse(courseId, { duration: totalMinutes });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  await setupAuth(app);

  // Helper middleware to check authentication
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Helper middleware to check role
  const hasRole =
    (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      // We can safely assert req.user exists here due to isAuthenticated check above
      if (req.user && roles.includes(req.user.role)) {
        return next();
      }
      res.status(403).json({ message: "Forbidden" });
    };

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

  // Profile routes
  const upload = multer({ dest: "uploads/" }); // You can customize destination

  app.put(
    "/api/profile",
    isAuthenticated,
    upload.single("profilePicture"),
    async (req, res) => {
      try {
        const userId = parseInt(req.body.id);
        if (userId !== req.user!.id) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        const { firstName, lastName } = req.body;

        let profilePictureUrl = undefined;
        if (req.file) {
          // You can store req.file.path or handle cloud storage upload here
          profilePictureUrl = `/uploads/${req.file.filename}`;
        }

        const updatedUser = await storage.updateUser(userId, {
          firstName,
          lastName,
          ...(profilePictureUrl && { profilePicture: profilePictureUrl }),
        });

        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.put("/api/profile/password", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.body.id);
      if (userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValid = await comparePasswords(currentPassword, user.password);
      if (!isValid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await storage.updateUser(userId, { password: hashedPassword });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // app.put("/api/profile/password", isAuthenticated, async (req, res) => {
  //   try {
  //     const userId = req.user!.id;
  //     const { currentPassword, newPassword } = req.body;

  //     const user = await storage.getUser(userId);
  //     if (!user) {
  //       return res.status(404).json({ message: "User not found" });
  //     }

  //     // Verify current password
  //     const isValid = await bcrypt.compare(currentPassword, user.password);
  //     if (!isValid) {
  //       return res.status(400).json({ message: "Current password is incorrect" });
  //     }

  //     // Hash new password
  //     const hashedPassword = await hashPassword(newPassword);

  //     // Update password
  //     await storage.updateUser(userId, { password: hashedPassword });

  //     res.json({ message: "Password updated successfully" });
  //   } catch (error) {
  //     console.error("Error updating password:", error);
  //     res.status(500).json({ message: "Internal server error" });
  //   }
  // });

  // User routes
  app.get(
    "/api/all/users",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const { search, role } = req.query;
        const users = await storage.getUsers();
        let filteredUsers = users.map(({ password, ...user }) => user);

        // Filter for active users
        filteredUsers = filteredUsers.filter(
          (user) => user.status === "active" || user.status === "inactive"
        );

        if (search) {
          const searchStr = search.toString().toLowerCase();
          filteredUsers = filteredUsers.filter(
            (user) =>
              user.username.toLowerCase().includes(searchStr) ||
              user.email.toLowerCase().includes(searchStr) ||
              user.firstName?.toLowerCase().includes(searchStr) ||
              user.lastName?.toLowerCase().includes(searchStr)
          );
        }

        if (role && role !== "all") {
          filteredUsers = filteredUsers.filter((user) => user.role === role);
        }

        res.json(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.get(
    "/api/users",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const { search, role } = req.query;
        const users = await storage.getUsers();
        let filteredUsers = users.map(({ password, ...user }) => user);

        // Filter for active users
        filteredUsers = filteredUsers.filter(
          (user) => user.status === "active"
        );

        if (search) {
          const searchStr = search.toString().toLowerCase();
          filteredUsers = filteredUsers.filter(
            (user) =>
              user.username.toLowerCase().includes(searchStr) ||
              user.email.toLowerCase().includes(searchStr) ||
              user.firstName?.toLowerCase().includes(searchStr) ||
              user.lastName?.toLowerCase().includes(searchStr)
          );
        }

        if (role && role !== "all") {
          filteredUsers = filteredUsers.filter((user) => user.role === role);
        }

        res.json(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Get draft users

  app.get(
    "/api/draft-users",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const { search, role } = req.query;
        const users = await storage.getUsers();
        let filteredUsers = users.map(({ password, ...user }) => user);

        // Filter for active users
        filteredUsers = filteredUsers.filter((user) => user.status === "draft");

        if (search) {
          const searchStr = search.toString().toLowerCase();
          filteredUsers = filteredUsers.filter(
            (user) =>
              user.username.toLowerCase().includes(searchStr) ||
              user.email.toLowerCase().includes(searchStr) ||
              user.firstName?.toLowerCase().includes(searchStr) ||
              user.lastName?.toLowerCase().includes(searchStr)
          );
        }

        if (role && role !== "all") {
          filteredUsers = filteredUsers.filter((user) => user.role === role);
        }

        res.json(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Approve user
  app.post(
    "/api/users/:id/approve",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const { password } = req.body; // Ensure password is being passed

        // Check if the user exists
        const existingUser = await storage.getUser(userId);
        if (!existingUser) {
          console.error("User not found in the database");
          return res.status(404).json({ message: "User not found" });
        }

        // Await hashed password before updating
        const hashedPassword = await hashPassword(password);

        // Proceed with updating the user if they exist
        const updatedUser = await storage.updateUser(userId, {
          status: "active",
          password: hashedPassword, // Use the resolved hashed password
        });

        if (!updatedUser) {
          console.error("Failed to update user:", userId);
          return res.status(500).json({ message: "Failed to update user" });
        }

        const { password: pw, ...userWithoutPassword } = updatedUser; // Omit password
        res.json(userWithoutPassword);
        // Send welcome email with credentials
        try {
          await sendApproveEmail(
            updatedUser.email,
            updatedUser.username,
            password, // Send the original unhashed password
            updatedUser.role
          );
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
          // Continue with the response even if email fails
        }
      } catch (error) {
        console.error("Error approving user:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/users/:id/reject",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User rejected successfully" });

        // Send rejection email before deleting the user
        try {
          await sendRejectionEmail(user.email, user.username);
        } catch (emailError) {
          console.error("Failed to send rejection email:", emailError);
          // Continue with deletion even if email fails
        }

        await storage.deleteUser(userId);
      } catch (error) {
        console.error("Error rejecting user:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.get(
    "/api/users/:id",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.put(
    "/api/users/:id",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const updateData = req.body;

        // Remove sensitive fields that shouldn't be updated directly
        delete updateData.password;

        const updatedUser = await storage.updateUser(userId, updateData);
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // app.delete(
  //   "/api/users/:id",
  //   isAuthenticated,
  //   hasRole(["admin"]),
  //   async (req, res) => {
  //     try {
  //       const userId = parseInt(req.params.id);
  //       await storage.deleteUser(userId);
  //       res.status(204).send();
  //     } catch (error) {
  //       console.error("Error deleting user:", error);
  //       res.status(500).json({ message: "Internal server error" });
  //     }
  //   }
  // );

  app.put(
    "/api/users/:id/status",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const { status } = req.body;

        if (!["active", "inactive"].includes(status)) {
          return res.status(400).json({ message: "Invalid status value" });
        }

        const updatedUser = await storage.updateUser(userId, { status });
        res.json({ message: `User marked as ${status}`, user: updatedUser });
      } catch (error) {
        console.error("Error updating user status:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Get pending courses route
  app.get(
    "/api/pending-courses",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        // const pendingCourses = await storage.getCourses({ status: "draft" });
        const pendingCourses = (await storage.getCourses()).filter(
          (course) => course.status === "draft"
        );
        const coursesWithInstructors = await Promise.all(
          pendingCourses.map(async (course) => {
            const instructor = course.instructorId
              ? await storage.getUser(course.instructorId)
              : null;
            return {
              ...course,
              creator: instructor
                ? `${instructor.firstName} ${instructor.lastName}`
                : "Unknown",
              submittedDate: course.createdAt.toISOString().split("T")[0],
            };
          })
        );
        res.json(coursesWithInstructors);
      } catch (error) {
        console.error("Error fetching pending courses:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Course approval route
  app.post(
    "/api/courses/:id/approve",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const courseId = parseInt(req.params.id);
        if (isNaN(courseId)) {
          return res.status(400).json({ message: "Invalid course ID" });
        }

        const updatedCourse = await storage.updateCourse(courseId, {
          status: "published",
        });
        if (!updatedCourse) {
          return res.status(404).json({ message: "Course not found" });
        }

        res.json(updatedCourse);
      } catch (error) {
        console.error("Error approving course:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Course rejection route
  app.post(
    "/api/courses/:id/reject",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const courseId = parseInt(req.params.id);
        if (isNaN(courseId)) {
          return res.status(400).json({ message: "Invalid course ID" });
        }

        const updatedCourse = await storage.updateCourse(courseId, {
          status: "draft",
        });
        if (!updatedCourse) {
          return res.status(404).json({ message: "Course not found" });
        }

        res.json(updatedCourse);
      } catch (error) {
        console.error("Error rejecting course:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Course routes
  // --- Comments API ---

  // Reorder modules within a course
  app.post("/api/courses/:courseId/reorder-modules", isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const { moduleOrder } = req.body;
      if (!Array.isArray(moduleOrder)) {
        return res.status(400).json({ message: "moduleOrder array is required" });
      }

      for (let i = 0; i < moduleOrder.length; i++) {
        const moduleId = moduleOrder[i];
        await storage.prisma.module.update({
          where: { id: moduleId, courseId },
          data: { position: i + 1 },
        });
      }

      res.json({ message: "Modules reordered successfully" });
    } catch (error) {
      console.error("Error reordering modules:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reorder lessons within a module
  app.post("/api/modules/:moduleId/reorder-lessons", isAuthenticated, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.moduleId);
      const { lessonOrder } = req.body;
      if (!Array.isArray(lessonOrder)) {
        return res.status(400).json({ message: "lessonOrder array is required" });
      }

      for (let i = 0; i < lessonOrder.length; i++) {
        const lessonId = lessonOrder[i];
        await storage.prisma.lesson.update({
          where: { id: lessonId, moduleId },
          data: { position: i + 1 },
        });
      }

      res.json({ message: "Lessons reordered successfully" });
    } catch (error) {
      console.error("Error reordering lessons:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/comments", isAuthenticated, async (req, res) => {
    try {
      const lessonId = parseInt(req.query.lessonId as string);
      if (isNaN(lessonId)) {
        return res.status(400).json({ message: "Invalid lessonId" });
      }
      const allComments = await storage.prisma.comment.findMany({
        where: { lessonId },
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Group replies under parent comments
      const commentsMap: Record<number, any> = {};
      const topLevelComments: any[] = [];

      allComments.forEach((comment: any) => {
        comment.replies = [];
        commentsMap[comment.id] = comment;
      });

      allComments.forEach((comment: any) => {
        if (comment.parentId) {
          const parent = commentsMap[comment.parentId];
          if (parent) {
            parent.replies.push(comment);
          }
        } else {
          topLevelComments.push(comment);
        }
      });

      res.json(topLevelComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/comments", isAuthenticated, async (req, res) => {
    try {
      console.log("Received POST /api/comments with body:", req.body);
      console.log("Authenticated user:", req.user);

      if (!req.user?.id) {
        console.warn("User not authenticated");
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { lessonId, comment, parentId } = req.body;
      if (!lessonId || !comment) {
        console.warn("Missing lessonId or comment");
        return res
          .status(400)
          .json({ message: "lessonId and comment are required" });
      }

      const newComment = await storage.createComment({
        lessonId,
        userId: req.user.id,
        comment,
        parentId: parentId || null,
        createdAt: new Date(),
      });
      console.log("Created comment:", newComment);
      res.status(201).json(newComment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  // --- End Comments API ---

  app.get("/api/courses", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (userRole === "admin") {
        const courses = (await storage.getCourses()).filter(
          (course) => course.status === "published"
        );
        return res.json(courses);
      }

      const accessData = await storage.getAllCourseAccessByUser({
        id: userId,
        role: userRole,
      });

      // Get all published courses
      const allPublishedCourses = (await storage.getCourses()).filter(
        (course) => course.status === "published"
      );

      // Direct course access
      const directAccessCourseIds = accessData
        .filter((access) => access.userId === userId)
        .map((access) => access.courseId);

      // Get user's groups
      const userGroups = await storage.getGroupMembersByUser(userId);
      const userGroupIds = userGroups.map((gm) => gm.groupId);

      // Courses accessed via group, only if:
      // - user is in that group
      // - group is assigned to that course
      const groupAccessCourseIds: number[] = [];

      for (const access of accessData) {
        if (access.groupId && userGroupIds.includes(access.groupId)) {
          const groupCourses = await storage.getGroupCoursesByGroup(
            access.groupId
          );
          const matched = groupCourses.find(
            (gc) => gc.courseId === access.courseId
          );
          if (matched) {
            groupAccessCourseIds.push(access.courseId);
          }
        }
      }

      const accessibleCourseIds = new Set([
        ...directAccessCourseIds,
        ...groupAccessCourseIds,
      ]);

      const accessibleCourses = allPublishedCourses.filter((course) =>
        accessibleCourseIds.has(course.id)
      );

      res.json(accessibleCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // New endpoint: get all courses created by the logged-in user
  app.get("/api/my-courses", isAuthenticated, async (req, res) => {
    try {
      const allCourses = await storage.getCourses();
      const myCourses = allCourses.filter(
        (course) => course.instructorId === req.user!.id
      );
      res.json(myCourses);
    } catch (error) {
      console.error("Error fetching my courses:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/courses/:id", isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      if (isNaN(courseId)) {
        return res.status(400).json({ message: "Invalid course ID" });
      }
      // Fetch course with modules and lessons included
      let course = await storage.getCourseWithContent(courseId);

      if (!course) {
        // Prisma returns null if not found
        return res.status(404).json({ message: "Course not found" });
      }

      // Fetch user's enrollment progress for this specific course
      let userProgress = 0; // Default to 0
      if (req.user) {
        // Check if user is authenticated
        const userId = req.user.id;
        const enrollments = await storage.getEnrollmentsByUser(userId); // Fetch all user enrollments
        const specificEnrollment = enrollments.find(
          (e) => e.courseId === courseId
        );
        if (specificEnrollment) {
          userProgress = specificEnrollment.progress;
        }
      }

      // Add progress to the course object before sending
      const courseWithProgress = { ...course, progress: userProgress };

      res.json(courseWithProgress);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(
    "/api/courses",
    isAuthenticated,
    hasRole(["contributor", "admin"]),
    async (req, res) => {
      try {
        // Zod validation removed - add back if needed
        // const courseData = insertCourseSchema.parse(req.body);
        const {
          title,
          description,
          categoryId,
          thumbnail,
          duration,
          difficulty,
          status,
        } = req.body; // Add category

        // Basic validation (replace with Zod/other validation if needed)
        if (!title || !description) {
          return res
            .status(400)
            .json({ message: "Title and description are required" });
        }

        const newCourse = await storage.createCourse({
          title,
          description,
          thumbnail: thumbnail || null,
          duration: duration ? parseInt(duration) : null, // Ensure duration is number or null
          difficulty: difficulty || null,
          status: status || "draft",
          // category: category || null, 
          categoryId: categoryId ? parseInt(categoryId) : null,
          instructorId: req.user!.id, // Assert req.user exists
        });

        res.status(201).json(newCourse);
      } catch (error) {
        // if (error instanceof z.ZodError) { ... } // Add back Zod error handling if used
        console.error("Error creating course:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.put(
    "/api/courses/:id",
    isAuthenticated,
    hasRole(["contributor", "admin"]),
    async (req, res) => {
      try {
        const courseId = parseInt(req.params.id);
        if (isNaN(courseId)) {
          return res.status(400).json({ message: "Invalid course ID" });
        }
        const course = await storage.getCourse(courseId);

        if (!course) {
          return res.status(404).json({ message: "Course not found" });
        }

        // Only allow the instructor or admin to update the course
        if (
          course.instructorId !== req.user!.id &&
          req.user!.role !== "admin"
        ) {
          // Assert req.user exists
          return res.status(403).json({ message: "Forbidden" });
        }

        // Zod validation removed
        // const courseData = insertCourseSchema.partial().parse(req.body);
        // Ensure category and other fields are correctly passed
        const {
          title,
          description,
          categoryId,
          thumbnail,
          duration,
          difficulty,
          status,
        } = req.body;
        const courseData: Partial<Course> = {
          title,
          description,
          categoryId: categoryId ? parseInt(categoryId) : null,
          thumbnail: thumbnail || null,
          duration: duration ? parseInt(duration) : null,
          difficulty: difficulty || null,
          status: status || undefined, // Use undefined if not provided, Prisma ignores it
        };
        // Remove undefined keys to avoid overwriting with null in Prisma update
        Object.keys(courseData).forEach(
          (key) =>
            courseData[key as keyof typeof courseData] === undefined &&
            delete courseData[key as keyof typeof courseData]
        );

        const updatedCourse = await storage.updateCourse(courseId, courseData);

        if (!updatedCourse) {
          // Handle case where update fails (e.g., record gone)
          return res
            .status(404)
            .json({ message: "Course not found or update failed" });
        }

        res.json(updatedCourse);
        await axios.post("http://localhost:5001/insert_questions", {
          course_id: courseId,
        });
      } catch (error) {
        // if (error instanceof z.ZodError) { ... }
        console.error("Error updating course:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.delete(
    "/api/courses/:id",
    isAuthenticated,
    hasRole(["contributor", "admin"]),
    async (req, res) => {
      try {
        const courseId = parseInt(req.params.id);
        if (isNaN(courseId)) {
          return res.status(400).json({ message: "Invalid course ID" });
        }
        // Check existence and permissions before deleting
        const course = await storage.getCourse(courseId);

        if (!course) {
          // Already gone, arguably a success for DELETE idempotency
          return res.status(204).send();
        }

        // Only allow the instructor or admin to delete the course
        if (
          course.instructorId !== req.user!.id &&
          req.user!.role !== "admin"
        ) {
          // Assert req.user exists
          return res.status(403).json({ message: "Forbidden" });
        }

        const deleted = await storage.deleteCourse(courseId);
        if (!deleted) {
          // This might happen in race conditions, treat as not found
          return res
            .status(404)
            .json({ message: "Course not found or delete failed" });
        }

        res.status(204).send();
      } catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Enrollment routes
  app.get("/api/enrollments", isAuthenticated, async (req, res) => {
    try {
      // storage.getEnrollmentsByUser already includes the necessary course data via Prisma include
      const enrollments = await storage.getEnrollmentsByUser(req.user!.id); // Assert req.user exists

      // Directly return the enrollments fetched by the storage layer
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/enrollments", isAuthenticated, async (req, res) => {
    try {
      // Zod validation removed
      // const enrollmentData = insertEnrollmentSchema.parse({ ... });
      const { courseId } = req.body;
      const userId = req.user!.id; // Assert req.user exists

      if (typeof courseId !== "number") {
        return res.status(400).json({ message: "Valid courseId is required" });
      }

      // Check if the course exists
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Check if the user is already enrolled (could be done in storage layer with unique constraint)
      const userEnrollments = await storage.getEnrollmentsByUser(userId);
      const existingEnrollment = userEnrollments.find(
        (enrollment) => enrollment.courseId === courseId
      );

      if (existingEnrollment) {
        return res
          .status(400)
          .json({ message: "Already enrolled in this course" });
      }

      const newEnrollment = await storage.createEnrollment({
        userId,
        courseId,
      });

      // Log the activity
      await storage.createActivityLog({
        userId: userId,
        action: "enrolled",
        resourceType: "course",
        resourceId: courseId,
        metadata: {}, // Prisma expects JsonNull or an object
      });

      res.status(201).json(newEnrollment);
    } catch (error) {
      // if (error instanceof z.ZodError) { ... }
      console.error("Error creating enrollment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Module routes
  app.get(
    "/api/courses/:courseId/modules",
    isAuthenticated,
    async (req, res) => {
      try {
        const courseId = parseInt(req.params.courseId);
        if (isNaN(courseId)) {
          return res.status(400).json({ message: "Invalid course ID" });
        }
        const modules = await storage.getModulesByCourse(courseId);

        res.json(modules);
      } catch (error) {
        console.error("Error fetching modules:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/modules",
    isAuthenticated,
    hasRole(["contributor", "admin"]),
    async (req, res) => {
      try {
        // Zod validation removed
        // const moduleData = insertModuleSchema.parse(req.body);
        const { courseId, title, position } = req.body;

        if (
          typeof courseId !== "number" ||
          !title ||
          typeof position !== "number"
        ) {
          return res.status(400).json({
            message: "Valid courseId, title, and position are required",
          });
        }

        // Check if the course exists and if the user is the instructor
        const course = await storage.getCourse(courseId);
        if (!course) {
          return res.status(404).json({ message: "Course not found" });
        }

        if (
          course.instructorId !== req.user!.id &&
          req.user!.role !== "admin"
        ) {
          // Assert req.user exists
          return res.status(403).json({ message: "Forbidden" });
        }

        const newModule = await storage.createModule({
          courseId,
          title,
          position,
        });

        res.status(201).json(newModule);
      } catch (error) {
        // if (error instanceof z.ZodError) { ... }
        console.error("Error creating module:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Lesson routes
  app.get(
    "/api/modules/:moduleId/lessons",
    isAuthenticated,
    async (req, res) => {
      try {
        const moduleId = parseInt(req.params.moduleId);
        if (isNaN(moduleId)) {
          return res.status(400).json({ message: "Invalid module ID" });
        }
        // For course-content page, include all lessons (assessment last)
        const lessons = await storage.getAllLessonsByModule(moduleId);

        res.json(lessons);
      } catch (error) {
        console.error("Error fetching lessons:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/lessons",
    isAuthenticated,
    hasRole(["contributor", "admin"]),
    async (req, res) => {
      try {
        // Zod validation removed
        // const lessonData = insertLessonSchema.parse(req.body);
        const { moduleId, title, content, videoUrl, duration, position } =
          req.body;

        if (
          typeof moduleId !== "number" ||
          !title ||
          typeof position !== "number"
        ) {
          return res.status(400).json({
            message: "Valid moduleId, title, and position are required",
          });
        }

        // Check if the module exists
        const module = await storage.getModule(moduleId);
        if (!module) {
          return res.status(404).json({ message: "Module not found" });
        }

        // Check if the user is the instructor of the course
        const course = await storage.getCourse(module.courseId);
        if (!course) {
          // Should not happen if module exists, but good practice
          return res
            .status(404)
            .json({ message: "Associated course not found" });
        }

        if (
          course.instructorId !== req.user!.id &&
          req.user!.role !== "admin"
        ) {
          // Assert req.user exists
          return res.status(403).json({ message: "Forbidden" });
        }

        let finalDuration = duration ? parseInt(duration) : null;

        if (videoUrl) {
          try {
            const ffmpegModule = await import("fluent-ffmpeg");
            const ffprobeStatic = await import("ffprobe-static");
            const ffmpeg = ffmpegModule.default;
            ffmpeg.setFfprobePath(ffprobeStatic.path);

            const videoPath = videoUrl.startsWith("/uploads")
              ? path.join(projectRoot, videoUrl)
              : videoUrl;

            await new Promise<void>((resolve, reject) => {
              ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) return reject(err);
                if (metadata && metadata.format && metadata.format.duration) {
                  finalDuration = Math.floor(metadata.format.duration);
                }
                resolve();
              });
            });
          } catch (err) {
            console.error("Failed to extract video duration:", err);
          }
        }

        let estimatedDuration = finalDuration;

        if ((!videoUrl || videoUrl === "") && content) {
          const wordCount = content.trim().split(/\s+/).length;
          estimatedDuration = Math.ceil(wordCount / 200); // 200 words per minute
          estimatedDuration = Math.max(1, estimatedDuration); // Minimum 1 minute
        }

        const newLesson = await storage.createLesson({
          moduleId,
          title,
          content: content || null,
          videoUrl: videoUrl || null,
          duration: estimatedDuration,
          position,
        });

        // Update course duration after creating lesson
        if (module?.courseId) {
          await updateCourseDuration(module.courseId);
        }

        res.status(201).json(newLesson);
      } catch (error) {
        // if (error instanceof z.ZodError) { ... }
        console.error("Error creating lesson:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Lesson update route (PUT /api/lessons/:id)
  app.put(
    "/api/lessons/:id",
    isAuthenticated,
    hasRole(["contributor", "admin"]),
    async (req, res) => {
      try {
        const lessonId = parseInt(req.params.id);
        if (isNaN(lessonId)) {
          return res.status(400).json({ message: "Invalid lesson ID" });
        }
        const lesson = await storage.getLesson(lessonId);
        if (!lesson) {
          return res.status(404).json({ message: "Lesson not found" });
        }
        // Only allow instructor or admin to update
        const module = await storage.getModule(lesson.moduleId);
        if (!module) {
          return res.status(404).json({ message: "Module not found" });
        }
        const course = await storage.getCourse(module.courseId);
        if (!course) {
          return res.status(404).json({ message: "Course not found" });
        }
        if (
          course.instructorId !== req.user!.id &&
          req.user!.role !== "admin"
        ) {
          return res.status(403).json({ message: "Forbidden" });
        }
        // Update lesson
        const updateData = req.body;
        const updatedLesson = await storage.updateLesson(lessonId, updateData);
        if (!updatedLesson) {
          return res.status(404).json({ message: "Lesson not found or update failed" });
        }
        // Update course duration after lesson edit
        if (module?.courseId) {
          await updateCourseDuration(module.courseId);
        }
        res.json(updatedLesson);
      } catch (error) {
        console.error("Error updating lesson:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Start a new assessment attempt for a module
  app.post(
    "/api/modules/:moduleId/assessment-attempts/start",
    isAuthenticated,
    async (req, res) => {
      try {
        const moduleId = parseInt(req.params.moduleId);
        if (isNaN(moduleId)) {
          return res.status(400).json({ message: "Invalid module ID" });
        }
        // Fetch all questions for the module
        const allQuestions = await storage.prisma.question.findMany({
          where: { moduleId },
        });
        if (allQuestions.length < 10) {
          return res.status(400).json({ message: "Not enough questions for assessment" });
        }
        // Group questions by difficulty
        const byDifficulty: Record<string, any[]> = {
          beginner: [],
          intermediate: [],
          advanced: [],
        };
        for (const q of allQuestions) {
          byDifficulty[q.difficulty].push(q);
        }
        // Calculate how many questions per difficulty (as equal as possible)
        const perLevel = Math.floor(10 / 3);
        let counts = { beginner: perLevel, intermediate: perLevel, advanced: 10 - 2 * perLevel };
        // If any level has fewer than needed, redistribute
        for (const level of ["beginner", "intermediate", "advanced"]) {
          if (byDifficulty[level].length < counts[level]) {
            const deficit = counts[level] - byDifficulty[level].length;
            counts[level] = byDifficulty[level].length;
            // Redistribute deficit to other levels
            const others = ["beginner", "intermediate", "advanced"].filter(l => l !== level);
            for (const other of others) {
              const available = byDifficulty[other].length - counts[other];
              const take = Math.min(deficit, available);
              counts[other] += take;
              if ((deficit - take) <= 0) break;
            }
          }
        }
        // Randomly select questions for each difficulty
        function pickRandom(arr: any[], n: number) {
          const copy = [...arr];
          const result = [];
          for (let i = 0; i < n && copy.length > 0; i++) {
            const idx = Math.floor(Math.random() * copy.length);
            result.push(copy.splice(idx, 1)[0]);
          }
          return result;
        }
        let selected: any[] = [];
        for (const level of ["beginner", "intermediate", "advanced"]) {
          selected = selected.concat(pickRandom(byDifficulty[level], counts[level]));
        }
        // Shuffle selected questions
        selected = pickRandom(selected, selected.length);

        // Create AssessmentAttempt
        const attempt = await storage.prisma.assessmentAttempt.create({
          data: {
            userId: req.user!.id,
            moduleId,
            status: "in_progress",
            passed: false,
            answers: [],
            questionIds: selected.map(q => q.id),
          },
        });
        res.status(201).json({
          attemptId: attempt.id,
          questions: selected.map(q => ({
            id: q.id,
            questionText: q.questionText,
            options: q.options,
            difficulty: q.difficulty,
          })),
        });
      } catch (error) {
        console.error("Error starting assessment attempt:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Get the user's latest assessment attempt for a module
  app.get(
    "/api/modules/:moduleId/assessment-attempts/me",
    isAuthenticated,
    async (req, res) => {
      try {
        const moduleId = parseInt(req.params.moduleId);
        if (isNaN(moduleId)) {
          return res.status(400).json({ message: "Invalid module ID" });
        }
        const userId = req.user!.id;
        // Get the latest attempt for this user and module, ordered by completedAt desc
        const latestAttempt = await storage.prisma.assessmentAttempt.findFirst({
          where: {
            userId,
            moduleId,
            completedAt: { not: null },
          },
          orderBy: { completedAt: "desc" },
        });
        if (!latestAttempt) {
          return res.json(null);
        }
        res.json({
          id: latestAttempt.id,
          score: latestAttempt.score,
          passed: latestAttempt.passed,
          status: latestAttempt.status,
          completedAt: latestAttempt.completedAt,
        });
      } catch (error) {
        console.error("Error fetching latest assessment attempt:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Submit an assessment attempt for a module
  app.post(
    "/api/assessment-attempts/:id/submit",
    isAuthenticated,
    async (req, res) => {
      try {
        const attemptId = parseInt(req.params.id);
        if (isNaN(attemptId)) {
          return res.status(400).json({ message: "Invalid attempt ID" });
        }
        const attempt = await storage.prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
        if (!attempt) {
          return res.status(404).json({ message: "Assessment attempt not found" });
        }
        if (attempt.userId !== req.user!.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
        if (attempt.status === "completed" || attempt.status === "passed" || attempt.status === "failed") {
          return res.status(400).json({ message: "Attempt already completed" });
        }
        const { answers } = req.body; // Array of {questionId, selectedOption}
        if (!Array.isArray(answers) || answers.length !== 10) {
          return res.status(400).json({ message: "Must submit 10 answers" });
        }
        // Fetch the questions for this attempt
        const questionIds = attempt.questionIds as number[] | undefined;
        if (!questionIds || questionIds.length !== 10) {
          return res.status(400).json({ message: "Invalid question set for attempt" });
        }
        const questions = await storage.prisma.question.findMany({
          where: { id: { in: questionIds } },
        });
        // Score the answers
        let correct = 0;
        const answerResults = answers.map((ans: any) => {
          const q = questions.find(q => q.id === ans.questionId);
          const isCorrect = q && ans.selectedOption === q.correctAnswer;
          if (isCorrect) correct++;
          return {
            questionId: ans.questionId,
            selectedOption: ans.selectedOption,
            isCorrect,
          };
        });
        const score = Math.round((correct / 10) * 100);
        const passed = score >= 80;
        // Update attempt
        await storage.prisma.assessmentAttempt.update({
          where: { id: attemptId },
          data: {
            completedAt: new Date(),
            score,
            status: passed ? "passed" : "failed",
            passed,
            answers: answerResults,
          },
        });

        // If passed, check if all module assessments for the course are passed and update course progress
        if (passed) {
          // Mark the assessment lesson as completed in lesson_progress
          const assessmentLesson = await storage.prisma.lesson.findFirst({
            where: {
              moduleId: attempt.moduleId,
              type: "assessment",
            },
          });
          if (assessmentLesson) {
            // Check if a lesson progress record exists
            const existingProgress = await storage.prisma.lessonProgress.findFirst({
              where: {
                userId: req.user!.id,
                lessonId: assessmentLesson.id,
              },
            });
            if (existingProgress) {
              await storage.prisma.lessonProgress.update({
                where: { id: existingProgress.id },
                data: { status: "completed", completedAt: new Date() },
              });
            } else {
              await storage.prisma.lessonProgress.create({
                data: {
                  userId: req.user!.id,
                  lessonId: assessmentLesson.id,
                  status: "completed",
                  completedAt: new Date(),
                },
              });
            }
          }

          // Get the module and course
          const module = await storage.prisma.module.findUnique({ where: { id: attempt.moduleId } });
          if (module) {
            const courseId = module.courseId;
            // Get all modules for the course
            const allModules = await storage.prisma.module.findMany({ where: { courseId } });
            const allModuleIds = allModules.map(m => m.id);
            // For each module, check if the user has a passed attempt
            let allPassed = true;
            for (const modId of allModuleIds) {
              const passedAttempt = await storage.prisma.assessmentAttempt.findFirst({
                where: {
                  userId: req.user!.id,
                  moduleId: modId,
                  passed: true,
                },
              });
              if (!passedAttempt) {
                allPassed = false;
                break;
              }
            }
            // If all passed, update enrollment progress to 100%
            if (allPassed) {
              const enrollment = await storage.prisma.enrollment.findFirst({
                where: { userId: req.user!.id, courseId },
              });
              if (enrollment) {
                await storage.prisma.enrollment.update({
                  where: { id: enrollment.id },
                  data: { progress: 100, completedAt: new Date() },
                });
              }
            }
          }
        }

        res.json({ score, passed, correct, total: 10 });
      } catch (error) {
        console.error("Error submitting assessment attempt:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Get all questions for a module
  app.get(
    "/api/modules/:moduleId/questions",
    isAuthenticated,
    async (req, res) => {
      try {
        const moduleId = parseInt(req.params.moduleId);
        if (isNaN(moduleId)) {
          return res.status(400).json({ message: "Invalid module ID" });
        }
        const questions = await storage.prisma.question.findMany({
          where: { moduleId },
        });
        res.json(questions);
      } catch (error) {
        console.error("Error fetching questions for module:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Assessment routes
  app.get(
    "/api/modules/:moduleId/assessments",
    isAuthenticated,
    async (req, res) => {
      try {
        const moduleId = parseInt(req.params.moduleId);
        if (isNaN(moduleId)) {
          return res.status(400).json({ message: "Invalid module ID" });
        }
        // Note: Prisma storage method handles potential null moduleId
        const assessments = await storage.getAssessmentsByModule(moduleId);

        res.json(assessments);
      } catch (error) {
        console.error("Error fetching assessments:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/assessments",
    isAuthenticated,
    hasRole(["contributor", "admin"]),
    async (req, res) => {
      try {
        // Zod validation removed
        // const assessmentData = insertAssessmentSchema.parse(req.body);
        const { title, description, moduleId, timeLimit, passingScore } =
          req.body;

        if (!title) {
          return res
            .status(400)
            .json({ message: "Assessment title is required" });
        }
        const moduleIdNum = moduleId ? parseInt(moduleId) : null;
        if (moduleId && isNaN(moduleIdNum as number)) {
          return res
            .status(400)
            .json({ message: "Invalid module ID provided" });
        }

        // If moduleId is provided, check if the module exists and permissions
        if (moduleIdNum) {
          const module = await storage.getModule(moduleIdNum);
          if (!module) {
            return res.status(404).json({ message: "Module not found" });
          }

          // Check if the user is the instructor of the course
          const course = await storage.getCourse(module.courseId);
          if (!course) {
            return res
              .status(404)
              .json({ message: "Associated course not found" });
          }

          if (
            course.instructorId !== req.user!.id &&
            req.user!.role !== "admin"
          ) {
            // Assert req.user exists
            return res.status(403).json({ message: "Forbidden" });
          }
        }

        const newAssessment = await storage.createAssessment({
          title,
          description: description || null,
          moduleId: moduleIdNum,
          timeLimit: timeLimit || null,
          passingScore: passingScore || null,
        });

        res.status(201).json(newAssessment);
      } catch (error) {
        // if (error instanceof z.ZodError) { ... }
        console.error("Error creating assessment:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Question routes
  app.get(
    "/api/assessments/:assessmentId/questions",
    isAuthenticated,
    async (req, res) => {
      try {
        const assessmentId = parseInt(req.params.assessmentId);
        if (isNaN(assessmentId)) {
          return res.status(400).json({ message: "Invalid assessment ID" });
        }
        const questions = await storage.getQuestionsByAssessment(assessmentId);

        res.json(questions);
      } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/questions",
    isAuthenticated,
    hasRole(["contributor", "admin"]),
    async (req, res) => {
      try {
        // Zod validation removed
        // const questionData = insertQuestionSchema.parse(req.body);
        const {
          assessmentId,
          questionText,
          questionType,
          options,
          correctAnswer,
          explanation,
          points,
          position,
        } = req.body;

        if (
          typeof assessmentId !== "number" ||
          !questionText ||
          !questionType ||
          typeof position !== "number"
        ) {
          return res.status(400).json({
            message:
              "Valid assessmentId, questionText, questionType, and position are required",
          });
        }

        // Check if the assessment exists
        const assessment = await storage.getAssessment(assessmentId);
        if (!assessment) {
          return res.status(404).json({ message: "Assessment not found" });
        }

        // If the assessment is linked to a module, check permissions
        if (assessment.moduleId) {
          const module = await storage.getModule(assessment.moduleId);
          if (!module) {
            // Should not happen, but check anyway
            return res
              .status(404)
              .json({ message: "Associated module not found" });
          }

          const course = await storage.getCourse(module.courseId);
          if (!course) {
            return res
              .status(404)
              .json({ message: "Associated course not found" });
          }

          if (
            course.instructorId !== req.user!.id &&
            req.user!.role !== "admin"
          ) {
            // Assert req.user exists
            return res.status(403).json({ message: "Forbidden" });
          }
        }

        const newQuestion = await storage.createQuestion({
          assessmentId,
          questionText,
          questionType,
          options: options || Prisma.JsonNull, // Use Prisma.JsonNull if options is null/undefined
          correctAnswer: correctAnswer || null,
          explanation: explanation || null,
          points: points || 1,
          position,
        });

        res.status(201).json(newQuestion);
      } catch (error) {
        // if (error instanceof z.ZodError) { ... }
        console.error("Error creating question:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Assessment attempts
  app.post("/api/assessment-attempts", isAuthenticated, async (req, res) => {
    try {
      // Zod validation removed
      // const attemptData = insertAssessmentAttemptSchema.parse({ ... });
      const { assessmentId } = req.body;
      const userId = req.user!.id; // Assert req.user exists

      if (typeof assessmentId !== "number") {
        return res
          .status(400)
          .json({ message: "Valid assessmentId is required" });
      }

      // Check if the assessment exists
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      const newAttempt = await storage.createAssessmentAttempt({
        userId,
        assessmentId,
      });

      // Log the activity
      await storage.createActivityLog({
        userId: userId,
        action: "started_assessment",
        resourceType: "assessment",
        resourceId: assessmentId,
        metadata: {}, // Prisma expects JsonNull or an object
      });

      res.status(201).json(newAttempt);
    } catch (error) {
      // if (error instanceof z.ZodError) { ... }
      console.error("Error creating assessment attempt:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/assessment-attempts/:id", isAuthenticated, async (req, res) => {
    try {
      const attemptId = parseInt(req.params.id);
      if (isNaN(attemptId)) {
        return res.status(400).json({ message: "Invalid attempt ID" });
      }
      const attempt = await storage.getAssessmentAttempt(attemptId);

      if (!attempt) {
        return res
          .status(404)
          .json({ message: "Assessment attempt not found" });
      }

      // Only allow the user who created the attempt to update it
      if (attempt.userId !== req.user!.id) {
        // Assert req.user exists
        return res.status(403).json({ message: "Forbidden" });
      }

      const updateData = req.body; // Use raw body for now
      const updatedAttempt = await storage.updateAssessmentAttempt(
        attemptId,
        updateData
      );

      if (!updatedAttempt) {
        return res
          .status(404)
          .json({ message: "Assessment attempt not found or update failed" });
      }

      // If the attempt is being marked as completed, log the activity
      if (updateData.status === "completed" && attempt.status !== "completed") {
        await storage.createActivityLog({
          userId: req.user!.id, // Assert req.user exists
          action: "completed_assessment",
          resourceType: "assessment",
          resourceId: attempt.assessmentId,
          metadata: { score: updateData.score }, // Ensure metadata is a valid JSON object
        });
      }

      res.json(updatedAttempt);
    } catch (error) {
      console.error("Error updating assessment attempt:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Group routes
  app.get(
    "/api/groups",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const groups = await storage.getGroups();

        const detailedGroups = await Promise.all(
          groups.map(async (group) => {
            const groupMembers = await storage.getGroupMembersByGroup(group.id);
            const groupCourses = await storage.getGroupCoursesByGroup(group.id);

            const users = (
              await Promise.all(
                groupMembers.map(async (member) => {
                  const user = await storage.getUser(member.userId);
                  return user ? { id: user.id, username: user.username } : null;
                })
              )
            ).filter(Boolean); // remove nulls

            const courses = (
              await Promise.all(
                groupCourses.map(async (entry) => {
                  const course = await storage.getCourse(entry.courseId);
                  return course ? { id: course.id, title: course.title } : null;
                })
              )
            ).filter(Boolean); // remove nulls

            return {
              id: group.id,
              name: group.name,
              description: group.description,
              createdAt: group.createdAt,
              members: users,
              courses: courses,
            };
          })
        );

        res.json(detailedGroups);
      } catch (error) {
        console.error("Error fetching groups:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/groups",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const { name, description, userIds = [], courseIds = [] } = req.body;

        if (!name) {
          return res.status(400).json({ message: "Group name is required" });
        }

        // Create group
        const newGroup = await storage.createGroup({
          name,
          description: description || null,
        });

        // Create course access mappings for each course-user combination
        if (Array.isArray(courseIds) && courseIds.length > 0) {
          const courseAccessPromises = [];
          for (const userId of userIds) {
            for (const courseId of courseIds) {
              courseAccessPromises.push(
                storage.createCourseAccess({
                  courseId,
                  userId,
                  groupId: newGroup.id,
                  accessType: "view",
                })
              );
            }
          }
          await Promise.all(courseAccessPromises);
        }

        // Link courses to group
        if (Array.isArray(courseIds) && courseIds.length > 0) {
          await Promise.all(
            courseIds.map((courseId: number) =>
              storage.createGroupCourse({ groupId: newGroup.id, courseId })
            )
          );
        }

        // Get courses accessible through this group
        const groupCourses = await storage.getGroupCoursesByGroup(newGroup.id);
        const courses = await Promise.all(
          groupCourses.map(async (gc) => {
            const course = await storage.getCourse(gc.courseId);
            return course ? { id: course.id, title: course.title } : null;
          })
        ).then((results) => results.filter(Boolean));
        res
          .status(201)
          .json({ message: "Group created successfully", group: newGroup });

        // Send email to each user
        if (userIds.length > 0 && courses.length > 0) {
          await Promise.all(
            userIds.map(async (userId: number) => {
              const user = await storage.getUser(userId);
              if (user) {
                await sendGroupAssignmentEmail(
                  user.email,
                  user.username,
                  newGroup.name,
                  courses
                );
              }
            })
          );
        }
      } catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.put(
    "/api/groups/:id",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const groupId = parseInt(req.params.id);
        const { name, userIds = [], courseIds = [] } = req.body;

        // Get existing users and courses before update
        const existingMembers = await storage.getGroupMembersByGroup(groupId);
        const existingUserIds = existingMembers.map((member) => member.userId);

        const existingGroupCourses = await storage.getGroupCoursesByGroup(
          groupId
        );
        const existingCourseIds = existingGroupCourses.map((gc) => gc.courseId);

        // Determine newly added users and courses
        const newlyAddedUserIds = userIds.filter(
          (userId) => !existingUserIds.includes(userId)
        );
        const newlyAddedCourseIds = courseIds.filter(
          (courseId) => !existingCourseIds.includes(courseId)
        );

        // Update group name
        await storage.updateGroup(groupId, { name });

        // Remove and recreate all members and courses
        await storage.deleteGroupMembers(groupId);
        await storage.deleteGroupCourses(groupId);

        // Add members
        if (userIds.length > 0) {
          await Promise.all(
            userIds.map((userId) =>
              storage.createGroupMember({ groupId, userId })
            )
          );
        }

        // Add courses
        if (courseIds.length > 0) {
          await Promise.all(
            courseIds.map((courseId) =>
              storage.createGroupCourse({ groupId, courseId })
            )
          );
        }

        // ✅ Recreate course access mappings
        if (userIds.length > 0 && courseIds.length > 0) {
          await Promise.all(
            userIds.flatMap((userId) =>
              courseIds.map((courseId) =>
                storage.createCourseAccess({
                  courseId,
                  userId,
                  groupId,
                  accessType: "view",
                })
              )
            )
          );
        }

        // Get updated course details
        const groupCourses = await storage.getGroupCoursesByGroup(groupId);
        const courses = await Promise.all(
          groupCourses.map(async (gc) => {
            const course = await storage.getCourse(gc.courseId);
            return course ? { id: course.id, title: course.title } : null;
          })
        ).then((results) => results.filter(Boolean));

        // Get group details
        const group = await storage.getGroup(groupId);

        res.status(200).json({ message: "Group updated successfully" });

        // ✉️ Send email to newly added users (only)
        if (newlyAddedUserIds.length > 0 && courses.length > 0 && group) {
          await Promise.all(
            newlyAddedUserIds.map(async (userId) => {
              const user = await storage.getUser(userId);
              if (user) {
                await sendGroupAssignmentEmail(
                  user.email,
                  user.username,
                  group.name,
                  courses
                );
              }
            })
          );
        }

        // ✉️ Send email to ALL users if new course(s) were added
        if (
          newlyAddedCourseIds.length > 0 &&
          group &&
          existingMembers.length > 0
        ) {
          await Promise.all(
            existingMembers.map(async (member) => {
              const user = await storage.getUser(member.userId);
              if (user) {
                await sendGroupAssignmentEmail(
                  user.email,
                  user.username,
                  group.name,
                  courses
                );
              }
            })
          );
        }
      } catch (error) {
        console.error("Error updating group:", error);
        res.status(500).json({ message: "Failed to update group" });
      }
    }
  );

  app.delete(
    "/api/groups/:id",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      const groupId = parseInt(req.params.id);

      if (isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }

      try {
        // 1. Delete all course access mappings associated with this group
        await storage.deleteCourseAccessByGroupId(groupId);

        // 2. Delete all group members and group-course links
        await storage.deleteGroupMembersByGroupId(groupId);
        await storage.deleteGroupCoursesByGroupId(groupId);

        // 3. Delete the group itself
        const success = await storage.deleteGroup(groupId);

        if (!success) {
          return res
            .status(404)
            .json({ message: "Group not found or already deleted" });
        }

        res.status(200).json({ message: "Group deleted successfully" });
      } catch (error) {
        console.error("Error deleting group:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Group members
  app.get(
    "/api/groups/:groupId/members",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const groupId = parseInt(req.params.groupId);
        if (isNaN(groupId)) {
          return res.status(400).json({ message: "Invalid group ID" });
        }
        const groupMembers = await storage.getGroupMembersByGroup(groupId);

        // TODO: Consider using Prisma include to fetch user details efficiently
        // For now, keep separate fetches
        const membersWithUserDetails = await Promise.all(
          groupMembers.map(async (member) => {
            const user = await storage.getUser(member.userId);
            // Explicitly handle null user case
            const { password, ...userWithoutPassword } = user ?? {};
            return {
              ...member,
              user: user ? userWithoutPassword : null,
            };
          })
        );

        res.json(membersWithUserDetails);
      } catch (error) {
        console.error("Error fetching group members:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/group-members",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        // Zod validation removed
        // const memberData = insertGroupMemberSchema.parse(req.body);
        const { groupId, userId } = req.body;

        if (typeof groupId !== "number" || typeof userId !== "number") {
          return res
            .status(400)
            .json({ message: "Valid groupId and userId are required" });
        }

        // Check if the group exists
        const group = await storage.getGroup(groupId);
        if (!group) {
          return res.status(404).json({ message: "Group not found" });
        }

        // Check if the user exists
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check if the user is already a member of the group
        const groupMembers = await storage.getGroupMembersByGroup(groupId);
        const existingMember = groupMembers.find(
          (member) => member.userId === userId
        );

        if (existingMember) {
          return res
            .status(400)
            .json({ message: "User is already a member of this group" });
        }

        const newMember = await storage.createGroupMember({ groupId, userId });

        res.status(201).json(newMember);
      } catch (error) {
        // if (error instanceof z.ZodError) { ... }
        console.error("Error adding group member:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/course-access",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const { courseId, userId, groupId, accessType } = req.body;

        if (
          typeof courseId !== "number" ||
          !accessType ||
          (!userId && !groupId)
        ) {
          return res.status(400).json({
            message:
              "Valid courseId, accessType, and either userId or groupId are required",
          });
        }
        if (userId && typeof userId !== "number") {
          return res.status(400).json({ message: "Invalid userId provided" });
        }
        if (groupId && typeof groupId !== "number") {
          return res.status(400).json({ message: "Invalid groupId provided" });
        }

        // Check if the course exists
        const course = await storage.getCourse(courseId);
        if (!course) {
          return res.status(404).json({ message: "Course not found" });
        }

        // Create access
        const newAccess = await storage.createCourseAccess({
          courseId,
          userId: userId || null,
          groupId: groupId || null,
          accessType,
        });

        res.status(201).json(newAccess);

        // Send email(s)
        if (userId) {
          const user = await storage.getUser(userId);
          if (user) {
            await sendGroupAssignmentEmail(
              user.email,
              user.username,
              "Direct Access", // or some other label if group isn't used
              [{ id: course.id, title: course.title }]
            );
          }
        }

        if (groupId) {
          const group = await storage.getGroup(groupId);
          const members = await storage.getGroupMembersByGroup(groupId); // list of { userId }
          const users = await Promise.all(
            members.map((member) => storage.getUser(member.userId))
          );
          const validUsers = users.filter((u) => u); // filter out nulls if any

          await Promise.all(
            validUsers.map((user) =>
              sendGroupAssignmentEmail(user.email, user.username, group.name, [
                { id: course.id, title: course.title },
              ])
            )
          );
        }
      } catch (error) {
        console.error("Error granting course access:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Lesson progress
  app.post("/api/lesson-progress", isAuthenticated, async (req, res) => {
    try {
      // Zod validation removed
      // const progressData = insertLessonProgressSchema.parse({ ... });
      const { lessonId, status } = req.body;
      const userId = req.user!.id; // Assert req.user exists

      if (typeof lessonId !== "number" || !status) {
        return res
          .status(400)
          .json({ message: "Valid lessonId and status are required" });
      }

      // Check if the lesson exists
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // Check if there's existing progress
      const userProgressItems = await storage.getLessonProgressByUser(userId);
      const existingProgress = userProgressItems.find(
        (progress) => progress.lessonId === lessonId
      );

      let progressResult;
      const progressInput = { userId, lessonId, status };

      if (existingProgress) {
        // Update existing progress
        progressResult = await storage.updateLessonProgress(
          existingProgress.id,
          progressInput
        );
        if (!progressResult) {
          // Handle potential update failure (e.g., record deleted between check and update)
          return res
            .status(404)
            .json({ message: "Lesson progress record not found for update" });
        }
      } else {
        // Create new progress
        progressResult = await storage.createLessonProgress(progressInput);
      }

      // Log the activity if completing the lesson
      if (status === "completed") {
        await storage.createActivityLog({
          userId: userId,
          action: "completed_lesson",
          resourceType: "lesson",
          resourceId: lessonId,
          metadata: {}, // Prisma expects JsonNull or an object
        });

        // Update course enrollment progress
        const module = await storage.getModule(lesson.moduleId);
        if (module) {
          const userEnrollments = await storage.getEnrollmentsByUser(userId);
          const enrollment = userEnrollments.find(
            (enr) => enr.courseId === module.courseId
          );

          if (enrollment) {
            // --- Corrected Progress Calculation ---
            // 1. Get all modules for the course
            const allModules = await storage.getModulesByCourse(
              module.courseId
            );
            const allModuleIds = allModules.map((m) => m.id);

            // 2. Get all lessons for all modules in the course
            let allLessonsInCourse: Lesson[] = [];
            for (const modId of allModuleIds) {
              const lessons = await storage.getLessonsByModule(modId);
              allLessonsInCourse = allLessonsInCourse.concat(lessons);
            }
            const totalLessonsInCourse = allLessonsInCourse.length;

            // 3. Get all completed lesson progress records for the user in this course
            // Use the specific function if available, otherwise filter all progress
            // Assuming getLessonProgressByUserAndCourse exists and is efficient:
            const courseProgressRecords =
              await storage.getLessonProgressByUserAndCourse(
                userId,
                module.courseId
              );
            const completedLessonsInCourse = courseProgressRecords.filter(
              (p) => p.status === "completed"
            ).length;

            // 4. Calculate overall progress percentage
            const progressPercentage =
              totalLessonsInCourse > 0
                ? Math.round(
                    (completedLessonsInCourse / totalLessonsInCourse) * 100
                  )
                : 0; // Avoid division by zero if course has no lessons

            // 5. Update enrollment with correct progress and completion status
            await storage.updateEnrollment(enrollment.id, {
              progress: progressPercentage,
              completedAt: progressPercentage === 100 ? new Date() : null,
            });

            // Auto-create certificate if completed and not exists
            if (progressPercentage === 100) {
              console.log(
                "Progress is 100%, checking for existing certificate..."
              );
              const existingCerts = await storage.getCertificatesByUser(userId);
              const existing = existingCerts.find(
                (c) => c.courseId === module.courseId
              );
              if (!existing) {
                console.log(
                  "No existing certificate found, creating new certificate..."
                );
                const crypto = await import("crypto");
                const certHash = crypto.randomBytes(16).toString("hex");
                await storage.createCertificate({
                  userId,
                  courseId: module.courseId,
                  certificateId: certHash,
                  issueDate: new Date(),
                  certificateUrl: null,
                });
                console.log("Certificate created with ID:", certHash);
              } else {
                console.log(
                  "Certificate already exists for this user and course."
                );
              }
            }
            // --- End Corrected Progress Calculation ---
          }
        }
      }

      res.status(201).json(progressResult);
    } catch (error) {
      // if (error instanceof z.ZodError) { ... }
      console.error("Error updating lesson progress:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Category Management Routes
  app.get("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(
    "/api/categories",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const { name } = req.body;
        if (!name) {
          return res.status(400).json({ message: "Category name is required" });
        }

        const newCategory = await storage.createCategory({ name });
        res.status(201).json(newCategory);
      } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.put(
    "/api/categories/:id",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const categoryId = parseInt(req.params.id);
        const { name } = req.body;

        if (isNaN(categoryId)) {
          return res.status(400).json({ message: "Invalid category ID" });
        }

        if (!name) {
          return res.status(400).json({ message: "Category name is required" });
        }

        const updatedCategory = await storage.updateCategory(categoryId, {
          name,
        });
        if (!updatedCategory) {
          return res.status(404).json({ message: "Category not found" });
        }

        res.json(updatedCategory);
      } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.delete(
    "/api/categories/:id",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const categoryId = parseInt(req.params.id);
        if (isNaN(categoryId)) {
          return res.status(400).json({ message: "Invalid category ID" });
        }

        const deleted = await storage.deleteCategory(categoryId);
        if (!deleted) {
          return res.status(404).json({ message: "Category not found" });
        }

        res.status(204).send();
      } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Activity logs
  app.get("/api/activity-logs", isAuthenticated, async (req, res) => {
    try {
      const activityLogs = await storage.getActivityLogsByUser(req.user!.id); // Assert req.user exists
      res.json(activityLogs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Lesson Progress Route ---
  app.get(
    "/api/courses/:courseId/progress",
    isAuthenticated,
    async (req, res) => {
      try {
        const courseId = parseInt(req.params.courseId);
        const userId = req.user!.id; // Assert user exists

        if (isNaN(courseId)) {
          return res.status(400).json({ message: "Invalid course ID" });
        }

        const progress = await storage.getLessonProgressByUserAndCourse(
          userId,
          courseId
        );
        res.json(progress);
      } catch (error) {
        console.error("Error fetching lesson progress:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  // --- End Lesson Progress Route ---

  // --- Video Upload Route ---
  app.post(
    "/api/upload/video",
    isAuthenticated,
    hasRole(["contributor", "admin"]),
    uploadVideo.single("video"),
    (req, res) => {
      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded." });
      }
      const videoUrl = `/uploads/videos/${req.file.filename}`;
      res
        .status(201)
        .json({ message: "Video uploaded successfully", videoUrl });
    }
  );

  // --- Image Upload Route ---
  app.post(
    "/api/upload/image",
    isAuthenticated,
    hasRole(["contributor", "admin"]),
    uploadImage.single("image"),
    (req, res) => {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded." });
      }
      const url = `/uploads/course-images/${req.file.filename}`;
      res.status(201).json({ message: "Image uploaded successfully", url });
    }
  );

  // --- Resource Upload Route ---
  app.post(
    "/api/resources",
    isAuthenticated,
    hasRole(["contributor", "admin"]),
    uploadResource.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No resource file uploaded." });
        }
        const { courseId, lessonId, description } = req.body;
        if (!courseId) {
          return res.status(400).json({ message: "courseId is required" });
        }
        const courseIdNum = parseInt(courseId);
        if (isNaN(courseIdNum)) {
          return res.status(400).json({ message: "Invalid courseId" });
        }
        let lessonIdNum: number | null = null;
        if (lessonId) {
          lessonIdNum = parseInt(lessonId);
          if (isNaN(lessonIdNum)) {
            return res.status(400).json({ message: "Invalid lessonId" });
          }
        }
        // Check course exists
        const course = await storage.getCourse(courseIdNum);
        if (!course) {
          return res.status(404).json({ message: "Course not found" });
        }
        // Only allow instructor or admin to upload
        if (
          course.instructorId !== req.user!.id &&
          req.user!.role !== "admin"
        ) {
          return res.status(403).json({ message: "Forbidden" });
        }
        // Save resource metadata
        const resource = await storage.createResource({
          courseId: courseIdNum,
          lessonId: lessonIdNum,
          uploaderId: req.user!.id,
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          storagePath: `/uploads/resources/${req.file.filename}`,
          description: description || null,
        });
        res.status(201).json(resource);
      } catch (error) {
        console.error("Error uploading resource:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // --- List Resources for a Course ---
  app.get(
    "/api/courses/:courseId/resources",
    isAuthenticated,
    async (req, res) => {
      try {
        const courseId = parseInt(req.params.courseId);
        if (isNaN(courseId)) {
          return res.status(400).json({ message: "Invalid course ID" });
        }
        // Only allow enrolled users, instructor, or admin to view
        const course = await storage.getCourse(courseId);
        if (!course) {
          return res.status(404).json({ message: "Course not found" });
        }
        if (
          req.user!.role !== "admin" &&
          course.instructorId !== req.user!.id
        ) {
          // Check enrollment
          const enrollments = await storage.getEnrollmentsByUser(req.user!.id);
          const enrolled = enrollments.some((e) => e.courseId === courseId);
          if (!enrolled) {
            return res.status(403).json({ message: "Forbidden" });
          }
        }
        const resources = await storage.getResourcesByCourse(courseId);
        res.json(resources);
      } catch (error) {
        console.error("Error fetching resources:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // --- Download Resource File ---
  app.get(
    "/api/resources/:id/download",
    isAuthenticated,
    async (req, res) => {
      try {
        const resourceId = parseInt(req.params.id);
        if (isNaN(resourceId)) {
          return res.status(400).json({ message: "Invalid resource ID" });
        }
        const resource = await storage.getResourceById(resourceId);
        if (!resource) {
          return res.status(404).json({ message: "Resource not found" });
        }
        // Only allow enrolled users, instructor, or admin to download
        const course = await storage.getCourse(resource.courseId);
        if (!course) {
          return res.status(404).json({ message: "Course not found" });
        }
        if (
          req.user!.role !== "admin" &&
          course.instructorId !== req.user!.id
        ) {
          // Check enrollment
          const enrollments = await storage.getEnrollmentsByUser(req.user!.id);
          const enrolled = enrollments.some((e) => e.courseId === course.id);
          if (!enrolled) {
            return res.status(403).json({ message: "Forbidden" });
          }
        }
        // Send file
        const absPath = path.join(projectRoot, resource.storagePath);
        if (!fs.existsSync(absPath)) {
          return res.status(404).json({ message: "File not found on server" });
        }
        res.download(absPath, resource.filename);
      } catch (error) {
        console.error("Error downloading resource:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // --- Delete Resource File ---
  app.delete(
    "/api/resources/:id",
    isAuthenticated,
    async (req, res) => {
      try {
        const resourceId = parseInt(req.params.id);
        if (isNaN(resourceId)) {
          return res.status(400).json({ message: "Invalid resource ID" });
        }
        const resource = await storage.getResourceById(resourceId);
        if (!resource) {
          return res.status(404).json({ message: "Resource not found" });
        }
        // Only allow instructor, admin, or uploader to delete
        const course = await storage.getCourse(resource.courseId);
        if (!course) {
          return res.status(404).json({ message: "Course not found" });
        }
        if (
          req.user!.role !== "admin" &&
          course.instructorId !== req.user!.id &&
          resource.uploaderId !== req.user!.id
        ) {
          return res.status(403).json({ message: "Forbidden" });
        }
        // Delete file from disk
        const absPath = path.join(projectRoot, resource.storagePath);
        if (fs.existsSync(absPath)) {
          try {
            fs.unlinkSync(absPath);
          } catch (err) {
            console.warn("Failed to delete file from disk:", err);
          }
        }
        // Delete from DB
        await storage.deleteResource(resourceId);
        res.status(204).send();
      } catch (error) {
        console.error("Error deleting resource:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  // --- End Upload Routes ---

  // --- Certificate Creation Route ---
  app.post("/api/certificates/:courseId", isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      if (isNaN(courseId)) {
        return res.status(400).json({ message: "Invalid course ID" });
      }

      // Check if user completed the course
      const enrollments = await storage.getEnrollmentsByUser(req.user!.id);
      const enrollment = enrollments.find((e) => e.courseId === courseId);
      if (!enrollment || enrollment.progress < 100) {
        return res.status(403).json({ message: "Course not completed" });
      }

      // Check if certificate already exists
      const existingCerts = await storage.getCertificatesByUser(req.user!.id);
      const existing = existingCerts.find((c) => c.courseId === courseId);
      if (existing) {
        return res.json({ certificateId: existing.id });
      }

      // Generate unique hash ID
      const crypto = await import("crypto");
      const certHash = crypto.randomBytes(16).toString("hex");

      // Create certificate
      const newCert = await storage.createCertificate({
        userId: req.user!.id,
        courseId,
        certificateId: certHash,
        issueDate: new Date(),
        certificateUrl: null,
      });

      res.json({ certificateId: certHash });
    } catch (error) {
      console.error("Error creating certificate:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Public Certificate PDF by Certificate ID ---
  app.get("/public/certificate/:certificateId", async (req, res) => {
    try {
      const certId = req.params.certificateId;
      const cert = await storage.getCertificateByHash(certId);
      if (!cert) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      const course = await storage.getCourse(cert.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const user = await storage.getUser(cert.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const PDFDocument = (await import("pdfkit")).default;
      const doc = new PDFDocument({ size: "A4", layout: "landscape" });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="certificate-${certId}.pdf"`
      );

      doc.pipe(res);

      const certImagePath = path.join(
        projectRoot,
        "uploads",
        "certificate-template.png"
      );
      if (fs.existsSync(certImagePath)) {
        doc.image(certImagePath, 0, 0, {
          width: doc.page.width,
          height: doc.page.height,
        });
      }

      doc.fontSize(30).fillColor("black").text("Certificate of Completion", {
        align: "center",
        valign: "center",
      });
      doc.moveDown(2);
      doc
        .fontSize(24)
        .text(`${user.firstName || ""} ${user.lastName || ""}`.trim(), {
          align: "center",
        });
      doc.moveDown(1);
      doc
        .fontSize(20)
        .text(`has successfully completed the course`, { align: "center" });
      doc.moveDown(1);
      doc.fontSize(24).text(`${course.title}`, { align: "center" });
      doc.moveDown(2);
      doc
        .fontSize(16)
        .text(`Issued on: ${cert.issueDate.toLocaleDateString()}`, {
          align: "center",
        });

      // Add certificate ID at bottom-right corner immediately after background
      doc
        .fontSize(10)
        .fillColor("gray")
        .text(
          `Certificate ID: ${certId}`,
          doc.page.width - 300,
          doc.page.height - 90,
          {
            allign: "right",
            width: "250",
          }
        );

      doc.end();
    } catch (error) {
      console.error("Error generating public certificate:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Certificate PDF by Certificate ID ---

  // --- Certificate PDF Generation Route ---
  // --- End Certificate PDF Generation Route ---

  // --- Get User Certificates Route ---
  app.get("/api/certificates-user", isAuthenticated, async (req, res) => {
    try {
      const certs = await storage.getCertificatesByUser(req.user!.id);
      res.json(certs);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  // --- End Get User Certificates Route ---

  app.get("/api/course-access", isAuthenticated, async (req, res) => {
    try {
      const accessData = await storage.getAllCourseAccessByUser({
        id: req.user!.id,
        role: req.user!.role,
      });

      res.json(accessData);
    } catch (error) {
      console.error("Error fetching course access:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(
    "/api/course-access/:id",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const accessId = parseInt(req.params.id);
        const { courseId, userId, groupId, accessType } = req.body;

        if (
          typeof courseId !== "number" ||
          !accessType ||
          (!userId && !groupId)
        ) {
          return res.status(400).json({
            message:
              "Valid courseId, accessType, and either userId or groupId are required",
          });
        }

        // Get existing access
        const existingAccess = await storage.prisma.courseAccess.findUnique({
          where: { id: accessId },
        });

        if (!existingAccess) {
          return res.status(404).json({ message: "Access record not found" });
        }

        const oldUserId = existingAccess.userId;
        const oldGroupId = existingAccess.groupId;
        const oldCourseId = existingAccess.courseId;

        // Update the access
        const updatedAccess = await storage.prisma.courseAccess.update({
          where: { id: accessId },
          data: {
            courseId,
            userId: userId || null,
            groupId: groupId || null,
            accessType,
          },
        });

        res.json(updatedAccess);

        // Compare and send email if user or course changed
        if (userId && (userId !== oldUserId || courseId !== oldCourseId)) {
          const user = await storage.getUser(userId);
          const course = await storage.getCourse(courseId);
          if (user && course) {
            await sendGroupAssignmentEmail(
              user.email,
              user.username,
              "Direct Access (Updated)",
              [{ id: course.id, title: course.title }]
            );
          }
        }

        // Compare and send email to group users if group or course changed
        if (groupId && (groupId !== oldGroupId || courseId !== oldCourseId)) {
          const group = await storage.getGroup(groupId);
          const members = await storage.getGroupMembersByGroup(groupId);
          const users = await Promise.all(
            members.map((m) => storage.getUser(m.userId))
          );
          const validUsers = users.filter((u) => u);

          const course = await storage.getCourse(courseId);
          if (group && course) {
            await Promise.all(
              validUsers.map((user) =>
                sendGroupAssignmentEmail(
                  user.email,
                  user.username,
                  group.name,
                  [{ id: course.id, title: course.title }]
                )
              )
            );
          }
        }
      } catch (error) {
        console.error("Error updating course access:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.delete(
    "/api/course-access/:id",
    isAuthenticated,
    hasRole(["admin"]),
    async (req, res) => {
      try {
        const accessId = parseInt(req.params.id);
        await storage.prisma.courseAccess.delete({
          where: { id: accessId },
        });
        res.status(204).send();
      } catch (error) {
        console.error("Error deleting course access:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Add the HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
