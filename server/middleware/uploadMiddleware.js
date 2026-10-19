import multer from "multer";

const upload = multer({
    storage: multer.diskStorage({}),
    limits: {
        files: 4,
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (_req, file, callback) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.mimetype)) {
            return callback(new Error("Only JPEG, PNG, and WebP images are allowed"));
        }
        callback(null, true);
    }
});

const uploadRoomImages = (req, res, next) => {
    upload.array("images", 4)(req, res, error => {
        if (!error) return next();

        const message =
            error.code === "LIMIT_FILE_SIZE"
                ? "Each image must be 5 MB or smaller"
                : error.code === "LIMIT_FILE_COUNT" ||
                    error.code === "LIMIT_UNEXPECTED_FILE"
                    ? "Upload no more than 4 images"
                    : "Only JPEG, PNG, and WebP images are allowed";

        return res.status(400).json({success: false, message});
    });
};

export default uploadRoomImages;