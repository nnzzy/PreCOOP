const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
};

const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin');
    }
    return res.redirect('/users');
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.redirect('/login');
};

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