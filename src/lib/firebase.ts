import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signIn = () => signInWithPopup(auth, googleProvider);
export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);

/**
 * Tạo tài khoản Firebase Auth mà KHÔNG đăng xuất Admin hiện tại.
 * Kỹ thuật: khởi tạo một Secondary Firebase App instance riêng biệt,
 * tạo user qua đó, rồi xóa secondary app ngay lập tức.
 */
export const createUserForAdmin = async (email: string, password: string): Promise<string> => {
  const secondaryAppName = `secondary-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return credential.user.uid;
  } finally {
    await secondaryAuth.signOut();
    await deleteApp(secondaryApp);
  }
};

/**
 * Cập nhật mật khẩu Firebase Auth cho user khác mà KHÔNG đăng xuất Admin.
 * Kỹ thuật: đăng nhập Secondary App với mật khẩu cũ → updatePassword → xóa app.
 * Yêu cầu: oldPassword phải đúng (lấy từ Firestore password_plain).
 */
export const updateUserPassword = async (email: string, oldPassword: string, newPassword: string): Promise<void> => {
  const secondaryAppName = `secondary-upd-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const credential = await signInWithEmailAndPassword(secondaryAuth, email, oldPassword);
    await updatePassword(credential.user, newPassword);
  } finally {
    await secondaryAuth.signOut();
    await deleteApp(secondaryApp);
  }
};

/**
 * Admin đặt lại mật khẩu — KHÔNG cần mật khẩu cũ.
 * Thử đăng nhập bằng password_plain đã lưu; nếu không có thì tạo lại Auth account.
 */
export const adminResetPassword = async (email: string, newPassword: string, knownOldPassword?: string): Promise<void> => {
  const secondaryAppName = `secondary-reset-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    if (knownOldPassword) {
      // Thử đăng nhập bằng mật khẩu cũ đã biết
      try {
        const credential = await signInWithEmailAndPassword(secondaryAuth, email, knownOldPassword);
        await updatePassword(credential.user, newPassword);
        return;
      } catch (_) {
        // Mật khẩu cũ không khớp, thử cách khác bên dưới
      }
    }
    // Fallback: Thử đăng nhập bằng chính newPassword (trường hợp đã đổi trước đó)
    try {
      const credential = await signInWithEmailAndPassword(secondaryAuth, email, newPassword);
      // Đã đúng rồi, không cần làm gì
      return;
    } catch (_) {}
    // Cuối cùng: tạo lại account Auth (xóa cũ sẽ cần Admin SDK, nên ta tạo mới — merge)
    try {
      await createUserWithEmailAndPassword(secondaryAuth, email, newPassword);
    } catch (createErr: any) {
      if (createErr.code === 'auth/email-already-in-use') {
        throw new Error('Không thể cập nhật mật khẩu. Mật khẩu cũ trong hệ thống không khớp với Firebase Auth. Hãy liên hệ quản trị hệ thống.');
      }
      throw createErr;
    }
  } finally {
    await secondaryAuth.signOut();
    await deleteApp(secondaryApp);
  }
};

export const logOut = () => signOut(auth);

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Firestore: CONNECTED");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
