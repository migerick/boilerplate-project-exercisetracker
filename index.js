require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define Mongoose Schemas
const userSchema = new mongoose.Schema({
  username: String
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  duration: Number,
  date: String
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Serve HTML page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// 1️⃣ Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.json({ error: 'Error creating user' });
  }
});

// 2️⃣ Get all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, '_id username');
  res.json(users);
});

// 3️⃣ Add exercise to a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const user = await User.findById(req.params._id);

    if (!user) {
      return res.json({ error: 'User not found' });
    }

    const formattedDate = date ? new Date(date).toDateString() : new Date().toDateString();
    const exercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: formattedDate
    });

    await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description,
      duration: parseInt(duration),
      date: formattedDate
    });
  } catch (err) {
    res.json({ error: 'Error adding exercise' });
  }
});

// 4️⃣ Get a user's exercise log with filters (from, to, limit)
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.json({ error: 'User not found' });

    let { from, to, limit } = req.query;
    let filter = { userId: user._id };

    // ✅ Filtrar fechas solo si existen y son válidas (y convertirlas al formato "Mon Jan 01 1990")
    if (from || to) {
      filter.date = {};

      if (from) {
        const fromDate = new Date(from);
        filter.date.$gte = fromDate.toDateString();  // Convertir a "Mon Jan 01 1990"
      }

      if (to) {
        const toDate = new Date(to);
        filter.date.$lte = toDate.toDateString();  // Convertir a "Mon Jan 01 1990"
      }
    }

    console.log(filter)

    // 🔹 Buscar ejercicios aplicando filtros
    let exercisesQuery = Exercise.find(filter).select('description duration date -_id').sort({ date: 1 });

    // ✅ Validar que "limit" sea un número válido antes de aplicarlo
    if (limit !== undefined) {
      const parsedLimit = parseInt(limit);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        exercisesQuery = exercisesQuery.limit(parsedLimit);
      }
    }

    let exercises = await exercisesQuery;

    // console.log({
    //   username: user.username,
    //   count: exercises.length,
    //   _id: user._id,
    //   log: exercises.map(ex => ({
    //     description: ex.description,
    //     duration: ex.duration,
    //     date: new Date(ex.date).toDateString() // ✅ Formato correcto "Mon Jan 01 1990"
    //   }))
    // })

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: new Date(ex.date).toDateString() // ✅ Formato correcto "Mon Jan 01 1990"
      }))
    });
  } catch (err) {
    res.json({ error: 'Error fetching logs' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
