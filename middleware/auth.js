// ใช้สำหรับหน้าไหนก็ได้ ที่ต้องล็อกอินก่อนถึงจะเข้าได้
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
};

// ใช้กับหน้า login หรือ register เพื่อกันไม่ให้ผู้ที่ล็อกอินแล้วกลับเข้าหน้า login/register อีก
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin');
    }
    return res.redirect('/users');
  }
  next();
};

// ตรวจสอบว่า user ที่ล็อกอินอยู่เป็น admin มั้ย ถ้าไม่ใช่่จะกลับไปหน้า login
const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.redirect('/login');
};

// ตรวจสอบว่า user ที่ล็อกอินอยู่เป็น user มั้ย ถ้าไม่ใช่่จะกลับไปหน้า login
const isUser = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'user') {
    return next();
  }
  res.redirect('/login');
};

module.exports = { 
  isAuthenticated, 
  redirectIfAuthenticated, 
  isAdmin, 
  isUser };