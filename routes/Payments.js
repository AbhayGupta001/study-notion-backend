const express = require('express');
const router = express.Router();

const { 
    auth , 
    isStudent,  
} = require('../middlewares/auth');

const {
    capturePayment,
    verifySignature,
    sendPaymentSuccessfullEmail
} = require('../controllers/Payments')

router.post('/capturePayment',auth,isStudent,capturePayment);
router.post('/verifySignature',auth,isStudent,verifySignature);
router.post('/sendPaymentSuccessEmail',auth,isStudent,sendPaymentSuccessfullEmail);

module.exports = router;