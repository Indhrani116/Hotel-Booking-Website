import {v2 as cloudinary} from "cloudinary";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";


// API to create a new room for a hotel
export const createRooms = async (req, res) => {
    try {
        const { roomType, pricePerNight, amenities } = req.body;

        console.log("BODY:", req.body);
        console.log("FILES:", req.files);
        console.log("USER:", req.user?._id);

        // Find hotel belonging to logged-in user
        const hotel = await Hotel.findOne({
            owner: req.user._id
        });

        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: "No Hotel found for this user"
            });
        }

        // Upload images to Cloudinary
        const uploadImages = req.files.map(async (file) => {
            try {
    const response = await cloudinary.uploader.upload(file.path);
    return response.secure_url;
} catch (error) {
    console.error("CLOUDINARY ERROR:");
    console.error("Message:", error.message);
    console.error("HTTP Code:", error.http_code);
    console.error("Full Error:", error);

    throw error;
}
        });

        const images = await Promise.all(uploadImages);

        // Convert amenities JSON string into array
        const parsedAmenities = JSON.parse(amenities);

        // Create room
        await Room.create({
            hotel: hotel._id,
            roomType,
            pricePerNight: Number(pricePerNight),
            amenities: parsedAmenities,
            images
        });

        res.json({
            success: true,
            message: "Room created successfully"
        });

    } catch (error) {
        console.error("CREATE ROOM ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
//API to get all rooms
export const getRooms = async(req,res )=>{
    try {
        const rooms=await Room.find({isAvailable:true}).populate({
            path:'hotel',
            populate:{
                path:'owner',
                select:'image'
            }
        }).sort({createdAt:-1})
        res.json({success:true,rooms});
    } catch (error) {
        res.json({success:false,message:error.message});
    }
    
}

//API to get all rooms for a specific hotel
export const getOwnerRooms = async(req,res )=>{
    try {
        const hotelData=await Hotel.findOne({owner: req.user._id})
        const rooms= await Room.find({hotel: hotelData._id}).populate("hotel");
        res.json({success:true,rooms});
    } catch (error) {
         res.json({success:false,message:error.message});
    }
}

//API to toggle availability of a room
export const toggleRoomAvailability = async(req,res )=>{
    try {
        const {roomId} =req.body;
        const roomData = await Room.findById(roomId);
        roomData.isAvailable=!roomData.isAvailable;
        await roomData.save();
        res.json({success: true,message:"Room availability Updated"});
    } catch (error) {
       res.json({success:false,message:error.message}); 
    }
}