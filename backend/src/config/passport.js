import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import userModel from "../model/user.model.js";
import dotenv from "dotenv";

dotenv.config();

// ---------------------------------------------------------------------------
// Google OAuth Strategy
// ---------------------------------------------------------------------------
// callbackURL must match exactly what is registered in the Google Cloud Console.
// We read it from the environment so there is NEVER a hardcoded URL in source
// code.  Set this env var to:
//   • Development : http://localhost:3000/auth/google/callback
//   • Production  : http://<your-domain>/auth/google/callback   (no port if 80/443)
// ---------------------------------------------------------------------------
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            proxy: true,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await userModel.findOne({ googleId: profile.id });

                if (!user) {
                    user = await userModel.findOne({
                        email: profile.emails[0].value,
                    });

                    if (user) {
                        // Existing email-password user — link Google account
                        user.googleId = profile.id;
                        user.verified = true;
                        await user.save();
                    } else {
                        // Brand-new user via Google
                        user = await userModel.create({
                            username:
                                profile.displayName
                                    .replace(/\s+/g, "")
                                    .toLowerCase() +
                                Math.floor(Math.random() * 1000),
                            email: profile.emails[0].value,
                            googleId: profile.id,
                            verified: true,
                        });
                    }
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await userModel.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

export default passport;
