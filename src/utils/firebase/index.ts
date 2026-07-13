export { db, auth } from './config';
export { saveSchedule, updateSchedule, getSchedules, deleteSchedule } from './schedules';
export { handleFirebaseError } from './error-handling';
export {
  BOOTSTRAP_ADMIN_EMAIL,
  normalizeEmail,
  getAuthErrorMessage,
  signInUser,
  signInWithGoogle,
  registerUser,
  resetPassword,
  signOutUser,
  subscribeToAuthState,
} from './auth';
export {
  getAllowedUser,
  listAllowedUsers,
  addAllowedUser,
  removeAllowedUser,
  ensureBootstrapAdminDoc,
} from './users';
export type { AllowedUser, UserRole } from './users';