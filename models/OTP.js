const otpTemplate = require('../mail/templates/emailVerificationTemplate')
const mongoose = require('mongoose');
const mailSender = require('../utils/mailSender');

const otpSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true
    },
    otp:{
        type:String,
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now(),
        expires:60*5 //auto delete after 5 mins of creation
    }
});

//otp document db main save hone se pehle mail bhejega user ko data enter krne ke baad

//1. function to send email
async function sendVerificationEmail(email,otp) {
    try{
        const mailResponse = await mailSender(
            email,
            "Verification Email from StudyNotion",
            otpTemplate(otp));
        console.log("Email sent Successfully",mailResponse);
    }
    catch(err){
        console.log("error while send mails",err);
        throw err;
    }
}

//pre middleware for otp
otpSchema.pre("save",async function(next){
    console.log("New document saved to database");
	// Only send an email when a new document is created
	if (this.isNew)
        await sendVerificationEmail(this.email,this.otp);
    //otp successfully send hone ke baad sign success ho jayega fir aage vo jahan pr bhi redirect hoga vo us page ke middleware pr jane ke liye next use kiya
    next();
});

//then model create krke export hoga
module.exports = mongoose.model("OTP",otpSchema);