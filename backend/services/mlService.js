const axios = require('axios');

const ML_API_URL = process.env.ML_API_URL || 'http://127.0.0.1:5001';

async function predictFinancialHealth(data) {
  try {
    const response = await axios.post(
      `${ML_API_URL}/predict`,
      data,
      { timeout: 5000 }
    );

    return response.data;
  } catch (error) {
    console.error(
      'ML prediction error:',
      error.response?.data || error.message
    );

    return null;
  }
}

module.exports = {
  predictFinancialHealth
};