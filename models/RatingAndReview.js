const mongoose = require('mongoose');

const ratingAndReviewSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required: true
    },
    rating:{
        type:Number,
        required:true
    },
    review:{
        type:String,
        required:true,
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        index: true,
        //instead of making id for odereing documents in schema we will now get documents ordered on bases of course id
        required: true
    }
});

module.exports = mongoose.model("RatingAndReview",ratingAndReviewSchema);