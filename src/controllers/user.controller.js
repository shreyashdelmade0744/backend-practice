import { asyncHandler } from "../utils/asynchandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async(req , res) => {

// get user details from frontend
// validation - not empty
// check if user already exists: username, email
// check for images, check for avatar
// upload them to cloudinary, avatar
// create user object - create entry in db
// remove password and refresh token field from response
// check for user creation
// return res

//frontend se user ka data aega, like postman
const {fullname,email,username,password} = req.body

//now we will validate whether all fields are filled or empty 
if([fullname,email,username,password].some((field_iterator)=>{
   return field_iterator.trim() === ""
})){
    throw new ApiError(400,"all fields are required")
}

//check is username , email already exist or not
//it is like or operation on database to see if we get either of these
const existedUser= User.findOne({
    $or : [{ username },{ email }]
})

if(existedUser){
    throw new ApiError(409,"email or username already existed")
}

const avatarLocalPath = req.files?.avatar[0]?.path 
const coverImageLocalPath = req.files?.coverImage[0]?.path 

if(!avatarLocalPath){
    throw new ApiError(400,"avatar image is required")
}

//now we got the local path , lets upload it on cloudinary 
const avatar = await uploadOnCloudinary(avatarLocalPath)
const coverImage = await uploadOnCloudinary(coverImageLocalPath)

if(!avatar){
    throw new ApiError(400,"avatar image is required")
}

//now lets create entry on db
const user = await User.create({
    fullname, 
    avatar : avatar.url,
    coverImage : coverImage?.url || "",
    email,
    password,
    username : username.toLowerCase()
})

//if user is successfully  created then we get is corresponding to that user 
const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" //this means we are removing password and refreshToken from db
)

if(!createdUser){
    throw new ApiError(500,"something went wrong while registering the user")
}

//now we will try to frame response 

return res.status(200).json(
    new ApiResponse(200,createdUser,"user registered successfuly")
)


})

export {registerUser}

