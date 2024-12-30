const nodemailer = require('nodemailer');

const mailSender =  async(email,title,body) =>{
    try{
        //create Transporter
        let transporter = nodemailer.createTransport({
            host:process.env.MAIL_HOST,
            auth:{
                user:process.env.MAIL_USER,
                pass:process.env.MAIL_PASS
            }
        });

        //define sendMail function
        const info = transporter.sendMail({
            from: 'StudyNotion || CodeHelp',
            to:`${email}`,
            subject:`${title}`,
            html:`${body}`
        });
        console.log(info);

        return info;
    }
    catch(err){
        console.log(err.message);
    }
}

module.exports = mailSender;