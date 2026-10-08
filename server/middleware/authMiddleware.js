import User from "../models/User.js";
import { getAuth } from "@clerk/express";

export const protect = async (req, res, next) => {
    try {
        const { userId, isAuthenticated } = getAuth(req);

        console.log("========== AUTH DEBUG ==========");
        console.log("Authenticated:", isAuthenticated);
        console.log("Clerk userId:", userId);
        console.log("MongoDB database:", User.db.name);
        console.log("MongoDB state:", User.db.readyState);

        if (!isAuthenticated || !userId) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated"
            });
        }

        const user = await User.findById(userId);

        console.log(
            "MongoDB user:",
            user ? user._id : "NOT FOUND"
        );

        console.log("================================");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found in database"
            });
        }

        req.user = user;

        next();

    } catch (error) {
        console.error("AUTH MIDDLEWARE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};