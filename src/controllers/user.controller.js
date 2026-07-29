import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/APIError.js"
import {User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/APIResponse.js"
import jwt from "jsonwebtoken"

const generateAccessandRefreshToken = async(userId) =>{
    try{   
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken 
        await user.save({validateBeforeSafe : false })

        return {accessToken , refreshToken}
    }
    catch(error){
        throw new ApiError(500 , "Something went wrong during refresh/access token generation")
    }
}

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

    const existedUser = await User.findOne({
        $or: [
            { email: email },
        { username: username }
        ]
    })
    if(existedUser){
        throw new ApiError(409 , "User with email or username already exist ")
    }
    console.log(req.body) 
    console.log(req.files)

    const avatarLocalPath = req.files?.avatar[0]?.path // get the file path 
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    if(!avatarLocalPath){
        throw new ApiError(409 , "avatar required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(409 , "avatar required")
    }

    const user = await User.create({
        fullname , 
        avatar : avatar.url  ,
        coverImage : coverImage.url || "No cover image" , 
        email , 
        password , 
        username : username.toLowerCase() 
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500 , "Something went wrong during creation ")
    }

    return res.status(201).json(
        new ApiResponse(200 , createdUser , "User Registered Sucessfully")
    )
})

const loginUser = asyncHandler(async (req ,res) => {
    // req body -> data 
    // username or by email 
    // find user 
    // password check 
    // access and refresh token 
    // send them by cookies and response that connected sucessfully 

    const {email , username , password} = req.body 
    if(!(email || username)){
        throw new ApiError(400 , "Username and password is required")
    }
    const user = await User.findOne({
        $or :[
            { username },
            { email } 
        ]
    }
    )
    if(!user){
        throw new ApiError(404 , "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(404 , "User password is incorrect")
    }

    const {accessToken , refreshToken} = await generateAccessandRefreshToken(user._id)

    const loggedinUser = await User.findById(user._id).select(
        "-password -refreshtoken"
    )
    const options = {
        httpOnly : true , 
        secure: true 
    }
    return res.status(200)
    .cookie("accessToken" , accessToken , options)
    .cookie("refreshToken" , refreshToken , options)
    .json(
        new ApiResponse(
            200 , 
            {
                user : loggedinUser , accessToken , refreshToken
            },
            "User loggen in successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req , res) => {
    await User.findByIdAndUpdate(
        req.user._id , 
        {
            $set:{
                refreshToken : undefined
            }
        },{
            new : true 
    })

    const options = {
        httpOnly : true , 
        secure: true 
    }
    return res
    .status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" ,options)
    .json(new ApiResponse(200 , {} , "User logged out successfully"))

})

const refreshAccessToken = asyncHandler(async (req , res)=>{
    const incommingRefreshToken = req.cookie.refreshToken || req.body.refreshAccessToken

    if(!incommingRefreshToken){
        throw new ApiError(401 , "unauthorised request")
    }
    
    try {
        const decodedToken = jwt.verify(incommingRefreshToken , process.env.REFRESH_TOKEN_SECRET)
    
        const user =  await User.findById(decodedToken._id) ;
    
        if(!user){
            throw new ApiError(401 , "invalid user")
        }
        if(incommingRefreshToken !== user?.refreshToken){
            throw new ApiError(401 , "Refresh Token expired or used")
        }
        const options = {
            httpOnly : true , 
            secure: true 
        }
        const {accessToken , newRefreshToken} = await generateAccessandRefreshToken(user._id)
    
        return res.status(200)
        .cookie("accessToken" , accessToken , options)
        .cookie("refreshToken" , newRefreshToken , options)
        .json(
            new ApiResponse(
               200 , {accessToken ,refreshToken : newRefreshToken},
               "Access token refreshed sucessfully"
            )
        )
    } catch (error) {
        throw new ApiError(401 , error?.message || "invalid")
    }
})

const changeCurrentPassword = asyncHandler(async(req , res)=>{
    const {oldPassword , newPassword} = req.body 

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400 , "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res.
    status(200)
    .json(
        200 , {} , "New Password created Succesfully"
    )
})

const getCurrentUser = asyncHandler((req, res) =>{
    return res
    .status(200)
    .json(
        200 , req.user , "Current user fetched succesfully"
    )

})

const updateAccountDetails = asyncHandler((req, res)=> {
    const {fullname , email} = req.body 

    if(!fullname || !email){
        throw new ApiError(400 , "Info Required")
    }

    const user = User.findByIdAndUpdate(
        req.user._id,
        {
            $set :{
                fullname = fullname ,
                email = email
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Account details updated successfully")
    )
})

const updateUserAvatar = asyncHandler((req , res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath) 

    if(!avatar.url){
        throw new ApiError(400 , "Error while uploading")
    }
    const user= await User.findByIdAndUpdate(
        req.user?._id,{
            $set :{
                avatar : avatar.url
            }
        },{new : true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Account avatar updated successfully")
    )
})

const updateUserCoverImage = asyncHandler((req , res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400 , "Avatar file missing")
    }

    const coverImage= await uploadOnCloudinary(coverImageLocalPath) 

    if(!coverImage.url){
        throw new ApiError(400 , "Error while uploading")
    }
    const user= await User.findByIdAndUpdate(
        req.user?._id,{
            $set :{
                coverImage : coverImage.url
            }
        },{new : true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Account cover image updated successfully")
    )
})
export {registerUser , loginUser ,
    logoutUser , refreshAccessToken , 
    getCurrentUser , changeCurrentPassword, 
    updateAccountDetails , updateUserAvatar , updateUserCoverImage
}