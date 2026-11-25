export { db, auth } from './config';
export { saveSchedule, saveNewVersion, updateSchedule, getSchedules, deleteSchedule, renameSchedule, renameAllSchedules, MAX_VERSIONS_PER_WEEK } from './schedules';
export type { NewVersionResult } from './schedules';
export type { WriteResult, UpdateOptions, RenameAllResult } from './schedules';
export { syncLocalSchedules, countLocalSchedules } from './sync';
export type { SyncResult } from './sync';
export { saveCloudDraft, loadCloudDraft, clearCloudDraft } from './drafts';
export type { CloudDraft } from './drafts';
export { handleFirebaseError, isFirebaseError } from './error-handling';
export {
  BOOTSTRAP_ADMIN_EMAIL,
  normalizeEmail,
  getAuthErrorMessage,
  signInUser,
  signInWithGoogle,
  registerUser,
  sendVerificationEmail,
  refreshEmailVerification,
  resetPassword,
  signOutUser,
  subscribeToAuthState,
} from './auth';
export {
  getAllowedUser,
  lookupAllowedUser,
  listAllowedUsers,
  addAllowedUser,
  removeAllowedUser,
  ensureBootstrapAdminDoc,
  describeFirestoreError,
  diagnoseUserAccess,
  FIRESTORE_RULES,
  FIRESTORE_RULES_CONSOLE_URL,
} from './users';
export type {
  AllowedUser,
  AllowedUserLookup,
  UserRole,
  AddUserResult,
  AccessDiagnostic,
  AccessProbe,
} from './users';