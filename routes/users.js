const express = require('express');
const router = express.Router();
const Equipment = require('../models/equipments');
const Borrow = require('../models/Borrow');
const { isUser } = require('../middleware/auth');


router.get('/', isUser, (req, res) => {
   res.render('users/userDashboard', { title: 'User Dashboard' });
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



module.exports = router;