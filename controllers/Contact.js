
const mailSender = require('../utils/mailSender');
const  contactTemplate  = require('../mail/templates/contactTemplate');

exports.contact = async(req,res)=>{
    try {
        
        const { 
            firstName,
            lastName,
            email,
            phoneNumber,
            message
        } = req.body;

        if(!firstName || !email || !message){
            return res.status(400).json({
                success: false,
                message: "Insufficient Information"
            });
        }

        console.log(email);

        try{
            
            const emailResponse = await mailSender(
                email,
                "Query Recieved",
                contactTemplate(email)
            );

            console.log("Email sent Successfully",emailResponse.response);

        }catch(err){
			// If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
			console.error("Error occurred while sending contact email:", err);
			return res.status(500).json({
				success: false,
				message: "Error occurred while contact sending email",
				err: err.message,
			});
        }

        return res.status(200).json({
            success: true,
            message: "Email Sent Successfully"
        });

    }catch(err){
		// If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
		console.error("Error occurred while sending contact confirmation mail ", err);
		return res.status(500).json({
			success: false,
			message: "Error occurred while sending contact confirmation main",
			err: err.message,
		});
    }
}