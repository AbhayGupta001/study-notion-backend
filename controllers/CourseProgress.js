
const SubSection = require("../models/SubSection");
const CourseProgress = require("../models/CourseProgress");

exports.updateCourseProgress = async(req,res)=>{
    try{

        //extract all the data needed
        const {courseId,subSectionId} = req.body;
        const userId = req.user.id;

        // console.log(courseId,"\n",subSectionId);

        //validate
        if(!courseId || !userId || !subSectionId)
            return res.status(400).json({
                success:false,
                message:"Incomplete Information"
            }); 

        //Check if SubSection exist
        const subSection = await SubSection.findById(subSectionId);
        if(!subSection)
            return res.status(404).json({
                success:false,
                message:"SubSection Not Found"
            })

        //check if Course Progress exist
        const courseProgress = await CourseProgress.findOne({
            courseID:courseId,
            userId:userId
        });
        
        if(!courseProgress)
            return res.status(404).json({
                success:false,
                message:"Course Progress does not exist"
            });
        
        //check if SubSection already completed 
        if(courseProgress?.completedVideos?.includes(subSectionId))
            return res.status(400).json({
                success:false,
                message:"User Already Completed this SubSection"
            });
        
        //push new subsection id in completed videos in course progress
        courseProgress?.completedVideos?.push(subSectionId);
        
        // console.log(courseProgress);

        //save the new data in database
        await courseProgress.save();

        //return response
        return res.status(200).json({
            success:true,
            message:"Course Progress Updated Successfully"
        })

    }catch(err){
        console.log(err);
        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        });
    }
}
