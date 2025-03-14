const blacklistedTokensSchema = `
CREATE TABLE IF NOT EXISTS blacklistedToken (
    token_id INT AUTO_INCREMENT PRIMARY KEY,
    token  VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);
`;

module.exports = blacklistedTokensSchema;