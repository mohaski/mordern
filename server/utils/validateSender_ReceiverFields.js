function validateSender_ReceiverFields(fields) {
    const errors = []; // Array to collect validation errors
  
    for (const [key, value] of Object.entries(fields)) {
        switch (key) {
            case "name":
                if (!value || value.trim().length < 2) {
                    errors.push("Name is should be atleast two characters long.");
                }
                
                break;
  
            case "email":
                if (!value || value.trim() === "") {
                    errors.push("Email is required.");
                }
                if (value && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) {
                  errors.push("Invalid email address.");
              }
              
                break;
  
            case "phone_number":
                if (!value || value.trim() === "") {
                    errors.push("Phone number is required.");
                }
                if (value && !/^\d{10}$/.test(value)) {
                  errors.push("Phone number must be exactly 10 digits.");
              }
                break;
  
            case "county":
                if (!value || value.trim() === "") {
                    errors.push("County is required.");
                }
                break;
  
            case "street_name":
                if (!value || value.trim() === "") {
                    errors.push("Street name is required.");
                }
                break;
  
            case "building_name":
                if (!value || value.trim() === "") {
                    errors.push("Building name is required.");
                }
                break;
  
            case "nearest_landmark":
                if (!value || value.trim() === "") {
                    errors.push("Nearest landmark is required.");
                }
                break;
  
            default:
                // Optionally handle unexpected fields
                errors.push(`Unexpected field: ${key}`);
        }
    }
  
    return errors;
  }

  module.exports = validateSender_ReceiverFields