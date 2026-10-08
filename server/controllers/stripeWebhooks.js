import Stripe from "stripe";
import Booking from "../models/Booking.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {

    const sig = request.headers["stripe-signature"];

    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(
            request.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

    } catch (error) {

        console.error("Webhook verification failed:", error.message);

        return response
            .status(400)
            .send(`Webhook Error: ${error.message}`);
    }

    try {

        // Payment completed successfully
        if (event.type === "checkout.session.completed") {

            const session = event.data.object;

            console.log("Checkout session completed:", session.id);

            const bookingId = session.metadata?.bookingId;

            console.log("Booking ID:", bookingId);

            if (!bookingId) {
                console.log("Booking ID not found in metadata");
                return response.json({ received: true });
            }

            if (session.payment_status === "paid") {

                const booking = await Booking.findByIdAndUpdate(
                    bookingId,
                    {
                        isPaid: true,
                        paymentMethod: "Stripe"
                    },
                    {
                        new: true
                    }
                );

                console.log("Booking payment updated:", booking);
            }
        }

        else {
            console.log("Unhandled event type:", event.type);
        }

        return response.json({ received: true });

    } catch (error) {

        console.error("Webhook processing error:", error);

        return response.status(500).json({
            success: false,
            message: error.message
        });
    }
};