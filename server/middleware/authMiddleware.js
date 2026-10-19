import User from "../models/User.js";
import { getAuth } from "@clerk/express";

export const protect = async (req, res, next) => {
    try {
        const { userId, isAuthenticated } = getAuth(req);

        

        if (!isAuthenticated || !userId) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated"
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found in database"
            });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error("Authentication middleware failed:", error.name);

        return res.status(500).json({
            success: false,
            message: "Unable to authenticate this request"
        });
    }
};