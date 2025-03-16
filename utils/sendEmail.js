const nodemailer = require("nodemailer");
require('dotenv').config();
// Configure email transporter
const transporter = nodemailer.createTransport({
    service: "gmail", 
    auth: {
        user: process.env.EMAIL_USER,  // Your email
        pass: process.env.EMAIL_PASS,  // App password (not actual password)
    },
});

/**
 * Send booking confirmation emails to the user and turf owner.
 */
const sendBookingEmails = async (userEmail, userName, ownerEmail, ownerName, turfName, date, startTime, endTime) => {
    try {
        const userMailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: "Booking Confirmation - Turf Booking",
            html: `<h2>Booking Confirmed ✅</h2>
                   <p>Hi ${userName},</p>
                   <p>Your booking for <strong>${turfName}</strong> is confirmed.</p>
                   <p><strong>Date:</strong> ${date} <br> 
                   <strong>Time:</strong> ${startTime} - ${endTime}</p>
                   <p>Enjoy your game! ⚽</p>`,
        };

        const ownerMailOptions = {
            from: process.env.EMAIL_USER,
            to: ownerEmail,
            subject: "New Turf Booking - Notification",
            html: `<h2>New Booking Alert 🚀</h2>
                   <p>Hi ${ownerName},</p>
                   <p>Your turf <strong>${turfName}</strong> has been booked.</p>
                   <p><strong>Date:</strong> ${date} <br> 
                   <strong>Time:</strong> ${startTime} - ${endTime}</p>
                   <p>Check your dashboard for details.</p>`,
        };

        // Send emails
        await transporter.sendMail(userMailOptions);
        await transporter.sendMail(ownerMailOptions);

        console.log("Booking emails sent successfully.");
    } catch (error) {
        console.error("Error sending emails:", error);
    }
};

module.exports = sendBookingEmails;