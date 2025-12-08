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
  orderBy // Might be useful for ordering tickets/trains
} from 'firebase/firestore';

/**
 * @typedef {Object} TrainDocument Data structure for documents in the 'trains' collection.
 * @property {string} name - The name of the train service (e.g., "Udarata Manike").
 * @property {string} trainNumber - The identifier for the train (e.g., "1082").
 * @property {string} departureStation - The station where the journey begins.
 * @property {string} arrivalStation - The final station of the journey.
 * @property {Timestamp} departureDate - Firestore Timestamp of departure date/time.
 * @property {string | Timestamp} [departureTime] - Optional: Departure time (string or Timestamp).
 * @property {string | Timestamp} [arrivalTime] - Optional: Arrival time (string or Timestamp).
 * @property {number} totalSeats - Total number of seats available initially.
 * @property {number} [availableSeats] - Optional: Current number of available seats.
 */

/**
 * @typedef {Object} BookingDocument Data structure for documents in the 'bookings' collection.
 * @property {string} userId - Firebase Auth UID of the booking user.
 * @property {string} userEmail - Email of the booking user.
 * @property {string} trainId - Document ID from the 'trains' collection.
 * @property {string} trainName - Name of the booked train service.
 * @property {string} from - Departure station (copied from train).
 * @property {string} to - Arrival station (copied from train).
 * @property {Timestamp} date - Travel date/time (copied from train's departureDate).
 * @property {string} [seat] - Optional: Assigned seat number (e.g., "A12"). Defaults to 'Not Assigned'.
 * @property {'Confirmed' | 'Cancelled'} status - Booking status.
 * @property {Timestamp} bookedAt - Firestore Timestamp when the booking was created.
 */

/**
 * Searches for available trains based on criteria.
 * @param {object} searchParams - Object containing { from, to, date }.
 * @returns {Promise<Array>} A promise that resolves with an array of train objects.
 * @throws {Error} Throws an error if the query fails.
 */
export const searchTrains = async (searchParams) => {
  try {
    // Convert JS Date to Firestore Timestamp for the start of the day
    const startOfDay = new Date(searchParams.date);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfSearchDayTimestamp = Timestamp.fromDate(startOfDay);

     // Convert JS Date to Firestore Timestamp for the end of the day
    const endOfDay = new Date(searchParams.date);
    endOfDay.setHours(23, 59, 59, 999);
    const endOfSearchDayTimestamp = Timestamp.fromDate(endOfDay);


    const trainsRef = collection(db, "trains");

    // Query for trains matching stations and departing on the selected date
    const q = query(trainsRef,
      where("departureStation", "==", searchParams.from),
      where("arrivalStation", "==", searchParams.to),
      where("departureDate", ">=", startOfSearchDayTimestamp), // Departing on or after the start of the selected day
      where("departureDate", "<=", endOfSearchDayTimestamp) // Departing on or before the end of the selected day
      // You might add ordering: orderBy("departureTime")
      // You might add filtering for available seats if that data exists on the train doc:
      // where("availableSeats", ">", 0) // Or specific class: where(`availableSeats.${searchParams.classType}`, ">", 0)
    );

    const querySnapshot = await getDocs(q);
    const results = [];
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });

    // Note: The date filtering is now done directly in the Firestore query for efficiency.
    // The previous frontend filtering is removed as it's handled by the more precise timestamp query.

    return results;

  } catch (error) {
    console.error("Error searching trains in Firestore: ", error);
    // Re-throw the error to be caught by the component
    throw new Error("Failed to search for trains. Please check the criteria and try again.");
  }
};

/**
 * Fetches all trains scheduled from today onwards.
 * @returns {Promise<Array>} A promise that resolves with an array of train objects.
 * @throws {Error} Throws an error if the query fails.
 */
export const getAllAvailableTrains = async () => {
  const trainsRef = collection(db, 'trains');
  const q = query(trainsRef, orderBy('trainNumber'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    bookedSeats: doc.data().bookedSeats || []
  }));
};

/**
 * Fetches all bookings for a specific user.
 * @param {string} userId - The UID of the user.
 * @returns {Promise<Array>} A promise that resolves with an array of ticket booking objects.
 * @throws {Error} Throws an error if the query fails.
 */
export const getUserTickets = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required to fetch tickets.");
  }
  try {
    const bookingsRef = collection(db, "bookings");
    // Query bookings for the current user, potentially order by booking date or travel date
    const q = query(
        bookingsRef,
        where("userId", "==", userId),
        orderBy("bookedAt", "desc") // Example: show newest bookings first
    );

    const querySnapshot = await getDocs(q);
    const tickets = [];
    querySnapshot.forEach((doc) => {
      tickets.push({ id: doc.id, ...doc.data() });
    });
    return tickets;

  } catch (error) {
    console.error("Error fetching user tickets from Firestore: ", error);
    throw new Error("Failed to load your tickets. Please try again later.");
  }
};

/**
 * Creates a new ticket booking document in Firestore.
 * @param {TrainDocument & {id: string}} train - The train object being booked (including its ID).
 * @param {{uid: string, email?: string}} currentUser - The user object performing the booking.
 * @returns {Promise<import('firebase/firestore').DocumentReference>} A promise that resolves with the new document reference.
 * @throws {Error} Throws an error if the booking fails.
 */
export const bookTicket = async (train, currentUser) => {
   if (!currentUser || !currentUser.uid) {
    throw new Error("User information is required to book a ticket.");
  }
   if (!train || !train.id) {
    throw new Error("Train information is required to book a ticket.");
  }

  try {
    const bookingsRef = collection(db, "bookings");
    const bookingData = {
      userId: currentUser.uid,
      userEmail: currentUser.email || 'N/A', // Include email if available
      trainId: train.id,
      trainName: train.name || 'Unknown Train', // Use train data
      from: train.departureStation,
      to: train.arrivalStation,
      date: train.departureDate, // This should be a Timestamp from the train doc
      // time: train.departureTime, // Include if available on train doc
      // seat: 'Not Assigned', // Implement seat assignment logic if needed
      status: 'Confirmed', // Default status
      bookedAt: Timestamp.now() // Record booking time
    };

    // TODO: Implement transaction for seat availability update if necessary
    // This part is complex and requires updating the 'trains' document atomically.
    // Example (pseudo-code, requires train doc structure knowledge):
    // const trainRef = doc(db, "trains", train.id);
    // await runTransaction(db, async (transaction) => {
    //   const trainDoc = await transaction.get(trainRef);
    //   if (!trainDoc.exists()) {
    //     throw "Train document does not exist!";
    //   }
    //   const currentSeats = trainDoc.data().availableSeats;
    //   if (currentSeats > 0) {
    //     transaction.update(trainRef, { availableSeats: currentSeats - 1 });
    //     // Add the booking doc within the transaction for atomicity
    //     transaction.set(doc(bookingsRef), bookingData); // Note: addDoc cannot be used directly in transaction
    //   } else {
    //     throw "No seats available!";
    //   }
    // });

    // Simple add without seat transaction:
    const docRef = await addDoc(bookingsRef, bookingData);
    console.log("Booking document written with ID: ", docRef.id);
    return docRef; // Return the document reference

  } catch (error) {
    console.error("Error booking ticket in Firestore: ", error);
    throw new Error("Failed to book ticket. Please try again.");
  }
};

/**
 * Deletes a ticket booking document from Firestore.
 * @param {string} ticketId - The ID of the booking document to delete.
 * @returns {Promise<void>} A promise that resolves when deletion is successful.
 * @throws {Error} Throws an error if deletion fails.
 */
export const cancelTicket = async (ticketId) => {
   if (!ticketId) {
    throw new Error("Ticket ID is required to cancel.");
  }
  try {
    const bookingDocRef = doc(db, "bookings", ticketId);
    await deleteDoc(bookingDocRef);
    console.log(`Ticket ${ticketId} cancelled successfully in Firestore.`);

    // TODO: Implement transaction to potentially increment seat availability
    // Similar to booking, requires atomic update on the 'trains' document.

  } catch (error) {
    console.error("Error cancelling ticket in Firestore: ", error);
    throw new Error("Failed to cancel ticket. Please try again.");
  }
};
