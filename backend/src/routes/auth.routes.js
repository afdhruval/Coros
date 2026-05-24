import { Router } from "express";
import {
    register,
    verifyEmail,
    loginUser,
    getMe,
    forgotPassword,
    resetPassword,
    logout,
} from "../controllers/auth.controller.js";

import { registerValidate } from "../validator/reg.validate.js";
import { authUser } from "../middlewares/auth.middleware.js";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";

const authRouter = Router();

authRouter.post("/register", registerValidate, register);
authRouter.get("/verify", verifyEmail);
authRouter.post("/login", loginUser);
authRouter.get("/getme", authUser, getMe);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);
authRouter.get("/logout", logout);

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------
authRouter.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

authRouter.get(
    "/google/callback",
    passport.authenticate("google", {
        // On failure send the user back to /login (relative — works on any domain)
        failureRedirect: "/login",
    }),
    (req, res) => {
        // Sign a JWT for the authenticated Google user
        const token = jwt.sign(
            { id: req.user._id, username: req.user.username },
            process.env.JWT_SECRET
        );

        // Set the token as an httpOnly cookie
        res.cookie("token", token, {
            httpOnly: true,
            // secure must be true in production (HTTPS).  The ALB terminates TLS,
            // so set  trust proxy  if you need req.secure to be true inside Express.
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        // Redirect to the React SPA root — relative path, works on any domain
        res.redirect("/");
    }
);

export default authRouter;