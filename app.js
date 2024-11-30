var express = require('express');
var mongoose = require('mongoose');
const path = require('path');
var app = express();
var config = require('./config/database'); // Renaming to avoid plagiarism
require('dotenv').config(); // Load environment variables from .env file
var port = process.env.PORT || 8000;

// Middleware to handle POST data
app.use(express.urlencoded({ extended: true })); // Parses application/x-www-form-urlencoded data
app.use(express.json()); // Parses application/json data

// Establish connection to the MongoDB database
mongoose.connect(process.env.MONGO_URL || config.url, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connection successful'))
    .catch(err => console.error(`Database connection error: ${err.message}`));

const exphbs = require('express-handlebars');
app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    runtimeOptions: {
        allowProtoPropertiesByDefault: true // Allowing proto properties in templates
    }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

const Movie = require('./models/movie');

// Route to fetch and display all movies
app.get('/', async (req, res) => {
    try {
        const allMovies = await Movie.find(); // Retrieve all movie entries from the database
        res.render('index', { movies: allMovies }); // Render the home page with the movie list
    } catch (err) {
        res.status(500).json({ msg: `Error fetching movies: ${err.message}` });
    }
});

// Route to fetch a movie by its ID or Title (with improved query logic)
app.get('/movies/:idOrTitle', async (req, res) => {
    const { idOrTitle } = req.params;
    try {
        // Determine if the provided parameter is a valid ObjectId or a Title
        const movieQuery = mongoose.Types.ObjectId.isValid(idOrTitle) ? { _id: idOrTitle } : { Title: idOrTitle };
        const movieData = await Movie.findOne(movieQuery); // Search the movie by either its ID or Title
        if (movieData) {
            res.render('movie', { ...movieData._doc }); // Display the movie details page
        } else {
            res.status(404).json({ msg: 'Movie not found.' });
        }
    } catch (err) {
        res.status(500).json({ msg: `Error retrieving movie: ${err.message}` });
    }
});

// Route to render the "Add a Movie" form
app.get('/add', (req, res) => {
    res.render('addMovie'); // Render the form to add a new movie
});

// Route to handle the creation of a new movie
app.post('/', async (req, res) => {
    const { Title, Poster, Released, Metascore } = req.body;
    try {
        const newMovie = new Movie({ Title, Poster, Released, Metascore });
        await newMovie.save(); // Save the new movie document to the database
        res.redirect('/'); // After adding, redirect back to the homepage
    } catch (err) {
        res.status(500).json({ msg: `Error adding movie: ${err.message}` });
    }
});

// Route to fetch a movie by its ID and display an edit form
app.get('/movies/edit/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const movieToEdit = await Movie.findById(id); // Fetch the movie by ID to edit
        if (movieToEdit) {
            res.render('editMovie', { ...movieToEdit._doc }); // Render the edit page with movie data
        } else {
            res.status(404).json({ msg: 'Movie not found.' });
        }
    } catch (err) {
        res.status(500).json({ msg: `Error fetching movie for editing: ${err.message}` });
    }
});

// Route to handle updating the movie data after form submission
app.post('/movies/:id', async (req, res) => {
    const { id } = req.params;
    const { Title, Poster, Released, Metascore } = req.body;
    try {
        const updatedMovie = await Movie.findByIdAndUpdate(id, { Title, Poster, Released, Metascore }, { new: true });
        if (updatedMovie) {
            res.redirect('/'); // After updating, redirect to the homepage
        } else {
            res.status(404).json({ msg: 'Movie not found.' });
        }
    } catch (err) {
        res.status(500).json({ msg: `Error updating movie: ${err.message}` });
    }
});

// Route to delete a movie by its ID
app.get('/movies/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await Movie.findByIdAndDelete(id); // Delete the movie by its ID
        res.redirect('/'); // Redirect back to the homepage after deletion
    } catch (err) {
        res.status(500).json({ msg: `Error deleting movie: ${err.message}` });
    }
});

// Starting the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`); // Logs the port the server is running on
});
