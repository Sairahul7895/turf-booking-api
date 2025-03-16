const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload Image and return URL + Public ID
const uploadImage = async (buffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'turfs' }, 
            (error, result) => {
                if (error) {
                    console.error("Cloudinary Upload Error:", error);
                    reject(error);
                } else {
                    resolve({ url: result.secure_url, publicId: result.public_id });
                }
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
};

// Delete Image using Public ID
const deleteImage = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
        console.log(`Deleted image: ${publicId}`);
    } catch (error) {
        console.error("Cloudinary Delete Error:", error);
    }
};

module.exports = { uploadImage, deleteImage };