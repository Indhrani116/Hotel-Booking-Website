import Hotel from "../models/Hotel.js";
import User from "../models/User.js";

export const registerHotel = async (req, res) => {
    try {
        const { name, address, contact, city } = req.body;

        const owner = req.user._id;

        // Check if the user has already registered a hotel
        const existingHotel = await Hotel.findOne({ owner });

        if (existingHotel) {
            // Make sure the user's role is hotelOwner
            await User.findByIdAndUpdate(owner, {
                role: "hotelOwner"
            });

            return res.json({
                success: true,
                message: "Hotel already registered",
                hotel: existingHotel
            });
        }

        // Create new hotel
        const hotel = await Hotel.create({
            name,
            address,
            contact,
            city,
            owner
        });

        // Change user's role to hotelOwner
        await User.findByIdAndUpdate(owner, {
            role: "hotelOwner"
        });

        res.json({
            success: true,
            message: "Hotel Registered Successfully",
            hotel
        });

    } catch (error) {
        console.error("Register hotel error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};