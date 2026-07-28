import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/APIError.js"
import {User } from "../models/user.model.js"
import {uploadOnCloudinary} from "./"
import { ApiResponse } from "../utils/APIResponse.js"


const registerUser = asyncHandler(async (req , res) => {
    // get the info from frontend 
    // validation of the details (not empty)
    // check if user already exists by username and email 
    // check files like avatar and cover images 
    // upload them to cloudinary 
    // create user object - create entry in db 
    // remove password and referesh token from response 
    // check for user creation 
    // return result els error 
    const {fullname , email , username , password} = req.body 
    console.log("email : " , email)
    
    if(
        [fullname , email , username , password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400 , "All the fields are required")
    }

    const existedUser = User.findOne({
        $or:[email , username]
    })
    if(existedUser){
        throw new ApiError(409 , "User with email or username already exist ")
    }
    console.log(req.body) 
    console.log(req.files)

    const avatarLocalPath = req.files?.avatar[0]?.path // get the file path 
    const coverImageLocalPath = req.files?.coverImage[0]?.path // get the file path
    
    if(!avatarLocalPath){
        throw new ApiError(409 , "avatar required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(409 , "avatar required")
    }

    User.create({
        fullname , 
        avatar : avatar.url  ,
        coverImage : coverImage.url || "No cover image" , 
        email , 
        password , 
        username : username.toLowerCase() 
    })
    const createdUser = await User.findById(User._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500 , "Something went wrong during creation ")
    }

    return res.status(201).json(
        new ApiResponse(200 , createdUser , "User Registered Sucessfully")
    )
})

export {registerUser}