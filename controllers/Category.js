const Category = require('../models/Category');

function getRandomInt(max) {
    return Math.floor(Math.random() * max)
}

//create a tag
exports.createCategory = async(req,res) =>{
    try{
        //fetch data
        const {name,description} = req.body;

        //validate
        if(!name){
            return res.status(400).json({
                success: false,
                message:"Category Not Found. Please enter category"
            });
        }

        //entry in db
        const categoryDetails = await Category.create({
            name,
            description
        });
        console.log("category: ",categoryDetails);

        //return response
        res.status(200).json({
            success: true,
            message: "Category created successfully"
        });

    }catch(err){
        console.log(err);
        console.log("Category not created");
        
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

//get All categories
exports.showAllCategories = async(req,res) =>{
    try{
        //it will return array of tags containing name and description only for each tags
        const allCategories = await Category.find(
            {},
            {
                name: true, 
                description:true,
            });

        if(!allCategories){
            return res.status(400).json({
                success: false,
                message: "No Categories Found"
            });
        }

        res.status(200).json({
            success: true,
            allCategories,
            message: "Categories fetched successfully"
        });

    }catch(err){
        console.log(err);
        console.log("Categories not fetched");
        
        res.status(500).json({
            success: false,
            message: err.message
        });        
    }
}

//get all catagory page details
exports.getCategoryPageDetails = async(req,res)=>{
    try{
        
        //get catagory id
        const {categoryId} = req.body;

        console.log("category details id:",categoryId);

        //fetch all courses in that catagory
        const selectedCategory = await Category.findById(categoryId)
            .populate({
                path:"courses",
                match: {status:"Published"},
                populate:{
                    path:"instructor",
                },
            })
            .populate({
                path:"courses",
                match: {status:"Published"},
                populate:{
                    path:"ratingAndReviews",
                },
            }).exec();
        
        // console.log("selected: ",selectedCategory);
        
        //validate
        if(!selectedCategory || 
            !selectedCategory.courses.length){
                return res.status(400).json({
                    success: false,
                    message:"Courses Not Found for the selected category"
                });
            }
            
        //get courses from different catagories
        const categoriesExceptSelected = await Category.find({
            _id: { $ne: categoryId },
        })
        
        let differentCategory = await Category.findOne(
            categoriesExceptSelected[getRandomInt(categoriesExceptSelected.length)]
            ._id
            )
            .populate({
            path:"courses",
            match: {status:"Published"},
            populate:{
                path:"instructor",
            },
        })
        .populate({
            path:"courses",
            match: {status:"Published"},
            populate:{
                path:"ratingAndReviews",
            },
        }).exec();
        
        //get top selling courses
		const allCategories = await Category.find()
        .populate({
            path:"courses",
            match: {status:"Published"},
            populate:{
                path:"instructor",
            },
        })
        .populate({
            path:"courses",
            match: {status:"Published"},
            populate:{
                path:"ratingAndReviews",
            },
        }).exec();
        
        console.log("all category: ",allCategories);
		const allCourses = allCategories.flatMap((category) => category.courses);
		const mostSellingCourses = allCourses
			.sort((a, b) => b.sold - a.sold)
			.slice(0, 10);        
        
        //return response
		res.status(200).json({
            success:true,
			selectedCategory,
			differentCategory,
			mostSellingCourses,
		});

    }catch(error){
		return res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
    }
}