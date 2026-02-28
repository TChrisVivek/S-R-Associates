/**
 * Utility function to upload a single file directly to Cloudinary using an unsigned upload preset.
 * 
 * @param {File} file The file object to upload
 * @returns {Promise<string>} The secure URL of the uploaded file on Cloudinary
 */
export const uploadToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        console.error("Cloudinary environment variables missing!");
        throw new Error("Cloudinary configuration is missing. Please check .env file.");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    // Using auto allows both images and raw files (like pdfs) to be uploaded
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'Failed to upload to Cloudinary');
        }

        const data = await response.json();
        console.log(data);
        console.log(data.secure_url);
        return data.secure_url;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        throw error;
    }
};

/**
 * Utility function to upload multiple files to Cloudinary.
 * 
 * @param {File[]} files Array of file objects
 * @returns {Promise<string[]>} Array of secure URLs
 */
export const uploadMultipleToCloudinary = async (files) => {
    const uploadPromises = Array.from(files).map(file => uploadToCloudinary(file));
    return Promise.all(uploadPromises);
};
