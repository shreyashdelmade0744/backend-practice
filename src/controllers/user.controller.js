import { asyncHandler } from "../utils/asynchandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async (userId)=>{
    try {
        const user = await User.findOne(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})
        return {accessToken,refreshToken}


    } catch (error) {
        throw new ApiError(500,"somthing went wrong while generating access and refresh token ")
    }
}


const registerUser = asyncHandler(async(req , res) => {

//frontend se user ka data aega, like postman
const {fullname,email,username,password} = req.body

//now we will validate whether all fields are filled or empty 
if([fullname,email,username,password].some((field_iterator)=>field_iterator.trim() === "")){
    throw new ApiError(400,"all fields are required")
}

//check is username , email already exist or not
//it is like or operation on database to see if we get either of these
const existedUser = await User.findOne({
    $or : [{ username },{ email }]
})

if(existedUser){
    throw new ApiError(409,"email or username already existed")
}

const avatarLocalPath = req.files?.avatar[0]?.path 
const coverImageLocalPath = req.files?.coverimage[0]?.path 

// let coverImageLocalPath; 
// if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
//     coverImageLocalPath = req.files.coverImage[0].path
// }

if(!avatarLocalPath){
    throw new ApiError(400,"avatar image is required")
}

console.table([avatarLocalPath,coverImageLocalPath]);


//now we got the local path , lets upload it on cloudinary 
const avatar = await uploadOnCloudinary(avatarLocalPath);
const coverImage =  await uploadOnCloudinary(coverImageLocalPath) 


if(!avatar){
    throw new ApiError(400,"avatar image is required")
}

//now lets create entry on db
const user = await User.create({
    fullname, 
    avatar : avatar.url,
    coverimage : coverImage?.url || "",
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
    new ApiResponse(200,user,"user registered successfuly") 
)

})

const loginUser  = asyncHandler(async(req,res)=>{
    console.log(req.body);
    const {username,email,password} = req.body 
    
    if(!username && !email){
        throw new ApiError(400,"username or email is required")
    }

    const existedUser = await User.findOne({
        $or : [{username},{email}]
    })

    if(!existedUser){
        throw new ApiError(401,"username or email does not exist");
    }
    
    const isPasswordValid = existedUser.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"password is invalid")
    }

   const {accessToken,refreshToken} =  await generateAccessAndRefreshTokens(existedUser._id);

   //as refresh token is added in the db
   const loggedinUser = await User.findById(existedUser._id).select("-password -refreshToken")

   const options = {
    httpOnly : true, // it means it can only be managed using server
    secure : true
   }

   return res.status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken,options) 
   .json(200,{user:loggedinUser,accessToken,refreshToken},"user loggedin successfully")


})

const logoutUser = asyncHandler(async(req,res)=>{

    await User.findByIdAndUpdate(req.user._id,{
        $set : {refreshToken : undefined}
    },
    {new : true}
)

const options = {
    httpOnly : true,
    secure : true
}

return res
.status(200)
.clearCookie("accessToken",options)
.clearCookie("refreshToken",options)
.json(new ApiResponse(200,{},"user logged out successfully"))

})

export {registerUser,loginUser,logoutUser}