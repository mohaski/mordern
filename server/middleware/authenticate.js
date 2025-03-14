const {checkRecordExists} = require("../utils/sqlFunctions");
const jwt = require("jsonwebtoken");

const authenticate = async (req, res, next) => {

  // 1. Get the cookie from headers
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // 2. Extract the JWT token (`sessionId`) from the cookie
  const sessionIdCookie = cookieHeader
    .split(';')
    .find(c => c.trim().startsWith('sessionId='));

  if (!sessionIdCookie) {
    return res.status(401).json({ message: "Session ID not found" });
  }

  const accessToken = sessionIdCookie.split('=')[1];
  const checkIfBlacklisted = await checkRecordExists("blacklistedToken", "token", accessToken); // Check if that token is blacklisted
  // if true, send an unathorized message, asking for a re-authentication.
  if (checkIfBlacklisted)
      return res
          .status(401)
          .json({ message: "This session has expired. Please login" });
 
      try{
        // if token has not been blacklisted, verify with jwt to see if it has been tampered with or not.
        // that's like checking the integrity of the accessToken
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET )
        const { user_id } = decoded; // get user id from the decoded token
        const user = await checkRecordExists("users", "user_id", user_id); // find user by that `user_id`
        const { password, ...data } = user; // return user object but the password
        req.user = data; // put the data object into req.user
        next();
      }catch(error){
        res.status(500).json({errorMessage: error.message})
      }
      
  };


module.exports = authenticate;
