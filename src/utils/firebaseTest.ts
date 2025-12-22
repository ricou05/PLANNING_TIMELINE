import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    // Try to fetch documents from the schedules collection
    const querySnapshot = await getDocs(collection(db, 'schedules'));
    console.log('Firebase connection successful');
    console.log(`Found ${querySnapshot.size} documents in schedules collection`);
    return true;
  } catch (error) {
    console.error('Firebase connection error:', error);
    return false;
  }
};
