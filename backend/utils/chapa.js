const axios = require("axios");
const chapaConfig = require("../config/chapa");

const initiateChapaPayment = async (payload) => {
  const response = await axios.post(
    `${chapaConfig.apiBaseUrl}/transaction/initialize`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${chapaConfig.secretKey}`,
        "Content-Type": "application/json",
      },
    },
  );
 
  return response.data;
};

const verifyChapaPayment = async (txRef) => {
  const response = await axios.get(
    `${chapaConfig.apiBaseUrl}/transaction/verify/${encodeURIComponent(txRef)}`,
    {
      headers: {
        Authorization: `Bearer ${chapaConfig.secretKey}`,
      },
    },
  );

  return response.data;
};

module.exports = { initiateChapaPayment, verifyChapaPayment };
