const mysql = require("mysql2/promise");
const config = require("../config/config");
const db = mysql.createPool(config);

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

//const userAlreadyExists = await checkRecordExists("users", "email", email);
//await insertRecord("users", user);



const createStaff = async (req, res) => {
  try {
    const { name, email, role, route_id } = req.body;
    console.log(name, email, role)
    const {county} = req.user;

    // Validate required fields
    if (!email || !role || !county) {
      return res.status(400).json({
        error: 'Email, role, and county fields cannot be empty!',
      });
    }

    // Set driver_type based on role
    let driver_type = null;
    if (role === 'driver') {
      driver_type = 'county';
    } else if (role === 'transit_driver') {
      driver_type = 'transit';
    }

    // Generate a random password
    const generatedPassword = passwordGenerator.generate({
      length: 8,
      numbers: true,
    });
    console.log('Generated Password:', generatedPassword);

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    // Create the staff object
    const staffData = {
      name,
      email,
      role,
      county,
      route_id: role === 'transit_driver' ? route_id : null,
      password: hashedPassword,
      driver_type,
      is_first_login: false,
    };

    // Check if email already exists
    const userAlreadyExists = await checkRecordExists("users", "email", email);
    if (userAlreadyExists) {
      return res.status(409).json({ error: 'Email already exists' });
    }


    // Save the new staff member
   const staff = await insertRecord("users", staffData);
    console.log(`${email}: ${generatedPassword}`)
    console.log(staff)

    return res.status(201).json({
      success: true,
      message: 'User created successfully!',
      data: {
        user_id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        county: staff.county,
        route_id: staff.route_id,
        driver_type: staff.driver_type,
        is_first_login: staff.is_first_login,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Server error' });
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
          route_id: user.route_id
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
  const { currentPassword, newPassword, confirmPassword } = req.body; // Changed variable names for clarity
  const email = req.user.email;

  // Validate all required fields
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      message: "All fields (current password, new password, confirm password) are required"
    });
  }

  // Verify current password matches
  try {
    // Get user's current password hash from database
    const user = await checkRecordExists("users", "email", email); 
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare provided current password with stored hash
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Error verifying current password" });
  }

  // Validate new password matches confirmation
  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      message: "New password and confirmation password must match"
    });
  }

  // Validate new password strength
  const validationErrors = passwordValidator(newPassword);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "Password validation failed",
      errors: validationErrors
    });
  }

  // Hash and update password
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await updateRecord("users", "password", "email", email, hashedPassword);
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error updating password" });
  }
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

const getStaffList = async(req, res) => {
  const {county} = req.params;
  console.log(`${county} it is`)
  if(!county) return res.status(400).json({message: 'county must be provided'});

  try{
    const [users] = await db.query(`SELECT * FROM users WHERE county = ? `, [county]);
    console.log(users)
    if(users.length === 0) return res.status(200).json({message: 'There are no employees in this county office other than you'} );

    return res.status(200).json({
      message: 'users list retrieved',
      users: users
    })
  }catch(error){
    return res.status(500).json({error: error.message})
  }

  

}

// Delete a staff member
const deleteStaff = async (req, res) => {
  const { id } = req.params;
  if(!id) return res.status(400).json({message: 'id must be provided'});
  console.log(id)

  try {
    
    // Find the staff member
    const staff = await checkRecordExists("users", "user_id", id);
   // console.log(staff.county);

    if (!staff) {
          return res.status(404).json({ message: 'Staff member not found' });
        }

    await db.query(`DELETE FROM users WHERE user_id = ?;`, [id]);

    return res.status(200).json({
      success: true,
      message: 'Staff member deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  createStaff,
  login,
  changePassword,
  logOut,
  getStaffList,
  deleteStaff
};
