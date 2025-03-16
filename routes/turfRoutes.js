const express = require('express');
const { addTurf, getTurfs, getTurfById, getBookings, createBooking, upload } = require('../controllers/turfController');
const { authenticateUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/add', authenticateUser, upload.array('images', 10), addTurf);
router.get('/getTurfs',authenticateUser, getTurfs);
router.get('/:id',authenticateUser, getTurfById);
router.get('/bookings/turf/:id',authenticateUser, getBookings);
router.post('/createBooking',authenticateUser, createBooking);


module.exports = router;
