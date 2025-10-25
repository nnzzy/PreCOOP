var express = require('express');
var router = express.Router();
var bcrypt = require("bcryptjs");
const User = require("../models/user");
const { redirectIfAuthenticated, isAuthenticated, isAdmin, isUser } = require('../middleware/auth');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' , layout: false});
});

// แสดงหน้า register
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('register' , { layout: false });
});

router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login' , { layout: false });
});


// สมัครสมาชิก (POST)
router.post('/register', async (req, res) => {
  try {
    const { fname, lname, email, password, confirm_password } = req.body; // ✅ เพิ่ม confirm_password

    // ตรวจสอบว่ารหัสผ่านทั้งสองช่องตรงกันไหม
    if (password !== confirm_password) {
      return res.render('register', {
        alert: {
          type: 'error',
          title: 'สมัครสมาชิกไม่สำเร็จ',
          message: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณากรอกใหม่อีกครั้ง'
        }
      });
    }

    // ตรวจสอบอีเมลซ้ำ
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

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);

    // สร้างผู้ใช้ใหม่
    const newUser = new User({
      fname,
      lname,
      email,
      password: hashedPassword,
      userRole: 'user'
    });

    await newUser.save();

    // สมัครสำเร็จ
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
        layout: false,
        alert: {
          type: 'error',
          title: 'เข้าสู่ระบบไม่สําเร็จ',
          message: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ'
        }
      });
    }

    // ตรวจสอบรหัสผ่านก่อน
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', {
        layout: false,
        alert: {
          type: 'error',
          title: 'เข้าสู่ระบบไม่สําเร็จ',
          message: 'รหัสผ่านไม่ถูกต้อง'
        }
      });
    }

    // เก็บข้อมูลใน session
    req.session.user = {
      id: user._id,
      role: user.userRole,
      fname: user.fname
    };

    // Redirect ตาม role
    let redirectUrl = '/';
    if (user.userRole === 'admin') {
      redirectUrl = '/admin';
    } else if (user.userRole === 'user') {
      redirectUrl = '/users';
    }

    res.render('login', {
      layout: false,
      alert: {
        type: 'success',
        title: 'เข้าสู่ระบบสําเร็จ!',
        message: `ยินดีต้อนรับคุณ ${user.fname}`,
        redirect: redirectUrl 
      }
    });

  } catch (err) {
    console.error(err);
    res.render('login', {
      layout: false,
      alert: {
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง'
      }
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;


