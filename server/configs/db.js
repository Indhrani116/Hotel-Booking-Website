import mongoose from "mongoose";

let isConnected = false;

const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }

    try {
        const connection = await mongoose.connect(
            process.env.MONGODB_URI,
            {
                dbName: "hotel-booking",
                serverSelectionTimeoutMS: 5000,
            }
        );

        isConnected = connection.connection.readyState === 1;

        console.log("MongoDB Connected Successfully");

    } catch (error) {
        isConnected = false;

        console.error(
            "MongoDB Connection Error:",
            error.message
        );

        throw error;
    }
};

export default connectDB;