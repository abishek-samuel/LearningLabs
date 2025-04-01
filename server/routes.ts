import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertCourseSchema, insertEnrollmentSchema, insertModuleSchema, 
  insertLessonSchema, insertAssessmentSchema, insertQuestionSchema,
  insertAssessmentAttemptSchema, insertGroupSchema, insertGroupMemberSchema,
  insertCourseAccessSchema, insertLessonProgressSchema, insertActivityLogSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  await setupAuth(app);

  // Helper middleware to check authentication
  const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Helper middleware to check role
  const hasRole = (roles: string[]) => (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (roles.includes(req.user.role)) {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };

  // User routes
  app.get('/api/users', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Course routes
  app.get('/api/courses', isAuthenticated, async (req, res) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/courses/:id', isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/courses', isAuthenticated, hasRole(['contributor', 'admin']), async (req, res) => {
    try {
      const courseData = insertCourseSchema.parse(req.body);
      const newCourse = await storage.createCourse({
        ...courseData,
        instructorId: req.user.id,
      });
      
      res.status(201).json(newCourse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put('/api/courses/:id', isAuthenticated, hasRole(['contributor', 'admin']), async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Only allow the instructor or admin to update the course
      if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const courseData = insertCourseSchema.partial().parse(req.body);
      const updatedCourse = await storage.updateCourse(courseId, courseData);
      
      res.json(updatedCourse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/courses/:id', isAuthenticated, hasRole(['contributor', 'admin']), async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Only allow the instructor or admin to delete the course
      if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteCourse(courseId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Enrollment routes
  app.get('/api/enrollments', isAuthenticated, async (req, res) => {
    try {
      const enrollments = await storage.getEnrollmentsByUser(req.user.id);
      
      // Get the course details for each enrollment
      const enrollmentsWithCourses = await Promise.all(
        enrollments.map(async (enrollment) => {
          const course = await storage.getCourse(enrollment.courseId);
          return {
            ...enrollment,
            course,
          };
        })
      );
      
      res.json(enrollmentsWithCourses);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/enrollments', isAuthenticated, async (req, res) => {
    try {
      const enrollmentData = insertEnrollmentSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      // Check if the course exists
      const course = await storage.getCourse(enrollmentData.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if the user is already enrolled
      const userEnrollments = await storage.getEnrollmentsByUser(req.user.id);
      const existingEnrollment = userEnrollments.find(
        (enrollment) => enrollment.courseId === enrollmentData.courseId
      );
      
      if (existingEnrollment) {
        return res.status(400).json({ message: "Already enrolled in this course" });
      }
      
      const newEnrollment = await storage.createEnrollment(enrollmentData);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "enrolled",
        resourceType: "course",
        resourceId: enrollmentData.courseId,
        metadata: {},
      });
      
      res.status(201).json(newEnrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Error creating enrollment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Module routes
  app.get('/api/courses/:courseId/modules', isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const modules = await storage.getModulesByCourse(courseId);
      
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/modules', isAuthenticated, hasRole(['contributor', 'admin']), async (req, res) => {
    try {
      const moduleData = insertModuleSchema.parse(req.body);
      
      // Check if the course exists and if the user is the instructor
      const course = await storage.getCourse(moduleData.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const newModule = await storage.createModule(moduleData);
      
      res.status(201).json(newModule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Error creating module:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Lesson routes
  app.get('/api/modules/:moduleId/lessons', isAuthenticated, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.moduleId);
      const lessons = await storage.getLessonsByModule(moduleId);
      
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/lessons', isAuthenticated, hasRole(['contributor', 'admin']), async (req, res) => {
    try {
      const lessonData = insertLessonSchema.parse(req.body);
      
      // Check if the module exists
      const module = await storage.getModule(lessonData.moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      // Check if the user is the instructor of the course
      const course = await storage.getCourse(module.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const newLesson = await storage.createLesson(lessonData);
      
      res.status(201).json(newLesson);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Error creating lesson:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Assessment routes
  app.get('/api/modules/:moduleId/assessments', isAuthenticated, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.moduleId);
      const assessments = await storage.getAssessmentsByModule(moduleId);
      
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/assessments', isAuthenticated, hasRole(['contributor', 'admin']), async (req, res) => {
    try {
      const assessmentData = insertAssessmentSchema.parse(req.body);
      
      // If moduleId is provided, check if the module exists
      if (assessmentData.moduleId) {
        const module = await storage.getModule(assessmentData.moduleId);
        if (!module) {
          return res.status(404).json({ message: "Module not found" });
        }
        
        // Check if the user is the instructor of the course
        const course = await storage.getCourse(module.courseId);
        if (!course) {
          return res.status(404).json({ message: "Course not found" });
        }
        
        if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const newAssessment = await storage.createAssessment(assessmentData);
      
      res.status(201).json(newAssessment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Error creating assessment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Question routes
  app.get('/api/assessments/:assessmentId/questions', isAuthenticated, async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.assessmentId);
      const questions = await storage.getQuestionsByAssessment(assessmentId);
      
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/questions', isAuthenticated, hasRole(['contributor', 'admin']), async (req, res) => {
    try {
      const questionData = insertQuestionSchema.parse(req.body);
      
      // Check if the assessment exists
      const assessment = await storage.getAssessment(questionData.assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      // If the assessment is linked to a module, check permissions
      if (assessment.moduleId) {
        const module = await storage.getModule(assessment.moduleId);
        if (!module) {
          return res.status(404).json({ message: "Module not found" });
        }
        
        const course = await storage.getCourse(module.courseId);
        if (!course) {
          return res.status(404).json({ message: "Course not found" });
        }
        
        if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const newQuestion = await storage.createQuestion(questionData);
      
      res.status(201).json(newQuestion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Error creating question:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Assessment attempts
  app.post('/api/assessment-attempts', isAuthenticated, async (req, res) => {
    try {
      const attemptData = insertAssessmentAttemptSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      // Check if the assessment exists
      const assessment = await storage.getAssessment(attemptData.assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }
      
      const newAttempt = await storage.createAssessmentAttempt(attemptData);
      
      // Log the activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "started_assessment",
        resourceType: "assessment",
        resourceId: attemptData.assessmentId,
        metadata: {},
      });
      
      res.status(201).json(newAttempt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Error creating assessment attempt:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put('/api/assessment-attempts/:id', isAuthenticated, async (req, res) => {
    try {
      const attemptId = parseInt(req.params.id);
      const attempt = await storage.getAssessmentAttempt(attemptId);
      
      if (!attempt) {
        return res.status(404).json({ message: "Assessment attempt not found" });
      }
      
      // Only allow the user who created the attempt to update it
      if (attempt.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedAttempt = await storage.updateAssessmentAttempt(attemptId, req.body);
      
      // If the attempt is being marked as completed, log the activity
      if (req.body.status === "completed" && attempt.status !== "completed") {
        await storage.createActivityLog({
          userId: req.user.id,
          action: "completed_assessment",
          resourceType: "assessment",
          resourceId: attempt.assessmentId,
          metadata: { score: req.body.score },
        });
      }
      
      res.json(updatedAttempt);
    } catch (error) {
      console.error("Error updating assessment attempt:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Group routes
  app.get('/api/groups', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/groups', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const groupData = insertGroupSchema.parse(req.body);
      const newGroup = await storage.createGroup(groupData);
      
      res.status(201).json(newGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Group members
  app.get('/api/groups/:groupId/members', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const groupMembers = await storage.getGroupMembersByGroup(groupId);
      
      // Get the user details for each member
      const membersWithUserDetails = await Promise.all(
        groupMembers.map(async (member) => {
          const user = await storage.getUser(member.userId);
          const { password, ...userWithoutPassword } = user || {};
          return {
            ...member,
            user: userWithoutPassword,
          };
        })
      );
      
      res.json(membersWithUserDetails);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/group-members', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const memberData = insertGroupMemberSchema.parse(req.body);
      
      // Check if the group exists
      const group = await storage.getGroup(memberData.groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Check if the user exists
      const user = await storage.getUser(memberData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if the user is already a member of the group
      const groupMembers = await storage.getGroupMembersByGroup(memberData.groupId);
      const existingMember = groupMembers.find(
        (member) => member.userId === memberData.userId
      );
      
      if (existingMember) {
        return res.status(400).json({ message: "User is already a member of this group" });
      }
      
      const newMember = await storage.createGroupMember(memberData);
      
      res.status(201).json(newMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Error adding group member:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Course access
  app.post('/api/course-access', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const accessData = insertCourseAccessSchema.parse(req.body);
      
      // Check if the course exists
      const course = await storage.getCourse(accessData.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if user or group exists
      if (accessData.userId) {
        const user = await storage.getUser(accessData.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
      }
      
      if (accessData.groupId) {
        const group = await storage.getGroup(accessData.groupId);
        if (!group) {
          return res.status(404).json({ message: "Group not found" });
        }
      }
      
      const newAccess = await storage.createCourseAccess(accessData);
      
      res.status(201).json(newAccess);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Error granting course access:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Lesson progress
  app.post('/api/lesson-progress', isAuthenticated, async (req, res) => {
    try {
      const progressData = insertLessonProgressSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      // Check if the lesson exists
      const lesson = await storage.getLesson(progressData.lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Check if there's existing progress
      const userProgressItems = await storage.getLessonProgressByUser(req.user.id);
      const existingProgress = userProgressItems.find(
        (progress) => progress.lessonId === progressData.lessonId
      );
      
      let progressResult;
      
      if (existingProgress) {
        // Update existing progress
        progressResult = await storage.updateLessonProgress(existingProgress.id, progressData);
      } else {
        // Create new progress
        progressResult = await storage.createLessonProgress(progressData);
      }
      
      // Log the activity if completing the lesson
      if (progressData.status === "completed") {
        await storage.createActivityLog({
          userId: req.user.id,
          action: "completed_lesson",
          resourceType: "lesson",
          resourceId: progressData.lessonId,
          metadata: {},
        });
        
        // Update course enrollment progress
        const module = await storage.getModule(lesson.moduleId);
        if (module) {
          const userEnrollments = await storage.getEnrollmentsByUser(req.user.id);
          const enrollment = userEnrollments.find(
            (enrollment) => enrollment.courseId === module.courseId
          );
          
          if (enrollment) {
            // Calculate new progress percentage
            const moduleLessons = await storage.getLessonsByModule(lesson.moduleId);
            const userProgress = await storage.getLessonProgressByUser(req.user.id);
            
            const completedLessons = userProgress.filter(
              (progress) => 
                progress.status === "completed" && 
                moduleLessons.some((lesson) => lesson.id === progress.lessonId)
            ).length;
            
            const progressPercentage = Math.round(
              (completedLessons / moduleLessons.length) * 100
            );
            
            await storage.updateEnrollment(enrollment.id, {
              progress: progressPercentage,
            });
          }
        }
      }
      
      res.status(201).json(progressResult);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      console.error("Error updating lesson progress:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Activity logs
  app.get('/api/activity-logs', isAuthenticated, async (req, res) => {
    try {
      const activityLogs = await storage.getActivityLogsByUser(req.user.id);
      res.json(activityLogs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add the HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
