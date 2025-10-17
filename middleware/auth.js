const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.redirect('/login');
};
// เอาไว้ตรวจสอบว่าผู้ใช้ล็อกอินอยู่หรือยัง ถ้ายังก็จะไปหน้า /login ถ้า login แล้วก็จะไปต่อ

const isAdmin = (req, res, next) => {
    if (req.session && req.session.userId && req.session.userRole === 'admin') {
        return next();
    }
    return res.redirect('/login');
};
// เอาไว้ตรวจสอบว่าผู้ใช้มี Role เป็น Admin และ Login หรือยัง ถ้ายังก็จะไปหน้า /login ถ้าใช่แล้วก็จะไปต่อ

const isUser = (req, res, next) => {
    if (req.session && req.session.userId && req.session.userRole === 'user') {
        return next();
    }
    return res.redirect('/login');
};
// เอาไว้ตรวจสอบว่าผู้ใช้มี Role เป็น User และ Login หรือยัง ถ้ายังก็จะไปหน้า /login ถ้าใช่แล้วก็จะไปต่อ

const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    // ถ้า login แล้ว redirect ไปหน้า dashboard ตาม role
    if (req.session.userRole === 'admin') return res.redirect('/admin');
    if (req.session.userRole === 'user') return res.redirect('/users');
  }
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isUser,
  redirectIfAuthenticated
};