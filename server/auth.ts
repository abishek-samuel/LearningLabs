import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage"; // Ensure this imports the PrismaStorage instance
import type { User } from ".prisma/client"; // Import User type from Prisma
// Zod is still useful for API input validation, but insertUserSchema is gone from storage.ts
// We might redefine validation schemas here or in routes.ts later.
// import { z } from "zod";
// Define the Prisma User type alias to avoid naming conflict in the global scope
import type { User as PrismaUser } from ".prisma/client";
import { sendPasswordResetEmail, sendWelcomeEmail } from "./utils/email";

declare global {
  namespace Express {
    // Augment Express.User with the Prisma User type
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends PrismaUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(
  supplied: string,
  stored: string
): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function setupAuth(app: Express): Promise<void> {
  const sessionSecret = process.env.SESSION_SECRET || "your-secret-key";

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          if (user.status !== "active") {
            return done(null, false, {
              message: "Account is not active. Please contact support.",
            });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Auth Routes
  app.post("/api/register", async (req, res, next) => {
    try {
      // TODO: Add validation here (e.g., using Zod) if desired
      const {
        username,
        email,
        password,
        firstName,
        lastName,
        role,
        profilePicture,
      } = req.body;

      // Basic checks (replace with robust validation)
      if (!username || !email || !password) {
        return res
          .status(400)
          .json({ message: "Username, email, and password are required" });
      }

      // Check if user with the same email or username already exists
      const existingEmailUser = await storage.getUserByEmail(email);
      if (existingEmailUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const existingUsernameUser = await storage.getUserByUsername(username);
      if (existingUsernameUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        firstName: firstName || null, // Handle optional fields
        lastName: lastName || null,
        role: role || "employee", // Default role if not provided
        profilePicture: profilePicture || null,
        status: "active",
      });

      // Send welcome email if created by admin
      try {
        await sendWelcomeEmail(email, username, password, role || "employee");
      } catch (error) {
        console.error("Failed to send welcome email:", error);
        // Continue with user creation even if email fails
      }
      return res.status(200).json({ message: "User Created Successfully" });
    } catch (error) {
      // if (error instanceof z.ZodError) { // Re-enable if using Zod validation
      //   return res.status(400).json({
      //     message: "Validation failed",
      //     errors: error.errors
      //   });
      // }
      // next(error);
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    // Add types to the callback parameters
    passport.authenticate(
      "local",
      (
        err: Error | null,
        user: PrismaUser | false | null,
        info?: { message: string }
      ) => {
        if (err) return next(err);
        if (!user) {
          return res
            .status(401)
            .json({ message: info?.message || "Invalid credentials" });
        }

        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);

          // Remove password from response
          const { password, ...userWithoutPassword } = user;
          return res.json(userWithoutPassword);
        });
      }
    )(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });

  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);

      if (user) {
        // Generate secure random 6-character password
        const newPassword = generateRandomPassword(6);

        // Hash the password
        const hashedPassword = await hashPassword(newPassword);
        // Update the user's password
        await storage.updateUser(user.id, {
          password: hashedPassword,
        });
        await sendPasswordResetEmail(user.email, user.username, newPassword);
      }

      return res.json({
        success: true,
        message:
          "If an account with that email exists, a new password has been sent.",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "An error occurred" });
    }
  });

  // Place this function above your route
  function generateRandomPassword(length = 6) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      password += chars[randomIndex];
    }
    return password;
  }

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { email, username, firstName, lastName, password, profilePicture } =
        req.body;

      const existingEmailUser = await storage.getUserByEmail(email);
      const existingUsernameUser = await storage.getUserByUsername(username);

      if (existingEmailUser || existingUsernameUser) {
        return res.json({
          success: false,
          message: "Email or Username already registered! Please sign in.",
        });
      }

      const newUser = await storage.createUser({
        email,
        username,
        password: "",
        firstName,
        lastName,
        status: "draft",
        role: "employee",
        profilePicture: profilePicture || null,
      });

      return res.json({ success: true, user: newUser });
    } catch (error) {
      console.error("Error saving Google user:", error);
      res.status(500).json({ error: "Something went wrong!" });
    }
  });
}

export { hashPassword, comparePasswords };
