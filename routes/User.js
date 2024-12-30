const express = require('express');
const router = express.Router();

const { auth } = require('../middlewares/auth');
const { contact } = require('../controllers/Contact');

const {
    sendOTP,
    signUp,
    login,
    changePassword,
} = require('../controllers/Auth');

const {
    resetPasswordToken,
    resetPassword
} = require('../controllers/ResetPassword');


//Rutes for Login, Signup and Authentication

//***************************************************************************************
//                                 AUTHENTICATION ROUTES
//***************************************************************************************

//Singup
router.post('/signup',signUp);

//sending otp
router.post('/sendotp',sendOTP);

//login route
router.post('/login',login);

//changing password
router.post('/changePassword',auth,changePassword);


//***************************************************************************************
//                                 RESET PASSWORD ROUTES
//***************************************************************************************

//reset password token
router.post('/reset-password-token',resetPasswordToken);

//reset password
router.post('/reset-password',resetPassword);

//***************************************************************************************
//                                 CONTACT ROUTE
//***************************************************************************************

router.post('/contact',contact);

module.exports = router;