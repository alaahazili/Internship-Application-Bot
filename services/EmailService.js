const nodemailer = require('nodemailer');
const { google } = require('googleapis');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    async sendVerificationEmail(email, name, token) {
        const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Verify your email - Internship Bot',
            html: `<p>Hi ${name},</p>
                   <p>Thank you for registering. Please verify your email by clicking the link below:</p>
                   <a href="${url}">${url}</a>
                   <p>This link will expire in 24 hours.</p>`
        };
        return this.transporter.sendMail(mailOptions);
    }

    async sendPasswordResetEmail(email, name, token) {
        const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Reset your password - Internship Bot',
            html: `<p>Hi ${name},</p>
                   <p>You requested a password reset. Click the link below to reset your password:</p>
                   <a href="${url}">${url}</a>
                   <p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>`
        };
        return this.transporter.sendMail(mailOptions);
    }

    async sendNotificationEmail(email, subject, html) {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject,
            html
        };
        return this.transporter.sendMail(mailOptions);
    }

    async sendWeeklyDigest() {
        // Placeholder: implement weekly digest logic
        // Fetch users, compile jobs, and send summary emails
    }
}

module.exports = EmailService; 