const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const userSchema = require("../models/usersModel");
const bcrypt = require("bcrypt");
const passwordGenerator = require("generate-password");
const passwordValidator = require("../utils/passwordValidation");
const {
  createTable,
  checkRecordExists,
  insertRecord,
  updateRecord,
} = require("../utils/sqlFunctions");
const blacklistedTokensSchema = require("../models/blacklistedTokensSchema")

const generateAccessToken = (user) => {
  return jwt.sign(
    { user_id: user.user_id, role: user.role, county: user.county}, process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

const register = async (req, res) => {
  const { email, role, county, } = req.body;
  if (!email || !role || !county) {
    res.status(400).json({
      error: "Email, role or county fields cannot be empty!",
    });
    return;
  }

  if (role === 'driver'){
    var driver_type = 'county'
  }

 /* const officeManager = req.user;
  if (officeManager.role !== "office manager" || officeManager.county !== county) {
    return res
      .status(400)
      .json({ message: "Unauthorized to register employees for this county" });
  }*/

  const salt = await bcrypt.genSalt(10);
  const generatedPassword = passwordGenerator.generate({
    length: 8,
    numbers: true,
  });
  console.log(generatedPassword);

  //const  generatedPassword = "Welcome";
  const hashedPassword = await bcrypt.hash(generatedPassword, salt);
  const user = {
    email,
    password: hashedPassword,
    role,
    county,
    driver_type,
    is_first_login: false,
  };
  try {
    await createTable(userSchema);
    const userAlreadyExists = await checkRecordExists("users", "email", email);
    if (userAlreadyExists) {
      res.status(409).json({ error: "Email already exists" });
    } else {
      await insertRecord("users", user);
      res.status(201).json({ message: "User created successfully!" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res
      .status(400)
      .json({ error: "Email or Password fields cannot be empty!" });
    return;
  }

  try {
    const user = await checkRecordExists("users", "email", email);

    if (user) {
      if (!user.password) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const passwordMatch = await bcrypt.compare(
        password,
        user.password
      );

      if (passwordMatch) {
        /*if (user.is_first_login) {
          res.status(200).json({
            message: "First login. Please change your password.",
            changePasswordRequired: true,
            email: user.email,
          });
          return;
        }*/

        const token = generateAccessToken(user)
        res.cookie("sessionId", token, {
          maxAge: 24 * 60 * 60 * 1000, // would expire in 1 day
          httpOnly: true, // The cookie is only accessible by the web server
          secure: true,
          sameSite: "None",
        })

        res.status(200).json({
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          county: user.county,
          access_token: token,
        });

       
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } else {
      res.status(401).json({ error: "Email not found in database" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const changePassword = async (req, res) => {
  const { password, confirmPassword } = req.body;
  const email = req.user.email;
  if (!password || !confirmPassword) {
    return res
      .status(401)
      .json({ message: "password or confirmPassword fields cannot be empty" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      message: "The password and confirmPassword have to match exactly!!",
    });
  }

  const validationErrors = await passwordValidator(password);
  if (validationErrors.length > 0) {
    return  res.status(400).json({
      message: "Password validation failed.",
      errors: validationErrors, // Return all validation errors
    });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  await updateRecord("users", "password", "email", email, hashedPassword);
  res.status(201).json({ message: "password changed successfully" });
};

const logOut = async (req, res) => {
  try {
    const authHeader = req.headers['cookie']; // 
    console.log(authHeader);
    // et the session cookie from request header
    if (!authHeader) return res.sendStatus(204); // No content
    const token = authHeader.split('=')[1]; // If there is, split the cookie string to get the actual jwt token
    //const accessToken = cookie.split(';')[0];
    const checkIfBlacklisted =  await checkRecordExists("blacklistedToken", "token", token); // Check if that token is blacklisted
    console.log(token)
    // if true, send a no content response.
    if (checkIfBlacklisted) return res.sendStatus(204);
    
    // otherwise blacklist token
    await insertRecord('blacklistedToken', {token: token});
    
    res.clearCookie("sessionId", {
      httpOnly: true,
      secure: false,
      sameSite: "None",
    });

    // **Ensure cookies are cleared**
    res.setHeader("Clear-Site-Data", '"cookies"');
    res.setHeader('clear-site-data', '"cookie"');
    res.status(200).json({message: "You are logged out"});
   
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }

}

module.exports = {
  register,
  login,
  changePassword,
  logOut
};
