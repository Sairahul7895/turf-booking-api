const turfModel = require('../models/turfModel');
const userModel = require('../models/User');
const sendBookingEmails = require("../utils/sendEmail");
const { uploadImage, deleteImage } = require('../config/cloudinary');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const addTurf = async (req, res) => {
    const uploadedImages = [];
    try {
        const {
            name, latitude, longitude, description,
            morningWeekdayPrice, morningWeekendPrice,
            eveningWeekdayPrice, eveningWeekendPrice, availableFrom, availableTo
        } = req.body;
        const userId = req.user.id; // Extract from authentication middleware
        const images = [];

        for (const file of req.files) {
            const { url, publicId } = await uploadImage(file.buffer);
            images.push(url);
            uploadedImages.push(publicId); // Store publicId for potential rollback
        }

        const turfId = await turfModel.createTurf(
            userId, name, latitude, longitude, description,
            morningWeekdayPrice, morningWeekendPrice,
            eveningWeekdayPrice, eveningWeekendPrice, availableFrom, availableTo, images
        );

        res.status(201).json({ message: "Turf added successfully", turfId });

    } catch (error) {
        console.error(error);
        // Rollback: Delete uploaded images from Cloudinary
        for (const publicId of uploadedImages) {
            await deleteImage(publicId);
        }
        res.status(500).json({ error: "Failed to add turf" });
    }
};

const getTurfs = async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: "User latitude and longitude are required" });
        }

        // Fetch nearby turfs from DB
        const turfs = await turfModel.getNearByTurfs(lat, lon);

        if (!turfs.length) {
            return res.json([]);
        }
        res.status(200).json(turfs);
    } catch (error) {
        console.error("Error fetching nearby turfs:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getTurfById = async (req, res) => {
    try {
        const { id } = req.params;
        const turf = await turfModel.getTurfDetailsById(id);

        if (!turf) {
            return res.status(404).json({ error: "Turf not found" });
        }
        try {
            // Fetch location name using latitude & longitude
            const locationName = await turfModel.getLocationName(turf.LATITUDE, turf.LONGITUDE);
            turf.locationName = locationName;
        } catch (error) {
            console.error(`Error fetching location for Turf ID ${id}:`, error);
            turf.locationName = "Unknown Location"; // Fallback value
        }

        res.json(turf);
    } catch (error) {
        console.error("Error fetching turf details:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

const createBooking = async (req, res) => {
    try {
        const bookingData = req.body;
        // Create booking in database
        const result = await turfModel.createBooking(bookingData);
        if (result) {
            // Extract userId and turfId from booking data
            const { userId, turfId, turfOwnerId, turfName, bookingDate, startTime, endTime } = bookingData;

            // Fetch user details (who booked the turf)
            const user = await userModel.getUserById(userId);
            if (!user) return res.status(404).json({ error: "User not found" });
            // Fetch turf owner details
            const turfOwner = await userModel.getUserById(turfOwnerId);
            if (!turfOwner) return res.status(404).json({ error: "Turf owner not found" });
            // Send email confirmations
            await sendBookingEmails(
                user.EMAIL, user.NAME, 
                turfOwner.EMAIL, turfOwner.NAME, 
                turfName, bookingDate, startTime, endTime
            );

            return res.status(201).json({ message: "Booking created successfully. Emails sent!", result });
        }

        res.status(400).json({ error: "Booking failed. Please try again." });
    } catch (error) {
        console.error("Booking error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


const getBookings = async (req, res) => {
    try {
        const { id } = req.params
        const { date } = req.query
        const result = await turfModel.getBookingsForId(id, date);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error', error);
    }
}


module.exports = { addTurf, getTurfs, getTurfById, getBookings, createBooking, upload };
