const Cloudinary = require('cloudinary').v2;

exports.uploadImageToCloudinary = async(file,folder,height,quality)=>{
    try{
        // validate data
        if(!file || !folder){
            console.log("file or folder missing");
            return;
        }

        //insert folder name in options
        const options = {folder};

        //if height and quality of file given then insert in options
        if(height)
            options.height = height;

        if(quality)
            options.quality = quality;

        options.resource_type = "auto";
        //upload file to cloudinary
        return await Cloudinary.uploader.upload(file.tempFilePath,options);

    }catch(err){
        console.log(err.message);
    }
}