const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { userModel } = require("./models/userModel");

const app = express();
const PORT = 3100;
app.use(bodyParser.json());

const dbUrl = "mongodb://localhost:27017/user_data";
mongoose.connect(dbUrl);

app.get("/", (req, res) => {
  res.send("Welcome");
});

app.post("/data/:id", async (req, res) => {
  let data = req.body;
  const user_id = req.params.id;
  let userDetails = await userModel.findOne({ userId: user_id });
  if (userDetails) {
    if (userDetails.data == null) {
      userDetails.data = [];
    }
    userDetails.data.push({
      name: data.eventName,
      email: data.endpointUrl,
      phone: data.phone,
      other_fields: data.other_fields,
    });

    userDetails = await userModel.findOneAndUpdate(
      { userId: userDetails.userId },
      userDetails,
      {
        returnOriginal: false,
      }
    );
  } else {
    userDetails = new userModel({
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
    userData = await userDetails.save();
  }

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
