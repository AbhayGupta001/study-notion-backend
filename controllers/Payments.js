const  mongoose = require('mongoose');
const {instance} = require('../config/razorpay');
const crypto = require('crypto');
const Course = require('../models/Course');
const User = require('../models/User');
const CourseProgress = require('../models/CourseProgress');
const { courseEnrollmentEmail } = require('../mail/templates/courseEnrollmentEmail');
const mailSender = require('../utils/mailSender');
const {paymentSuccessEmail} = require('../mail/templates/paymentSuccessEmail') 


//purchasing multiple courses in one go without using web hook
exports.capturePayment = async(req,res) =>{

    const {courses} = req.body;
    const userId = req.user.id;

    // console.log(courses);
    if(courses.length == 0)
        return res.status(404).json({success:false , message:"Please Provide Course ID"});

    let totalAmount = 0;
    for(const course_id of courses){
        try{

            const course = await Course.findById(course_id);
            //check if course present in db
            if(!course)
                return res.status(200).json({success:false,message:"Course not Found"});

            //now check if user is already enrolled in it
            const uid = new mongoose.Types.ObjectId(userId); 
            if(course?.studentsEnrolled?.includes(uid))
                return res.status(200).json({success:false,message:"User Already Enrolled"});

            //Add the price of course in total amount
            totalAmount += course?.price;

        }catch(error){
            console.log(error)
            return res.status(500).json({ success: false, message: error.message })
        }
    }

    //create order or initiate payment
    const options = {
        amount: totalAmount*100, //amount is multiplied by 100 and then sent to razorpay
        currency:"INR",
        receipt: Math.random(Date.now()).toString()
    }

    try{

        const paymentResponse = await instance.orders.create(options);
        if(paymentResponse)
           return res.status(200).json({
                        success:true,
                        data: paymentResponse
                    });

    }catch(err){
        console.log(err);
        res.status(500).json({
            success:false,
            message:"Could no initiate order"
        })
    }
}

//if payment successful then send the mail to user
exports.sendPaymentSuccessfullEmail = async(req,res)=>{
    const {orderId,paymentId,amount} = req.body;
    const userId = req.user.id;

    // console.log("details: ",orderId,paymentId,amount,userId);

    if(!orderId || !paymentId || !amount || !userId){
        return res
        .status(404).json({success:false,message:"Please provide all details"});
    }
    
    try{

        const enrolledStudent = await User.findById(userId);

        const body = paymentSuccessEmail(
            `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
            amount/100,orderId,paymentId
        );
        
        //send mail to user for confirming successfull payment
        await mailSender(
            enrolledStudent.email,
            `Payment Received`,
            body
        );

    }catch(err){
        console.log("error in sending mail", err)
        return res
          .status(400)
          .json({ success: false, message: "Could not send email" })
    }
}

//verify the payment and enroll student if verified
exports.verifySignature = async(req,res) =>{
    const razorpay_order_id = req?.body?.razorpay_order_id;
    const razorpay_payment_id = req?.body?.razorpay_payment_id;
    const razorpay_signature = req?.body?.razorpay_signature;
    const courses = req?.body?.courses;

    const userId = req.user.id;

    // console.log("details",razorpay_order_id,razorpay_payment_id,razorpay_signature,userId);

    //validating data
    if(!razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature ||
        !courses ||
        !userId
    )
        return res.status(404).json({success:false,message:"Payment Failed"});
    
    //attaching order_id and payment_id as one through OR operator
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    
    const expectedSignature = crypto
        .createHmac("sha256",process.env.RAZORPAY_SECRET) //Encrypting the razorpay secret
        .update(body.toString()) //attching body in string format with encrypted key
        .digest("hex"); //now again applying the cryptographic algorithm on complete string
    
    //the above signature expected is created and compared with the signature received 
    if(expectedSignature === razorpay_signature){

        //if payment verified now enroll students in courses
        // console.log(req.body);
        await enrollStudents(courses,userId,res);
        return res.status(200).json({ success: true, message: "Payment Verified" })
    }
    
    return res.status(200).json({ success: false, message: "Payment Failed" })
}

const enrollStudents = async(courses,userId,res)=>{
    if(!courses || !userId)
        return res.
            status(400).json({success:false,message:"Please provide courseId and UserId"});

    //add courses Id's in user model and user Id in all enrolled courses
    for(const course_id of courses){
        try{
            //enroll student in course
            const enrolledCourse = await Course.findByIdAndUpdate(
                { _id:course_id },
                { $push:{ studentsEnrolled:userId } },
                { new:true }
            );

            if(!enrolledCourse)
                return res
                        .status(404).json({success:false,message:"Course Not Found"});
            
            console.log("Updated Course: ",enrolledCourse);

            // create the course progress and add in the user so that it can be updated in future
            const courseProgress = new CourseProgress({
                courseID: course_id,
                userId: userId,
                completedVideos: [],
            });

            await courseProgress.save();

            //add course in user -> courses
            const enrolledStudent = await User.findByIdAndUpdate(
                {_id:userId},
                { 
                    $push:{ courses:course_id },
                    courseProgress: courseProgress._id
                },
                {new: true}
            );
            console.log("Enrolled Student",enrolledStudent); 

            //send mail to user for course enrollment confirmation
            const name = enrolledStudent.firstName + enrolledStudent.lastName;
            const courseName = enrolledCourse.courseName;

            //body template for Course Enrollement Mail
            const body = courseEnrollmentEmail(courseName,name);
            const mailResponse = await mailSender(
                enrolledStudent.email,
                `Successfully Enrolled into ${enrolledCourse.courseName}`,
                body
            );
            
            console.log("Enrollment Mail sent successfully",mailResponse);

        }catch(err){
            console.log(err);
            res.status(500).json({
                success:false,
                message:err.message
            })
        }
    }
}

//purchasing single course using webhooks
// exports.capturePayment = async(req,res) =>{

//     //fetch data 
//     const { courseID, userID } = req.body;
    
//     //validate
//     if(!courseID){
//         return res.status(400).json({
//             success: false,
//             message: "Please provide valid Course Id"
//         });
//     }

//     //validate course details
//     let courseDetails;
//     try{
//         courseDetails = await Course.findById(courseID);
//         if(!courseDetails){
//             return res.status(400).json({
//                 success: false,
//                 message: "Course Not Found"
//             });
//         }
        
//         const uid = new mongoose.Types.ObjectId;
//         //check if user is already enrolled
//         if(courseDetails.studentsEnrolled.includes(userID)){
//             return res.json({
//                 success: false,
//                 message: "User Already Enrolled in Course"
//             });
//         }
//     }catch(err){
//         return res.status(500).json({
//             success: false,
//             message: err.message
//         });
//     }

//     //create orders
//     const amount = courseDetails.price;
//     const currency = "INR";

//     const options = {
//         amount,
//         currency,
//         receipt: Math.random(Date.now()).toString(),
//         //needed for enrolling students after purchasing the courses
//         notes:{
//             courseID,
//             userID
//         }
//     }
    
//     //now instantiate payment 
//     try{
//         const paymentResponse = await instance.orders.create(options);
//         console.log(paymentResponse);
//         res.status(200).json({
//             success: true,
//             courseName: courseDetails.courseName,
//             courseDesciption: courseDetails.courseDescription,
//             thumbnail: courseDetails.thumbnail,
//             order_id: paymentResponse.id,
//             currency: paymentResponse.currency,
//             amount: paymentResponse.amount
//         });

//     }catch(err){
//         return res.status(500).json({
//             success: false,
//             message: "Failed to capture payment"
//         });
//     }
// }

// // verify signature authorize payment and enroll student 
// exports.verifySignature = async(req,res) =>{
//     //our web hook secret key
//     const webhookSecret = "1234";

//     //fetch signature fron req
//     const signature = req.headers("x-razorpay-signature");

//     //now signature is encrypted so we have to encrypt our webhookSecret and then compare with signature
//     const shasum = crypto.createHmac("sha256",webhookSecret);
//     //converting it into a string
//     shasum.update(JSON.stringify(req.body));
//     //in generql after encryption these text are called digest that are in Hexa decimal format
//     const digest = shasum.digest("Hex");

//     //now comparing the two keys
//     if(signature === digest){
//         console.log("Password Authorized");

//         //Action to be performed after payment is authorized->  now enroll the student
//         //get course and user id
//         const { courseID , userID } = req.body.payload.payment.entity.notes;

//         try{
//             //enroll in course
//             const enrolledCourse = await Course.findByIdAndUpdate(courseID,
//                 {
//                     $push:{
//                         enrolledCourse:userID
//                     }
//             },
//             {new: true});

//             //validate if course exist or not 
//             if(!enrolledCourse){
//                 return res.status(400).json({
//                     success: false,
//                     message: "Course Not Found"
//                 });
//             }

//             console.log(enrolledCourse);

//             //create the course progress and add in the user so that it can be updated in future
//             const courseProgress = new CourseProgress({
//                 courseID: courseID,
//             });

//             //add course in user -> courses
//             const enrolledStudent = await User.findByIdAndUpdate(userID,
//                 {
//                     $push:{
//                         courses:courseID
//                     },
//                     courseProgress: courseProgress._id
//                 },
//                 {new: true});
//             console.log(enrolledStudent);

//             //mail send for enrolled course
//             const name = enrolledStudent.firstName + enrolledStudent.lastName;
//             const courseName = enrolledCourse.courseName;

//             const body = courseEnrollmentMail(courseName,name);
//             const mailResponse = await mailSender(
//                 enrolledStudent.email,
//                 "New Course Enrolled",
//                 body
//             );
            
//             console.log(mailResponse);

//             return res.status(200).json({
//                 success: true,
//                 message: "Course Enrolled Successfully"
//             });

//         }catch(err){
//             return res.status(500).json({
//                 success: false,
//                 message: err.message
//             });
//         }
//     }
//     else{
//         return res.status(500).json({
//             success: false,
//             message: "Invalid Request"
//         });
//     }
// }