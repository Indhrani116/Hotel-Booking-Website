import transporter from "../configs/nodemailer.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import Stripe from "stripe";

// Function to check availability of a room
const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {
    try {
        const bookings = await Booking.find({
            room,
            checkInDate: { $lte: checkOutDate },
            checkOutDate: { $gte: checkInDate },
        });

        return bookings.length === 0;
    } catch (error) {
        console.error(error.message);
        return false;
    }
};


// API to check availability of room
// POST /api/bookings/check-availability
export const checkAvailabilityAPI = async (req, res) => {
    try {
        const { room, checkInDate, checkOutDate } = req.body;

        const isAvailable = await checkAvailability({
            checkInDate,
            checkOutDate,
            room
        });

        res.json({
            success: true,
            isAvailable
        });

    } catch (error) {
        console.error(error);

        res.json({
            success: false,
            message: error.message
        });
    }
};


// API to create a new booking
// POST /api/bookings/book
export const createbooking = async (req, res) => {
    try {
        const {
            room,
            checkInDate,
            checkOutDate,
            guests
        } = req.body;

       
        const user = req.user._id;

        if (!checkInDate || !checkOutDate || !guests) {
    return res.status(400).json({
        success: false,
        message: "Check-in date, check-out date and guests are required"
    });
}

        // Check availability before booking
        const isAvailable = await checkAvailability({
            checkInDate,
            checkOutDate,
            room
        });

        if (!isAvailable) {
            return res.json({
                success: false,
                message: "Room is not available"
            });
        }

        // Get room details
        const roomData = await Room.findById(room).populate("hotel");

        if (!roomData) {
            return res.json({
                success: false,
                message: "Room not found"
            });
        }

        // Calculate total price
        let totalPrice = roomData.pricePerNight;

        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);

        const timeDiff = checkOut.getTime() - checkIn.getTime();

        const nights = Math.ceil(
            timeDiff / (1000 * 3600 * 24)
        );

        totalPrice *= nights;

        // Create booking
// Create booking
const booking = await Booking.create({
    user,
    room,
    hotel: roomData.hotel._id,
    guests: Number(guests),
    checkInDate,
    checkOutDate,
    totalPrice
});

console.log("Booking created:", booking._id);

// Email details
const mailOptions = {
    from: process.env.SENDER_EMAIL,
    to: req.user.email,
    subject: 'Hotel Booking Confirmation',

    html: `
        <h2>Your Booking is Confirmed!</h2>

        <p>Dear ${req.user.username || "Guest"},</p>

        <p>
            Thank you for your booking! Here are your booking details:
        </p>

        <ul>
            <li>
                <strong>Booking ID:</strong>
                ${booking._id}
            </li>

            <li>
                <strong>Hotel Name:</strong>
                ${roomData.hotel.name}
            </li>

            <li>
                <strong>Location:</strong>
                ${roomData.hotel.address}
            </li>

            <li>
                <strong>Check-In:</strong>
                ${new Date(booking.checkInDate).toDateString()}
            </li>

            <li>
                <strong>Check-Out:</strong>
                ${new Date(booking.checkOutDate).toDateString()}
            </li>

            <li>
                <strong>Guests:</strong>
                ${booking.guests}
            </li>

            <li>
                <strong>Booking Amount:</strong>
                ${process.env.CURRENCY || '$'} ${booking.totalPrice} /night
            </li>
        </ul>

        <p>
            We look forward to welcoming you!
        </p>

        <p>
            If you need to make any changes, feel free to contact us.
        </p>
    `
};

try {
    await transporter.sendMail(mailOptions);
    console.log("Confirmation email sent successfully!");
} catch (emailError) {
    console.error("EMAIL ERROR:", emailError);
}

        res.json({
            success: true,
            message: "Booking created successfully"
        });

    } catch (error) {
        console.error(error);

        res.json({
            success: false,
            message: "Failed to create booking"
        });
    }
};


// API to get all bookings for a user
// GET /api/bookings/user
export const getUserBookings = async (req, res) => {
    try {
        const user = req.user._id;

        const bookings = await Booking.find({ user })
            .populate("room hotel")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            bookings
        });

    } catch (error) {
        console.error(error);

        res.json({
            success: false,
            message: "Failed to fetch bookings"
        });
    }
};


// API to get all bookings for hotel
// GET /api/bookings/hotel
export const getHotelBookings = async (req, res) => {
    try {
        // Logged-in hotel owner's Clerk ID
        const ownerId = req.user._id;

        console.log("Dashboard owner ID:", ownerId);

        // Find hotel belonging to this owner
        const hotel = await Hotel.findOne({
            owner: ownerId
        });

        console.log("Hotel found:", hotel);

        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: "No hotel found for this owner"
            });
        }

        // Find all bookings for this hotel
        const bookings = await Booking.find({
            hotel: hotel._id
        })
            .populate("user")
            .populate("room")
            .populate("hotel")
            .sort({ createdAt: -1 });

        console.log("Hotel bookings:", bookings);

        // Total number of bookings
        const totalBookings = bookings.length;

        // Total revenue
        const totalRevenue = bookings.reduce(
            (total, booking) => total + Number(booking.totalPrice || 0),
            0
        );

        console.log("Total bookings:", totalBookings);
        console.log("Total revenue:", totalRevenue);

        res.json({
            success: true,
            dashboardData: {
                bookings,
                totalBookings,
                totalRevenue
            }
        });

    } catch (error) {
        console.error("GET HOTEL BOOKINGS ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const stripePayment = async (req, res) => {
    try {
        const { bookingId } = req.body;

        console.log("Stripe payment request:", bookingId);
        console.log(
            "Stripe key exists:",
            !!process.env.STRIPE_SECRET_KEY
        );

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required"
            });
        }

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const roomData = await Room.findById(booking.room)
            .populate("hotel");

        if (!roomData) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        if (!roomData.hotel) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found"
            });
        }

        const totalPrice = Number(booking.totalPrice);

        if (!totalPrice || totalPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking amount"
            });
        }

        const { origin } = req.headers;

        console.log("Frontend origin:", origin);
        console.log("Booking amount:", totalPrice);

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({
                success: false,
                message: "Stripe secret key is missing"
            });
        }

        if (!origin) {
            return res.status(400).json({
                success: false,
                message: "Frontend origin is missing"
            });
        }

        const stripeInstance = new Stripe(
            process.env.STRIPE_SECRET_KEY
        );

        const line_items = [
            {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: roomData.hotel.name,
                    },
                    unit_amount: Math.round(totalPrice * 100),
                },
                quantity: 1,
            }
        ];

        const session =
            await stripeInstance.checkout.sessions.create({
                line_items,
                mode: "payment",
                success_url: `${origin}/my-bookings`,
                cancel_url: `${origin}/my-bookings`,
                metadata: {
                    bookingId: bookingId.toString(),
                },
            });

        console.log("Stripe session created:", session.id);
        console.log("Stripe URL:", session.url);

        return res.json({
            success: true,
            url: session.url
        });

    } catch (error) {

        console.error("========== STRIPE ERROR ==========");
        console.error(error);
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        console.error("Type:", error.type);
        console.error("==================================");

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};