import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import { json } from 'express';
import mongoose from 'mongoose';
import { use } from 'bcrypt/promises.js';

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findOne(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      'somthing went wrong while generating access and refresh token '
    );
  }
}; //working

const registerUser = asyncHandler(async (req, res) => {
  //frontend se user ka data aega, like postman
  const { fullname, email, username, password } = req.body;

  //now we will validate whether all fields are filled or empty
  if (
    [fullname, email, username, password].some(
      (field_iterator) => field_iterator.trim() === ''
    )
  ) {
    throw new ApiError(400, 'all fields are required');
  }

  //check is username , email already exist or not
  //it is like or operation on database to see if we get either of these
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, 'email or username already existed');
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverimage[0]?.path;

  // let coverImageLocalPath;
  // if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
  //     coverImageLocalPath = req.files.coverImage[0].path
  // }

  if (!avatarLocalPath) {
    throw new ApiError(400, 'avatar image is required');
  }

  console.table([avatarLocalPath, coverImageLocalPath]);

  //now we got the local path , lets upload it on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, 'avatar image is required');
  }

  //now lets create entry on db
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverimage: coverImage?.url || '',
    email,
    password,
    username: username.toLowerCase(),
  });

  //if user is successfully  created then we get is corresponding to that user
  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken' //this means we are removing password and refreshToken from db
  );

  if (!createdUser) {
    throw new ApiError(500, 'something went wrong while registering the user');
  }

  //now we will try to frame response

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'user registered successfuly'));
}); //working

const loginUser = asyncHandler(async (req, res) => {
  console.log(req.body);
  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, 'username or email is required');
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!existedUser) {
    throw new ApiError(401, 'username or email does not exist');
  }

  const isPasswordValid = existedUser.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'password is invalid');
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    existedUser._id
  );

  //as refresh token is added in the db
  const loggedinUser = await User.findById(existedUser._id).select(
    '-password -refreshToken'
  );

  const options = {
    httpOnly: true, // it means it can only be managed using server
    secure: true,
  };

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
      200,
      { user: loggedinUser, accessToken, refreshToken },
      'user loggedin successfully'
    );
}); //working

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, 'user logged out successfully'));
}); //working

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'unauthorized access');
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    //  console.log(user)

    if (!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, 'Refresh token is expired or used ');
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', newRefreshToken, options)
      .json(
        200,
        { accessToken, refreshToken: newRefreshToken },
        'Access token refreshed'
      );
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid refresh access tokennn');
  }
}); //working

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
  
    if (!user) {
      throw new ApiError(404, "User not found");
    }
  
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
      throw new ApiError(401, "Old password is invalid");
    }
  
    user.password = newPassword;
    await user.save({validateBeforeSave:false}); // Allow validations like password hashing
  
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"));
  }); // working
  

const getCurrentUser = asyncHandler(async (req, res) => {

    console.log(req.user)
  return res
    .status(200)
    .json(200, req.user, 'current user fetched successfully');
});//working

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname && !email) {
    throw new ApiError(400, 'fullname and email required ');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullname: fullname, email: email } },
    { new: true }
  ).select('-password');

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'account details updated successfully'));
});//working

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, 'avatar file is missing');
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, 'avatar not uploaded on cloudinary');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select('-password');
  return res
    .status(200)
    .json(new ApiResponse(200, user, 'avatar image updated successfuly'));
});//working

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, 'cover image file is missing');
  }

  const coverimage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverimage.url) {
    throw new ApiError(400, 'cover image not uploaded on cloudinary');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverimager: coverimage.url } },
    { new: true }
  ).select('-password');

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'cover image updated successfuly'));
});//working

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const username = req.params?.username;
  
    if (!username || username.trim() === "") {
      throw new ApiError(400, "username is invalid");
    }
  
    const channel = await User.aggregate([
      {
        $match: {
          username: username.toLowerCase(),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscribersCount: { $size: "$subscribers" },
          channelsSubscribedToCount: { $size: "$subscribedTo" },
          isSubscribed: {
            $in: [req.user?._id, "$subscribers.subscriber"],
          },
        },
      },
      {
        $project: {
          fullname: 1,
          username: 1,
          email: 1,
          avatar: 1,
          coverimage: 1,
          subscribersCount: 1,
          channelsSubscribedToCount: 1,
          isSubscribed: 1,
        },
      },
    ]);
  
    res.status(200).json({ channel });
  }); //working

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'watchHistory',
        foreignField: '_id',
        as: 'watchHistory',
        pipeline :[
            {
                $lookup:{
                    from:"users",
                    localField:"owner",
                    foreignField:"_id",
                    as:"owner",
                    pipeline:[
                        {
                            $project:{
                                fullname:1,
                                username:1,
                                avatar:1
                            }
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first:"$owner"
                                }
                            }
                        }
                    ]

                }
            }
        ]


      },
    },
  ]);//working

  return res.status(200)
  .json(200, new ApiResponse(200,user[0].watchHistory,"watch history fetched successfully"))



});//working



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
