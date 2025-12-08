import { db } from './config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  getDoc,
  updateDoc,
  doc,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { format, addMonths, parseISO, isValid } from 'date-fns';

/**
 * @typedef {Object} SeasonPassDocument Data structure for documents in the 'seasonPasses' collection.
 * @property {string} userId - Firebase Auth UID of the user who applied for the pass.
 * @property {string} userEmail - Email of the user who applied for the pass.
 * @property {string} fullName - Full name of the pass holder.
 * @property {string} idNumber - ID/passport number of the pass holder.
 * @property {string} phone - Contact phone number.
 * @property {string} fromStation - Station where the route begins.
 * @property {string} toStation - Station where the route ends.
 * @property {'monthly' | 'quarterly' | 'biannual' | 'annual'} passType - Type of season pass.
 * @property {'economy' | 'business' | 'first'} class - Class of travel.
 * @property {Timestamp} validFrom - Date when the pass becomes valid.
 * @property {Timestamp} validTo - Date when the pass expires.
 * @property {'Pending' | 'Active' | 'Expired' | 'Cancelled'} status - Status of the season pass.
 * @property {number} cost - Cost of the pass.
 * @property {string} [comments] - Optional additional comments.
 * @property {Timestamp} createdAt - When the pass application was created.
 * @property {Timestamp} [updatedAt] - When the pass was last updated.
 * @property {string} [renewedFrom] - ID of the previous pass if this was renewed.
 */

/**
 * Calculates the end date of a season pass based on start date and pass type.
 * @param {Date|Timestamp} startDate - The start date of the pass
 * @param {'monthly'|'quarterly'|'biannual'|'annual'} passType - Type of pass
 * @returns {Date} The calculated end date
 */
export const calculateEndDate = (startDate, passType) => {
  let dateObj;
  
  // Convert to JS Date if it's a Firestore Timestamp
  if (startDate instanceof Timestamp) {
    dateObj = startDate.toDate();
  } else if (startDate instanceof Date) {
    dateObj = startDate;
  } else if (typeof startDate === 'string' && isValid(parseISO(startDate))) {
    dateObj = parseISO(startDate);
  } else {
    dateObj = new Date();
  }
  
  // Map pass types to number of months
  const monthMap = {
    'monthly': 1,
    'quarterly': 3,
    'biannual': 6,
    'annual': 12
  };
  
  // Calculate end date (subtract 1 day for exact periods like 30, 90 days)
  const endDate = addMonths(dateObj, monthMap[passType] || 1);
  
  return endDate;
};

/**
 * Calculates the cost of a season pass based on type and class.
 * @param {'monthly'|'quarterly'|'biannual'|'annual'} passType - Type of pass
 * @param {'economy'|'business'|'first'} travelClass - Class of travel
 * @param {string} fromStation - Origin station
 * @param {string} toStation - Destination station
 * @returns {number} The calculated cost
 */
export const calculatePassCost = (passType, travelClass, fromStation, toStation) => {
  // Base monthly costs by class
  const baseMonthlyRates = {
    'economy': 45,
    'business': 75,
    'first': 120
  };
  
  // Multipliers by pass type (with bulk discount for longer periods)
  const typeMultipliers = {
    'monthly': 1,
    'quarterly': 2.7, // 10% discount for 3 months
    'biannual': 5.1,  // 15% discount for 6 months
    'annual': 9.6     // 20% discount for 12 months
  };
  
  // Calculate base cost
  let cost = baseMonthlyRates[travelClass] * typeMultipliers[passType];
  
  // In a real app, you would also factor in the route distance (fromStation-toStation)
  // This is just a simplified example
  
  return Math.round(cost * 100) / 100; // Round to 2 decimal places
};

/**
 * Submits a new season pass application to Firestore.
 * @param {Object} passDetails - Season pass application details
 * @param {{uid: string, email?: string}} currentUser - The user object submitting the application
 * @returns {Promise<{docRef: import('firebase/firestore').DocumentReference}>} 
 *          A promise that resolves with the new document reference
 * @throws {Error} Throws an error if submission fails
 */
export const applyForSeasonPass = async (passDetails, currentUser) => {
  if (!currentUser || !currentUser.uid) {
    throw new Error("User information is required to apply for a season pass.");
  }
  
  if (!passDetails.fullName || !passDetails.idNumber || !passDetails.fromStation || !passDetails.toStation) {
    throw new Error("Full name, ID number, and route information are required.");
  }
  
  try {
    const passesRef = collection(db, "seasonPasses");
    
    // Convert start date to Timestamp if it's a Date
    const startDate = passDetails.validFrom instanceof Date
      ? Timestamp.fromDate(passDetails.validFrom)
      : passDetails.validFrom;
    
    // Calculate end date
    const endDate = calculateEndDate(
      passDetails.validFrom,
      passDetails.passType || 'monthly'
    );
    
    // Calculate pass cost
    const cost = calculatePassCost(
      passDetails.passType || 'monthly',
      passDetails.class || 'economy',
      passDetails.fromStation,
      passDetails.toStation
    );
    
    // Prepare application data
    const passData = {
      userId: currentUser.uid,
      userEmail: currentUser.email || 'N/A',
      fullName: passDetails.fullName,
      idNumber: passDetails.idNumber,
      phone: passDetails.phone || 'N/A',
      fromStation: passDetails.fromStation,
      toStation: passDetails.toStation,
      passType: passDetails.passType || 'monthly',
      class: passDetails.class || 'economy',
      validFrom: startDate,
      validTo: Timestamp.fromDate(endDate),
      status: 'Pending', // New applications start as pending
      cost: cost,
      comments: passDetails.comments || '',
      createdAt: Timestamp.now()
    };
    
    // Add document to Firestore
    const docRef = await addDoc(passesRef, passData);
    console.log("Season pass application created with ID: ", docRef.id);
    
    return { docRef };
    
  } catch (error) {
    console.error("Error applying for season pass in Firestore: ", error);
    throw new Error("Failed to submit season pass application. Please try again.");
  }
};

/**
 * Fetches all season passes for a specific user.
 * @param {string} userId - The UID of the user
 * @returns {Promise<Array>} A promise that resolves with an array of season pass objects
 * @throws {Error} Throws an error if the query fails
 */
export const getUserPasses = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required to fetch season passes.");
  }
  
  try {
    const passesRef = collection(db, "seasonPasses");
    
    // Query passes for the current user, order by creation date
    const q = query(
      passesRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc") // Show newest first
    );
    
    const querySnapshot = await getDocs(q);
    const passes = [];
    
    // Current date for checking if passes are expired
    const now = Timestamp.now();
    
    querySnapshot.forEach((doc) => {
      const passData = doc.data();
      
      // Automatically update status if the pass is expired but still marked as active
      if (passData.status === 'Active' && passData.validTo < now) {
        passData.status = 'Expired';
        // Ideally, we would update the document in Firestore here too
      }
      
      passes.push({ id: doc.id, ...passData });
    });
    
    return passes;
    
  } catch (error) {
    console.error("Error fetching user season passes from Firestore: ", error);
    throw new Error("Failed to load your season passes. Please try again later.");
  }
};

/**
 * Renews an existing season pass with a new validity period.
 * @param {string} passId - The ID of the pass to renew
 * @param {'monthly'|'quarterly'|'biannual'|'annual'} [newPassType] - Optional new pass type
 * @param {Date} [customStartDate] - Optional custom start date, defaults to day after current expiry
 * @returns {Promise<{docRef: import('firebase/firestore').DocumentReference}>} 
 *          A promise that resolves with the new document reference
 * @throws {Error} Throws an error if renewal fails
 */
export const renewSeasonPass = async (passId, newPassType, customStartDate) => {
  if (!passId) {
    throw new Error("Pass ID is required to renew a season pass.");
  }
  
  try {
    // Get the existing pass
    const passDocRef = doc(db, "seasonPasses", passId);
    const passDoc = await getDoc(passDocRef);
    
    if (!passDoc.exists()) {
      throw new Error("Season pass not found.");
    }
    
    const passData = passDoc.data();
    
    // Only allows renewal for active or recently expired passes
    if (passData.status !== 'Active' && passData.status !== 'Expired') {
      throw new Error("Only active or expired passes can be renewed.");
    }
    
    // Determine new start and end dates
    let newStartDate;
    
    if (customStartDate) {
      // Use custom start date if provided
      newStartDate = customStartDate instanceof Date 
        ? Timestamp.fromDate(customStartDate)
        : customStartDate;
    } else {
      // Default: Start the day after current expiry
      const currentEndDate = passData.validTo.toDate();
      const nextDay = new Date(currentEndDate);
      nextDay.setDate(nextDay.getDate() + 1);
      newStartDate = Timestamp.fromDate(nextDay);
    }
    
    // Calculate new end date based on pass type (use existing or new)
    const passType = newPassType || passData.passType;
    const newEndDate = calculateEndDate(newStartDate.toDate(), passType);
    
    // Calculate new cost
    const cost = calculatePassCost(
      passType,
      passData.class,
      passData.fromStation,
      passData.toStation
    );
    
    // Create renewal data - mostly copy from original with new dates
    const renewalData = {
      userId: passData.userId,
      userEmail: passData.userEmail,
      fullName: passData.fullName,
      idNumber: passData.idNumber,
      phone: passData.phone,
      fromStation: passData.fromStation,
      toStation: passData.toStation,
      passType: passType,
      class: passData.class,
      validFrom: newStartDate,
      validTo: Timestamp.fromDate(newEndDate),
      status: 'Active', // Renewals start as active (could be 'Pending' if you need approval)
      cost: cost,
      comments: passData.comments,
      createdAt: Timestamp.now(),
      renewedFrom: passId // Reference to the original pass
    };
    
    // Add new pass document to Firestore
    const passesRef = collection(db, "seasonPasses");
    const docRef = await addDoc(passesRef, renewalData);
    
    // Update the original pass status if it's still active
    if (passData.status === 'Active') {
      await updateDoc(passDocRef, {
        status: 'Expired',
        updatedAt: Timestamp.now()
      });
    }
    
    console.log("Season pass renewed with ID: ", docRef.id);
    return { docRef };
    
  } catch (error) {
    console.error("Error renewing season pass in Firestore: ", error);
    throw new Error(error.message || "Failed to renew season pass. Please try again.");
  }
};

/**
 * Updates status of a season pass (typically for admin or automatic updates)
 * @param {string} passId - ID of the pass to update
 * @param {'Pending' | 'Active' | 'Expired' | 'Cancelled'} newStatus - New status
 * @returns {Promise<void>} A promise that resolves when update is successful
 * @throws {Error} Throws an error if update fails
 */
export const updatePassStatus = async (passId, newStatus) => {
  if (!passId || !newStatus) {
    throw new Error("Pass ID and new status are required.");
  }
  
  const validStatuses = ['Pending', 'Active', 'Expired', 'Cancelled'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }
  
  try {
    const passDocRef = doc(db, "seasonPasses", passId);
    await updateDoc(passDocRef, {
      status: newStatus,
      updatedAt: Timestamp.now()
    });
    
    console.log(`Season pass ${passId} status updated to ${newStatus} in Firestore.`);
    
  } catch (error) {
    console.error("Error updating season pass status in Firestore: ", error);
    throw new Error("Failed to update season pass status. Please try again.");
  }
};

/**
 * Gets detailed information for a specific season pass
 * @param {string} passId - The ID of the pass to retrieve
 * @returns {Promise<Object|null>} A promise that resolves with the pass data or null if not found
 * @throws {Error} Throws an error if retrieval fails
 */
export const getPassDetails = async (passId) => {
  if (!passId) {
    throw new Error("Pass ID is required to get pass details.");
  }
  
  try {
    const passDocRef = doc(db, "seasonPasses", passId);
    const passDoc = await getDoc(passDocRef);
    
    if (!passDoc.exists()) {
      return null;
    }
    
    return { id: passDoc.id, ...passDoc.data() };
    
  } catch (error) {
    console.error("Error getting season pass details from Firestore: ", error);
    throw new Error("Failed to retrieve pass details. Please try again.");
  }
}; 