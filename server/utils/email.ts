import nodemailer from "nodemailer";

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendWelcomeEmail(
  email: string,
  username: string,
  password: string,
  role: string
) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Welcome to Learning Management System",
    html: `
      <h1>Welcome to LMS!</h1>
      <p>Hello ${username},</p>
      <p>An administrator has created an account for you with the following details:</p>
      <ul>
        <li>Username: ${username}</li>
        <li>Role: ${role}</li>
        <li>Temporary Password: ${password}</li>
      </ul>
      <p>Please login and change your password immediately for security purposes.</p>
      <p>Best regards,<br>LMS Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Welcome email sent successfully to:", email);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
}

export async function sendApproveEmail(
  email: string,
  username: string,
  password: string,
  role: string
) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Welcome to Learning Management System - Account Approved",
    html: `
      <h1>Welcome to LMS!</h1>
      <p>Hello ${username},</p>
      <p>Your account has been approved! You can now login with the following credentials:</p>
      <ul>
        <li>Email: ${email}</li>
        <li>Role: ${role}</li>
        <li>Password: ${password}</li>
      </ul>
      <p>Please login and change your password immediately for security purposes.</p>
      <p>Best regards,<br>LMS Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Approval email sent successfully to:", email);
  } catch (error) {
    console.error("Error sending approval email:", error);
    throw error;
  }
}

export async function sendRejectionEmail(email: string, username: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Learning Management System - Account Request Rejected",
    html: `
      <h1>Account Request Status</h1>
      <p>Hello ${username},</p>
      <p>We regret to inform you that your account request has been rejected by the administrator.</p>
      <p>If you believe this is a mistake, please contact support.</p>
      <p>Best regards,<br>LMS Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Rejection email sent successfully to:", email);
  } catch (error) {
    console.error("Error sending rejection email:", error);
    throw error;
  }
}
