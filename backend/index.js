const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const authMiddleware = (req, res, next) => {
  const authorization = req.get("authorization");
  if (authorization && authorization.startsWith("Bearer ")) {
    const token = authorization.replace("Bearer ", "");
    try {
      const decodedToken = jwt.verify(token, process.env.SECRET);
      if (!decodedToken.id) {
        return res.status(401).json({ error: "Invalid token" });
      }
      req.userId = decodedToken.id; // Store the user ID in the request object
      next();
    } catch (error) {
      return res.status(401).json({ error: "Token invalid or expired" });
    }
  } else {
    return res.status(401).json({ error: "Token missing" });
  }
};

const requestLogger = (request, response, next) => {
  const logEntry = `${new Date().toISOString()} - Method: ${
    request.method
  }, Path: ${request.path}, Body: ${JSON.stringify(request.body)}\n`;

  fs.appendFile("log.txt", logEntry, (err) => {
    if (err) {
      console.error("Error writing to log file", err);
    }
  });

  next();
};

app.use(requestLogger);

mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.MONGODB_CONNECTION_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error.message);
  });

const noteSchema = new mongoose.Schema({
  id: Number,
  title: String,
  author: {
    name: String,
    email: String,
  },
  content: String,
});

noteSchema.set("toJSON", {
  transform: (document, retObj) => {
    retObj._id = retObj._id.toString();
    delete retObj._id;
    delete retObj.__v;
  },
});

const Note = mongoose.model("Note", noteSchema);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  username: String,
  passwordHash: String,
});

userSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    delete returnedObject.passwordHash;
  },
});
const User = mongoose.model("User", userSchema);

app.post("/users", async (request, response) => {
  const { name, email, username, password } = request.body;

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const user = new User({
    name,
    email,
    username,
    passwordHash,
  });
  const savedUser = await user.save();

  response.status(201).json(savedUser);
});

// Create a router for testing purposes
const testingRouter = express.Router();
testingRouter.post("/reset", async (request, response) => {
  await Note.deleteMany({});
  await User.deleteMany({});
  response.status(204).end();
});

// Add testing router only in test mode
if (process.env.NODE_ENV === "test") {
  app.use("/api/testing", testingRouter);
}

app.get("/users", async (request, response) => {
  const users = await User.find({});
  response.json(users);
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const user = await User.findOne({ username });
  const passwordCorrect =
    user === null ? false : await bcrypt.compare(password, user.passwordHash);

  if (!(user && passwordCorrect)) {
    return response.status(401).json({
      error: "invalid username or password",
    });
  }

  const userForToken = {
    username: user.username,
    id: user._id,
  };

  const token = jwt.sign(userForToken, process.env.SECRET, {});

  response.status(200).send({ token, name: user.name, email: user.email });
});

app.get("/notes", async (req, res) => {
  const page = parseInt(req.query._page) || 1;
  const limit = parseInt(req.query._per_page) || 10;
  const skip = (page - 1) * limit;

  Note.find({})
    .skip(skip)
    .limit(limit)
    .then((notes) => {
      res.status(200).json(notes);
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
});

app.get("/notes/total", (req, res) => {
  Note.countDocuments({})
    .then((count) => {
      res.status(200).json({ total: count });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
});

const getTokenFrom = (request) => {
  const authorization = request.get("authorization");
  if (authorization && authorization.startsWith("Bearer ")) {
    return authorization.replace("Bearer ", "");
  }
  return null;
};

app.post("/notes", authMiddleware, async (request, response) => {
  const body = request.body;

  const user = await User.findById(request.userId);

  if (!user) {
    return response.status(401).json({ error: "unAuthorized" });
  }

  const note = new Note({
    id: body.id,
    title: body.title,
    author: {
      name: user.name,
      email: user.email,
    },
    content: body.content,
  });

  const savedNote = await note.save();
  response.status(201).json(savedNote);
});

app.get("/notes/:pos", async (request, response, next) => {
  const pos = parseInt(request.params.pos);

  if (isNaN(pos) || pos < 1) {
    return response.status(404).json({ error: "Invalid position" });
  }

  try {
    const notes = await Note.find({}).sort({ _id: 1 });

    if (pos > notes.length) {
      return response.status(404).json({ error: "No such note exists" });
    }

    const note_to_ret = notes[pos - 1];
    response.status(200).json(note_to_ret);
  } catch (error) {
    next(error);
  }
});

app.delete("/notes/:pos", authMiddleware, async (request, response, next) => {
  const pos = parseInt(request.params.pos);

  if (isNaN(pos) || pos < 1) {
    return response.status(404).json({ error: "Invalid position" });
  }

  try {
    const notes = await Note.find({}).sort({ _id: 1 });

    if (pos > notes.length) {
      return response.status(404).json({ error: "No such note exists" });
    }

    const note_to_delete = notes[pos - 1];

    const user = await User.findById(request.userId);

    if (!user || user.name !== note_to_delete.author.name) {
      return response.status(403).json({
        error: "Forbidden access to another user's note",
      });
    }

    await Note.findByIdAndDelete(note_to_delete._id);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.put("/notes/:pos", authMiddleware, async (request, response, next) => {
  const pos = parseInt(request.params.pos);
  const body = request.body;

  if (isNaN(pos) || pos < 1) {
    return response.status(404).json({ error: "Invalid position" });
  }

  const updated_note = {
    content: body.content,
  };

  try {
    const notes = await Note.find({}).sort({ _id: 1 });

    if (pos > notes.length) {
      return response.status(404).json({ error: "No such note exists" });
    }

    const note_to_update = notes[pos - 1];

    const user = await User.findById(request.userId);

    if (!user || user.name !== note_to_update.author.name) {
      return response
        .status(403)
        .json({ error: "Forbidden access to another user's note" });
    }

    const result = await Note.findByIdAndUpdate(
      note_to_update._id,
      { $set: updated_note },
      { new: true }
    );

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// {
//   "id": 555555555,
// "title": "ggg",
// "author": {
//   "name": "itayush",
//   "email": "bla@bla.com"
// },
// "content": "nmnm"
// }
