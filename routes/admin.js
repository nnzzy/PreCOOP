var express = require('express');
var router = express.Router();
const { isAdmin } = require('../middleware/auth'); 

router.get('/', isAdmin, (req, res) => {
  res.render('admin/adminDashboard', {
    title: 'Admin Dashboard'
  });
});

module.exports = router;