import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, UserAccount, INITIAL_USERS } from '../T0_Config';
import { safeString, matchUserRole } from '../T1_Utils';
import { UserProfile } from './index';

const USERS_COLLECTION = 'users';

/**
 * FIREBASE FIRESTORE USER SERVICE
 */
export const UserService = {
  /**
   * Fetch all user accounts from Firebase Firestore collection 'users'.
   * HARD SECURITY GUARD: Only users with 'ADMIN' role are permitted to pull user accounts.
   */
  async fetchUsersFromFirestore(requestorRole?: string): Promise<UserAccount[]> {
    if (requestorRole && requestorRole !== 'ADMIN') {
      console.warn('🔒 [SECURITY GUARD HARD BLOCK] Non-Admin user requested user accounts list. Access blocked!');
      return [];
    }
    try {
      const colRef = collection(db, USERS_COLLECTION);
      const snapshot = await getDocs(colRef);

      if (snapshot.empty) {
        console.log('⚡ Firestore collection "users" is empty. Auto-seeding INITIAL_USERS to Firestore Cloud...');
        const seeded: UserAccount[] = [];
        for (const user of INITIAL_USERS) {
          const docRef = doc(db, USERS_COLLECTION, user.id);
          const userData = {
            ...user,
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
          };
          await setDoc(docRef, userData);
          seeded.push(userData);
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('PMS_2026_USER_ACCOUNTS_KEY', JSON.stringify(seeded));
        }
        return seeded;
      }

      const usersList: UserAccount[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as UserAccount;
        usersList.push({
          ...data,
          id: docSnap.id || data.id
        });
      });

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('PMS_2026_USER_ACCOUNTS_KEY', JSON.stringify(usersList));
      }

      return usersList;
    } catch (err) {
      console.warn('⚠️ Cloud Firestore fetch failed, using local storage cache fallback:', err);
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('PMS_2026_USER_ACCOUNTS_KEY');
        if (raw) {
          try {
            return JSON.parse(raw);
          } catch {
            return INITIAL_USERS;
          }
        }
      }
      return INITIAL_USERS;
    }
  },

  /**
   * Authenticate user credentials against Firebase Firestore cloud records.
   */
  async authenticateUserFirestore(
    emailInput: string,
    passwordInput: string
  ): Promise<{
    success: boolean;
    user?: UserProfile & { id?: string; role?: string; assignedProjectIds?: string[]; exp?: number };
    message: string;
  }> {
    const cleanEmail = safeString(emailInput).trim().toLowerCase();
    const cleanPass = safeString(passwordInput).trim();

    if (!cleanEmail || !cleanPass) {
      return {
        success: false,
        message: '❌ Vui lòng nhập đầy đủ Email và Mật khẩu đăng nhập!'
      };
    }

    const allUsers = await this.fetchUsersFromFirestore();
    const found = allUsers.find(acc => acc.email.toLowerCase() === cleanEmail);

    if (!found) {
      return {
        success: false,
        message: '❌ Email hoặc mật khẩu không chính xác. Vui lòng liên hệ Admin để cấp tài khoản!'
      };
    }

    if (!found.isActive) {
      return {
        success: false,
        message: '🔒 Tài khoản hiện đang bị tạm khóa. Vui lòng liên hệ Quản trị viên!'
      };
    }

    if (found.passwordHash !== cleanPass) {
      return {
        success: false,
        message: '❌ Email hoặc mật khẩu không chính xác. Vui lòng liên hệ Admin để cấp tài khoản!'
      };
    }

    const matchedProfile = matchUserRole(found.email);
    const simulatedExp = Math.floor(Date.now() / 1000) + 3600;

    return {
      success: true,
      user: {
        ...matchedProfile,
        id: found.id,
        name: found.fullName || matchedProfile.name,
        role: found.role,
        assignedProjectIds: found.assignedProjectIds && found.assignedProjectIds.length > 0
          ? found.assignedProjectIds
          : (found.role === 'ADMIN' ? ['ALL'] : ['ALL']),
        exp: simulatedExp
      },
      message: 'Đăng nhập thành công!'
    };
  },

  /**
   * Save or update a user account in Firebase Firestore.
   */
  async saveUserProfileToFirestore(account: UserAccount): Promise<void> {
    try {
      const docId = account.id || `usr-${Date.now().toString().slice(-4)}`;
      const docRef = doc(db, USERS_COLLECTION, docId);
      const updatedData: UserAccount = {
        ...account,
        id: docId,
        email: safeString(account.email).trim().toLowerCase(),
        passwordHash: safeString(account.passwordHash, '123456').trim(),
        fullName: safeString(account.fullName).trim(),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };

      await setDoc(docRef, updatedData, { merge: true });

      // Update local storage cache
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('PMS_2026_USER_ACCOUNTS_KEY');
        const list: UserAccount[] = raw ? JSON.parse(raw) : [...INITIAL_USERS];
        const idx = list.findIndex(a => a.id === docId || a.email.toLowerCase() === updatedData.email);
        if (idx >= 0) {
          list[idx] = updatedData;
        } else {
          list.push(updatedData);
        }
        localStorage.setItem('PMS_2026_USER_ACCOUNTS_KEY', JSON.stringify(list));
      }
    } catch (err) {
      console.error('❌ Failed to save user account to Firestore:', err);
      throw err;
    }
  },

  /**
   * Delete a user account from Firebase Firestore.
   */
  async deleteUserFromFirestore(userId: string): Promise<void> {
    try {
      const docRef = doc(db, USERS_COLLECTION, userId);
      await deleteDoc(docRef);

      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('PMS_2026_USER_ACCOUNTS_KEY');
        if (raw) {
          const list: UserAccount[] = JSON.parse(raw);
          const filtered = list.filter(a => a.id !== userId && a.email.toLowerCase() !== userId.toLowerCase());
          localStorage.setItem('PMS_2026_USER_ACCOUNTS_KEY', JSON.stringify(filtered));
        }
      }
    } catch (err) {
      console.error('❌ Failed to delete user account from Firestore:', err);
      throw err;
    }
  }
};
