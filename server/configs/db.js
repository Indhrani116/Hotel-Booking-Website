import mongoose from "mongoose";

const connectDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            console.log("Database already connected");
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: "hotel-booking",
            serverSelectionTimeoutMS: 10000,
        });

        console.log("Database Connected");

    } catch (error) {
        console.error("MongoDB connection failed:", error.name);
        throw error;
    }
};

export default connectDB;