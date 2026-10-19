# Stripe payment status fix

The booking page now confirms a returned Stripe Checkout Session on the server.
The server retrieves the session directly from Stripe, checks that it belongs
to the signed-in user's booking and has the expected USD amount, then marks the
booking paid. This covers the gap between Stripe's redirect and a delayed or
misconfigured webhook. The webhook remains enabled as the primary update path
and now also handles delayed-payment success events.

## Deploy

Deploy the updated `server` and `client` folders to their respective Vercel
projects. Set the environment variables listed in each folder's `.env.example`
in the corresponding Vercel project; do not upload `.env` files.

Configure the Stripe webhook to send these events to the backend:

`https://hotel-booking-website-cyan.vercel.app/api/stripe`

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Set `STRIPE_WEBHOOK_SECRET` in the backend environment to the signing secret
for that endpoint. The backend also needs `STRIPE_SECRET_KEY` configured.

## Other fixes included

- Room owners can only change availability for rooms belonging to their hotel.
- Clerk webhook signatures are verified against the original request body, and
  failed deliveries now return retryable HTTP errors.
- Room uploads are limited to four JPEG, PNG, or WebP files, up to 5 MB each.
- Booking checks reject invalid dates and guest counts, permit same-day
  check-out/check-in, ignore cancelled bookings, and re-check availability when
  the booking is created.
- The owner dashboard's paid-revenue figure excludes unpaid bookings.
- Removed request/debug logs that exposed account and booking details, and
  escaped user-controlled values in booking emails.
- Updated the vulnerable `source-map-js` lockfile entry; the dependency audits
  report no known vulnerabilities.

## Test

Use Stripe test mode and complete a Checkout payment. The browser should return
to **My Bookings**, where the app verifies the Checkout Session and reloads the
booking. If Stripe is still processing an asynchronous method, the page retries
for a short period; the webhook updates the booking when Stripe reports success.
