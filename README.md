# Hotel Booking Website

A full-stack hotel reservation platform designed to simplify the process of discovering accommodations, checking room availability, and managing hotel bookings. The application provides separate experiences for customers and hotel owners, with integrated authentication and secure online payments.

**Live Application:** https://hotel-booking-website-muar.vercel.app/

## Key Features

- **User Authentication:** Secure sign-in and account management using Clerk.
- **Hotel Discovery:** Browse hotels, explore room details, pricing, and amenities.
- **Room Booking:** Check availability and reserve rooms based on selected dates and guest details.
- **Payment Integration:** Online payments through Stripe Checkout with webhook-based payment status updates.
- **Booking Management:** View reservations and track payment status.
- **Hotel Owner Dashboard:** Register properties, manage room listings, and monitor bookings and revenue.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | Clerk |
| Payment Gateway | Stripe |
| Image Management | Cloudinary |
| Deployment | Vercel |

## Local Setup

**1. Clone the repository**

```bash
git clone YOUR_REPOSITORY_URL
cd HOTEL-BOOKING
```

**2. Install dependencies**

```bash
cd client
npm install

cd ../server
npm install
```

**3. Configure environment variables**

Create `.env` files in the `client` and `server` directories with the required database, authentication, image storage, and payment gateway credentials.

**4. Run the application**

Start the backend:

```bash
cd server
npm run server
```

Start the frontend in a separate terminal:

```bash
cd client
npm run dev
```

## Payment Processing

Integrated Stripe Checkout for online transactions. Stripe webhooks handle successful payment events and automatically synchronize booking payment status with MongoDB.

## Developer

**Indhrani Pichuka**  
B.Tech – Artificial Intelligence & Data Science  
Shri Vishnu Engineering College for Women

---

*Developed as a full-stack web application to demonstrate practical implementation of modern frontend development, REST APIs, database integration, authentication, and payment processing.*
