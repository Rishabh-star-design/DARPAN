
import { getAuth } from "firebase-admin/auth";
import { randomUUID } from "node:crypto";
import { app } from "../config/firebase.js";
import User from "../models/user.model.js";
import redis from "../../../shared/redis/redis.js";

// LOGIN
export const login = async (req, res) => {
    try {
        const { token } = req.body;

        // Validate Firebase token
        if (!token) {
            return res.status(400).json({
                message: "Firebase authentication token is missing"
            });
        }

        // Verify Firebase ID token
        const decoded = await getAuth(app).verifyIdToken(token);

        if (!decoded.uid) {
            return res.status(401).json({
                message: "Invalid Firebase authentication token"
            });
        }

        // Find existing user
        let user = await User.findOne({
            firebaseUid: decoded.uid
        });

        // Create new user if not found
        if (!user) {
            user = await User.create({
                firebaseUid: decoded.uid,
                name: decoded.name || "User",
                email: decoded.email,
                avatar: decoded.picture || ""
            });
        }

        // Generate session
        const sessionId = randomUUID();

        const sessionData = {
            userId: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            plan: user.plan,
            credits: user.credits,
            totalCredits: user.totalCredits,
            planExpiresAt: user.planExpiresAt
        };

        const expiry = 7 * 24 * 60 * 60;

        await redis.set(
            `user-session-${user._id}`,
            sessionId,
            "EX",
            expiry
        );

        await redis.set(
            `session-${sessionId}`,
            JSON.stringify(sessionData),
            "EX",
            expiry
        );

        // Set session cookie
        res.cookie("session", sessionId, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: expiry * 1000,
            path: "/"
        });

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
};


// LOGOUT
export const logOut = async (req, res) => {
    try {
        const sessionId = req.cookies?.session;

        if (sessionId) {
            await redis.del(`session-${sessionId}`);
        }

        res.clearCookie("session", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/"
        });

        return res.status(200).json({
            message: "Logout successful"
        });

    } catch (error) {
        console.error("LOGOUT ERROR:", error);

        return res.status(500).json({
            message: "Logout failed"
        });
    }
};


// UPDATE USER PAYMENT
export const updateUserPayment = async (req, res) => {
    try {
        const { plan, credits, userId } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        user.plan = plan;
        user.credits += credits;
        user.totalCredits += credits;
        user.planExpiresAt = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
        );

        await user.save();

        const sessionId = await redis.get(
            `user-session-${user._id}`
        );

        if (sessionId) {
            const sessionData = {
                userId: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                plan: user.plan,
                credits: user.credits,
                totalCredits: user.totalCredits,
                planExpiresAt: user.planExpiresAt
            };

            await redis.set(
                `session-${sessionId}`,
                JSON.stringify(sessionData),
                "EX",
                7 * 24 * 60 * 60
            );
        }

        return res.status(200).json({
            success: true
        });

    } catch (error) {
        console.error("UPDATE PAYMENT ERROR:", error);

        return res.status(500).json({
            message: "Unable to update payment"
        });
    }
};


// DEDUCT CREDITS
export const deductCredits = async (req, res) => {
    try {
        const { userId, agent } = req.body;

        const COST = {
            chat: 1,
            search: 5,
            coding: 10,
            pdf: 10,
            ppt: 10,
            vision: 10
        };

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const requiredCredits = COST[agent] || 1;

        if (user.credits < requiredCredits) {
            return res.status(400).json({
                message: "Not enough credits"
            });
        }

        user.credits -= requiredCredits;
        await user.save();

        const sessionId = await redis.get(
            `user-session-${user._id}`
        );

        if (sessionId) {
            const sessionData = {
                userId: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                plan: user.plan,
                credits: user.credits,
                totalCredits: user.totalCredits,
                planExpiresAt: user.planExpiresAt
            };

            await redis.set(
                `session-${sessionId}`,
                JSON.stringify(sessionData),
                "EX",
                7 * 24 * 60 * 60
            );
        }

        return res.status(200).json({
            success: true,
            credits: user.credits
        });

    } catch (error) {
        console.error("DEDUCT CREDITS ERROR:", error);

        return res.status(500).json({
            message: "Unable to deduct credits"
        });
    }
};
