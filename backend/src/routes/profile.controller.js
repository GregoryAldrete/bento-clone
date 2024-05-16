const User = require('../models/user.model');
const Profile = require('../models/porfile.model');
const cloudinary = require('../services/cloudinary');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Helper function to verify username from JWT token against URL params
const verifyUsernameMatch = async (token, urlUsername) => {
  try {
    if (!token) {
      throw new Error('Authorization token not found');
    }

    // Verify the JWT token to extract user information
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Extract username from the JWT payload
    const jwtUsername = decoded.username;

    // Compare the usernames
    if (jwtUsername !== urlUsername) {
      throw new Error('Username mismatch');
    }
  } catch (error) {
    throw error;
  }
};

// Controller function to add a profile object to a user's profile details
const addProfileObject = async (req, res) => {
  let { username } = req.params;
  // Convert username to string if it's a number
  username = String(username);
  const {
    type,
    id,
    baseUrl,
    userName,
    logo,
    bgColor,
    content,
    location,
    imgUrl,
  } = req.body;

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    await verifyUsernameMatch(token, username);

    // Find the user by username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find or create the profile document associated with the user
    let profile = await Profile.findOne({ user: user._id });

    if (!profile) {
      // Create a new profile document if none exists
      profile = await Profile.create({ user: user._id, profiles: [] });
    }

    // Create the new profile object based on the input data
    const newProfileObject = {
      type,
      id,
      baseUrl,
      userName,
      logo,
      bgColor,
      content,
      location,
      imgUrl,
    };

    if (
      type === 'image' &&
      imgUrl &&
      imgUrl.startsWith('data:image') &&
      imgUrl !== null &&
      imgUrl !== 'null'
    ) {
      // Upload the image to Cloudinary and get the URL
      const fileStr = imgUrl; // Assuming imgUrl contains the base64 image data
      const uploadedResponse = await cloudinary.uploader.upload(fileStr, {
        folder: `bento/${username}`, // Upload image under 'avatars/username' folder
        public_id: `bento_${username}_${Date.now()}`, // Unique ID for the uploaded image
      });

      // Set the imgUrl field of the profile object to the Cloudinary URL
      newProfileObject.imgUrl = uploadedResponse.secure_url;
    }

    // Add the new profile object to the profiles array within the profile document
    profile.profiles.push(newProfileObject);

    // Save the updated profile document
    await profile.save();

    res.status(201).json({
      message: 'Profile object added successfully',
      profile: profile,
    });
  } catch (error) {
    console.error('Add profile object error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Controller function to fetch all profile objects associated with a user
const getAllProfileObjects = async (req, res) => {
  let { username } = req.params;
  // Convert username to string if it's a number
  username = String(username);

  try {
    // Find the user by username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the profile document associated with the user
    const profile = await Profile.findOne({ user: user._id });

    if (!profile) {
      return res
        .status(404)
        .json({ message: 'Profile not found for the user' });
    }

    // Return the profiles array from the profile document

    res.status(200).json({ profile });
  } catch (error) {
    console.error('Fetch profile objects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const setInitialProfile = async (userId) => {
  try {
    // Find the user by their ID
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Check if the user already has an associated profile
    const existingProfile = await Profile.findOne({ user: userId });

    if (existingProfile) {
      console.log('User already has a profile');
      return;
    }

    // Create a new profile reference object with default values
    const defaultProfile = {
      user: userId,
      profiles: [], // Set an empty array or add default profile objects here
    };

    // Create and save the new profile document
    const newProfile = await Profile.create(defaultProfile);
    console.log('Initial profile set for user:', user.username);

    // Associate the new profile document with the user
    user.profileDetails = newProfile._id;
    await user.save();

    console.log('Profile reference updated for user:', user.username);
  } catch (error) {
    console.error('Set initial profile error:', error);
    throw error;
  }
};

const updateProfileObject = async (req, res) => {
  let { username } = req.params;
  // Convert username to string if it's a number
  username = String(username);
  const {
    type,
    id,
    baseUrl,
    userName,
    logo,
    bgColor,
    content,
    location,
    imgUrl,
  } = req.body;

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    await verifyUsernameMatch(token, username);

    // Find the user by their username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the profile document associated with the user
    const profile = await Profile.findOne({ user: user._id });

    if (!profile) {
      return res
        .status(404)
        .json({ message: 'Profile not found for the user' });
    }

    // Find the index of the object to be updated within the profiles array
    const objectIndex = profile.profiles.findIndex(
      (obj) => obj.id.toString() === id
    );

    if (objectIndex === -1) {
      return res
        .status(404)
        .json({ message: 'Object not found in the profile' });
    }

    // Create the new profile object based on the input data
    const newProfileObject = {
      type,
      id,
      baseUrl,
      userName,
      logo,
      bgColor,
      content,
      location,
      imgUrl,
    };

    if (type === 'image' && imgUrl) {
      // Upload the image to Cloudinary and get the URL
      const uploadedResponse = await cloudinary.uploader.upload(imgUrl, {
        folder: `bento/${username}`, // Upload image under 'bento/username' folder
        public_id: `bento_${username}_${Date.now()}`, // Unique ID for the uploaded image
      });

      // Set the imgUrl field of the profile object to the Cloudinary URL
      newProfileObject.imgUrl = uploadedResponse.secure_url;
    }

    // Update the specific object using its index
    profile.profiles[objectIndex] = {
      ...profile.profiles[objectIndex],
      ...newProfileObject,
    };

    // Save the updated profile document
    await profile.save();

    res.status(200).json({ message: 'Profile object updated successfully' });
  } catch (error) {
    console.error('Update profile object error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const setProfileDetails = async (req, res) => {
  const { username } = req.params;
  const { profileDetails } = req.body;

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    await verifyUsernameMatch(token, username);

    // Find the user by username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the profile document associated with the user
    let profile = await Profile.findOne({ user: user._id });

    if (!profile) {
      // Create a new profile document if none exists
      profile = await Profile.create({ user: user._id, profiles: [] });
    }

    // Clear existing profile objects
    profile.profiles = [];

    // Add new profile objects from the request body
    profile.profiles.push(...profileDetails);

    // Save the updated profile document
    await profile.save();

    res.status(200).json({
      message: 'Profile details updated successfully',
      profile: profile,
    });
  } catch (error) {
    console.error('Set profile details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteProfileObject = async (req, res) => {
  const { username, objectId } = req.params;

  // Convert username to string if it's a number

  try {
    // Find the user by their username

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    await verifyUsernameMatch(token, username);

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the profile document associated with the user
    const profile = await Profile.findOne({ user: user._id });

    if (!profile) {
      return res
        .status(404)
        .json({ message: 'Profile not found for the user' });
    }

    // Find the index of the object to be deleted within the profiles array
    const objectIndex = profile.profiles.findIndex(
      (obj) => obj.id.toString() === objectId
    );

    if (objectIndex === -1) {
      return res
        .status(404)
        .json({ message: 'Object not found in the profile' });
    }

    // Remove the specific object from the profiles array
    profile.profiles.splice(objectIndex, 1);

    // Save the updated profile document
    await profile.save();

    res.status(200).json({ message: 'Profile object deleted successfully' });
  } catch (error) {
    console.error('Delete profile object error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateDisplayName = async (req, res) => {
  let { username } = req.params;
  // Convert username to string if it's a number
  username = String(username);
  //   const { updatedObject } = req.body;
  const { displayname } = req.body;

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    await verifyUsernameMatch(token, username);

    // Find the user by their username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the profile document associated with the user
    const profile = await Profile.findOne({ user: user._id });

    if (!profile) {
      return res
        .status(404)
        .json({ message: 'Profile not found for the user' });
    }

    profile.displayName = displayname;

    // Save the updated profile document
    await profile.save();

    console.log('Profile Name updated successfully');
    res.status(200).json({ message: 'Profile Name updated successfully' });
  } catch (error) {
    console.error('Update profile Name error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateBio = async (req, res) => {
  let { username } = req.params;
  // Convert username to string if it's a number
  username = String(username);
  //   const { updatedObject } = req.body;
  const { bio } = req.body;

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    await verifyUsernameMatch(token, username);

    // Find the user by their username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the profile document associated with the user
    const profile = await Profile.findOne({ user: user._id });

    if (!profile) {
      return res
        .status(404)
        .json({ message: 'Profile not found for the user' });
    }

    profile.bio = bio;

    // Save the updated profile document
    await profile.save();

    res.status(200).json({ message: 'Profile Bio updated successfully' });
  } catch (error) {
    console.error('Update profile Name error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const uploadAvatar = async (req, res) => {
  let { username } = req.params;
  // Convert username to string if it's a number
  username = String(username);

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    await verifyUsernameMatch(token, username);

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the profile document associated with the user
    const profile = await Profile.findOne({ user: user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const fileStr = req.body.avatar;
    const uploadedResponse = await cloudinary.uploader.upload(fileStr, {
      folder: `bento/${username}`, // Optional folder in Cloudinary
      public_id: `avatar`, // Unique ID for avatar
    });

    profile.avatar = uploadedResponse.secure_url;
    await profile.save();

    res.status(200).json({ message: 'Avatar uploaded successfully', profile });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  addProfileObject,
  getAllProfileObjects,
  setInitialProfile,
  updateProfileObject,
  setProfileDetails,
  deleteProfileObject,
  updateDisplayName,
  updateBio,
  uploadAvatar,
};