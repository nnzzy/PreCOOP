const express = require('express');
const router = express.Router();
const Equipment = require('../models/equipments');
const Borrow = require('../models/Borrow');
const User = require('../models/user');    
const bcrypt = require('bcrypt');           
const { isUser } = require('../middleware/auth');

router.get('/', isUser, async (req, res) => {
  try {
    const user = req.session.user;

    // นับอุปกรณ์ทั้งหมด
    const totalEquipments = await Equipment.countDocuments({ deleted_at: null });

    // นับอุปกรณ์ที่ยืมได้ (available)
    const availableEquipments = await Equipment.countDocuments({ 
      deleted_at: null, 
      status: 'available' 
    });

    // นับอุปกรณ์ที่ไม่ว่าง (unavailable)
    const unavailableEquipments = await Equipment.countDocuments({ 
      deleted_at: null, 
      status: 'unavailable' 
    });

    // นับจำนวนที่ user คนนี้กำลังยืมอยู่
    const myBorrowedCount = await Borrow.countDocuments({
      user_id: user.id,
      status: { $in: ['waitForRent', 'Borrowed', 'PendingReturn'] }
    });

    res.render('users/userDashboard', { 
      title: 'User Dashboard',
      totalEquipments,
      availableEquipments,
      unavailableEquipments,
      myBorrowedCount
    });
  } catch (err) {
    console.error('Error loading dashboard:', err);
    res.render('users/userDashboard', { 
      title: 'User Dashboard',
      totalEquipments: 0,
      availableEquipments: 0,
      unavailableEquipments: 0,
      myBorrowedCount: 0
    });
  }
});

router.get('/userEquipment', isUser, async (req, res) => {
  try {
    const equipments = await Equipment.find({ deleted_at: null }).populate('category_id');
    res.render('users/userEquipment', { title: 'User Equipment', equipments });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.post('/borrow/:id', isUser, async (req, res) => {
  try {
    const equipmentId = req.params.id;
    const { return_date } = req.body;

    //  ดึง user_id จาก session
    const user = req.session.user; 
    if (!user) {
      return res.status(401).json({ error: 'ไม่พบข้อมูลผู้ใช้ในระบบ กรุณาเข้าสู่ระบบใหม่' });
    }

    //  เพิ่มข้อมูลลงใน collection borrows
    const newBorrow = new Borrow({
      user_id: user.id,
      equipment_id: equipmentId,
      return_date,
      status: 'waitForRent'
    });
    await newBorrow.save();
    //  อัปเดตสถานะของอุปกรณ์
    await Equipment.findByIdAndUpdate(equipmentId, { status: 'unavailable' });

    res.redirect('/users/userEquipment');
  } catch (err) {
    console.error(err);
    res.status(500).send('เกิดข้อผิดพลาดในระบบ');
  }

});

// หน้าคืนอุปกรณ์ - แสดงเฉพาะที่ status = 'Borrowed'
router.get('/returnEquipment', isUser, async (req, res) => {
  try {
    const user = req.session.user;
    
    // ดึงรายการที่ user คนนี้ยืมและมี status เป็น 'Borrowed' หรือ 'PendingReturn'
    const borrowedItems = await Borrow.find({
      user_id: user.id,
      status: { $in: ['Borrowed', 'PendingReturn'] }
    })
    .populate('equipment_id')
    .sort({ created_at: -1 });

    res.render('users/returnEquipment', {
      title: 'returnEquipment',
      borrowedItems,
      alert: null
    });
  } catch (err) {
    console.error('Error loading borrowed items:', err);
    res.render('users/returnEquipment', {
      title: 'returnEquipment',
      borrowedItems: [],
      alert: {
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลได้'
      }
    });
  }
});

// ขอคืนอุปกรณ์ - เปลี่ยน status จาก 'Borrowed' เป็น 'PendingReturn'
router.post('/returnEquipment/:id', isUser, async (req, res) => {
  try {
    const borrowId = req.params.id;
    const user = req.session.user;

    // อัปเดตสถานะ - ตรวจสอบว่าเป็นของ user คนนี้และ status เป็น 'Borrowed'
    const updated = await Borrow.findOneAndUpdate(
      { 
        _id: borrowId, 
        user_id: user.id,
        status: 'Borrowed' 
      },
      { 
        $set: { status: 'PendingReturn' } 
      },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ 
        success: false, 
        message: 'ไม่สามารถขอคืนได้ (อาจขอคืนไปแล้ว)' 
      });
    }

    return res.json({ 
      success: true, 
      message: 'ขอคืนอุปกรณ์เรียบร้อย รอแอดมินอนุมัติ' 
    });
  } catch (err) {
    console.error('Error returning equipment:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดขณะขอคืนอุปกรณ์' 
    });
  }
});

// หน้าประวัติการยืม 
router.get('/borrowhistory', isUser, async (req, res) => {
  try {
    const user = req.session.user;
        
    // ดึงประวัติการยืมที่คืนแล้วของ user คนนี้
    const borrowHistory = await Borrow.find({
      user_id: user.id,
      status: 'Returned'
    })
    .populate('equipment_id')
    .sort({ updated_at: -1 }); 

    res.render('users/borrowHistory', {
      title: 'borrowHistory',
      borrowHistory,
      alert: null
    });
  } catch (err) {
    console.error('Error loading borrow history:', err);
    res.render('users/borrowHistory', {
      title: 'borrowHistory',
      borrowHistory: [],
      alert: {
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดประวัติการยืมได้'
      }
    });
  }
});


router.get('/userSetting', isUser, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    
    if (!user) {
      return res.redirect('/login');
    }

    res.render('users/userSetting', {
      title: 'userSetting',
      user: user,
      locals: {
        user: req.session.user
      }
    });
  } catch (err) {
    console.error('Error loading user settings:', err);
    res.render('users/userSetting', {
      title: 'userSetting',
      user: req.session.user,
      alert: {
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลได้'
      }
    });
  }
});

// อัปเดตข้อมูลส่วนตัว - แก้เป็น JSON response
router.post('/userSetting', isUser, async (req, res) => {
  try {
    const { fname, lname, email } = req.body;
    const userId = req.session.user.id;

    // ตรวจสอบว่า email ซ้ำกับคนอื่นหรือไม่
    const existingUser = await User.findOne({ 
      email: email, 
      _id: { $ne: userId } 
    });

    if (existingUser) {
      return res.json({
        success: false,
        message: 'อีเมลนี้ถูกใช้งานแล้ว'
      });
    }

    // อัปเดตข้อมูล
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { fname, lname, email },
      { new: true }
    );

    // อัปเดต session
    req.session.user = {
      ...req.session.user,
      fname: updatedUser.fname,
      lname: updatedUser.lname,
      email: updatedUser.email
    };

    return res.json({
      success: true,
      message: 'บันทึกข้อมูลเรียบร้อยแล้ว'
    });

  } catch (err) {
    console.error('Error updating user:', err);
    return res.json({
      success: false,
      message: 'ไม่สามารถอัปเดตข้อมูลได้'
    });
  }
});

// เปลี่ยนรหัสผ่าน - แก้เป็น JSON response
router.post('/userSetting/changePassword', isUser, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user.id;

    // ตรวจสอบข้อมูลที่ส่งมา
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // ตรวจสอบว่ารหัสผ่านใหม่ตรงกัน
    if (newPassword !== confirmPassword) {
      return res.json({
        success: false,
        message: 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน'
      });
    }

    // ตรวจสอบความยาวรหัสผ่าน
    if (newPassword.length < 6) {
      return res.json({
        success: false,
        message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
      });
    }

    // ดึงข้อมูล user
    const user = await User.findById(userId);
    
    // ตรวจสอบรหัสผ่านเดิม
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      return res.json({
        success: false,
        message: 'รหัสผ่านเดิมไม่ถูกต้อง'
      });
    }

    // Hash รหัสผ่านใหม่
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // อัปเดตรหัสผ่าน
    await User.findByIdAndUpdate(userId, {
      password: hashedNewPassword
    });

    return res.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว'
    });

  } catch (err) {
    console.error('Error changing password:', err);
    return res.json({
      success: false,
      message: 'ไม่สามารถเปลี่ยนรหัสผ่านได้'
    });
  }
});

module.exports = router;