const express = require("express");
const bodyParser = require("body-parser");
var payloadChecker = require("payload-validator");
const mongoose = require("mongoose");
const { userModel } = require("./models/userModel");
const websocketServer = require("websocket").server;
const { w3cwebsocket: W3CWebSocket } = require("websocket");
var CryptoJS = require("crypto-js");

const http = require("http");

const app = express();
const PORT = 3100;
const websocketServerPort = 8000;
const salt = "privyrtest";
var expectedPayload = {
  name: "",
  email: "",
  phone: 0,
  other_fields: {},
};

const server = http.createServer();
server.listen(websocketServerPort);
console.log("listening on port 8000");

const client = new W3CWebSocket("ws://0.0.0.0:8000");
const wsServer = new websocketServer({
  httpServer: server,
});

const clients = [];

app.use(bodyParser.json());

const dbUrl = "mongodb://localhost:27017/user_data";
mongoose.connect(dbUrl);

const getUniqueID = () => {
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return s4() + s4() - "-" + s4();
};

wsServer.on("request", function (request) {
  var wsID = getUniqueID();
  console.log(
    new Date() + "Received a new connection from origin " + request.origin + "."
  );

  const connection = request.accept(null, request.origin);
  clients[wsID] = connection;
  console.log(
    "connected: " + wsID + " in" + Object.getOwnPropertyNames(clients)
  );

  connection.on("message", function (message) {
    // user_id

    if (message.type == "utf8") {
      console.log('Received message" ' + message.utf8Data);

      for (key in clients) {
        clients[key].sendUTF(message.utf8Data);
        console.log(message);
        console.log("sent message to: " + clients[key]);
      }
    }
  });
});

function decryptData(encrypted, iv, key) {
  var decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

app.get("/find/:id", async (req, res) => {
  const id = req.params.id;
  const user_details = await userModel.findOne({ userId: id });
  res.set("Access-Control-Allow-Origin", "*");
  res.send(user_details);
});

app.post("/data/:id", async (req, res) => {
  let data = req.body;
  const id = req.params.id.replace("Por21Ld", "/");

  var result = payloadChecker.validator(
    req.body,
    expectedPayload,
    ["name", "email", "phone"],
    false
  );
  if (result.success) {
    var iv = CryptoJS.enc.Base64.parse("");
    var key = CryptoJS.SHA256(salt);

    var user_id = decryptData(id, iv, key);

    let userDetailsRecord = await userModel.findOne({ userId: user_id });

    let userData;
    if (userDetailsRecord) {
      if (userDetailsRecord.data == null) {
        userDetailsRecord.data = [];
      }
      userDetailsRecord.data.push({
        name: data.name,
        email: data.email,
        phone: data.phone,
        other_fields: data.other_fields,
      });

      userData = await userModel.findOneAndUpdate(
        { userId: userDetailsRecord.userId },
        userDetailsRecord,
        { returnOriginal: false }
      );
    } else {
      userDetailsRecord = new userModel({
        userId: user_id,
        data: [
          {
            name: data.name,
            email: data.email,
            phone: data.phone,
            other_fields: data.other_fields,
          },
        ],
      });
      userData = await userDetailsRecord.save();
    }

    client.send(
      JSON.stringify({
        type: "message",
        msg: userData,
      })
    );

    res.send({
      result: "added succesfully: " + data.name,
    });
  } else {
    res.json({ message: result.response.errorMessage });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at: http://localhost:${PORT}/`);
});

mongoose.connection.on("connected", () => {
  console.log("Mongoose default connection open to " + dbUrl);
});

// websocket

// nodejs client - key will use user_id

// react client - key will use user_id
