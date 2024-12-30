const express = require('express');
const app = express();

const userRoutes = require('./routes/User');
const profileRoutes = require('./routes/Profile');
const courseRoutes = require('./routes/Course');
const paymentRoutes = require('./routes/Payments');

const database = require('./config/database');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
//this package enables both front end and backend at different ports simultaneously 
const cors = require('cors');
const dotenv = require('dotenv');
const { cloudinaryConnect } = require('./config/cloudinary');
dotenv.config();

const PORT = process.env.PORT || 5000;
database.connect();
cloudinaryConnect();

app.use(
	cors({
		origin: "*",
		credentials: true,
	})
);

app.use(express.json());
app.use(cookieParser());


app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: "/tmp"
    })
);

app.use('/api/v1/auth',userRoutes);
app.use('/api/v1/profile',profileRoutes);
app.use('/api/v1/course',courseRoutes);
app.use('/api/v1/payment',paymentRoutes);

app.get('/',(req,res) =>{
    res.json({
        success: true,
        message: "Your server is up and running...."
    });
});

app.listen(PORT,()=>{
    console.log(`App is running at ${PORT}`);
});