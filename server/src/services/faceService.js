/**
 * Service to handle face-related logic
 */

/**
 * Calculates euclidean distance between two face descriptors
 * @param {Array} desc1 
 * @param {Array} desc2 
 * @returns {number}
 */
const euclideanDistance = (desc1, desc2) => {
    if (!desc1 || !desc2 || desc1.length !== desc2.length) return 1.0;
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        sum += (desc1[i] - desc2[i]) ** 2;
    }
    return Math.sqrt(sum);
};

/**
 * Compares a face descriptor against a stored one
 * @param {Array} descriptor 
 * @param {string} storedDescriptorJson 
 * @param {number} threshold 
 * @returns {boolean}
 */
const verifyFace = (descriptor, storedDescriptorJson, threshold = 0.6) => {
    try {
        const storedDescriptor = JSON.parse(storedDescriptorJson);
        const distance = euclideanDistance(descriptor, storedDescriptor);
        console.log(`[FACE_VERIFY] Distance: ${distance.toFixed(4)}, Threshold: ${threshold}`);
        return distance < threshold;
    } catch (e) {
        console.error("Face verification error:", e);
        return false;
    }
};

module.exports = {
    euclideanDistance,
    verifyFace
};
