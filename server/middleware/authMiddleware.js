import User from "../models/User.js";
import { getAuth } from "@clerk/express";

// Middleware to check if user is authenticated
export const protect = async (req, res, next) => {
    try {
        const { userId } = getAuth(req);

        console.log("Clerk userId:", userId);

        if (!userId) {
            return res.json({
                success: false,
                message: "not authenticated"
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.json({
                success: false,
                message: "User not found in database"
            });
        }

        req.user = user;

        next();

    } catch (error) {
        console.log("Auth middleware error:", error.message);

        return res.json({
            success: false,
            message: error.message
        });
    }
};