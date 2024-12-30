const User = require('../models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.auth = (req,res,next) =>{
    try{
        //extract token
        const token = req.cookies.token || req.body.token || 
                        req.header("Authorization").replace("Bearer ","");
        
        //check if token found
        if(!token){
            return res.status(401).json({
                success:true,
                message: "Token not found"
            });
        }

        try{
            
            //Verify token
            const decode = jwt.verify(token,process.env.JWT_SECRET);
            console.log(decode);
            
            //inserting the token data in req body so we can authorize the user further
            req.user = decode;

        }catch(err){
            console.log(err);
            console.log("Invalid Token");
            return res.status(401).json({
                success: false,
                message: "Token Invalid"
            });
        }

        //calling authorization middleware
        next();

    }catch(err){
        console.log(err);
        console.log("Authentication Failed");
        res.status(401).json({
            success: false,
            message: "Something went wrong. Authentication Failed"
        });
    }
}

exports.isStudent = async(req,res,next)=>{
    try{
        //if no matching role
        if(req.user.accountType != "Student"){
            return res.status(403).json({
                success: false,
                message: "This is protected route for Students"
            });
        }
        
        //if authorized then next
        next();

    }catch(err){
        console.log(err);
        console.log("Authorization Failed");
        res.status(500).json({
            success: false,
            message: "User role cannot be verified. Please try again later"
        });   
    }
}

exports.isInstructor = async(req,res,next)=>{
    try{
        //if no matching role
        if(req.user.accountType != "Instructor"){
            return res.status(403).json({
                success: false,
                message: "This is protected route for Instructors"
            });
        }
        
        //if authorized then next
        next();

    }catch(err){
        console.log(err);
        console.log("Authorization Failed");
        res.status(500).json({
            success: false,
            message: "User role cannot be verified. Please try again later"
        });   
    }
}

exports.isAdmin = async(req,res,next)=>{
    try{
        //if no matching role
        if(req.user.accountType != "Admin"){
            return res.status(403).json({
                success: false,
                message: "This is protected route for Admin"
            });
        }
        
        //if authorized then next
        next();

    }catch(err){
        console.log(err);
        console.log("Authorization Failed");
        res.status(500).json({
            success: false,
            message: "User role cannot be verified. Please try again later"
        });   
    }
}