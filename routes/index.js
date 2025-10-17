var express = require('express');
var router = express.Router();
var bcrypt = require("bcryptjs");
const User = require("../models/user");
const { redirectIfAuthenticated, isAuthenticated, isAdmin, isUser } = require('../middleware/auth');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// แสดงหน้า register
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('register');
});

router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login');
});


// สมัครสมาชิก (POST)
router.post('/register', async (req, res) => {
  try {
    const { fname, lname, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('register', {
        alert: {
          type: 'error',
          title: 'สมัครสมาชิกไม่สำเร็จ',
          message: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น'
        }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fname,
      lname,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.render('register', {
      alert: {
        type: 'success',
        title: 'สมัครสมาชิกสำเร็จ!',
        message: 'คุณสามารถเข้าสู่ระบบได้แล้ว'
      }
    });

  } catch (err) {
    console.error(err);
    res.render('register', {
      alert: {
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง'
      }
    });
  }
});




router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.render('login', {
        alert: {
          type: 'error',
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          message: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ'
        }
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', {
        alert: {
          type: 'error',
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          message: 'รหัสผ่านไม่ถูกต้อง'
        }
      });
    }

    req.session.userId = user.id;
    req.session.userRole = user.userRole;

    let redirectUrl = '/';
    if (user.userRole === 'admin') {
      redirectUrl = '/admin';
    } else if (user.userRole === 'user') {
      redirectUrl = '/users';
    }

    res.render('login', {
      alert: {
        type: 'success',
        title: 'เข้าสู่ระบบสำเร็จ!',
        message: `ยินดีต้อนรับคุณ ${user.fname}`,
        redirect: redirectUrl 
      }
    });

  } catch (err) {
    console.error(err);
    res.render('login', {
      alert: {
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง'
      }
    });
  }
});


router.get('/users',isUser,(req,res) => {
  res.render('users/userDashboard', { name: 'User Dashboard' });
});

router.get('/admin', isAdmin, (req, res) => {
  res.render('admin/adminDashboard', { name: 'Admin Dashboard' });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;


