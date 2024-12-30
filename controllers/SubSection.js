const Section = require('../models/Section');
const SubSection = require('../models/SubSection');
const { uploadImageToCloudinary } = require('../utils/imageUploader');
require('dotenv').config();

exports.createSubSection = async(req,res) =>{
    try{
        //fetch data and vedio file
        const {title,description,sectionID} = req.body;
        const video = req.files.videoFile;

        //validate -> data & sectionID to check if it exist or not
        if(!sectionID || !title || !description){
            return res.status(401).json({
                success: false,
                message: "All fields are mandatory"
            });
        }
        console.log(video);

        //upload vedio file to cloudinary
        const videoDetails = await uploadImageToCloudinary(video,process.env.FOLDER_NAME);
        console.log("Cloudinary",videoDetails);

        //create entry in db
        const subSectionDetails = await SubSection.create({
            title,
            timeDuration: `${videoDetails.duration}`,
            description,
            videoUrl: videoDetails.secure_url
        });

        console.log(subSectionDetails);

        //update Section object with this newly created subSection ID
        const updatedSection = await Section.findByIdAndUpdate(
            sectionID,
            {
                $push: {
                    subSection: subSectionDetails._id
                }
            },
            {new: true}
        ).populate("subSection");

        console.log(updatedSection);
            
        //return response
        res.status(200).json({
            success: true,
            message: "Sub-Section created successfully",
            data:updatedSection
        });

    }catch(err){
        console.error("Error creating new sub-section:", err);
        res.status(500).json({
            success: false,
            message: "Unable to create section. Please try later",
            error: err.message
        });
    }
}

//update subSection
exports.updatedSubSection = async(req,res) =>{
    try{
        //fetch data
        const {sectionID,subSectionID,title,description} = req.body;

        //validate
        const subSection = await SubSection.findById(subSectionID);
        if(!subSection){
            return res.status(400).json({
                success: false,
                message: "Sub-Section not found"
            });
        }
        
        //if new vedio file then upload to cloudinary
        if(title) 
            subSection.title = title;
        
        if(description) 
            subSection.description = description;

        //upload vedio file to cloudinsry
        if(req.files && req.files.videoFile){
            const video = req.files.videoFile;
            const videoDetails = await uploadImageToCloudinary(
                video,
                process.env.FOLDER_NAME
            );

            subSection.timeDuration = `${videoDetails.duration}`;
            subSection.videoUrl = videoDetails.secure_url;
        }

        //update
        await subSection.save();

        const updatedSection = await Section.findById(sectionID).populate("subSection").exec();

        //return response
        return res.status(200).json({
            success: true,
            message: "Sub Section updated Successfully",
            data:updatedSection
        });

    }catch(err){
        console.error("Error updating sub-section:", err);
        res.status(500).json({
            success: false,
            message: "Unable to update sub-section. Please try later",
            error: err.message
        });
    }
}

//delete subSection
exports.deleteSubSection = async(req,res)=>{
    try{
        //get section and sub section id
        const { sectionId, subSectionId} = req.body;

        //remove sub section id from the main section it belongs to
        const updatedSection = await Section.findByIdAndUpdate(
            sectionId,
            {
                $pull: {
                    subSection : subSectionId
                }
            },
            {new: true}
        ).populate("subSection")
        .exec();

        console.log(subSectionId , updatedSection);
        
        //delete sub section
        const subSection = await SubSection.findByIdAndDelete(subSectionId);

        //validate 
        if(!subSection){
            return res.status(404).json({
                success: false,
                message: "Sub-Section not found"
            });
        }

        //return res
        res.status(200).json({
            success: true,
            message: "Sub-Section deleted successfully",
            data:updatedSection,
        });

    }catch(err){
        console.error("Error deleting sub-section:", error);
        res.status(500).json({
            success: false,
            message: "Unable to delete sub-section. Please try later",
            error: err.message
        });
    }
}