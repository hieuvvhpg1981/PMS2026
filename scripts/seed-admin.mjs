/**
 * Script: seed-admin.mjs
 * Mục đích: Cập nhật / khởi tạo tài khoản Admin cho email hieuvvhpg@gmail.com
 * Chạy: node scripts/seed-admin.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(readFileSync(configPath, 'utf8'));

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

const ADMIN_EMAIL = 'hieuvvhpg@gmail.com';

const adminProfile = {
  email: ADMIN_EMAIL,
  hoTen: 'Hiếu Vũ',
  phongBan: 'Ban Giám Đốc',
  role: 'Admin',
  trangThai: 'Active',
  preApproved: true,
  matKhau: 'admin123',
  updatedAt: new Date().toISOString(),
};

console.log('📝 Đang cập nhật Firestore...');
console.log('   Collection: users');
console.log('   Document ID:', ADMIN_EMAIL);
console.log('   Data:', JSON.stringify(adminProfile, null, 2));

try {
  await setDoc(doc(db, 'users', ADMIN_EMAIL), adminProfile, { merge: true });
  console.log('\n✅ THÀNH CÔNG! Đã cập nhật tài khoản Admin:');
  console.log('   Email   :', ADMIN_EMAIL);
  console.log('   Họ tên  : Hiếu Vũ');
  console.log('   Phòng ban: Ban Giám Đốc');
  console.log('   Vai trò : Admin');
  console.log('   Mật khẩu: admin123');
  console.log('\n🔑 Hãy đăng nhập ngay tại màn hình chính.');
} catch (err) {
  console.error('❌ LỖI:', err.message);
  process.exit(1);
}

process.exit(0);
