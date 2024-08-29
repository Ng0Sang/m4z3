const api = require("../models/targetDetails.models");
const sensitiveKeywords = require("../models/keywords.models");
const uniqueIds = require("../models/uniqueIds.models");
const scanReports = require("../models/ssdScanReport.models");
const handleErrors = require("../utilities/handleErrors");
const axios = require("axios");
const Fuse = require("fuse.js");

// To collect the basic Auth-N and Auth-Z credentials for the API to be scanned and its Owner
exports.saveApiCredentials = async (req, res) => {
  try {
    const {
      user_id,
      apiOwnerName,
      apiOwnerEmail,
      apiName,
      apiDescription,
      apiKey,
      apiEndpointURL,
      hostURL,
      apiKeywords,
      uniqueId1,
      uniqueId2,
    } = req.body;

    const newApi = new api({
      user_id,
      apiOwnerName,
      apiOwnerEmail,
      apiName,
      apiDescription,
      apiEndpointURL,
      apiKey,
      hostURL,
    });

    const newSensitiveKeywords = new sensitiveKeywords({
      user_id,
      apiKeywords,
    });

    const newUniqueIds = new uniqueIds({ user_id, uniqueId1, uniqueId2 });

    await newApi.save();
    await newSensitiveKeywords.save();
    await newUniqueIds.save();

    return res.status(201).send({
      Message: "API Credentials successfully stored",
      newAPI: newApi,
      newSensitiveKeywords: newSensitiveKeywords,
      newUniqueIds: newUniqueIds,
    });
  } catch (error) {
    console.log(error);
  }
};

// This function will help collect all values from the response.data object into an array
const collectApiDataValues = (obj) => {
  let values = [];

  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      values = values.concat(collectApiDataValues(obj[key])); // Collect values from nested objects
    } else if (typeof obj[key] === "string") {
      values.push(obj[key]); // Directly add strings
    } else if (typeof obj[key] === "number") {
      values.push(JSON.stringify(obj[key])); // Convert the numbers to strings
    } else if (obj[key] instanceof Date) {
      values.push(obj[key].toISOString()); // Convert the dates to ISO string format
    } else {
      values.push(JSON.stringify(obj[key]));
    }
  }
  return values;
};

// To retrieve all the needed data from the databases for authentication and scans
exports.fetchUserApiDetailsAndScanForShadowSensitiveData = async (req, res) => {
  try {
    const user_id = req.params.user_id;

    const apiDetails = await api.findOne({ user_id: user_id });
    const keywords = await sensitiveKeywords.findOne({ user_id: user_id });
    const uniqueId = await uniqueIds.findOne({ user_id: user_id });

    // Check if the user_id or not
    if (!apiDetails || !keywords || !uniqueId) {
      return "Sorry, couldn't find any of these information in any of our databases";
    } else {
      const apiKeyHeader = apiDetails.apiKey;
      const hostURL = apiDetails.hostURL;
      const apiEndpointURL = apiDetails.apiEndpointURL;

      // API Key header
      const headers = apiKeyHeader;
      console.log(headers);
      console.log(hostURL);
      console.log(apiEndpointURL);

      // API URL and the axios querying the API
      // d266031f7emsh560d74c3967d7c0p15ac83jsn0377c1239a6f
      const apiUrl = `${hostURL}${apiEndpointURL}`;
      console.log(apiUrl);

      const response = await axios.get(apiUrl, { headers });

      const apiData = response.data;
      console.log(apiData);

      const apiKeywords = keywords.apiKeywords;
      console.log(apiKeywords);

      const apiDataValues = collectApiDataValues(apiData);

      // Initialize Fuse.js with collected values
      const fuse = new Fuse(apiDataValues, {
        includeScore: true,
        threshold: 0.3,
      });

      const foundKeywords = {};
      const notFoundKeywords = {};

      // Scan for the array of keywords in the sensitveKeywords collection
      apiKeywords.forEach((keyword) => {
        const result = fuse.search(keyword);
        if (result.length > 0) {
          foundKeywords[keyword] = true;
        } else {
          notFoundKeywords[keyword] = false;
        }
      });

      if (response.status === 200) {
        apiScanTime = new Date().toLocaleString();
        apiOwnerName = `${apiDetails.apiOwnerName}`;
        apiOwnerEmail = `${apiDetails.apiOwnerEmail}`;
        apiName = `${apiDetails.apiName}`;
        apiDescription = `${apiDetails.apiDescription}`;
        apiUrl = `${apiDetails.hostURL}`;
        apiScanType = "";
        apiScanDuration = "";
        Total_Keywords_Scanned = keywords.apiKeywords;
        Flagged_Keywords = foundKeywords;
        Unflagged_Keywords = notFoundKeywords;
        Status_code = 200;
        vulnerable_Message = "";
        Not_Vulnerable_Message = "";
        Request = apiUrl;
        Response = apiData;

        if (Flagged_Keywords === null) {
        }
        const newScanReport = new scanReport({
          user_id,
          apiScanTime,
          apiOwnerName,
          apiOwnerEmail,
          apiName,
          apiDescription,
          apiUrl,
          apiScanType,
          apiScanDuration,
          Total_Keywords_Scanned,
          Flagged_Keywords,
          Unflagged_Keywords,
          Status_code,
          vulnerable_Message,
          Not_Vulnerable_Message,
          Request,
          Response,
        });

        const saveReportData = await newScanReport.save();

        return res.status(200).json({ newScanReport: saveReportData });
      } else {
        return "Report data has not been saved";
      }
    }

    // Commented code for Includes for scanning for SSD
    // const apiDataString = JSON.stringify(apiData);
    // console.log(apiData, apiDataString);

    // Seach for the Keywords within the API retrieved with the GET method
    //   const foundKeywords = {};
    //   apiKeywords.forEach((apiKeyword) => {
    //     if (apiDataString.includes(apiKeyword)) {
    //       foundKeywords[apiKeyword] = true;
    //       return foundKeywords;
    //     } else {
    //       console.log(
    //         "API doesn't contain this specific keywords exposed to the public"
    //       );
    //     }
    //   });
    //   return foundKeywords;
  } catch (error) {
    console.log(error);
  }
};

exports.fetchUserApiDetailsAndScanForBrokenObjectLevelAuthorisation = async (
  req,
  res
) => {
  try {
    const user_id = req.params.user_id;
    const apiDetails = await api.findOne({ user_id: user_id });
    const uniqueIds = await uniqueIds.findOne({ user_id: user_id });

    // Check if details exist or not
    if (!apiDetails || !uniqueIds) {
      return "Sorry, couldn't find any of these information in any of our databases collections";
    } else {
      const forEachUniqueId = async (uniqueId) => {
        const hostURL = apiDetails.hostURL;
        const apiEndpointURL = apiDetails.apiEndpointURL;
        // const uniqueId = uniqueIds.uniqueId;
        const apiUrl = `${hostURL}${apiEndpointURL}`;
        console.log(apiUrl);

        const response = await axios.get(`apiUrl,{ uniqueId }`);
        const apiData = response.data;
        console.log(`API Response for unique Identifier: ${uniqueId}`, apiData);
      };

      // Loop through unique identifiers in the database array
      for (const uniqueId of uniqueIds) {
        await forEachUniqueId(uniqueId);
      }

      if (response.status === 200) {
        apiScanTime = new Date().toLocaleString();
        apiOwnerName = `${apiDetails.apiOwnerName}`;
        apiOwnerEmail = `${apiDetails.apiOwnerEmail}`;
        apiName = `${apiDetails.apiName}`;
        apiDescription = `${apiDetails.apiDescription}`;
        apiUrl = `${apiDetails.hostURL}`;
        apiScanType = "Broken Objet Level Authorization Scans";
        apiScanDuration = "";
        Unique_Identifiers_Used = uniqueIds.uniqueId;
        Status_code = 200;
        vulnerable_Message = "";
        Not_Vulnerable_Message = "";
        Request = apiUrl;
        Response = apiData;

        if (Flagged_Keywords === null) {
        }
        const newScanReport = new scanReports({
          user_id,
          apiScanTime,
          apiOwnerName,
          apiOwnerEmail,
          apiName,
          apiDescription,
          apiUrl,
          apiScanType,
          apiScanDuration,
          Unique_Identifiers_Used,
          Status_code,
          vulnerable_Message,
          Not_Vulnerable_Message,
          Request,
          Response,
        });

        const saveReportData = await newScanReport.save();

        return res.status(200).json({
          savedData: saveReportData,
          Message:
            "API BOLA Scan conducted, checkout report for more information",
        });
      } else {
        return "Report data has not been saved";
      }
    }
  } catch (error) {
    console.log(error);
  }
};
