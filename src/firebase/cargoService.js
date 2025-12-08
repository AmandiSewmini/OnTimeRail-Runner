import { db } from './config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
  getDoc,
  updateDoc,
  limit
} from 'firebase/firestore';

/**
 * @typedef {Object} CargoDocument Data structure for documents in the 'cargos' collection.
 * @property {string} userId - Firebase Auth UID of the user who created the shipment.
 * @property {string} userEmail - Email of the user who created the shipment.
 * @property {string} senderName - Name of the cargo sender.
 * @property {string} recipientName - Name of the cargo recipient.
 * @property {string} from - Station/location where the cargo is shipped from.
 * @property {string} to - Station/location where the cargo is shipped to.
 * @property {Timestamp} shippingDate - Date when the cargo is scheduled to be shipped.
 * @property {'general' | 'fragile' | 'perishable' | 'dangerous'} cargoType - Type of cargo.
 * @property {number} weight - Weight of the cargo in kg.
 * @property {string} [specialInstructions] - Optional special handling instructions.
 * @property {string} trackingNumber - Unique tracking number for the cargo.
 * @property {'Pending' | 'In Transit' | 'Delivered' | 'Cancelled'} status - Status of the cargo.
 * @property {number} cost - Cost of the shipment.
 * @property {Timestamp} createdAt - When the cargo booking was created.
 * @property {Timestamp} [updatedAt] - When the cargo booking was last updated.
 */

/**
 * Generates a unique tracking number for a cargo shipment.
 * @returns {string} A tracking number in format CRG1234567
 */
const generateTrackingNumber = () => {
  // Format: CRG + 7 random digits
  const randomDigits = Math.floor(1000000 + Math.random() * 9000000);
  return `CRG${randomDigits}`;
};

/**
 * Calculate shipping cost based on cargo details
 * @param {number} weight - Weight of cargo in kg
 * @param {string} cargoType - Type of cargo
 * @param {string} from - Origin station
 * @param {string} to - Destination station
 * @returns {number} Calculated cost in dollars
 */
const calculateShippingCost = (weight, cargoType, from, to) => {
  // Base cost - $10
  let cost = 10;
  
  // Add cost based on weight - $1 per kg
  cost += weight;
  
  // Additional cost based on cargo type
  if (cargoType === 'fragile') cost += 5;
  if (cargoType === 'perishable') cost += 8;
  if (cargoType === 'dangerous') cost += 15;
  
  // For a real app, you would also calculate based on distance between from-to
  // This is just a simplistic example
  
  return cost;
};

/**
 * Creates a new cargo shipment booking in Firestore.
 * @param {Object} cargoDetails - Cargo details from the booking form
 * @param {{uid: string, email?: string}} currentUser - The user object performing the booking
 * @returns {Promise<{docRef: import('firebase/firestore').DocumentReference, trackingNumber: string}>} 
 *          A promise that resolves with the new document reference and tracking number
 * @throws {Error} Throws an error if the booking fails
 */
export const bookCargo = async (cargoDetails, currentUser) => {
  if (!currentUser || !currentUser.uid) {
    throw new Error("User information is required to book a cargo shipment.");
  }
  
  if (!cargoDetails.from || !cargoDetails.to || !cargoDetails.shippingDate) {
    throw new Error("Origin, destination and shipping date are required.");
  }
  
  try {
    const cargosRef = collection(db, "cargos");
    
    // Generate tracking number
    const trackingNumber = generateTrackingNumber();
    
    // Calculate cost
    const cost = calculateShippingCost(
      cargoDetails.weight || 1, 
      cargoDetails.cargoType || 'general',
      cargoDetails.from,
      cargoDetails.to
    );
    
    // Prepare booking data
    const cargoData = {
      userId: currentUser.uid,
      userEmail: currentUser.email || 'N/A',
      senderName: cargoDetails.senderName || 'Not Provided',
      recipientName: cargoDetails.recipientName || 'Not Provided',
      from: cargoDetails.from,
      to: cargoDetails.to,
      shippingDate: cargoDetails.shippingDate instanceof Date 
        ? Timestamp.fromDate(cargoDetails.shippingDate)
        : cargoDetails.shippingDate, // Assuming Timestamp already
      cargoType: cargoDetails.cargoType || 'general',
      weight: cargoDetails.weight || 1,
      specialInstructions: cargoDetails.specialInstructions || '',
      trackingNumber: trackingNumber,
      status: 'Pending',
      cost: cost,
      createdAt: Timestamp.now()
    };
    
    // Add document to Firestore
    const docRef = await addDoc(cargosRef, cargoData);
    console.log("Cargo booking created with ID: ", docRef.id);
    
    return { docRef, trackingNumber };
    
  } catch (error) {
    console.error("Error booking cargo in Firestore: ", error);
    throw new Error("Failed to book cargo shipment. Please try again.");
  }
};

/**
 * Fetches all cargo shipments for a specific user.
 * @param {string} userId - The UID of the user
 * @returns {Promise<Array>} A promise that resolves with an array of cargo booking objects
 * @throws {Error} Throws an error if the query fails
 */
export const getUserCargos = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required to fetch cargo shipments.");
  }
  
  try {
    const cargosRef = collection(db, "cargos");
    
    // Query cargos for the current user, order by creation date
    const q = query(
      cargosRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc") // Show newest first
    );
    
    const querySnapshot = await getDocs(q);
    const cargos = [];
    
    querySnapshot.forEach((doc) => {
      cargos.push({ id: doc.id, ...doc.data() });
    });
    
    return cargos;
    
  } catch (error) {
    console.error("Error fetching user cargos from Firestore: ", error);
    throw new Error("Failed to load your cargo shipments. Please try again later.");
  }
};

/**
 * Tracks a cargo shipment by its tracking number
 * @param {string} trackingNumber - The tracking number of the cargo
 * @returns {Promise<Object|null>} A promise that resolves with the cargo booking or null if not found
 * @throws {Error} Throws an error if the query fails
 */
export const trackCargo = async (trackingNumber) => {
  if (!trackingNumber) {
    throw new Error("Tracking number is required.");
  }
  
  try {
    const cargosRef = collection(db, "cargos");
    
    // Query for the specific tracking number
    const q = query(
      cargosRef,
      where("trackingNumber", "==", trackingNumber),
      limit(1) // Should only be one matching document
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null; // No matching cargo found
    }
    
    // Return the first (and should be only) matching document
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
    
  } catch (error) {
    console.error("Error tracking cargo in Firestore: ", error);
    throw new Error("Failed to track cargo. Please try again with a valid tracking number.");
  }
};

/**
 * Cancels a cargo booking in Firestore.
 * @param {string} cargoId - The ID of the cargo document
 * @returns {Promise<void>} A promise that resolves when cancellation is successful
 * @throws {Error} Throws an error if cancellation fails
 */
export const cancelCargo = async (cargoId) => {
  if (!cargoId) {
    throw new Error("Cargo ID is required to cancel.");
  }
  
  try {
    const cargoDocRef = doc(db, "cargos", cargoId);
    
    // First check if the cargo exists and can be cancelled
    const cargoDoc = await getDoc(cargoDocRef);
    
    if (!cargoDoc.exists()) {
      throw new Error("Cargo booking not found.");
    }
    
    const cargoData = cargoDoc.data();
    
    // Only allow cancellation if status is Pending or In Transit
    if (cargoData.status === 'Delivered') {
      throw new Error("Cannot cancel a cargo that has already been delivered.");
    }
    
    if (cargoData.status === 'Cancelled') {
      throw new Error("This cargo booking is already cancelled.");
    }
    
    // Update the status to cancelled
    await updateDoc(cargoDocRef, {
      status: 'Cancelled',
      updatedAt: Timestamp.now()
    });
    
    console.log(`Cargo ${cargoId} cancelled successfully in Firestore.`);
    
  } catch (error) {
    console.error("Error cancelling cargo in Firestore: ", error);
    throw new Error(error.message || "Failed to cancel cargo. Please try again.");
  }
};

/**
 * Update cargo status (admin function)
 * @param {string} cargoId - ID of the cargo document
 * @param {'Pending' | 'In Transit' | 'Delivered' | 'Cancelled'} newStatus - New status
 * @returns {Promise<void>} A promise that resolves when update is successful
 * @throws {Error} Throws an error if update fails
 */
export const updateCargoStatus = async (cargoId, newStatus) => {
  if (!cargoId || !newStatus) {
    throw new Error("Cargo ID and new status are required.");
  }
  
  const validStatuses = ['Pending', 'In Transit', 'Delivered', 'Cancelled'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }
  
  try {
    const cargoDocRef = doc(db, "cargos", cargoId);
    await updateDoc(cargoDocRef, {
      status: newStatus,
      updatedAt: Timestamp.now()
    });
    
    console.log(`Cargo ${cargoId} status updated to ${newStatus} in Firestore.`);
    
  } catch (error) {
    console.error("Error updating cargo status in Firestore: ", error);
    throw new Error("Failed to update cargo status. Please try again.");
  }
}; 