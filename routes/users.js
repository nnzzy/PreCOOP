var express = require('express');
var router = express.Router();
const { isUser } = require('../middleware/auth');


router.get('/', isUser, (req, res) => {
   res.render('users/userDashboard', { title: 'User Dashboard' });
});

module.exports = router;