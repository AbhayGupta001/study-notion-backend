const Course = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { uploadImageToCloudinary } = require('../utils/imageUploader');
const { convertSecondsToDuration } = require('../utils/secToDuration');
require('dotenv').config();

exports.updateProfile = async(req,res)=>{
    try{
        //get id
        const {firstName,lastName,dateOfBirth="",about="",gender,contactNumber } = req.body;
        const userId = req.user.id;

        //validate
        if(!contactNumber || !gender || !userId){
            return res.status(401).json({
                success: false,
                message: "Fill the fields marked with \'*\'"
            });
        }

        //find profile id from user object using user id
        const user = await User.findById(userId).populate("additionalDetails");
        const profileId = user.additionalDetails;
        const profileDetails = await Profile.findById(profileId);

        //update->new method to update 

        //updating the values of object profile
        profileDetails.gender = gender;
        profileDetails.dateOfBirth = dateOfBirth;
        profileDetails.about = about;
        profileDetails.contactNumber = contactNumber;

        //saving the updated project in db
        await profileDetails.save();

        // console.log(profileDetails);

        user.firstName = firstName;
        user.lastName = lastName;
        user.additionalDetails = profileDetails;
        await user.save();

        // console.log(user);

        //old method to update->
        // const updatedProfile = await Profile.findByIdAndUpdate(profileId,
        //     {
        //         gender,
        //         dateOfBirth,
        //         about,
        //         contactNumber
        //     });

        //return response
        res.status(200).json({
            success: true,
            message: "Profile Updated Successfully",
            updatedUserDetails:user
        }); 

    }catch(err){
        console.log(err);
        console.log("Profile updation unsuccessfull");
        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try later"
        });
    }
}

//delete account
//explore task or job scheduling a request 
// explore cronjob
exports.deleteAccount = async(req,res) => {
    try{
        //fetch id
        const userId = req.user.id;
        
        //get details
        const userDetails = await User.findById(userId);

        //delete profile i.e. additional details
        const profileId = userDetails.additionalDetails;
       await Profile.findByIdAndDelete(profileId);

        //HW: if user is a student then 
        //course progress of a student
        if(userDetails.accountType === "Student"){
            userDetails.courseProgress.forEach(async(progressId) => {
                
                // Emtying the course progress array in user model
                userDetails.courseProgress.pop();

                // await User.findByIdAndUpdate(userDetails._id,
                //     {
                //         $pop: {
                //             courseProgress: progressId
                //         }
                // });

                // deleting the document for course progress with following id
                await CourseProgress.findByIdAndDelete(progressId);
            });
        }
         
        // saving the userdetails in db after emptying course progress array
        await userDetails.save();

        // delete the id from students endrolled
        userDetails.courses.forEach(async(courseId)=>{
            await Course.findByIdAndUpdate(courseId,
            {
                $pop: {
                    studentsEnrolled: userId
                }
            });
        });
        
        //delete user
        await User.findByIdAndDelete(userId);

        res.status(200).json({
            success: true,
            message: "Account deleted successfully"
        });

    }catch (error) {
		console.log(error);
		console.log("User Cannot be deleted");
        res.status(500).json({
            success: false,
            message: "User Cannot be deleted successfully"
         });
	}
}        

exports.getAllUserDetails = async (req, res) => {
	try {
		const id = req.user.id;
		const userDetails = await User.findById(id)
			.populate("additionalDetails")
			.exec();
		console.log(userDetails);
		res.status(200).json({
			success: true,
			message: "User Data fetched successfully",
			data: userDetails,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

//update profile picture
exports.updateProfilePicture = async(req,res)=>{
    try{
        //fetch data
        const image = req.files.imageFile;
        const userId  =  req.user.id;

        //validate
        if(!image){
            return res.status(400).json({
                success: false,
                message: "Image File Not Found"
            });
        }

        //upload image to cloudinary
        const imageDetails = await uploadImageToCloudinary(
            image,
            process.env.FOLDER_NAME,
            1000,
            1000);
        
        console.log(imageDetails);
        
        //get user detais
        let updatedUserDetails = await User.findByIdAndUpdate(
            userId,
            {image: imageDetails.secure_url},
            {new: true}
        );

        //return respomse
        res.status(200).json({
            success: true,
            message: "Profile Picture Updated Successfully",
            data: updatedUserDetails
        });
    }catch(err){
        return res.status(500).json({
            success: false,
            message: "Failed to update the Profile Picture",
        });
    }
}

//enrolled courses for user
exports.getEnrolledCourses = async (req, res) => {
    try {
        const userId = req.user.id
        let userDetails = await User.findOne({
            _id: userId,
        })
        .populate({
            path:"courses",
            populate:{
                path:"courseContent",
                populate:{
                    path:"subSection"
                }
            }
        })
        .exec()
      
        if (!userDetails) {
            return res.status(400).json({
            success: false,
            message: `Could not find user with id: ${userDetails}`,
            })
        }

        userDetails = userDetails.toObject()
        var SubsectionLength = 0
        for (var i = 0; i < userDetails.courses.length; i++) {
          let totalDurationInSeconds = 0
          SubsectionLength = 0
          for (var j = 0; j < userDetails.courses[i].courseContent.length; j++) {
            totalDurationInSeconds += userDetails.courses[i].courseContent[
              j
            ].subSection.reduce((acc, curr) => acc + parseInt(curr.timeDuration), 0)
            userDetails.courses[i].totalDuration = convertSecondsToDuration(
              totalDurationInSeconds
            )
            SubsectionLength +=
              userDetails.courses[i].courseContent[j].subSection.length
          }
          let courseProgressCount = await CourseProgress.findOne({
            courseID: userDetails.courses[i]._id,
            userId: userId,
          })
          courseProgressCount = courseProgressCount?.completedVideos.length
          if (SubsectionLength === 0) {
            userDetails.courses[i].progressPercentage = 100
          } else {
            // To make it up to 2 decimal point
            const multiplier = Math.pow(10, 2)
            userDetails.courses[i].progressPercentage =
              Math.round(
                (courseProgressCount / SubsectionLength) * 100 * multiplier
              ) / multiplier
          }
        }

        return res.status(200).json({
            success: true,
            data: userDetails.courses,
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        })
    }
};

exports.instructorDashboard = async(req,res)=>{
    try{

        const userId = req.user.id;

        const courseDetails = await Course.find({instructor:userId});

        if(!courseDetails)
            return res.status(404).json({success:false,message:"No Course Found"});

        const courseData = courseDetails?.map(course => {
            const totalStudentsEnrolled = course?.studentsEnrolled?.length;
            const totalAmountGenerated = totalStudentsEnrolled * course?.price;

            const courseDataWithStats = {
                _id:course?._id,
                courseName:course?.courseName,
                totalStudentsEnrolled,
                totalAmountGenerated
            }

            return courseDataWithStats;
        })

        res.status(200).json({
            success:true,
            data:courseData
        });

    }catch(err){
        console.log(err);
        res.status(500).json({success:false,message:"Internal Sever Error"});
    }
}