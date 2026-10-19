import User from "../models/User.js";
import { Webhook } from "svix";

const clerkWebhooks = async (req, res) => {
    if (!process.env.CLERK_WEBHOOK_SECRET) {
        console.error("Clerk webhook secret is not configured");
        return res.status(500).json({
            success: false,
            message: "Clerk webhook is not configured"
        });
    }

    const rawPayload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
    const headers = {
        "svix-id": req.headers["svix-id"],
        "svix-timestamp": req.headers["svix-timestamp"],
        "svix-signature": req.headers["svix-signature"]
    };

    try {
        const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
        await webhook.verify(rawPayload, headers);
    } catch (error) {
        console.error("Clerk webhook signature verification failed:", error.message);
        return res.status(400).json({
            success: false,
            message: "Invalid webhook signature"
        });
    }

    let payload;
    try {
        payload = JSON.parse(rawPayload);
    } catch (error) {
        console.error("Clerk webhook payload is invalid JSON:", error.message);
        return res.status(400).json({
            success: false,
            message: "Invalid webhook payload"
        });
    }

    try {
        const { data, type } = payload;

        switch (type) {
            case "user.created":
            case "user.updated": {
                const primaryEmail = data.email_addresses?.find(
                    email => email.id === data.primary_email_address_id
                )?.email_address;
                const email = primaryEmail || data.email_addresses?.[0]?.email_address;

                if (!email) {
                    throw new Error("Clerk user event is missing an email address");
                }

                const userData = {
                    email,
                    username: [data.first_name, data.last_name].filter(Boolean).join(" ")
                        || email.split("@")[0],
                    image: data.image_url || data.profile_image_url || ""
                };

                await User.findByIdAndUpdate(
                    data.id,
                    {
                        $set: userData,
                        $setOnInsert: { role: "user" }
                    },
                    { upsert: true, new: true, runValidators: true }
                );
                break;
            }
            case "user.deleted":
                await User.findByIdAndDelete(data.id);
                break;
            default:
                break;
        }

        return res.json({ success: true, message: "Webhook received" });
    } catch (error) {
        console.error("Clerk webhook processing failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to process Clerk webhook"
        });
    }
};

export default clerkWebhooks;