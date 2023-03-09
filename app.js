const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { userModel } = require("./models/userModel");
const websocketServer = require("websocket").server;
const { w3cwebsocket: W3CWebSocket } = require("websocket");

const http = require("http");

const app = express();
const PORT = 3100;
const websocketServerPort = 8000;

const server = http.createServer();
server.listen(websocketServerPort);
console.log("listening on port 8000");

const client = new W3CWebSocket("ws://127.0.0.1:8000");
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

app.get("/", (req, res) => {
  res.send("Welcome");
});

app.post("/data/:id", async (req, res) => {
  let data = req.body;
  const user_id = req.params.id;
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
