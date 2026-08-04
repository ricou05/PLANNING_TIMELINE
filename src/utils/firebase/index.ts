export { db, auth } from './config';
export { saveSchedule, updateSchedule, getSchedules, deleteSchedule } from './schedules';
export type { WriteResult, UpdateOptions } from './schedules';
export { syncLocalSchedules, countLocalSchedules } from './sync';
export type { SyncResult } from './sync';
export { saveCloudDraft, loadCloudDraft, clearCloudDraft } from './drafts';
export type { CloudDraft } from './drafts';
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