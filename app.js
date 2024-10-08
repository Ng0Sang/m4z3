// Requiring all modules
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");
const { authRoutes, apiScans } = require("./routes/index");
const ssdScanResult = require("./models/ssdScanReport.models");
const bolaScanResult = require("./models/bolaScanReport.models");
app.use(express.static("./public"));

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/api", apiScans);

//Connecting to Mongo DB!!
mongoose.set("strictQuery", true);

const connectMongodb = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("D4t4B4s3 1s Succ3sfully C0nn3ct3d");
  } catch (error) {
    console.log(error);
  }
};

app.use(cors());
app.use(morgan("tiny"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Setting the environment for the Report
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

//Function for finding A Shadow Sensitive Data Scan report by the API Name
async function getSsdScanReportByName(apiName) {
  try {
    const scanResults = await ssdScanResult.findOne({ apiName: apiName });

    if (!scanResults) {
      return "There's no report under this name";
    }
    return scanResults;
  } catch (error) {
    console.error("Error fetching scan report:", error);
    return error;
  }
}

// Function for finding A Broken Object Level Authorization Scan report by the API Name
async function getBolaScanReportByName(apiName) {
  try {
    const scanResults = await bolaScanResult.findOne({ apiName: apiName });

    if (!scanResults) {
      return "There's no report under this name";
    }
    return scanResults;
  } catch (error) {
    console.error("Error fetching scan report:", error);
    return error;
  }
}

// Technical and Executive Report for Shadow Sensitive Data Scans
app.get("/technical-report/:apiName", async (req, res) => {
  const { apiName } = req.params;
  const technicalReport = await getSsdScanReportByName(apiName);
  if (!technicalReport) {
    return res
      .status(404)
      .send("There is no saved Technical Scan report in this API name");
  } else {
    res.render("technicalReport.ejs", { technicalReport });
  }
});

app.get("/executive-report/:apiName", async (req, res) => {
  const { apiName } = req.params;
  const executiveReport = await getSsdScanReportByName(apiName);

  if (!executiveReport) {
    return res
      .status(404)
      .send("There is no saved Technical Scan report in this API name");
  } else {
    res.render("executiveReport.ejs", { executiveReport });
  }
});

// Technical and Exeutive Report for Broken Object Level Authourization Scan
app.get("/technical-report/:apiName", async (req, res) => {
  const { apiName } = req.params;
  const technicalReport = await getBolaScanReportByName(apiName);
  if (!technicalReport) {
    return res
      .status(404)
      .send("There is no saved Technical Scan report in this API name");
  } else {
    res.render("technicalReport.ejs", { technicalReport });
  }
});

app.get("/executive-report/:apiName", async (req, res) => {
  const { apiName } = req.params;
  const executiveReport = await getBolaScanReportByName(apiName);

  if (!executiveReport) {
    return res
      .status(404)
      .send("There is no saved Technical Scan report in this API name");
  } else {
    res.render("executiveReport.ejs", { executiveReport });
  }
});

// Parsing all 404 requests
app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// for development
if (app.get("env") === "development") {
  app.use((error, req, res) => {
    res.status(error.status || 500);
    req.json({
      message: error.message || "Internal Server Error",
      error: error,
    });
  });
}

//Server listening on port process.env.PORT
const PORT = 3000;
const port = process.env.PORT || PORT;
app.listen(port, () => {
  connectMongodb();
  console.log(`The Server is listening on port ${port}`);
});
