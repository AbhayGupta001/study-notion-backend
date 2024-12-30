const User = require('../models/User');
const mailSender = require('../utils/mailSender');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();

//resetPasswordToken-> so that we can identify the user who is reseting the password,
//send Frontend link to enter reset password details
exports.resetPasswordToken = async(req,res)=>{
    try{
        //fetch email
        const email = req.body.email;
		
        //authenticate user
        const user = await User.findOne({ email: email });
		if (!user) {
			return res.json({
				success: false,
				message: `This Email: ${email} is not Registered With Us Enter a Valid Email `,
			});
		}
        
        //create token for authenticating the user during the reset password link
        const token = crypto.randomUUID();

        //now fetching the user for which token is created and then saving the token in the db
        const updatedDetails = await User.findOneAndUpdate(
            {email: email},
            {
                token: token,
                resetPaswordExpiresIn: Date.now() + 5*60*1000 
            },
            {new: true}
        );
        console.log("DETAILS", updatedDetails);

        //createing the reset password frontend link 
        let url = `http://localhost:3000/update-password/${token}`;

        //send mail containing link
        mailSender(
            email,
            "Reset Password",
            `Your Link for email verification is ${url}. Please click this url to reset your password.`
        );

        //return response
        res.status(200).json({
            success: true,
            message: "Email sent successfully"
        });

    }catch(err){
        console.log(err);
        console.log("Failed to send reset password mail");
		return res.status(500).json({
			err: err.message,
			success: false,
			message: `Some Error in Sending the Reset Message`,
		});
    }
}


//resetPassword-> user will click on the link and enter the password and it will be updated in db
exports.resetPassword = async(req,res)=>{
    try{
        //fetch data from body
        const {newPassword,confirmNewPassword,token} = req.body;
        // console.log(newPassword,confirmNewPassword,token);

        //validate data
        if(!newPassword || !confirmNewPassword){
            return res.status(400).json({
                success: false,
                message: "Insufficient Information. Please enter complete feilds"
            });
        }

        if(newPassword != confirmNewPassword){
            return res.status(401).json({
                success: false,
                message: "Password doesn't match. Please enter correct password"
            });
        }

        //fetch data through token from db and validate it
        const userDetails = await User.findOne({token: token});

        if(!userDetails){
            return res.status(400).json({
                success: false,
                message: "Invalid Token"
            });
        }
        //check if token is expired or not
        if(userDetails.resetPaswordExpiresIn < Date.now()){
            return res.status(401).json({
                success: false,
                message: "Token expired. Please try to again to reset Password"
            });
        }

        //hash password
        const encryptedPassword = await bcrypt.hash(newPassword,10);

        //update password
        await User.findOneAndUpdate(
            {token},
            {
                password: encryptedPassword,
                confirmPassword: encryptedPassword
            },
            {new: true}
        );

        //return response
        res.status(200).json({
            success: true,
            message: "Password Reset Successful"
        });

    }catch(err){
        console.log(err);
        console.log("Failed to reset password");
        res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again later."
        });        
    }
}