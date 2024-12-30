const User = require('../models/User');
const OTP = require('../models/OTP');
const Profile = require('../models/Profile');
const otpGenerator = require('otp-generator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mailSender = require('../utils/mailSender');
const { passwordUpdated } = require('../mail/templates/passwordUpdate')
require('dotenv').config();

//sendOTP
exports.sendOTP = async(req,res)=>{
    try{
        //fetch email from request
        const { email } = req.body;

        //check if already registered or not by checking in db
        const user = await User.findOne({email});

        if(user){
            return res.status(401).json({
                success:false,
                message:'User Already Registered'
            });
        }

        let otp = 0;
        
        let result = null;
        
        do{
            //if new user then generate otp
            otp = otpGenerator.generate(6,{
                upperCaseAlphabets:false,
                lowerCaseAlphabets:false,
                specialChars:false
            });
            console.log("OTP Generated: ",otp);

            //check if otp generated is unique or not
            result = await OTP.findOne({otp: otp});
        }while(result) // if otp present in database then it will regenerate
        
        //if unique otp generated then make entry in database with email sent to the concerned user 

        //data to be mentioned in entry
        const otpPayload = {
            email,otp
        };

        //creating entry -> here otp and email will be taken from payload and date of creation is set default
        const otpBody = await OTP.create(otpPayload);
        console.log("Entry of otp in db: ",otpBody);

        //return response
        return res.status(200).json({
            success:true,
            message:"OTP Sent Successfully",
            otp
        });

    }catch(err){
        console.log(err);
        console.log("OTP not sent. Something went wrong");
        return res.status(500).json({
            success:false,
            message:err.message
        });
    }
}

//SignUp
exports.signUp = async(req,res) =>{
    try{
        //data fetch from body
        const {
            firstName,
            lastName,
            email,
            accountType,
            code,
            contactNumber,
            password,
            confirmPassword,
            otp
        } = req.body;

        //validate data 
        if(
            !otp || 
            !email || 
            !password || 
            !confirmPassword || 
            !firstName||
            !lastName){
            return res.status(401).json({
                success:false,
                message:'Insufficient Information. Fill complete fields'
            });
        }

        //validate password
        if(password !== confirmPassword){
            return res.status(401).json({
                success:false,
                message:'Passwords doesn\'t match'
            });
        }
        
        //check already registered user 
        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(401).json({
                success:false,
                message:'User Already Registered'
            });
        }

        //find most recent otp for a user -> there can be multiple otp's for a single user
        const response = await OTP.find({email}).sort({createdAt:-1}).limit(1);
        console.log(response);
        //verify otp-> 2 cases
        //1. No document with otp found in the collecetion OTP
        if(response.length === 0){
            return res.status(401).json({
                success:false,
                message:'OTP not found'
            });
        } 
        //otp entered by the user is incorrect
        else if(response[0].otp != otp){
            return res.status(401).json({
                success:false,
                message:'Incorrect OTP. Please enter the correct OTP'
            });
        }

        //hash password
        const hashedPassword = await bcrypt.hash(password,10);
        const hashedConfirmPassword = await bcrypt.hash(confirmPassword,10);
        
        //create user 
        let approved = "";
        approved === "Instructor" ? approved = false : approved = true;
        
        //-> creating profile document of current user for additional details in user object
        const profile = await Profile.create({
            gender:null,
            dateOfBirth:null,
            about:null,
            code,
            contactNumber
        });

        console.log(profile);
        
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            confirmPassword: hashedConfirmPassword,
            accountType,
            additionalDetails: profile._id,
            image:`https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
        });

        //return response
        return res.status(200).json({
            success:true,
            newUser,
            message:"User registered successfully"
        });

    }catch(err){
        console.log(err);
        console.log("Signup Failed");
        return res.status(500).json({
            success: false,
            message: "User cannot be registered. Please try again later."
        });
    }
}

//Login
exports.login = async(req,res)=>{
    try{
        //fetch data from body
        const {email,password} = req.body;

        //validate data 
        if(!email || !password){
            return res.status(401).json({
                success:false,
                message:"Incomplete information. Enter all details."
            });
        }

        //check if user registered or not
        const user = await User.findOne({email}).populate("additionalDetails");
        if(!user){
            return res.status(401).json({
                success:false,
                message:"User not registered. Please Signup."
            });
        }

        //compare passwords
        if(await bcrypt.compare(password,user.password)){
            //create token
            let jwtPayload = {
                email: user.email,
                id: user._id,
                accountType: user.accountType
            }

            const token = jwt.sign(jwtPayload,process.env.JWT_SECRET,{
                expiresIn: "4h"
            });
            
            //insert token
            user.token = token;
            user.password = undefined;

            //send cookies
            const cookieOptions = {
                expires: new Date(Date.now() + 4*60*60*1000),
                httpOnly: true
            }

            res.cookie("token",token,cookieOptions).status(200).json({
                success: true,
                token,
                user,
                message: "User Logged In Successfully"
            });
        }
        else{
            //if password incorrect
            return res.status(401).json({
                success:false,
                message:"Incorrect Password. Please enter correct password."
            });
        }
        
    }catch(err){
        console.log(err);
        console.log("Login Failure");
        return res.status(500).json({
            success: false,
            message: "Login Failed. Please try again later"
        });
    }
}

//changePassword
exports.changePassword = async(req,res)=>{
    try{
        //find user details
        const userDetails = await User.findById(req.user.id);

        //fetch the data from req body
        const {oldPassword , newPassword} = req.body;
        
        //validate
        const isPasswordMatch = await bcrypt.compare(
            oldPassword,
            userDetails.password
        );
        
        //if old password does not match with password in db
        if(!isPasswordMatch){
            return res.status(401).json({
                success: false,
                message: "The password is incorrect"
            });
        }

        //compare passwords
        // if(newPassword !== confirmNewPassword){
        //     return res.status(400).json({
        //         success: false,
        //         message: "New Password does not match with confirm password"
        //     });
        // }

        //hash new password
        const encryptedPassword = await bcrypt.hash(newPassword,10);

        //update in db 
        const updatedUserDetails = await User.findByIdAndUpdate(
            req.user.id,
            {password: encryptedPassword},
            {confirmPassword: encryptedPassword},
            {new: true});

        //send mail to user
        try{
            let name = updatedUserDetails.firstName + updatedUserDetails.lastName;
            const emailResponse = await mailSender(
                updatedUserDetails.email,
                "Password Change Mail",
                passwordUpdated(
                    updatedUserDetails.email,
                    name
                )
            );
            console.log("Email sent Successfully",emailResponse.response);
        
        }catch(err){
			// If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
			console.error("Error occurred while sending email:", err);
			return res.status(500).json({
				success: false,
				message: "Error occurred while sending email",
				err: err.message,
			});
        }
		// Return success response
		return res.status(200).json({ 
                success: true, 
                message: "Password updated successfully" 
            });

    }catch(err){
		// If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
		console.error("Error occurred while updating password:", err);
		return res.status(500).json({
			success: false,
			message: "Error occurred while updating password",
			err: err.message,
		});
    }
}
