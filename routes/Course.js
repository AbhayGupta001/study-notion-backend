// Import the required modules
const express = require("express");
const router = express.Router();

//middlewares
const {
    auth,
    isStudent,
    isInstructor,
    isAdmin
} = require('../middlewares/auth');

//catagory controller imports
const {
    createCategory,
    showAllCategories,
    getCategoryPageDetails,
} = require('../controllers/Category');

//Course controller imports 
const {
    createCourse,
    editCourse,
    getAllCourses,
    getInstructorCourses,
    getCourseDetails,
    getFullCourseDetails,
    deleteCourse
} = require('../controllers/Course');

//section controller imports
const {
    createSection,
    updateSection,
    deleteSection
} = require('../controllers/Section');

//Sub-Section imports
const {
    createSubSection,
    updatedSubSection,
    deleteSubSection
} = require('../controllers/SubSection');

//Raing And Review constroller imports
const {
    createRating,
    getAverageRating,
    getAllRatingReviews,
    getRatingByCourse
} = require('../controllers/RatingAndReview');

const {
    updateCourseProgress
} = require("../controllers/CourseProgress");

// ********************************************************************************************************
//                                      Category routes (Only by Admin)
// ********************************************************************************************************
// Category can Only be Created by Admin
// TODO: Put IsAdmin Middleware here
router.post('/createCategory',auth,isAdmin,createCategory);
router.get('/showAllCategories',showAllCategories);
router.post('/getCategoryPageDetails',getCategoryPageDetails);

// ********************************************************************************************************
//                                      Course routes
// ********************************************************************************************************

//Courses can only be created by instructors
router.post('/createCourse',auth,isInstructor,createCourse);
router.post('/editCourse',auth,isInstructor,editCourse);
router.post('/deleteCourse',auth,isInstructor,deleteCourse);

//Section Handling Routes

//Add Sections in it
router.post('/addSection',auth,isInstructor,createSection);
//update a section 
router.post('/updateSection',auth,isInstructor,updateSection);
//delete section
router.post('/deleteSection',auth,isInstructor,deleteSection);

//Sub section handling routes

//Add SubSection
router.post('/addSubSection',auth,isInstructor,createSubSection);
//update Sub Section
router.post('/updateSubSection',auth,isInstructor,updatedSubSection);
//delete Sub Section
router.post('/deleteSubSection',auth,isInstructor,deleteSubSection);

//Get All registered or published courses
router.get('/getAllCourses',getAllCourses);

//get courses by instructor
router.get('/getInstructorCourses',auth,getInstructorCourses);

//Get Details for a course
router.post('/getCourseDetails',getCourseDetails);

//Get Full Course Details for Lecture Streaming 
router.post('/getFullCourseDetails',auth,isStudent,getFullCourseDetails);

router.post('/updateCourseProgress',auth,isStudent,updateCourseProgress);

// ********************************************************************************************************
//                                      Rating and Review
// ********************************************************************************************************
router.post('/createRating',auth,isStudent,createRating);
router.get('/getAverageRating',getAverageRating);
router.get('/getReviews',getAllRatingReviews);

module.exports = router;