import express from 'express';
import { checkAvailabilityAPI, createbooking, getHotelBookings, getUserBookings } from '../controllers/bookingController.js';
import { protect } from '../middleware/authMiddleware.js';

const bookingRouter = express.Router();

bookingRouter.post('/check-availability',checkAvailabilityAPI);
bookingRouter.post('/book',protect,createbooking);
bookingRouter.get('/user',protect,getUserBookings);
bookingRouter.get('/hotel',protect,getHotelBookings);

export default bookingRouter;