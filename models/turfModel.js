const { default: axios } = require('axios');
const pool = require('../config/db');

const createTurf = async (
    userId, name, latitude, longitude, description,
    morningWeekdayPrice, morningWeekendPrice,
    eveningWeekdayPrice, eveningWeekendPrice, availableFrom, availableTo,
    images
) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const turfQuery = `
            INSERT INTO "TURFS" 
            ("USER_ID", "NAME", "LATITUDE", "LONGITUDE", "DESCRIPTION", 
            "MORNING_WEEKDAY_PRICE", "MORNING_WEEKEND_PRICE", 
            "EVENING_WEEKDAY_PRICE", "EVENING_WEEKEND_PRICE") 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING "ID";

        `;
        const turfResult = await client.query(turfQuery, [
            userId, name, latitude, longitude, description,
            morningWeekdayPrice, morningWeekendPrice,
            eveningWeekdayPrice, eveningWeekendPrice
        ]);

        const turfId = turfResult.rows[0].ID;

        // Insert Images
        for (const imageUrl of images) {
            await client.query(`INSERT INTO "TURF_PHOTOS" ("TURF_ID", "PHOTO_URL") VALUES ($1, $2)`, [turfId, imageUrl]);
        }

        // Insert Timings
        await client.query(`
                INSERT INTO "TURF_TIMINGS" ("TURF_ID", "OPEN_TIME", "CLOSE_TIME") 
                VALUES ($1, $2, $3)`,
            [turfId, availableFrom, availableTo]
        );

        await client.query('COMMIT');
        return turfId;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const getNearByTurfs = async (lat, lon) => {
    try {
        const query = `
            SELECT t."ID", t."NAME", t."LATITUDE", t."LONGITUDE",
                (
                    6371 * acos(
                        cos(radians($1)) * cos(radians(t."LATITUDE")) *  
                        cos(radians(t."LONGITUDE") - radians($2)) +  
                        sin(radians($1)) * sin(radians(t."LATITUDE"))
                    )
                ) AS distance_km,
                tp."PHOTO_URL" -- Get the first matching photo
            FROM "TURFS" t
            LEFT JOIN (
                SELECT DISTINCT ON ("TURF_ID") "TURF_ID", "PHOTO_URL"
                FROM "TURF_PHOTOS"
                ORDER BY "TURF_ID", "ID" ASC
            ) tp ON t."ID" = tp."TURF_ID"
            WHERE (
                6371 * acos(
                    cos(radians($1)) * cos(radians(t."LATITUDE")) *  
                    cos(radians(t."LONGITUDE") - radians($2)) +  
                    sin(radians($1)) * sin(radians(t."LATITUDE"))
                )
            ) <= 50
            ORDER BY distance_km ASC;
        `;

        const { rows } = await pool.query(query, [lat, lon]);
        return rows;
    } catch (error) {
        console.error("Database Error:", error);
        throw error;
    }
};

// Function to format time to AM/PM
const formatTime = (time) => {
    if (!time) return "Not Available";
    const [hours, minutes] = time.split(":");
    let hour = parseInt(hours, 10);
    const amPm = hour >= 12 ? "PM" : "AM";

    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12; // Convert 00:00 to 12 AM

    return `${hour}:${minutes} ${amPm}`;
};

// Fetch single turf details with images and available timings
const getTurfDetailsById = async (id) => {
    const turfQuery = `SELECT * FROM "TURFS" WHERE "ID" = $1;`;
    const { rows: turfRows } = await pool.query(turfQuery, [id]);

    if (turfRows.length === 0) {
        return null;
    }

    const turf = turfRows[0];

    // Fetch Turf Images
    const imagesQuery = `SELECT "PHOTO_URL" FROM "TURF_PHOTOS" WHERE "TURF_ID" = $1;`;
    const { rows: imageRows } = await pool.query(imagesQuery, [id]);
    const photos = imageRows.map(row => row.PHOTO_URL);

    // Fetch Available Timings
    const timingsQuery = `SELECT "OPEN_TIME", "CLOSE_TIME" FROM "TURF_TIMINGS" WHERE "TURF_ID" = $1;`;
    const { rows: timingRows } = await pool.query(timingsQuery, [id]);

    return {
        ...turf,
        PHOTOS: photos,
        availableFrom: timingRows.length ? formatTime(timingRows[0].OPEN_TIME) : "Not Available",
        availableTo: timingRows.length ? formatTime(timingRows[0].CLOSE_TIME) : "Not Available"
    };
};


// Function to fetch location name from OpenStreetMap API
const getLocationName = async (lat, lng) => {
    try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
            params: {
                lat: lat,
                lon: lng,
                format: "json"
            }
        });
        return response.data.display_name || "Unknown Location";
    } catch (error) {
        console.error("Error fetching location name:", error);
        return "Unknown Location";
    }
};

const createBooking = async (bookingData) => {
    try {
        const { userId, turfId, bookingDate, startTime, endTime, duration, price } = bookingData;
        const query = `
            INSERT INTO "BOOKINGS"("USER_ID","TURF_ID","BOOKING_DATE","START_TIME","END_TIME","DURATION_MINUTES","PRICE") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "ID";
        `;
        const values = [userId, turfId, bookingDate, startTime, endTime, duration, price];
        const { rows } = await pool.query(query, values);
        return rows;
    } catch (error) {
        console.error("Database Error:", error);
        throw error;
    }
}

const getBookingsForId = async (id, date) => {
    try {
        const query = `
            select "ID","TURF_ID","START_TIME","END_TIME" from "BOOKINGS" WHERE "TURF_ID" = $1 AND "BOOKING_DATE" = $2
        `;
        const { rows } = await pool.query(query, [id, date]);
        return rows;
    } catch (error) {
        console.error("Database Error:", error);
        throw error;
    }
}

module.exports = { createTurf, getNearByTurfs, getLocationName, getTurfDetailsById, getBookingsForId, createBooking };