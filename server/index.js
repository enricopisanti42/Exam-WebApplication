'use strict';

const express = require('express');
const morgan = require('morgan');                                  // logging middleware
const cors = require('cors');

const { check, validationResult, } = require('express-validator'); // validation middleware

const dao = require('./dao');

// init express
const app = new express();
const port = 3001;

app.use(morgan('dev'));
app.use(express.json());

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

/** Authentication-related imports **/
const passport = require('passport');   // authentication middleware
const LocalStrategy = require('passport-local');  // authentication strategy (username and password)

/** Set up authentication strategy to search in the DB a user with a matching password.
 * The user object will contain other information extracted by the method userDao.getUseR.
 **/
passport.use(new LocalStrategy(async function verify(username, password, callback) {
  const user = await dao.getUser(username, password)
  if(!user)
    return callback(null, false, 'Incorrect username or password');  
    
  return callback(null, user); // NOTE: user info in the session (all fields returned by userDao.getUser, i.e, id, username, name, role)
}));


// Serializing in the session the user object given from LocalStrategy(verify).
passport.serializeUser(function (user, callback) { // this user is id + username + name 
  callback(null, user);
});

// Starting from the data in the session, we extract the current (logged-in) user.
passport.deserializeUser(function (user, callback) { // this user is id + email + name 
  // if needed, we can do extra check here (e.g., double check that the user is still in the database, etc.)
  // e.g.: return userDao.getUserById(id).then(user => callback(null, user)).catch(err => callback(err, null));

  return callback(null, user); // this will be available in req.user
});

/** Creating the session */
const session = require('express-session');

app.use(session({
  secret: "shhhhh... it's a secret!",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.authenticate('session'));

/** Defining authentication verification middleware **/
const isLoggedIn = (req, res, next) => {
  if(req.isAuthenticated()) { // To check if a request comes from an authenticated user, we can check Passport's req.isAuthenticated() at the beginning of every callback body in each route to protect
    return next();
  }
  return res.status(401).json({error: 'Not authorized'});
}

/*** Utility Functions ***/

// This function is used to format express-validator errors as strings
const errorFormatter = ({ location, msg, param, value, nestedErrors }) => {
  return `${location}[${param}]: ${msg}`;
};


// POST /api/sessions 
// This route is used for performing login.
app.post('/api/sessions', function(req, res, next) {
  passport.authenticate('local', (err, user, info) => { 
    if (err)
      return next(err);
      if (!user) {
        // display wrong login messages
        return res.status(401).json({ error: info});
      }
      // success, perform the login and extablish a login session
      req.login(user, (err) => {
        if (err)
          return next(err);
        
        // req.user contains the authenticated user, we send all the user info back
        // this is coming from userDao.getUser() in LocalStratecy Verify Fn
        return res.json(req.user);
      });
  })(req, res, next);
});

// GET /api/sessions/current
// This route checks whether the user is logged in or not.
app.get('/api/sessions/current', (req, res) => {
  if(req.isAuthenticated()) {
    res.status(200).json(req.user);}
  else
    res.status(401).json({error: 'Not authenticated'});
});

// DELETE /api/session/current
// This route is used for loggin out the current user.
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => {
    res.status(200).json({});
  });
});


// GET `api/reservations/<iduser>`
app.get('/api/reservations/:iduser',isLoggedIn,[ check('iduser').isInt({min: 1}).withMessage("Id is not an integer") ] , async(req,res) => {
  // Is there any validation error?
  const errors = validationResult(req).formatWith(errorFormatter); // format error message
  if (!errors.isEmpty()) {
  return res.status(422).json({ error: errors.array().join(", ") }); // error message is a single string with all error joined together
  }
  try{
    const checkuser = await dao.getUserById(req.params.iduser);
      if(checkuser.hasOwnProperty("error"))
          res.status(404).json({error: "User not found"});
      else{
        const prenotazioni = await dao.getUserReservations(req.params.iduser);
        return res.status(200).json(prenotazioni);
      }
  } catch (err) {
    res.status(500).json(err);
  }
});

//GET `/api/airplane/<airplanetype>`
const validatePlanetype = [
  check('airplanetype')
    .not()
    .isNumeric()
    .withMessage('Planetype must not be a number') //Se il valore è numerico, questa validazione fallisce e viene restituito un messaggio di errore "Planetype must not be a number".
    .trim()  //Rimuove gli spazi bianchi all'inizio e alla fine del valore del campo "airplanetype"
    .notEmpty()
    .withMessage('Planetype cannot be empty'),
];

app.get("/api/airplanes/:airplanetype", validatePlanetype, async (req, res) => {
  
  const errors = validationResult(req).formatWith(errorFormatter); // format error message
  if (!errors.isEmpty()) {
  return res.status(422).json({ error: errors.array().join(", ") }); // error message is a single string with all error joined together
  }
  try {
    const result = await dao.getPlaneSeats(req.params.airplanetype);
    
    if (result.error) {
      return res.status(404).json({ error: "Aereo non trovato" });
    } else {
      return res.status(200).json(result);
    }
  } catch (err) {
    res.status(500).json(err);
  }
});


//DELETE `api/reservations/
app.delete("/api/reservations/:idreservation", [check("idreservation").isInt({ min: 1 }).withMessage("Id is not an integer")],async (req, res) => {
  try {

    const errors = validationResult(req).formatWith(errorFormatter); // format error message
    if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array().join(", ") }); // error message is a single string with all error joined together
    }
    
    const reservationId = req.params.idreservation;
    const result = await dao.deleteReservation(reservationId);
    
    if (result.rowsAffectedReservations > 0 || result.rowsAffectedReservedSeats > 0) { //se ho avuto un "effetto" > 0
      res.status(201).json({message : "Seat canceled correctly"}); // Successful deletion, no content to return
    } else {
      res.status(404).json({ error: "Reservation not found." });
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

// POST `api/reservations/`
app.post("/api/reservations", isLoggedIn,
    check("idplane")
      .isInt({ min: 1 })
      .withMessage('Invalid id plane ')
      .notEmpty()
      .withMessage('Plane cannot be empty'),
    check("seats")
      .notEmpty()
      .withMessage("Seat cannot be empty")
      .isArray({min: 1})
      .withMessage("Seat must not be an empty ")
      .custom((value) => {
        for (const seat of value) {
          if (!/^(1\d|[1-9]|2[0-5])[a-f]$/.test(seat)) { //La regex controlla se seat è una combinazione di due caratteri: un numero da 1 a 25 seguito da una lettera compresa tra "a" e "f".
            return false;
          }
        }
        return true;
      })
      .withMessage(
        "Il campo seat deve essere un array di stringhe, dove ogni elemento ha il formato di un numero compreso tra 1 e 25 seguito da una lettera compresa tra a e f."
      ),
    async (req, res) => {

  const errors = validationResult(req).formatWith(errorFormatter); // format error message
    if (!errors.isEmpty()) {
     return res.status(422).json({ error: errors.array().join(", ") }); // error message is a single string with all error joined together
    }

  const checking = await dao.checkUserReservation(req.user.id, req.body.idplane);
    if(checking>0){
      return res.status(406).json({ error: "You have just done a reservation for that specific plane"})
    }
  
  const reservation = {
    iduser: req.user.id,
    idplane: req.body.idplane,
    seats: req.body.seats,
  };

  try {
    const datareservation = await dao.createReservation(
      reservation.iduser,
      reservation.idplane,
      reservation.seats
    );

  if(datareservation.error){
    return res.status(406).json({error: datareservation.error, seats: datareservation.seats}); //verifichiamo fondamentalmente se questi posti sono riservati dato che abbiamo già checkato nel middleware sia iduser che idplane!
  }

  else
    return res.status(201).json(datareservation);
    
  }  catch (err) {
    res.status(500).end();
  }
});

// activate the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});