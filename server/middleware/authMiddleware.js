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
        const userCount = await User.countDocuments();
const firstUser = await User.findOne().select("_id email username");

console.log("Total users in this database:", userCount);
console.log("First user in database:", firstUser);


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