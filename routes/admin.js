var express = require('express');
var router = express.Router();
const { isAdmin } = require('../middleware/auth'); 
const Equipment = require('../models/equipments');
const Categories = require('../models/Categories');
const Borrow = require('../models/Borrow');
const User = require('../models/user');
const bcrypt = require('bcryptjs');



router.get('/', isAdmin, async(req, res) => {
  try {
    const borrows = await Borrow.find()

    
    res.render('admin/adminDashboard', {
      title: 'adminDashboard',
      borrows,
    });
  } catch (err) {
    console.error('Error loading borrows:', err);
    res.render('admin/adminDashboard', {
      title: 'adminDashboard',
      borrows: [],
    });
  }
});

// เพิ่ม multer
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ตั้งค่า multer สำหรับอัพโหลดรูปภาพ
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'public/uploads/equipments';
    // สร้างโฟลเดอร์ถ้ายังไม่มี
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // สร้างชื่อไฟล์ไม่ให้ซ้ำ: timestamp-randomnumber-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'equipment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// กรองเฉพาะไฟล์รูปภาพ
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // จำกัดขนาดไฟล์ 5MB
  }
});

// แสดงหน้ารายการอุปกรณ์
router.get('/equipmentAdmin', isAdmin, async (req, res) => {
  try {
    const equipments = await Equipment.find({ deleted_at: null })
      .populate('category_id')
      .sort({ created_at: -1 });

    let alert = null;
    
    // ตรวจสอบ query parameter
    if (req.query.success === 'add') {
      alert = {
        type: 'success',
        title: 'สำเร็จ!',
        message: 'เพิ่มอุปกรณ์ใหม่เรียบร้อยแล้ว'
      };
    } else if (req.query.success === 'edit') {
      alert = {
        type: 'success',
        title: 'สำเร็จ!',
        message: 'แก้ไขอุปกรณ์เรียบร้อยแล้ว'
      };
    } else if (req.query.success === 'delete') {
      alert = {
        type: 'success',
        title: 'สำเร็จ!',
        message: 'ลบอุปกรณ์เรียบร้อยแล้ว'
      };
    }

    res.render('admin/adminEquipment', {
      title: 'Equipment Admin',
      equipments: equipments,
      alert: alert
    });
  } catch (err) {
    console.error(err);
    res.render('admin/adminEquipment', {
      title: 'Equipment Admin',
      equipments: [],
      alert: {
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลได้'
      }
    });
  }
});

// แสดงหน้าเพิ่มอุปกรณ์
router.get('/equipmentAdmin/add', isAdmin, async (req, res) => {
  try {
    const categories = await Categories.find({ deleted_at: null });
    
    res.render('admin/addEquipment', {
      title: 'เพิ่มอุปกรณ์ใหม่',
      categories: categories
    });
  } catch (err) {
    console.error(err);
    res.render('admin/addEquipment', {
      title: 'เพิ่มอุปกรณ์ใหม่',
      categories: [],
      alert: {
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลหมวดหมู่ได้'
      }
    });
  }
});

// เพิ่มอุปกรณ์ใหม่
router.post('/equipmentAdmin/add', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category_id, description, status, location } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!name || !category_id) {
      const categories = await Categories.find({ deleted_at: null });
      return res.render('admin/addEquipment', {
        title: 'เพิ่มอุปกรณ์ใหม่',
        categories: categories,
        formData: req.body,
        alert: {
          type: 'warning',
          title: 'ข้อมูลไม่ครบถ้วน',
          message: 'กรุณากรอกชื่ออุปกรณ์และเลือกหมวดหมู่'
        }
      });
    }

    // เก็บ path ของรูปภาพ
    const imagePath = req.file ? `/uploads/equipments/${req.file.filename}` : null;

    const newEquipment = new Equipment({
      name: name.trim(),
      category_id,
      description: description ? description.trim() : '',
      status: status || 'available',
      location: location ? location.trim() : '',
      image: imagePath
    });

    await newEquipment.save();
    
    // Redirect with success message
    res.redirect('/admin/equipmentAdmin?success=add');
  } catch (err) {
    console.error('Error adding equipment:', err);
    
    // ถ้ามีการอัพโหลดไฟล์แล้วเกิด error ให้ลบไฟล์ออก
    if (req.file) {
      const fs = require('fs');
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const categories = await Categories.find({ deleted_at: null });
    
    res.render('admin/addEquipment', {
      title: 'เพิ่มอุปกรณ์ใหม่',
      categories: categories,
      formData: req.body,
      alert: {
        type: 'error',
        title: 'เพิ่มอุปกรณ์ไม่สำเร็จ',
        message: err.message || 'กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง'
      }
    });
  }
});


// แสดงหน้าแก้ไขอุปกรณ์
router.get('/equipmentAdmin/edit/:id', isAdmin, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    const categories = await Categories.find({ deleted_at: null });

    if (!equipment) {
      return res.redirect('/admin/equipmentAdmin');
    }

    res.render('admin/editEquipment', {
      title: 'แก้ไขอุปกรณ์',
      equipment: equipment,
      categories: categories
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/equipmentAdmin');
  }
});

// แก้ไขอุปกรณ์
router.post('/equipmentAdmin/edit/:id', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category_id, description, status, location, removeImage } = req.body;
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.redirect('/admin/equipmentAdmin');
    }

    let imagePath = equipment.image;

    // ถ้ามีการอัพโหลดรูปใหม่
    if (req.file) {
      // ลบรูปเก่า
      if (equipment.image) {
        const oldImagePath = path.join(__dirname, '..', 'public', equipment.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imagePath = `/uploads/equipments/${req.file.filename}`;
    } 
    // ถ้ากดลบรูป
    else if (removeImage === 'true') {
      if (equipment.image) {
        const oldImagePath = path.join(__dirname, '..', 'public', equipment.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imagePath = null;
    }

    await Equipment.findByIdAndUpdate(req.params.id, {
      name: name.trim(),
      category_id,
      description: description ? description.trim() : '',
      status,
      location: location ? location.trim() : '',
      image: imagePath
    });

    res.redirect('/admin/equipmentAdmin?success=edit');
  } catch (err) {
    console.error(err);
    
    // ถ้ามีการอัพโหลดไฟล์แล้วเกิด error ให้ลบไฟล์ออก
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    res.redirect('/admin/equipmentAdmin/edit/' + req.params.id);
  }
});

// ลบอุปกรณ์ (Soft Delete)
router.post('/equipmentAdmin/delete/:id', isAdmin, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    

    await Equipment.findByIdAndUpdate(req.params.id, {
      deleted_at: new Date()
    });
    
    res.redirect('/admin/equipmentAdmin?success=delete');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/equipmentAdmin');
  }
});

// แสดงหน้ารายการหมวดหมู่
router.get('/categories', isAdmin, async (req, res) => {
  try {
    const categories = await Categories.find({ deleted_at: null })
      .sort({ created_at: -1 });

    res.render('admin/adminCategories', {
      title: 'จัดการหมวดหมู่',
      categories: categories
    });
  } catch (err) {
    console.error(err);
    res.render('admin/adminCategories', {
      title: 'จัดการหมวดหมู่',
      categories: [],
      alert: {
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลได้'
      }
    });
  }
});

// แสดงหน้าเพิ่มหมวดหมู่
router.get('/categories/add', isAdmin, (req, res) => {
  res.render('admin/addCategories', {
    title: 'เพิ่มหมวดหมู่ใหม่'
  });
});

// เพิ่มหมวดหมู่ใหม่
router.post('/categories/add', isAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    // ตรวจสอบว่ามีหมวดหมู่นี้อยู่แล้วหรือไม่
    const existingCategory = await Categories.findOne({ 
      name: name, 
      deleted_at: null 
    });

    if (existingCategory) {
      return res.render('admin/addCategories', {
        title: 'เพิ่มหมวดหมู่ใหม่',
        formData: req.body,
        alert: {
          type: 'warning',
          title: 'หมวดหมู่นี้มีอยู่แล้ว',
          message: 'กรุณาใช้ชื่อหมวดหมู่อื่น'
        }
      });
    }

    const newCategory = new Categories({
      name
    });

    await newCategory.save();
    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    res.render('admin/addCategories', {
      title: 'เพิ่มหมวดหมู่ใหม่',
      formData: req.body,
      alert: {
        type: 'error',
        title: 'เพิ่มหมวดหมู่ไม่สำเร็จ',
        message: 'กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง'
      }
    });
  }
});

// แสดงหน้าแก้ไขหมวดหมู่
router.get('/categories/edit/:id', isAdmin, async (req, res) => {
  try {
    const category = await Categories.findById(req.params.id);

    if (!category) {
      return res.redirect('/admin/categories');
    }

    res.render('admin/editCategories', {
      title: 'แก้ไขหมวดหมู่',
      category: category
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/categories');
  }
});

// แก้ไขหมวดหมู่
router.post('/categories/edit/:id', isAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    await Categories.findByIdAndUpdate(req.params.id, {
      name
    });

    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/categories/edit/' + req.params.id);
  }
});

// ลบหมวดหมู่ (Soft Delete)
router.post('/categories/delete/:id', isAdmin, async (req, res) => {
  try {
    // ตรวจสอบว่ามีอุปกรณ์ที่ใช้หมวดหมู่นี้อยู่หรือไม่
    const equipmentCount = await Equipment.countDocuments({
      category_id: req.params.id,
      deleted_at: null
    });

    if (equipmentCount > 0) {
      const categories = await Categories.find({ deleted_at: null });
      return res.render('admin/adminCategories', {
        title: 'จัดการหมวดหมู่',
        categories: categories,
        alert: {
          type: 'warning',
          title: 'ไม่สามารถลบได้',
          message: `หมวดหมู่นี้มีอุปกรณ์ที่ใช้งานอยู่ ${equipmentCount} รายการ`
        }
      });
    }

    await Categories.findByIdAndUpdate(req.params.id, {
      deleted_at: new Date()
    });
    
    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/categories');
  }
});

// แสดงถังขยะอุปกรณ์
router.get('/trash/equipments', isAdmin, async (req, res) => {
  try {
    const trashedEquipments = await Equipment.find({ deleted_at: { $ne: null } })
      .populate('category_id')
      .sort({ deleted_at: -1 });

    res.render('admin/trashEquipments', {
      title: 'ถังขยะ - อุปกรณ์',
      equipments: trashedEquipments
    });
  } catch (err) {
    console.error(err);
    res.render('admin/trashEquipments', {
      title: 'ถังขยะ - อุปกรณ์',
      equipments: [],
      alert: {
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลได้'
      }
    });
  }
});

// กู้คืนอุปกรณ์
router.post('/trash/equipments/restore/:id', isAdmin, async (req, res) => {
  try {
    await Equipment.findByIdAndUpdate(req.params.id, {
      deleted_at: null
    });
    res.redirect('/admin/trash/equipments?success=restore');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/trash/equipments?error=restore');
  }
});

// ลบอุปกรณ์ถาวร
router.post('/trash/equipments/permanent-delete/:id', isAdmin, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    
    // ลบรูปภาพ
    if (equipment && equipment.image) {
      const imagePath = path.join(__dirname, '..', 'public', equipment.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // ลบจาก database จริงๆ
    await Equipment.findByIdAndDelete(req.params.id);
    
    res.redirect('/admin/trash/equipments?success=permanent');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/trash/equipments?error=permanent');
  }
});

// ลบอุปกรณ์ในถังขยะทั้งหมดถาวร
router.post('/trash/equipments/empty', isAdmin, async (req, res) => {
  try {
    const trashedEquipments = await Equipment.find({ deleted_at: { $ne: null } });
    
    // ลบรูปภาพทั้งหมด
    for (const equipment of trashedEquipments) {
      if (equipment.image) {
        const imagePath = path.join(__dirname, '..', 'public', equipment.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    }

    // ลบจาก database
    await Equipment.deleteMany({ deleted_at: { $ne: null } });
    
    res.redirect('/admin/trash/equipments?success=empty');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/trash/equipments?error=empty');
  }
});

// แสดงถังขยะหมวดหมู่
router.get('/trash/categories', isAdmin, async (req, res) => {
  try {
    const trashedCategories = await Categories.find({ deleted_at: { $ne: null } })
      .sort({ deleted_at: -1 });

    res.render('admin/trashCategories', {
      title: 'ถังขยะ - หมวดหมู่',
      categories: trashedCategories
    });
  } catch (err) {
    console.error(err);
    res.render('admin/trashCategories', {
      title: 'ถังขยะ - หมวดหมู่',
      categories: [],
      alert: {
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลได้'
      }
    });
  }
});

// กู้คืนหมวดหมู่
router.post('/trash/categories/restore/:id', isAdmin, async (req, res) => {
  try {
    await Categories.findByIdAndUpdate(req.params.id, {
      deleted_at: null
    });
    res.redirect('/admin/trash/categories?success=restore');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/trash/categories?error=restore');
  }
});

// ลบหมวดหมู่ถาวร
router.post('/trash/categories/permanent-delete/:id', isAdmin, async (req, res) => {
  try {
    // ตรวจสอบว่ามีอุปกรณ์ที่ใช้หมวดหมู่นี้หรือไม่ (รวมที่ถูกลบแล้ว)
    const equipmentCount = await Equipment.countDocuments({
      category_id: req.params.id
    });

    if (equipmentCount > 0) {
      return res.redirect('/admin/trash/categories?error=has-equipment');
    }

    // ลบจาก database จริงๆ
    await Categories.findByIdAndDelete(req.params.id);
    
    res.redirect('/admin/trash/categories?success=permanent');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/trash/categories?error=permanent');
  }
});

// ลบหมวดหมู่ในถังขยะทั้งหมดถาวร
router.post('/trash/categories/empty', isAdmin, async (req, res) => {
  try {
    // ตรวจสอบว่ามีหมวดหมู่ที่มีอุปกรณ์ใช้งานอยู่หรือไม่
    const trashedCategories = await Categories.find({ deleted_at: { $ne: null } });
    
    for (const category of trashedCategories) {
      const equipmentCount = await Equipment.countDocuments({
        category_id: category._id
      });
      
      if (equipmentCount > 0) {
        return res.redirect('/admin/trash/categories?error=has-equipment');
      }
    }

    // ลบจาก database
    await Categories.deleteMany({ deleted_at: { $ne: null } });
    
    res.redirect('/admin/trash/categories?success=empty');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/trash/categories?error=empty');
  }
});

// หน้าแสดงรายการยืมให้ admin จัดการ
router.get('/adminManageBorrow', isAdmin, async (req, res) => {
  try {
    // ดึงรายการทั้งหมดแล้ว populate user + equipment
    const borrows = await Borrow.find()
      .populate('user_id', 'fname lname email')       // ดึงชื่อผู้ใช้
      .populate('equipment_id', 'name image')         // ดึงชื่ออุปกรณ์ + รูป (ถ้ามี)
      .sort({ created_at: -1 });

    res.render('admin/adminManageBorrow', {
      title: 'Manage Borrow',
      borrows,
      alert:null
    });
  } catch (err) {
    console.error('Error loading borrows:', err);
    res.render('admin/adminManageBorrow', {
      title: 'Manage Borrow',
      borrows: [],
      alert: { type: 'error', title: 'ผิดพลาด', message: 'โหลดข้อมูลการยืมไม่สำเร็จ' }
    });
  }
});

// อนุมัติการยืม
router.post('/adminManageBorrow/approve/:id', isAdmin, async (req, res) => {
  try {
    const borrowId = req.params.id;

    // ป้องกันการอนุมัติซ้ำ — อัปเดตเฉพาะถ้ายังเป็น waitForRent
    const updated = await Borrow.findOneAndUpdate(
      { _id: borrowId, 
        status: 'waitForRent' },
      { $set: { status: 'Borrowed' } },
      { new: true }
    ).populate('user_id', 'fname lname').populate('equipment_id', 'name');

    if (!updated) {
      // ไม่พบหรือสถานะไม่ใช่ waitForRent (อาจอนุมัติไปแล้ว)
      return res.status(400).json({ success: false, message: 'ไม่สามารถอนุมัติได้ (อาจอนุมัติไปแล้ว)' });
    }

    return res.json({ success: true, message: 'อนุมัติการยืมเรียบร้อย', borrow: updated });
  } catch (err) {
    console.error('Error approving borrow:', err);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดขณะอนุมัติ' });
  }
});

// หน้ายืนยันการคืนอุปกรณ์
router.get('/confirmReturn', isAdmin, async (req, res) => {
  try {
    // ดึงรายการทั้งหมด
    const borrows = await Borrow.find()
      .populate('user_id', 'fname lname email')
      .populate('equipment_id', 'name image')
      .sort({ created_at: -1 });

    res.render('admin/confirmReturn', {
      title: 'confirmReturn',
      borrows,
      alert: null
    });
  } catch (err) {
    console.error('Error loading returns:', err);
    res.render('admin/confirmReturn', {
      title: 'confirmReturn',
      borrows: [],
      alert: { 
        type: 'error', 
        title: 'เกิดข้อผิดพลาด', 
        message: 'ไม่สามารถโหลดข้อมูลได้' 
      }
    });
  }
});

//ยืนยันการคืนอุปกรณ์
router.post('/confirmReturn/approve/:id', isAdmin, async (req, res) => {
  try {
    const borrowId = req.params.id;

    // ค้นหารายการยืมที่มี status = PendingReturn
    const borrow = await Borrow.findOne({ 
      _id: borrowId, 
      status: 'PendingReturn' 
    });

    if (!borrow) {
      return res.status(400).json({ 
        success: false, 
        message: 'ไม่พบรายการหรือไม่ใช่สถานะรอคืน' 
      });
    }

    // อัปเดตสถานะการยืมเป็น Returned
    await Borrow.findByIdAndUpdate(borrowId, {
      $set: { status: 'Returned' }
    });

    // อัปเดตสถานะอุปกรณ์กลับเป็น available
    await Equipment.findByIdAndUpdate(borrow.equipment_id, {
      $set: { status: 'available' }
    });

    return res.json({ 
      success: true, 
      message: 'ยืนยันการคืนอุปกรณ์เรียบร้อย' 
    });
  } catch (err) {
    console.error('Error confirming return:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดขณะยืนยันการคืน' 
    });
  }
});

// แสดงรายชื่อผู้ใช้ทั้งหมด
router.get('/listuser', isAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .sort({ created_at: -1 });

    let alert = null;
    
    // จัดการ Success Messages
    if (req.query.success === 'edit') {
      alert = {
        type: 'success',
        title: 'สำเร็จ!',
        message: 'แก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว'
      };
    } else if (req.query.success === 'delete') {
      alert = {
        type: 'success',
        title: 'สำเร็จ!',
        message: 'ลบผู้ใช้เรียบร้อยแล้ว'
      };
    }
    
    // จัดการ Error Messages
    else if (req.query.error === 'self-delete') {
      alert = {
        type: 'error',
        title: 'ไม่สามารถดำเนินการได้',
        message: 'คุณไม่สามารถลบบัญชีของตัวเองได้'
      };
    } else if (req.query.error === 'has-borrow') {
      alert = {
        type: 'warning',
        title: 'ไม่สามารถลบได้',
        message: 'ผู้ใช้นี้มีประวัติการยืมอุปกรณ์ในระบบ'
      };
    } else if (req.query.error === 'delete') {
      alert = {
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถลบผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง'
      };
    }

    res.render('admin/listUser', {
      title: 'Mange User',
      users,
      alert
    });
  } catch (err) {
    console.error('Error loading users:', err);
    res.render('admin/listUser', {
      title: 'Mange User',
      users: [],
      alert: {
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้'
      }
    });
  }
});

// แก้ไขข้อมูลผู้ใช้ 
router.post('/listuser/edit/:id', isAdmin, async (req, res) => {
  try {
    const { fname, lname, email, userRole } = req.body;
    const userId = req.params.id;

    // ดึงข้อมูลผู้ใช้เดิมมาก่อน
    const existingUserData = await User.findById(userId);
    if (!existingUserData) {
      return res.json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // เตรียมข้อมูลสำหรับอัปเดต (ใช้ค่าเดิมถ้าไม่ได้ส่งมา)
    const updateData = {
      fname: fname ? fname.trim() : existingUserData.fname,
      lname: lname ? lname.trim() : existingUserData.lname,
      email: email ? email.trim() : existingUserData.email,
      userRole: userRole || existingUserData.userRole
    };

    // ตรวจสอบว่าเป็นตัวเองหรือไม่
    const isCurrentUser = req.session.user.id === userId;
    
    // ตรวจสอบว่ากำลังเปลี่ยนบทบาทหรือไม่
    const isRoleChanging = existingUserData.userRole !== updateData.userRole;

    // ถ้าเป็นตัวเองและพยายามเปลี่ยนบทบาท ให้บล็อก
    if (isCurrentUser && isRoleChanging) {
      return res.json({
        success: false,
        message: 'คุณไม่สามารถเปลี่ยนบทบาทของตัวเองได้'
      });
    }

    // ตรวจสอบอีเมลซ้ำ (เฉพาะถ้ามีการเปลี่ยนอีเมล)
    if (updateData.email !== existingUserData.email) {
      const existingUser = await User.findOne({ 
        email: updateData.email, 
        _id: { $ne: userId } 
      });

      if (existingUser) {
        return res.json({
          success: false,
          message: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น'
        });
      }
    }

    // อัปเดตข้อมูล
    await User.findByIdAndUpdate(userId, updateData);

    // ถ้าแก้ไขข้อมูลตัวเอง ให้อัปเดต session ด้วย
    if (isCurrentUser) {
      req.session.user.fname = updateData.fname;
      req.session.user.role = updateData.userRole;
    }

    res.json({
      success: true,
      message: 'แก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว'
    });

  } catch (err) {
    console.error('Error updating user:', err);
    res.json({
      success: false,
      message: 'เกิดข้อผิดพลาดขณะแก้ไขข้อมูล: ' + err.message
    });
  }
});

// ลบผู้ใช้
router.post('/listuser/delete/:id', isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // ป้องกันการลบตัวเอง
    if (req.session.user.id === userId) {
      return res.redirect('/admin/listuser?error=self-delete');
    }

    // ตรวจสอบว่าผู้ใช้มีประวัติการยืมหรือไม่
    const borrowCount = await Borrow.countDocuments({ user_id: userId });

    if (borrowCount > 0) {
      return res.redirect('/admin/listuser?error=has-borrow');
    }

    await User.findByIdAndDelete(userId);
    
    res.redirect('/admin/listuser?success=delete');
  } catch (err) {
    console.error('Error deleting user:', err);
    res.redirect('/admin/listuser?error=delete');
  }
});






module.exports = router;