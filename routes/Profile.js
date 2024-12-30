const express = require('express');
const router = express.Router();

const { auth, isStudent, isInstructor } = require('../middlewares/auth');
const { 
    updateProfile,
    deleteAccount,
    getAllUserDetails,
    updateProfilePicture,
    getEnrolledCourses,
    instructorDashboard
} = require('../controllers/Profile');


//Rutes for Update profile, get all user details, get courses enrolled for a user, delete account or profile

//***************************************************************************************
//                                 PROFILE ROUTES
//***************************************************************************************

// update and get profile details 
router.get('/getUserDetails',auth,getAllUserDetails);
router.put('/updateProfile',auth,updateProfile);
router.put('/updateDisplayPicture',auth,updateProfilePicture);
router.get('/getEnrolledCourses',auth,isStudent,getEnrolledCourses);
router.get('/instructorDashboard',auth,isInstructor,instructorDashboard);

//delete account
router.delete('/deleteProfile',auth,deleteAccount);

module.exports = router;