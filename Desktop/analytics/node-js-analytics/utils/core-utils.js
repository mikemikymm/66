// File: core-utils.js

/**
 * Pauses execution for a specified number of milliseconds.
 * @param {number} ms - Milliseconds to sleep.
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Splits an array into chunks of a specified size.
 * @param {Array<any>} array - The array to chunk.
 * @param {number} size - The size of each chunk.
 * @returns {Array<Array<any>>} An array of chunks.
 */
const chunkArray = (array, size) => {
  if (!Array.isArray(array)) {
      console.error("chunkArray: Input is not an array.");
      return [];
  }
  if (size <= 0) {
      console.error("chunkArray: Chunk size must be positive.");
      return [array]; // Return original array wrapped? Or empty? Depends on desired behavior.
  }
  const chunkedArr = [];
  let index = 0;
  while (index < array.length) {
    chunkedArr.push(array.slice(index, size + index));
    index += size;
  }
  return chunkedArr;
};

/**
 * Groups an array of objects by the value of a specified key.
 * @param {Array<object>} data - The array of objects.
 * @param {string} key - The key to group by.
 * @returns {object} An object where keys are the group values and values are arrays of items belonging to that group.
 */
const groupDataByKey = (data, key) => {
    if (!Array.isArray(data)) {
        console.error("groupDataByKey: Input data is not an array.");
        return {};
    }
    return data.reduce((acc, item) => {
        const groupKey = item[key];
        // Ensure groupKey is suitable as an object key (might need string conversion for complex types)
        const keyStr = String(groupKey);
        if (!acc[keyStr]) {
            acc[keyStr] = [];
        }
        acc[keyStr].push(item);
        return acc;
    }, {});
};

module.exports = {
    sleep,
    chunkArray,
    groupDataByKey,
};

// --- END OF FILE utils/core-utils.js ---