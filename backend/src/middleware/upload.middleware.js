import multer from "multer";

export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname?.toLowerCase().split(".").pop();
    const matchingExtensions = {
      "application/pdf": "pdf",
      "text/plain": "txt",
    };

    if (matchingExtensions[file.mimetype] === extension) {
      callback(null, true);
      return;
    }

    callback(new Error("Only matching PDF and TXT resume files are supported"));
  },
});
