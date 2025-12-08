import { db } from './config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  orderBy,
  getDoc
} from 'firebase/firestore';

/**
 * @typedef {Object} ComplaintDocument Data structure for documents in the 'complaints' collection.
 * @property {string} userId - Firebase Auth UID of the user who submitted the complaint.
 * @property {string} userEmail - Email of the user who submitted the complaint.
 * @property {'schedule'|'service'|'facility'|'staff'|'other'} type - Type of complaint.
 * @property {string} subject - Brief subject of the complaint.
 * @property {string} description - Detailed description of the complaint.
 * @property {string} [contactInfo] - Optional additional contact information.
 * @property {'Pending'|'In Progress'|'Resolved'|'Rejected'} status - Status of the complaint.
 * @property {string} [response] - Response from customer service (if any).
 * @property {string} [adminId] - ID of the admin who processed the complaint.
 * @property {Timestamp} createdAt - When the complaint was submitted.
 * @property {Timestamp} [updatedAt] - When the complaint was last updated.
 * @property {Timestamp} [resolvedAt] - When the complaint was resolved.
 */

/**
 * Submits a new complaint to Firestore.
 * @param {Object} complaintData - The complaint details
 * @param {{uid: string, email?: string}} currentUser - The user submitting the complaint
 * @returns {Promise<{docRef: import('firebase/firestore').DocumentReference}>} 
 *          A promise that resolves with the new document reference
 * @throws {Error} Throws an error if submission fails
 */
export const submitComplaint = async (complaintData, currentUser) => {
  if (!currentUser || !currentUser.uid) {
    throw new Error("User information is required to submit a complaint.");
  }
  
  if (!complaintData.type || !complaintData.subject || !complaintData.description) {
    throw new Error("Complaint type, subject, and description are required.");
  }
  
  try {
    const complaintsRef = collection(db, "complaints");
    
    // Prepare complaint data
    const newComplaint = {
      userId: currentUser.uid,
      userEmail: currentUser.email || 'N/A',
      type: complaintData.type,
      subject: complaintData.subject,
      description: complaintData.description,
      contactInfo: complaintData.contactInfo || '',
      status: 'Pending', // Initial status for all complaints
      createdAt: Timestamp.now()
    };
    
    // Add to Firestore
    const docRef = await addDoc(complaintsRef, newComplaint);
    console.log("Complaint submitted with ID: ", docRef.id);
    
    return { docRef };
    
  } catch (error) {
    console.error("Error submitting complaint to Firestore: ", error);
    throw new Error("Failed to submit complaint. Please try again.");
  }
};

/**
 * Fetches all complaints for a specific user.
 * @param {string} userId - The UID of the user
 * @returns {Promise<Array>} A promise that resolves with an array of complaint objects
 * @throws {Error} Throws an error if the query fails
 */
export const getUserComplaints = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required to fetch complaints.");
  }
  
  try {
    const complaintsRef = collection(db, "complaints");
    
    // Query complaints for the current user, order by creation date
    const q = query(
      complaintsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc") // Show newest first
    );
    
    const querySnapshot = await getDocs(q);
    const complaints = [];
    
    querySnapshot.forEach((doc) => {
      complaints.push({ id: doc.id, ...doc.data() });
    });
    
    return complaints;
    
  } catch (error) {
    console.error("Error fetching user complaints from Firestore: ", error);
    throw new Error("Failed to load your complaints. Please try again later.");
  }
};

/**
 * Gets detailed information for a specific complaint
 * @param {string} complaintId - The ID of the complaint to retrieve
 * @returns {Promise<Object|null>} A promise that resolves with the complaint data or null if not found
 * @throws {Error} Throws an error if retrieval fails
 */
export const getComplaintDetails = async (complaintId) => {
  if (!complaintId) {
    throw new Error("Complaint ID is required to get details.");
  }
  
  try {
    const complaintDocRef = doc(db, "complaints", complaintId);
    const complaintDoc = await getDoc(complaintDocRef);
    
    if (!complaintDoc.exists()) {
      return null;
    }
    
    return { id: complaintDoc.id, ...complaintDoc.data() };
    
  } catch (error) {
    console.error("Error getting complaint details from Firestore: ", error);
    throw new Error("Failed to retrieve complaint details. Please try again.");
  }
};

/**
 * Updates the status of a complaint (for admin purposes).
 * @param {string} complaintId - ID of the complaint
 * @param {'Pending'|'In Progress'|'Resolved'|'Rejected'} newStatus - New status
 * @param {string} [response] - Optional response from customer service
 * @param {string} [adminId] - ID of the admin making the update
 * @returns {Promise<void>} A promise that resolves when update is successful
 * @throws {Error} Throws an error if update fails
 */
export const updateComplaintStatus = async (complaintId, newStatus, response, adminId) => {
  if (!complaintId || !newStatus) {
    throw new Error("Complaint ID and new status are required.");
  }
  
  const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }
  
  try {
    const complaintDocRef = doc(db, "complaints", complaintId);
    
    // Prepare update data
    const updateData = {
      status: newStatus,
      updatedAt: Timestamp.now()
    };
    
    // If resolving, add resolved timestamp
    if (newStatus === 'Resolved') {
      updateData.resolvedAt = Timestamp.now();
    }
    
    // If there's a response, add it
    if (response) {
      updateData.response = response;
    }
    
    // If admin ID provided, add it
    if (adminId) {
      updateData.adminId = adminId;
    }
    
    await updateDoc(complaintDocRef, updateData);
    console.log(`Complaint ${complaintId} status updated to ${newStatus} in Firestore.`);
    
  } catch (error) {
    console.error("Error updating complaint status in Firestore: ", error);
    throw new Error("Failed to update complaint status. Please try again.");
  }
};

/**
 * Adds a follow-up message from the user to an existing complaint.
 * @param {string} complaintId - ID of the complaint to follow up on
 * @param {string} message - Follow-up message
 * @param {string} userId - ID of the user (for verification)
 * @returns {Promise<void>} A promise that resolves when the follow-up is added
 * @throws {Error} Throws an error if adding the follow-up fails
 */
export const addComplaintFollowUp = async (complaintId, message, userId) => {
  if (!complaintId || !message) {
    throw new Error("Complaint ID and follow-up message are required.");
  }
  
  try {
    const complaintDocRef = doc(db, "complaints", complaintId);
    const complaintDoc = await getDoc(complaintDocRef);
    
    if (!complaintDoc.exists()) {
      throw new Error("Complaint not found.");
    }
    
    // Verify user owns this complaint
    const complaintData = complaintDoc.data();
    if (complaintData.userId !== userId) {
      throw new Error("You do not have permission to follow up on this complaint.");
    }
    
    // Add follow-up to the existing conversation array or create it
    const conversation = complaintData.conversation || [];
    
    conversation.push({
      message,
      sender: 'user',
      timestamp: Timestamp.now()
    });
    
    // Update complaint with new message and revert to "Pending" if it was "Resolved"
    await updateDoc(complaintDocRef, {
      conversation,
      status: complaintData.status === 'Resolved' ? 'In Progress' : complaintData.status,
      updatedAt: Timestamp.now()
    });
    
    console.log(`Follow-up added to complaint ${complaintId} in Firestore.`);
    
  } catch (error) {
    console.error("Error adding follow-up to complaint in Firestore: ", error);
    throw new Error(error.message || "Failed to add follow-up. Please try again.");
  }
}; 