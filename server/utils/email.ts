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
    from: process.env.SMTP_FROM || "your-email@example.com",
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
