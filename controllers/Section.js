const Section = require('../models/Section');
const Course = require('../models/Course');

exports.createSection = async(req, res) => {
    try{
        //fetch data 
        const {sectionName,courseID} = req.body;

        //validate
        if(!sectionName || !courseID){
            return res.status(401).json({
                success: false,
                message: "All fields are mandatory."
            });
        }

        //create entry in db
        const newSection = await Section.create({
            sectionName
        });

        //update in respective course
        const updatedCourse = await Course.findByIdAndUpdate(
            courseID,
            {
                $push: {
                    courseContent: newSection._id
                }
            },
            {new: true}
            
        ).populate({
            path: 'courseContent',
            populate: {
                path:'subSection',
            }
        }).exec();


        console.log(updatedCourse);

        // return response 
        res.status(200).json({
            success: true,
            message: "Section created SuccessFully",
            data:updatedCourse
        });

    }catch(err){
        console.log(err);
        console.log("Section creation unsuccessful");
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

exports.updateSection = async(req,res) => {
    try{
        //fetch data
        const {sectionName,sectionID} = req.body;

        console.log(req.body);

        //validate
        if(!sectionName || !sectionID){
            return res.status(401).json({
                success: false,
                message: "All fields are mandatory."
            });
        }

        //update in db
        const updatedSection = await Section.findByIdAndUpdate(
            sectionID,
            {sectionName},
            {new: true}
        ).populate("subSection");

        //return response
        res.status(200).json({
            success: true,
            message: "Section Updated Successfully",
            data:updatedSection
        });

    }catch(err){
        console.log(err);
        console.log("Section Updation unsuccessful");
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
} 

exports.deleteSection = async(req,res) =>{
    try{
        //get ID
        const {sectionId , courseId} = req.body;

        //AT THE TIME OF TESTING
        //course main se is section ki id hatao
        const updatedCourse = await Course.findByIdAndUpdate(
            courseId,
            {
                $pull: {
                    courseContent: sectionId
                }
            },
            {new: true}
        ).populate({
            path: 'courseContent',
            populate: {
                path:'subSection',
            }
        }).exec();

        console.log(updatedCourse);

        //delete section by ID
        await Section.findByIdAndDelete(sectionId);

        //return res
        res.status(200).json({
            success: true,
            message: "Section deleted successfully",
            data:updatedCourse
        });

    }catch(err){
        console.log(err);
        console.log("Section deletion unsuccessful");
        res.status(500).json({
            success: false,
            message: "Unable to delete Section. Please try later"
        });
    }
}