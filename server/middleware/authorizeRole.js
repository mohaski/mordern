const authorizeRole = (userRole) => {
    return (req, res, next) => {
        console.log(req.user.role);
        if (!req.user) {
            return res.status(401).json({ message: "User authentication required." });
          }
          
          if (req.user.role !== userRole) {
            return res.status(403).json({ message: "Access denied. Insufficient permissions." });
          }
        next();
    };
};

module.exports = authorizeRole;