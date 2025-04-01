import { 
  User, InsertUser, Course, InsertCourse, Module, InsertModule, 
  Lesson, InsertLesson, Enrollment, InsertEnrollment,
  Assessment, InsertAssessment, Question, InsertQuestion,
  AssessmentAttempt, InsertAssessmentAttempt, Group, InsertGroup,
  GroupMember, InsertGroupMember, CourseAccess, InsertCourseAccess,
  LessonProgress, InsertLessonProgress, ActivityLog, InsertActivityLog,
  Certificate, InsertCertificate
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

// Create memory store for session
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User related methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Course related methods
  getCourse(id: number): Promise<Course | undefined>;
  getCourses(): Promise<Course[]>;
  getCoursesByInstructor(instructorId: number): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, course: Partial<Course>): Promise<Course | undefined>;
  deleteCourse(id: number): Promise<boolean>;

  // Module related methods
  getModule(id: number): Promise<Module | undefined>;
  getModulesByCourse(courseId: number): Promise<Module[]>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: number, module: Partial<Module>): Promise<Module | undefined>;
  deleteModule(id: number): Promise<boolean>;

  // Lesson related methods
  getLesson(id: number): Promise<Lesson | undefined>;
  getLessonsByModule(moduleId: number): Promise<Lesson[]>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: number, lesson: Partial<Lesson>): Promise<Lesson | undefined>;
  deleteLesson(id: number): Promise<boolean>;

  // Enrollment related methods
  getEnrollment(id: number): Promise<Enrollment | undefined>;
  getEnrollmentsByUser(userId: number): Promise<Enrollment[]>;
  getEnrollmentsByCourse(courseId: number): Promise<Enrollment[]>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  updateEnrollment(id: number, enrollment: Partial<Enrollment>): Promise<Enrollment | undefined>;
  deleteEnrollment(id: number): Promise<boolean>;

  // Assessment related methods
  getAssessment(id: number): Promise<Assessment | undefined>;
  getAssessmentsByModule(moduleId: number): Promise<Assessment[]>;
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  updateAssessment(id: number, assessment: Partial<Assessment>): Promise<Assessment | undefined>;
  deleteAssessment(id: number): Promise<boolean>;

  // Question related methods
  getQuestion(id: number): Promise<Question | undefined>;
  getQuestionsByAssessment(assessmentId: number): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: number, question: Partial<Question>): Promise<Question | undefined>;
  deleteQuestion(id: number): Promise<boolean>;

  // Assessment attempt related methods
  getAssessmentAttempt(id: number): Promise<AssessmentAttempt | undefined>;
  getAssessmentAttemptsByUser(userId: number): Promise<AssessmentAttempt[]>;
  getAssessmentAttemptsByAssessment(assessmentId: number): Promise<AssessmentAttempt[]>;
  createAssessmentAttempt(attempt: InsertAssessmentAttempt): Promise<AssessmentAttempt>;
  updateAssessmentAttempt(id: number, attempt: Partial<AssessmentAttempt>): Promise<AssessmentAttempt | undefined>;
  
  // Group related methods
  getGroup(id: number): Promise<Group | undefined>;
  getGroups(): Promise<Group[]>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: number, group: Partial<Group>): Promise<Group | undefined>;
  deleteGroup(id: number): Promise<boolean>;

  // Group member related methods
  getGroupMember(id: number): Promise<GroupMember | undefined>;
  getGroupMembersByGroup(groupId: number): Promise<GroupMember[]>;
  getGroupMembersByUser(userId: number): Promise<GroupMember[]>;
  createGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  deleteGroupMember(id: number): Promise<boolean>;

  // Course access related methods
  getCourseAccess(id: number): Promise<CourseAccess | undefined>;
  getCourseAccessByCourse(courseId: number): Promise<CourseAccess[]>;
  getCourseAccessByUser(userId: number): Promise<CourseAccess[]>;
  getCourseAccessByGroup(groupId: number): Promise<CourseAccess[]>;
  createCourseAccess(access: InsertCourseAccess): Promise<CourseAccess>;
  deleteCourseAccess(id: number): Promise<boolean>;

  // Lesson progress related methods
  getLessonProgress(id: number): Promise<LessonProgress | undefined>;
  getLessonProgressByUser(userId: number): Promise<LessonProgress[]>;
  getLessonProgressByLesson(lessonId: number): Promise<LessonProgress[]>;
  createLessonProgress(progress: InsertLessonProgress): Promise<LessonProgress>;
  updateLessonProgress(id: number, progress: Partial<LessonProgress>): Promise<LessonProgress | undefined>;

  // Activity log related methods
  getActivityLog(id: number): Promise<ActivityLog | undefined>;
  getActivityLogsByUser(userId: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Certificate related methods
  getCertificate(id: number): Promise<Certificate | undefined>;
  getCertificatesByUser(userId: number): Promise<Certificate[]>;
  getCertificatesByCourse(courseId: number): Promise<Certificate[]>;
  createCertificate(certificate: InsertCertificate): Promise<Certificate>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private courses: Map<number, Course>;
  private modules: Map<number, Module>;
  private lessons: Map<number, Lesson>;
  private enrollments: Map<number, Enrollment>;
  private assessments: Map<number, Assessment>;
  private questions: Map<number, Question>;
  private assessmentAttempts: Map<number, AssessmentAttempt>;
  private groups: Map<number, Group>;
  private groupMembers: Map<number, GroupMember>;
  private courseAccess: Map<number, CourseAccess>;
  private lessonProgress: Map<number, LessonProgress>;
  private activityLogs: Map<number, ActivityLog>;
  private certificates: Map<number, Certificate>;

  // ID counters
  private userIdCounter: number;
  private courseIdCounter: number;
  private moduleIdCounter: number;
  private lessonIdCounter: number;
  private enrollmentIdCounter: number;
  private assessmentIdCounter: number;
  private questionIdCounter: number;
  private assessmentAttemptIdCounter: number;
  private groupIdCounter: number;
  private groupMemberIdCounter: number;
  private courseAccessIdCounter: number;
  private lessonProgressIdCounter: number;
  private activityLogIdCounter: number;
  private certificateIdCounter: number;

  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.courses = new Map();
    this.modules = new Map();
    this.lessons = new Map();
    this.enrollments = new Map();
    this.assessments = new Map();
    this.questions = new Map();
    this.assessmentAttempts = new Map();
    this.groups = new Map();
    this.groupMembers = new Map();
    this.courseAccess = new Map();
    this.lessonProgress = new Map();
    this.activityLogs = new Map();
    this.certificates = new Map();

    // Initialize ID counters
    this.userIdCounter = 1;
    this.courseIdCounter = 1;
    this.moduleIdCounter = 1;
    this.lessonIdCounter = 1;
    this.enrollmentIdCounter = 1;
    this.assessmentIdCounter = 1;
    this.questionIdCounter = 1;
    this.assessmentAttemptIdCounter = 1;
    this.groupIdCounter = 1;
    this.groupMemberIdCounter = 1;
    this.courseAccessIdCounter = 1;
    this.lessonProgressIdCounter = 1;
    this.activityLogIdCounter = 1;
    this.certificateIdCounter = 1;

    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });

    // Create an admin user by default
    this.createUser({
      username: "admin",
      email: "admin@example.com",
      password: "admin123",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    });

    // Create a contributor user
    this.createUser({
      username: "contributor",
      email: "contributor@example.com",
      password: "contributor123",
      firstName: "Content",
      lastName: "Creator",
      role: "contributor",
    });

    // Create an employee user
    this.createUser({
      username: "employee",
      email: "employee@example.com",
      password: "employee123",
      firstName: "John",
      lastName: "Doe",
      role: "employee",
    });
  }

  // User related methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === role
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { 
      ...user, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Course related methods
  async getCourse(id: number): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async getCourses(): Promise<Course[]> {
    return Array.from(this.courses.values());
  }

  async getCoursesByInstructor(instructorId: number): Promise<Course[]> {
    return Array.from(this.courses.values()).filter(
      (course) => course.instructorId === instructorId
    );
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const id = this.courseIdCounter++;
    const now = new Date();
    const newCourse: Course = { 
      ...course, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.courses.set(id, newCourse);
    return newCourse;
  }

  async updateCourse(id: number, course: Partial<Course>): Promise<Course | undefined> {
    const existingCourse = this.courses.get(id);
    if (!existingCourse) return undefined;

    const updatedCourse = { 
      ...existingCourse, 
      ...course,
      updatedAt: new Date()
    };
    this.courses.set(id, updatedCourse);
    return updatedCourse;
  }

  async deleteCourse(id: number): Promise<boolean> {
    return this.courses.delete(id);
  }

  // Module related methods
  async getModule(id: number): Promise<Module | undefined> {
    return this.modules.get(id);
  }

  async getModulesByCourse(courseId: number): Promise<Module[]> {
    return Array.from(this.modules.values())
      .filter((module) => module.courseId === courseId)
      .sort((a, b) => a.position - b.position);
  }

  async createModule(module: InsertModule): Promise<Module> {
    const id = this.moduleIdCounter++;
    const newModule: Module = { ...module, id };
    this.modules.set(id, newModule);
    return newModule;
  }

  async updateModule(id: number, module: Partial<Module>): Promise<Module | undefined> {
    const existingModule = this.modules.get(id);
    if (!existingModule) return undefined;

    const updatedModule = { ...existingModule, ...module };
    this.modules.set(id, updatedModule);
    return updatedModule;
  }

  async deleteModule(id: number): Promise<boolean> {
    return this.modules.delete(id);
  }

  // Lesson related methods
  async getLesson(id: number): Promise<Lesson | undefined> {
    return this.lessons.get(id);
  }

  async getLessonsByModule(moduleId: number): Promise<Lesson[]> {
    return Array.from(this.lessons.values())
      .filter((lesson) => lesson.moduleId === moduleId)
      .sort((a, b) => a.position - b.position);
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const id = this.lessonIdCounter++;
    const newLesson: Lesson = { ...lesson, id };
    this.lessons.set(id, newLesson);
    return newLesson;
  }

  async updateLesson(id: number, lesson: Partial<Lesson>): Promise<Lesson | undefined> {
    const existingLesson = this.lessons.get(id);
    if (!existingLesson) return undefined;

    const updatedLesson = { ...existingLesson, ...lesson };
    this.lessons.set(id, updatedLesson);
    return updatedLesson;
  }

  async deleteLesson(id: number): Promise<boolean> {
    return this.lessons.delete(id);
  }

  // Enrollment related methods
  async getEnrollment(id: number): Promise<Enrollment | undefined> {
    return this.enrollments.get(id);
  }

  async getEnrollmentsByUser(userId: number): Promise<Enrollment[]> {
    return Array.from(this.enrollments.values()).filter(
      (enrollment) => enrollment.userId === userId
    );
  }

  async getEnrollmentsByCourse(courseId: number): Promise<Enrollment[]> {
    return Array.from(this.enrollments.values()).filter(
      (enrollment) => enrollment.courseId === courseId
    );
  }

  async createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment> {
    const id = this.enrollmentIdCounter++;
    const now = new Date();
    const newEnrollment: Enrollment = { 
      ...enrollment, 
      id,
      enrolledAt: now,
      progress: 0
    };
    this.enrollments.set(id, newEnrollment);
    return newEnrollment;
  }

  async updateEnrollment(id: number, enrollment: Partial<Enrollment>): Promise<Enrollment | undefined> {
    const existingEnrollment = this.enrollments.get(id);
    if (!existingEnrollment) return undefined;

    const updatedEnrollment = { ...existingEnrollment, ...enrollment };
    this.enrollments.set(id, updatedEnrollment);
    return updatedEnrollment;
  }

  async deleteEnrollment(id: number): Promise<boolean> {
    return this.enrollments.delete(id);
  }

  // Assessment related methods
  async getAssessment(id: number): Promise<Assessment | undefined> {
    return this.assessments.get(id);
  }

  async getAssessmentsByModule(moduleId: number): Promise<Assessment[]> {
    return Array.from(this.assessments.values()).filter(
      (assessment) => assessment.moduleId === moduleId
    );
  }

  async createAssessment(assessment: InsertAssessment): Promise<Assessment> {
    const id = this.assessmentIdCounter++;
    const now = new Date();
    const newAssessment: Assessment = { 
      ...assessment, 
      id,
      createdAt: now
    };
    this.assessments.set(id, newAssessment);
    return newAssessment;
  }

  async updateAssessment(id: number, assessment: Partial<Assessment>): Promise<Assessment | undefined> {
    const existingAssessment = this.assessments.get(id);
    if (!existingAssessment) return undefined;

    const updatedAssessment = { ...existingAssessment, ...assessment };
    this.assessments.set(id, updatedAssessment);
    return updatedAssessment;
  }

  async deleteAssessment(id: number): Promise<boolean> {
    return this.assessments.delete(id);
  }

  // Question related methods
  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async getQuestionsByAssessment(assessmentId: number): Promise<Question[]> {
    return Array.from(this.questions.values())
      .filter((question) => question.assessmentId === assessmentId)
      .sort((a, b) => a.position - b.position);
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const id = this.questionIdCounter++;
    const newQuestion: Question = { ...question, id };
    this.questions.set(id, newQuestion);
    return newQuestion;
  }

  async updateQuestion(id: number, question: Partial<Question>): Promise<Question | undefined> {
    const existingQuestion = this.questions.get(id);
    if (!existingQuestion) return undefined;

    const updatedQuestion = { ...existingQuestion, ...question };
    this.questions.set(id, updatedQuestion);
    return updatedQuestion;
  }

  async deleteQuestion(id: number): Promise<boolean> {
    return this.questions.delete(id);
  }

  // Assessment attempt related methods
  async getAssessmentAttempt(id: number): Promise<AssessmentAttempt | undefined> {
    return this.assessmentAttempts.get(id);
  }

  async getAssessmentAttemptsByUser(userId: number): Promise<AssessmentAttempt[]> {
    return Array.from(this.assessmentAttempts.values()).filter(
      (attempt) => attempt.userId === userId
    );
  }

  async getAssessmentAttemptsByAssessment(assessmentId: number): Promise<AssessmentAttempt[]> {
    return Array.from(this.assessmentAttempts.values()).filter(
      (attempt) => attempt.assessmentId === assessmentId
    );
  }

  async createAssessmentAttempt(attempt: InsertAssessmentAttempt): Promise<AssessmentAttempt> {
    const id = this.assessmentAttemptIdCounter++;
    const now = new Date();
    const newAttempt: AssessmentAttempt = { 
      ...attempt, 
      id,
      startedAt: now,
      status: "in_progress",
      answers: {}
    };
    this.assessmentAttempts.set(id, newAttempt);
    return newAttempt;
  }

  async updateAssessmentAttempt(id: number, attempt: Partial<AssessmentAttempt>): Promise<AssessmentAttempt | undefined> {
    const existingAttempt = this.assessmentAttempts.get(id);
    if (!existingAttempt) return undefined;

    const updatedAttempt = { ...existingAttempt, ...attempt };
    this.assessmentAttempts.set(id, updatedAttempt);
    return updatedAttempt;
  }

  // Group related methods
  async getGroup(id: number): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async getGroups(): Promise<Group[]> {
    return Array.from(this.groups.values());
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const id = this.groupIdCounter++;
    const now = new Date();
    const newGroup: Group = { 
      ...group, 
      id,
      createdAt: now
    };
    this.groups.set(id, newGroup);
    return newGroup;
  }

  async updateGroup(id: number, group: Partial<Group>): Promise<Group | undefined> {
    const existingGroup = this.groups.get(id);
    if (!existingGroup) return undefined;

    const updatedGroup = { ...existingGroup, ...group };
    this.groups.set(id, updatedGroup);
    return updatedGroup;
  }

  async deleteGroup(id: number): Promise<boolean> {
    return this.groups.delete(id);
  }

  // Group member related methods
  async getGroupMember(id: number): Promise<GroupMember | undefined> {
    return this.groupMembers.get(id);
  }

  async getGroupMembersByGroup(groupId: number): Promise<GroupMember[]> {
    return Array.from(this.groupMembers.values()).filter(
      (member) => member.groupId === groupId
    );
  }

  async getGroupMembersByUser(userId: number): Promise<GroupMember[]> {
    return Array.from(this.groupMembers.values()).filter(
      (member) => member.userId === userId
    );
  }

  async createGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const id = this.groupMemberIdCounter++;
    const now = new Date();
    const newMember: GroupMember = { 
      ...member, 
      id,
      addedAt: now
    };
    this.groupMembers.set(id, newMember);
    return newMember;
  }

  async deleteGroupMember(id: number): Promise<boolean> {
    return this.groupMembers.delete(id);
  }

  // Course access related methods
  async getCourseAccess(id: number): Promise<CourseAccess | undefined> {
    return this.courseAccess.get(id);
  }

  async getCourseAccessByCourse(courseId: number): Promise<CourseAccess[]> {
    return Array.from(this.courseAccess.values()).filter(
      (access) => access.courseId === courseId
    );
  }

  async getCourseAccessByUser(userId: number): Promise<CourseAccess[]> {
    return Array.from(this.courseAccess.values()).filter(
      (access) => access.userId === userId
    );
  }

  async getCourseAccessByGroup(groupId: number): Promise<CourseAccess[]> {
    return Array.from(this.courseAccess.values()).filter(
      (access) => access.groupId === groupId
    );
  }

  async createCourseAccess(access: InsertCourseAccess): Promise<CourseAccess> {
    const id = this.courseAccessIdCounter++;
    const now = new Date();
    const newAccess: CourseAccess = { 
      ...access, 
      id,
      grantedAt: now
    };
    this.courseAccess.set(id, newAccess);
    return newAccess;
  }

  async deleteCourseAccess(id: number): Promise<boolean> {
    return this.courseAccess.delete(id);
  }

  // Lesson progress related methods
  async getLessonProgress(id: number): Promise<LessonProgress | undefined> {
    return this.lessonProgress.get(id);
  }

  async getLessonProgressByUser(userId: number): Promise<LessonProgress[]> {
    return Array.from(this.lessonProgress.values()).filter(
      (progress) => progress.userId === userId
    );
  }

  async getLessonProgressByLesson(lessonId: number): Promise<LessonProgress[]> {
    return Array.from(this.lessonProgress.values()).filter(
      (progress) => progress.lessonId === lessonId
    );
  }

  async createLessonProgress(progress: InsertLessonProgress): Promise<LessonProgress> {
    const id = this.lessonProgressIdCounter++;
    const now = new Date();
    const newProgress: LessonProgress = { 
      ...progress, 
      id,
      lastAccessedAt: now
    };
    this.lessonProgress.set(id, newProgress);
    return newProgress;
  }

  async updateLessonProgress(id: number, progress: Partial<LessonProgress>): Promise<LessonProgress | undefined> {
    const existingProgress = this.lessonProgress.get(id);
    if (!existingProgress) return undefined;

    const updatedProgress = { 
      ...existingProgress, 
      ...progress,
      lastAccessedAt: new Date()
    };
    this.lessonProgress.set(id, updatedProgress);
    return updatedProgress;
  }

  // Activity log related methods
  async getActivityLog(id: number): Promise<ActivityLog | undefined> {
    return this.activityLogs.get(id);
  }

  async getActivityLogsByUser(userId: number): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .filter((log) => log.userId === userId)
      .sort((a, b) => {
        if (!b.createdAt || !a.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = this.activityLogIdCounter++;
    const now = new Date();
    const newLog: ActivityLog = { 
      ...log, 
      id,
      createdAt: now
    };
    this.activityLogs.set(id, newLog);
    return newLog;
  }

  // Certificate related methods
  async getCertificate(id: number): Promise<Certificate | undefined> {
    return this.certificates.get(id);
  }

  async getCertificatesByUser(userId: number): Promise<Certificate[]> {
    return Array.from(this.certificates.values()).filter(
      (certificate) => certificate.userId === userId
    );
  }

  async getCertificatesByCourse(courseId: number): Promise<Certificate[]> {
    return Array.from(this.certificates.values()).filter(
      (certificate) => certificate.courseId === courseId
    );
  }

  async createCertificate(certificate: InsertCertificate): Promise<Certificate> {
    const id = this.certificateIdCounter++;
    const now = new Date();
    const newCertificate: Certificate = { 
      ...certificate, 
      id,
      issueDate: now
    };
    this.certificates.set(id, newCertificate);
    return newCertificate;
  }
}

export const storage = new MemStorage();
