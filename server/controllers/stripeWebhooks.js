import Stripe from "stripe";
import Booking from "../models/Booking.js";

export const stripeWebhooks = async (request, response) => {

    const sig = request.headers["stripe-signature"];

    let event;

    try {
        if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
            console.error("Stripe webhook secrets are not configured");
            return response.status(500).send("Stripe webhook is not configured");
        }

        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
        event = stripeInstance.webhooks.constructEvent(
            request.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

    } catch (error) {

        console.error("Stripe webhook verification failed:", error.message);

        return response
            .status(400)
            .send(`Webhook Error: ${error.message}`);
    }

    try {

        // Stripe can report successful payment through either event for
        // Checkout sessions that use delayed payment methods.
        if (
            event.type === "checkout.session.completed" ||
            event.type === "checkout.session.async_payment_succeeded"
        ) {

            const session = event.data.object;

            const bookingId = session.metadata?.bookingId;

            if (!bookingId) {
                console.error("Checkout Session is missing bookingId metadata");
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

                if (!booking) {
                    console.error("No booking found for completed Stripe Session");
                    return response.status(404).json({
                        success: false,
                        message: "Booking not found"
                    });
                }

                console.log("Booking payment marked as paid:", booking._id);
            } else {
                console.log("Stripe Session is not paid yet:", event.type);
            }
        }

        else {
            console.log("Unhandled event type:", event.type);
        }

        return response.json({ received: true });

    } catch (error) {

        console.error("Stripe webhook processing failed:", error.message);

        return response.status(500).json({
            success: false,
            message: "Unable to process Stripe webhook"
        });
    }
};