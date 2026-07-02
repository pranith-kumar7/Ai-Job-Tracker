import multer from "multer";

export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = ["application/pdf", "text/plain"];

    if (
      allowedTypes.includes(file.mimetype) ||
      file.originalname?.toLowerCase().endsWith(".txt")
    ) {
      callback(null, true);
      return;
    }

    callback(new Error("Only PDF and TXT resumes are supported"));
  },
});
