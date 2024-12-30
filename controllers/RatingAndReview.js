const RatingAndReviews = require('../models/RatingAndReview');
const Course = require('../models/Course');
const { default: mongoose } = require('mongoose');

exports.createRating = async(req,res) =>{
    try{
        //get userId
        const userId = req.user.id;

        //fetch data from body
        const { rating,review,courseID } = req.body;
        
        //check is user is enrolled or not 
        const courseDetails = await Course.findOne({
            _id: courseID,
            studentsEnrolled: {
                $elemMatch: {
                    $eq: userId
                }
            }
        });

        if(!courseDetails){
            return res.status(400).json({
                success: false,
                message: "Student not enrolled in the Course"
            });
        }

        //check if already reviewed a course or not
        const isReviewed = await RatingAndReviews.findOne({
            user: userId,
            course: courseID
        });
        
        if(isReviewed){
            return res.status(401).json({
                success: false,
                message: "Course already reviewed by user"
            });
        }

        //create rating 
        const ratingReview = await RatingAndReviews.create({
            rating,
            review,
            course: courseID,
            user: userId
        });

        console.log(ratingReview);

        //update the id of rating in the course it was given for
        const updatedCourseDetails = await Course.findByIdAndUpdate(
            courseID,
            {
                $push: {
                    ratingAndReviews: ratingReview._id
                }
            },
            {new: true}
        ).populate("ratingAndReviews").exec();

        console.log(updatedCourseDetails);

        //return response
        res.status(200).json({
            success: true,
            message: "Rating and Review created successfully",
            data:updatedCourseDetails
        });

    }catch(err){
        console.log(err);
        console.log("Can't be reviewed");
        res.status(500).json({
            success: false,
            message:"Something went wrong while reviewing", 
            error: err.message
        });
    }
}

exports.getAverageRating = async(req,res) =>{
    try{

        //get course id 
        const { courseID } = req.body;

        //calculate average rating
        const result = await RatingAndReviews.aggregate([
            //ratings for given course id will be matched
            {
                $match:{
                    course: new mongoose.Types.ObjectId(courseID)
                }
            },
            //then added into a group and an average of rating will be calculated and added as a key in the array of courses returned where the final rating will be at 0th index
            {
                $group:{
                    _id: null,
                    averageRating: { $avg: "$rating"}
                }
            }
        ]);

        //return average rating
        if(result.length() > 0){
            res.status(200).json({
                success: true,
                averageRating: result[0].averageRating
            });
        }

        //if course is not reviewed by any one yet
        res.status(200).json({
            success: true,
            message: "Average rating is 0. No ratings found for the course.",
            averageRating: 0
        });
        
        //if no rating return 0
    }catch(err){
        console.log(err);
        console.log("Cant get Average Rating");
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
}

//getAllRatings
exports.getAllRatingReviews = async(req,res)=>{
    try{
        //every rating
        const allRatingReview = await RatingAndReviews.find({})
        .sort({rating: "desc"})
        .populate({
            path:"user",
            //while populating show these fields only 
            select: "firstName lastName image"
        })
        .populate({
            path:"course",
            select: "courseName"
        })
        .exec();

        if(!allRatingReview){
            return res.status(400).json({
                success: false,
                message: "No course has been reviewed yet"
            });
        }

        res.status(200).json({
            success: true,
            message: "All ratings fetched successfully",
            data:allRatingReview
        });

    }catch(err){
        console.log(err);
        console.log("Cant get Rating and Reviews");
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
}

//getRatingByCourse

exports.getRatingByCourse = async(req,res)=>{
    try{
        //get course id
        const {courseId} = req.body;
        
        //validate
        if(!courseId){
            return res.status(400).json({
                success: false,
                message: "Course Not Found"
            });
        }
        
        //fetch reviews
        const ratingReview = await RatingAndReviews.findOne({
            course: courseId
        })
        .sort({rating: "desc"})
        .populate({
            path:"user",
            //while populating show these fields only 
            select: "firstName lastName email image"
        })
        .populate({
            path:"course",
            select: "courName"
        })
        .exec();

        //return response
        if(!ratingReview){
            return res.status(400).json({
                success: false,
                message: "No Ratings found.Course not reviewed yet"
            });
        }

        res.status(200).json({
            success: true,
            message: "Ratings and Reviews fetched successfully",
            ratingReview
        });

    }catch(err){
        console.log(err);
        console.log("Cant get Rating and Reviews");
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
}