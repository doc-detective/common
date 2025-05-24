/**
 * Verifies that additionalProperties is defined for all object properties
 * 
 * @param {object} input - The schema object to validate
 * @param {object} options - Custom options for the function
 * @returns {array|boolean} - Returns true if valid, or an array of errors if invalid
 */
function additionalPropertyCheck(input, options = {}) {
  // If not an object, can't check
  if (typeof input !== 'object' || input === null) {
    return true;
  }

  const errors = [];

  // Check current object if it's a schema with type "object"
  if (input.type === 'object' && input.additionalProperties === undefined) {
    errors.push({
      message: 'Object schema should explicitly define additionalProperties',
    });
  }

  // Recursively check properties if present
  if (input.properties && typeof input.properties === 'object') {
    Object.entries(input.properties).forEach(([propName, propSchema]) => {
      // If the property is an object type schema, check it
      if (propSchema && propSchema.type === 'object' && propSchema.additionalProperties === undefined) {
        errors.push({
          message: `Property '${propName}' is an object that should explicitly define additionalProperties`,
          path: ['properties', propName]
        });
      }
    });
  }

  return errors.length ? errors : true;
}

module.exports = additionalPropertyCheck;