import {v2 as cloudinary} from "cloudinary";
import { unlink } from "node:fs/promises";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";


// API to create a new room for a hotel
export const createRooms = async (req, res) => {
    try {
        const { roomType, pricePerNight, amenities } = req.body;
        const price = Number(pricePerNight);

        if (
            !roomType ||
            !Number.isFinite(price) ||
            price <= 0 ||
            !Array.isArray(req.files) ||
            req.files.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Room type, a positive price, and at least one image are required"
            });
        }

        let parsedAmenities;
        try {
            parsedAmenities = JSON.parse(amenities);
        } catch {
            return res.status(400).json({
                success: false,
                message: "Amenities must be valid JSON"
            });
        }

        if (!Array.isArray(parsedAmenities) || parsedAmenities.some(item => typeof item !== "string")) {
            return res.status(400).json({
                success: false,
                message: "Amenities must be a list of names"
            });
        }

        const hotel = await Hotel.findOne({ owner: req.user._id });
        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: "No hotel found for this user"
            });
        }

        const images = await Promise.all(
            req.files.map(async file => {
                const result = await cloudinary.uploader.upload(file.path);
                return result.secure_url;
            })
        );

        await Room.create({
            hotel: hotel._id,
            roomType,
            pricePerNight: price,
            amenities: parsedAmenities,
            images
        });

        return res.json({
            success: true,
            message: "Room created successfully"
        });
    } catch (error) {
        console.error("Room creation failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to create room"
        });
    } finally {
        await Promise.allSettled(
            (req.files || []).map(file => unlink(file.path))
        );
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
        res.status(500).json({success:false,message:"Unable to fetch rooms"});
    }
    
}

//API to get all rooms for a specific hotel
export const getOwnerRooms = async(req,res )=>{
    try {
        const hotelData=await Hotel.findOne({owner: req.user._id})
        if (!hotelData) {
            return res.status(404).json({
                success: false,
                message: "No hotel found for this user"
            });
        }

        const rooms= await Room.find({hotel: hotelData._id}).populate("hotel");
        res.json({success:true,rooms});
    } catch (error) {
         res.status(500).json({success:false,message:"Unable to fetch rooms"});
    }
}

//API to toggle availability of a room
export const toggleRoomAvailability = async(req,res )=>{
    try {
        const {roomId} =req.body;
        if (!roomId) {
            return res.status(400).json({success:false,message:"Room ID is required"});
        }

        const hotel = await Hotel.findOne({owner: req.user._id});
        if (!hotel) {
            return res.status(404).json({success:false,message:"No hotel found for this user"});
        }

        const roomData = await Room.findOne({_id: roomId, hotel: hotel._id});
        if (!roomData) {
            return res.status(404).json({success:false,message:"Room not found for this hotel"});
        }

        roomData.isAvailable=!roomData.isAvailable;
        await roomData.save();
        res.json({success: true,message:"Room availability Updated"});
    } catch (error) {
       res.status(500).json({success:false,message:"Unable to update room availability"});
    }
}