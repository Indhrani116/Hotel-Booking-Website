import transporter from "../configs/nodemailer.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import Stripe from "stripe";

const isValidDateOnly = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isValidDateRange = (checkInDate, checkOutDate) =>
    isValidDateOnly(checkInDate) &&
    isValidDateOnly(checkOutDate) &&
    checkInDate < checkOutDate;

const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);

// Function to check availability of a room
const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {
    const roomData = await Room.findById(room).select("isAvailable").lean();
    if (!roomData?.isAvailable) return false;

    const overlappingBooking = await Booking.exists({
        room,
        status: { $ne: "cancelled" },
        checkInDate: { $lt: checkOutDate },
        checkOutDate: { $gt: checkInDate }
    });

    return !overlappingBooking;
};


// API to check availability of room
// POST /api/bookings/check-availability
export const checkAvailabilityAPI = async (req, res) => {
    try {
        const { room, checkInDate, checkOutDate } = req.body;

        if (!room || !isValidDateRange(checkInDate, checkOutDate)) {
            return res.status(400).json({
                success: false,
                message: "A room and valid check-in/check-out dates are required"
            });
        }

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
        console.error("Availability check failed:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to check room availability"
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
        const guestCount = Number(guests);

        if (
            !room ||
            !isValidDateRange(checkInDate, checkOutDate) ||
            !Number.isInteger(guestCount) ||
            guestCount < 1
        ) {
            return res.status(400).json({
                success: false,
                message: "Room, valid stay dates, and a positive whole-number guest count are required"
            });
        }

        const roomData = await Room.findById(room).populate("hotel");
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

        // Check availability before booking
        const isAvailable = await checkAvailability({
            checkInDate,
            checkOutDate,
            room
        });

        if (!isAvailable) {
            return res.status(409).json({
                success: false,
                message: "Room is not available"
            });
        }

        const nights =
            (Date.parse(`${checkOutDate}T00:00:00.000Z`) -
                Date.parse(`${checkInDate}T00:00:00.000Z`)) /
            (1000 * 60 * 60 * 24);
        const totalPrice = Number(roomData.pricePerNight) * nights;

        if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: "Room price is invalid"
            });
        }

const booking = await Booking.create({
    user,
    room,
    hotel: roomData.hotel._id,
    guests: guestCount,
    checkInDate,
    checkOutDate,
    totalPrice
});

// Email details
const mailOptions = {
    from: process.env.SENDER_EMAIL,
    to: req.user.email,
    subject: 'Hotel Booking Request Received',

    html: `
        <h2>Your Booking Request Is Received</h2>

        <p>Dear ${escapeHtml(req.user.username || "Guest")},</p>

        <p>
            Thank you for your booking! Here are your booking details:
        </p>

        <ul>
            <li>
                <strong>Booking ID:</strong>
                ${escapeHtml(booking._id)}
            </li>

            <li>
                <strong>Hotel Name:</strong>
                ${escapeHtml(roomData.hotel.name)}
            </li>

            <li>
                <strong>Location:</strong>
                ${escapeHtml(roomData.hotel.address)}
            </li>

            <li>
                <strong>Check-In:</strong>
                ${escapeHtml(new Date(booking.checkInDate).toDateString())}
            </li>

            <li>
                <strong>Check-Out:</strong>
                ${escapeHtml(new Date(booking.checkOutDate).toDateString())}
            </li>

            <li>
                <strong>Guests:</strong>
                ${escapeHtml(booking.guests)}
            </li>

            <li>
                <strong>Total booking amount:</strong>
                ${escapeHtml(process.env.CURRENCY || '$')} ${escapeHtml(booking.totalPrice)}
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
} catch (emailError) {
    console.error("Booking email could not be sent:", emailError.message);
}

        res.json({
            success: true,
            message: "Booking created successfully"
        });

    } catch (error) {
        console.error("Booking creation failed:", error.message);
        res.status(500).json({
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
        console.error("User bookings could not be fetched:", error.message);
        res.status(500).json({
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
res.set("Cache-Control", "no-store");

        const ownerId = req.user._id;

        // Find hotel belonging to this owner
        const hotel = await Hotel.findOne({
            owner: ownerId
        });

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

        // Total number of bookings
        const totalBookings = bookings.length;

        // Total revenue
        const totalRevenue = bookings.reduce(
            (total, booking) =>
                total + (booking.isPaid ? Number(booking.totalPrice || 0) : 0),
            0
        );

        res.json({
            success: true,
            dashboardData: {
                bookings,
                totalBookings,
                totalRevenue
            }
        });

    } catch (error) {
        console.error("Hotel bookings could not be fetched:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch hotel bookings"
        });
    }
};

export const stripePayment = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required"
            });
        }

        const booking = await Booking.findOne({
            _id: bookingId,
            user: req.user._id
        });

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
                success_url: `${origin}/my-bookings?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${origin}/my-bookings?payment=cancelled`,
                metadata: {
                    bookingId: bookingId.toString(),
                },
            });

        return res.json({
            success: true,
            url: session.url
        });

    } catch (error) {

        console.error("Stripe Checkout session creation failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to start Stripe Checkout"
        });
    }
};

// Confirm a Checkout Session on the server after Stripe redirects the guest
// back to the site. This is a fallback for delayed or misconfigured webhooks.
export const confirmStripePayment = async (req, res) => {
    try {
        const sessionId = req.query.session_id;

        if (!sessionId || typeof sessionId !== "string") {
            return res.status(400).json({
                success: false,
                message: "Stripe Checkout Session ID is required"
            });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({
                success: false,
                message: "Stripe secret key is missing"
            });
        }

        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripeInstance.checkout.sessions.retrieve(sessionId);
        const bookingId = session.metadata?.bookingId;

        if (session.mode !== "payment" || !bookingId) {
            return res.status(400).json({
                success: false,
                message: "Checkout Session is not linked to a booking"
            });
        }

        // The authenticated user must own the booking referenced by Stripe.
        const booking = await Booking.findOne({
            _id: bookingId,
            user: req.user._id
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found for this account"
            });
        }

        const expectedAmount = Math.round(Number(booking.totalPrice) * 100);
        if (
            Number(session.amount_total) !== expectedAmount ||
            session.currency !== "usd"
        ) {
            return res.status(400).json({
                success: false,
                message: "Checkout amount does not match this booking"
            });
        }

        if (session.payment_status !== "paid") {
            return res.status(202).json({
                success: true,
                isPaid: false,
                message: "Stripe is still confirming this payment"
            });
        }

        await Booking.updateOne(
            { _id: booking._id, user: req.user._id },
            { $set: { isPaid: true, paymentMethod: "Stripe" } }
        );

        return res.json({ success: true, isPaid: true });
    } catch (error) {
        console.error("Stripe payment confirmation failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to confirm payment with Stripe"
        });
    }
};