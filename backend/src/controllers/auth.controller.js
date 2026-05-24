import userModel from "../model/user.model.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/mail.service.js";

// Utility for URL generation
const getUrlPrefix = (req) => {
    return `${req.protocol}://${req.get("host")}`;
};

export async function register(req, res) {
    try {
        const { username, email, password } = req.body;
        const isUserAlreadyExists = await userModel.findOne({ $or: [{ email }, { username }] });

        if (isUserAlreadyExists) {
            return res.status(400).json({ message: "User with this email or username already exists", success: false });
        }

        // We create the user with verified: false. This is standard to allow verification links to work.
        const user = await userModel.create({ username, email, password, verified: true });

        const emailVerificationToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // POINT TO FRONTEND: This ensures users see a beautiful React page, not a raw backend string.
        const verificationUrl = `${getUrlPrefix(req)}/verify?token=${emailVerificationToken}`;

        // PROFESSIONAL EMAIL TEMPLATE (Gmail-friendly)
        await sendEmail({
            to: email,
            subject: "Verify your email - COROS",
            html: `
            <div style="background-color: #f9fafb; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="padding: 40px 48px;">
                            <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 24px; color: #000000; letter-spacing: -0.02em;">Welcome to COROS</h1>
                            <p style="font-size: 16px; line-height: 24px; margin: 0 0 32px; color: #4b5563;">
                                Hi ${username},<br><br>
                                Thank you for choosing COROS. To finalize your account setup and unlock your discovery workspace, please confirm your email address below.
                            </p>
                            <div style="text-align: center; margin-bottom: 32px;">
                                <a href="${verificationUrl}" style="background-color: #000000; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">Verify Email Address</a>
                            </div>
                            <p style="font-size: 14px; line-height: 20px; margin: 0; color: #6b7280; font-style: italic;">
                                If you didn't create an account, you can safely ignore this email. This link will expire in 1 hour.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f3f4f6; padding: 24px 48px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="font-size: 12px; color: #9ca3af; margin: 0;">&copy; 2026 COROS. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </div>`,
            text: `Welcome to COROS, ${username}! Click here to verify your account: ${verificationUrl}`
        });

        res.status(201).json({ message: "Check email for verification link.", success: true });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ message: "Registration failed", success: false });
    }
}

export async function verifyEmail(req, res) {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ success: false, message: "Token is required" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findOne({ email: decoded.email });

        if (!user) return res.status(400).json({ success: false, message: "Verification failed" });

        user.verified = true;
        await user.save();

        res.status(200).json({ success: true, message: "Account successfully verified" });
    } catch (err) {
        res.status(400).json({ success: false, message: "Link expired or invalid" });
    }
}

export async function loginUser(req, res) {
    try {
        const { email, password } = req.body;
        console.log("Login attempt for:", email);

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password", success: false });
        }

        if (!user.verified && !user.googleId) {
            return res.status(403).json({ message: "Please verify your email before logging in", success: false });
        }

        if (user.googleId && !user.password) {
            return res.status(400).json({ message: "Please login with Google", success: false });
        }

        const ispasswordMatched = await user.comparepassword(password);
        if (!ispasswordMatched) {
            return res.status(401).json({ message: "Invalid email or password", success: false });
        }

        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET);
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(200).json({ success: true, user: { id: user._id, username: user.username, email: user.email } });
    } catch (err) {
        res.status(500).json({ message: "Server error during login", success: false });
    }
}

export async function forgotPassword(req, res) {
    const { email } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found", success: false });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
        to: email,
        subject: "COROS - Password Reset OTP",
        html: `
        <div style="background-color:#f9fafb;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
                <tr><td style="padding:40px 48px;">
                    <h1 style="font-size:22px;font-weight:800;margin:0 0 16px;color:#000;">Password Reset</h1>
                    <p style="font-size:15px;color:#4b5563;margin:0 0 24px;">Use the OTP below to reset your COROS password. It expires in <strong>10 minutes</strong>.</p>
                    <div style="background:#f3f4f6;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
                        <p style="font-size:36px;font-weight:900;letter-spacing:0.3em;color:#000;margin:0;">${otp}</p>
                    </div>
                    <p style="font-size:13px;color:#9ca3af;margin:0;">If you didn't request this, you can safely ignore this email.</p>
                </td></tr>
                <tr><td style="background:#f3f4f6;padding:20px 48px;text-align:center;border-top:1px solid #e5e7eb;">
                    <p style="font-size:12px;color:#9ca3af;margin:0;">&copy; 2026 COROS. All rights reserved.</p>
                </td></tr>
            </table>
        </div>`
    });
    res.status(200).json({ message: "OTP sent", success: true });
}

export async function resetPassword(req, res) {
    const { email, otp, newPassword } = req.body;
    const user = await userModel.findOne({ email, otp, otpExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: "Invalid/Expired OTP", success: false });

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    res.status(200).json({ message: "Password reset", success: true });
}

export function logout(req, res) {
    res.clearCookie("token");
    res.status(200).json({ message: "Logged out", success: true });
}

export async function getMe(req, res) {
    if (!req.user || !req.user.id) return res.status(401).json({ success: false });
    const user = await userModel.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "Not found", success: false });
    res.status(200).json({ success: true, user });
}