const Course = require('../models/Course');
const Category = require('../models/Category');
const User = require('../models/User');
const { uploadImageToCloudinary } = require('../utils/imageUploader');
const { convertSecondsToDuration } = require('../utils/secToDuration');
const CourseProgress = require('../models/CourseProgress');
const Section = require('../models/Section');
const SubSection = require('../models/SubSection');

exports.createCourse = async(req,res) =>{
    try{
        //fetch data and file
        let {
            courseName,
            courseDescription,
            whatYouWillLearn,
            price,
            category,//id of category
            tags,
            status,
			instructions
        } = req.body;

        // console.log(req.body,req.files.thumbnailImage);
        const thumbnail = req.files.thumbnailImage;

        //validate
        if(
            !courseName || 
            !courseDescription || 
            !whatYouWillLearn || 
            !price || 
            !category || 
            !tags || 
            !thumbnail){
            return res.status(401).json({
                success: false,
                message: "All fields are mandatory. Please fill complete fields"
            });     
        }

        //if course status published or else set top draft
		if (!status || status === undefined) {
			status = "Draft";
		}

        //parse json string to json array
        tags = JSON.parse(tags);
        instructions = JSON.parse(instructions);

        //if instructor or not
        const userId = req.user.id;
		const instructorDetails = await User.findById(userId, {
			accountType: "Instructor",
		});

		if (!instructorDetails) {
			return res.status(404).json({
				success: false,
				message: "Instructor Details Not Found",
			});
		}

        //validate catagory
        const categoryDetails = await Category.findById(category);
        if(!categoryDetails){
            return res.status(401).json({
                success: false,
                message: "Invalid Catagory"
            });
        }
        
        //image upload to cloudinary
        const thumbnailImage = await uploadImageToCloudinary(
            thumbnail,
            process.env.FOLDER_NAME
        );
        console.log(thumbnailImage);

        //inserting entry in db
        const newCourse = await Course.create({
            courseName,
            courseDescription,
            instructor: instructorDetails._id,
            whatYouWillLearn,
            price,
            tags,
            thumbnail: thumbnailImage.secure_url,
            category: categoryDetails._id,
            status,
            instructions,
        });

        //password hidden
        if(newCourse){
            newCourse.instructor.password = undefined;
            newCourse.instructor.confirmPassword = undefined;
        }

        //updating user(instructor) course list
        await User.findByIdAndUpdate(
            {_id: instructorDetails._id},
            {
                $push: {
                    courses: newCourse._id
                }
            },
            {new: true});

        //updating course in tag course list
        const updatedCategory = await Category.findByIdAndUpdate(
            {_id: category},
            {
                $push: {
                    courses: newCourse._id
                }
            },
            {new: true});
        console.log(updatedCategory);

        // return response
        return res.status(200).json({
            success: true,
            data: newCourse,
            message: "Course created Successfully"
        });

    }catch(err){
        console.log(err);
        console.log("Course creation unsuccessful");
		res.status(500).json({
			success: false,
			message: "Failed to create course",
			err: err.message,
		});
    }
}

exports.editCourse = async(req,res) =>{
    try{
        //fetch data and file
        const updates = req.body;
        const {courseId} = req.body;

        console.log(req.body);

        //if instructor or not
        const userId = req.user.id;
		const instructorDetails = await User.findById(userId, {
			accountType: "Instructor",
		});

		if (!instructorDetails) {
			return res.status(404).json({
				success: false,
				message: "Instructor Details Not Found",
			});
		}

        //validate course
        const courseDetails = await Course.findById(courseId);
        if(!courseDetails){
            return res.status(401).json({
                success: false,
                message: "Invalid Course"
            });
        }
        
        if(req.files){
            //image upload to cloudinary
            const thumbnail = req.files.thumbnailImage;
            const thumbnailImage = await uploadImageToCloudinary(
                thumbnail,
                process.env.FOLDER_NAME
            );
            console.log(thumbnailImage);
            updates["thumbnail"] = thumbnailImage.secure_url;
        }
        
        // console.log(updates);
        if("tags" in updates)
            updates["tags"] = JSON.parse(updates["tags"]);

        if("instructions" in updates)
            updates["instructions"] = JSON.parse(updates["instructions"]);

        //inserting entry in db
        const updatedCourse = await Course.findByIdAndUpdate(
            {_id: courseDetails._id},
            updates,
            {new: true}
        ).populate({
            path: "courseContent",
            populate:{
                path:"subSection"
            }
        })
        .populate("ratingAndReviews")
        .populate("category")
        .populate("studentsEnrolled")
        .exec();

        //hinding
        if(updatedCourse){
            updatedCourse.instructor.password = undefined;
            updatedCourse.instructor.confirmPassword = undefined;    
        }

        // return response
        return res.status(200).json({
            success: true,
            data: updatedCourse,
            message: "Course updated Successfully"
        });

    }catch(err){
        console.log(err);
        console.log("Course updation unsuccessful");
		res.status(500).json({
			success: false,
			message: "Failed to update course",
			err: err.message,
		});
    }
}

exports.deleteCourse = async(req,res)=>{
    try{

        const {courseId} = req.body;

        //check if course exist 
        const course = await Course.findById(courseId)
        .populate("studentsEnrolled")
        .populate("courseContent").exec();

        if(!course)
            return res.status(404).json({success:false,message:"Course Not Found"});
        
        //Unenroll students
        const studentsEnrolled = course?.studentsEnrolled;
        for(studentId of studentsEnrolled){
            //delete course progress
            const progress = await CourseProgress.findOneAndDelete({
                userId:studentId , courseID:courseId
            });
            
            await User.findByIdAndUpdate(studentId,{
                $pull:{
                    courses:courseId, //removing course from user model
                    courseProgress:progress?._id //removing course progress of course from user
                }
            });
        }

        //delete sections and subsections
        const sections = course?.courseContent;
        for(const section of sections){
            //delete subsections
            for(const subsectionId of section?.subSection){
                await SubSection.findByIdAndDelete(subsectionId);
            }

            //delete section
            await Section?.findByIdAndDelete(section?._id);
        }

        //delete course
        await Course.findByIdAndDelete(courseId);

        res.status(200).json({
            success:true,
            message:"Course Deleted Successfully"
        });

    }catch(err){
        console.log(err);
        res.status(500).json({success:false,message:"Internal Server Error"});
    }
}

exports.getAllCourses = async(req,res)=>{
    try{
        const allCourses = await Course.find(
            {},
            {
                courseName: true,
                courseDescription:true,
                thumbnail: true,
                price: true,
                tags: true,
				instructor: true,
				ratingAndReviews: true,
				studentsEnroled: true,
                createdAt:true
            })
            .populate("instructor")
            .populate("category")
            .populate("ratingAndReviews").exec();

        if(!allCourses){
            return res.status(400).json({
                success: false,
                message: "No Course Found"
            });
        }

        res.status(200).json({
            success: true,
            data: allCourses,
            message: "Courses fetched SuccessFully"
        });

    }catch(err){
        console.log(err);
        console.log("Course fetching unsuccessful");
		return res.status(404).json({
			success: false,
			message: `Can't Fetch Course Data`,
			err: err.message,
		});
    }
}

exports.getInstructorCourses = async(req,res)=>{
    try{

        const userId = req.user.id;

        // console.log(userId);

        const allCourses = await Course.find({instructor:userId})
            .populate({
                path:"courseContent",
                populate:{
                    path:"subSection"
                }
            })
            .populate("instructor")
            .populate("category")
            .populate("ratingAndReviews").exec();

        console.log(allCourses);

        if(!allCourses){
            return res.status(400).json({
                success: false,
                message: "No Course Found"
            });
        }

        res.status(200).json({
            success: true,
            data: allCourses,
            message: "Courses fetched SuccessFully"
        });

    }catch(err){
        console.log(err);
        console.log("Course fetching unsuccessful");
		return res.status(404).json({
			success: false,
			message: `Can't Fetch Course Data`,
			err: err.message,
		});
    }
}

//getCourseDetails
exports.getCourseDetails = async(req,res) =>{
    try{
        //get course id
        const { courseId } =  req.body;
        // const courseID = new mongoose.Types.ObjectId(courseId)

        console.log("courseId: ",courseId);

        //fetch details
        const courseDetails = await Course.findById(
            {_id: courseId})
            .populate({
                path:"instructor",
                populate:{
                    path:"additionalDetails"
                }
            })
            .populate({
                path: "courseContent",
                populate:{
                    path:"subSection"
                }
            })
            .populate("ratingAndReviews")
            .populate("category")
            .populate("studentsEnrolled")
            .exec()
        
        if(!courseDetails){
            return res.status(401).json({
                success: false,
                message: `Course not found with Course ID ${courseId}`
            });
        }

        //find total duration of course
        let totalDurationInSeconds = 0
        courseDetails.courseContent.forEach((content) => {
        content.subSection.forEach((subSection) => {
            const timeDurationInSeconds = parseInt(subSection.timeDuration)
            totalDurationInSeconds += timeDurationInSeconds
        })
        })

        const totalDuration = convertSecondsToDuration(totalDurationInSeconds)
        
        return res.status(200).json({
            success: true,
            message: "Course details fetched successfully",
            data:{course:courseDetails,totalDuration}
        });

    }catch(err){
        console.log(err);
        console.log("Course not found");
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

//Full Course Details for Lecture streaming 
exports.getFullCourseDetails = async(req,res) =>{
    try{
        //get course id
        const { courseId } =  req.body;
        const userId = req.user.id;

        //fetch details
        const courseDetails = await Course.findById(
            {_id: courseId})
            .populate({
                path:"instructor",
                populate:{
                    path:"additionalDetails"
                }
            })
            .populate({
                path: "courseContent",
                populate:{
                    path:"subSection"
                }
            })
            .populate("ratingAndReviews")
            .populate("category")
            .populate("studentsEnrolled")
            .exec()
        
        if(!courseDetails){
            return res.status(401).json({
                success: false,
                message: `Course not found with Course ID ${courseId}`
            });
        }

        let courseProgressCount = await CourseProgress.findOne({
            courseID:courseId,
            userId:userId
        });

        console.log(courseProgressCount);

        //find total duration of course
        let totalDurationInSeconds = 0
        courseDetails.courseContent.forEach((content) => {
        content.subSection.forEach((subSection) => {
            const timeDurationInSeconds = parseInt(subSection.timeDuration)
            totalDurationInSeconds += timeDurationInSeconds
        })
        })

        const totalDuration = convertSecondsToDuration(totalDurationInSeconds)
        
        return res.status(200).json({
            success: true,
            message: "Course details fetched successfully",
            data:{
                course:courseDetails,
                totalDuration,
                completedVideos:courseProgressCount?.completedVideos ? 
                courseProgressCount?.completedVideos :[]
            }
        });

    }catch(err){
        console.log(err);
        console.log("Course not found");
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
}