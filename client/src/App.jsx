import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';
import { React, useState, useEffect } from 'react';
import { Container, Toast } from 'react-bootstrap/'
import { BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import API from './API';
import {Navigation} from './components/Navigation';
import { MainLayout, ReservationLayout, LoginLayout , DefaultLayout, NotFoundLayout } from './components/AirplaneLayout';

function App() {

  // This state keeps track if the user is currently logged-in.
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // This state contains the user's info.
  const [user, setUser] = useState(null);


  const handleErrors = (err) => {
    let msg = '';
    if (err.error) msg = err.error;
    else if (String(err) === "string") msg = String(err);
    else msg = "Unknown Error";
    setMessage(msg); // WARN: a more complex application requires a queue of messages. In this example only last error is shown.
  }
// la funzione handleErrors interpreta e gestisce gli errori restituiti durante l'esecuzione delle operazioni nel tuo codice, 
//creando un messaggio di errore comprensibile per l'utente e impostando lo stato message per visualizzarlo nell'interfaccia utente.

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const user = await API.getUserInfo();  // here you have the user info, if already logged in
        setUser(user);
        setLoggedIn(true); setLoading(false);
      } catch (err) {
        handleErrors(err)
        setUser(null);
        setLoggedIn(false); setLoading(false);
      }
    };
    init();
  }, []);  // This useEffect is called only the first time the component is mounted.

  /**
   * This function handles the login process.
   * It requires a username and a password inside a "credentials" object.
   */
  const handleLogin = async (credentials) => {
    try {
      const user = await API.logIn(credentials);
      console.log(user);
      setUser(user);
      setLoggedIn(true);
    } catch (err) {
      // error is handled and visualized in the login form, do not manage error, throw it
      throw err;
    }
  };

/**
   * This function handles the logout process.
   */ 
    const handleLogout = async () => {
      await API.logOut();
      setLoggedIn(false);
      // clean up everything
      setUser(null);
    };

  /*
   * 
   * Defining a structure for Filters
   * Each filter is identified by a unique name and is composed by the following fields:
   * - A label to be shown in the GUI
   * - An URL of the corresponding route
   * - A filter function applied before passing the films to the FilmTable component
   */
  const filters = {
    'local':  { label: 'Local', url: '/planes/local'},
    'regional':      { label: 'Regional', url: '/planes/regional'},
    'international': { label: 'International', url: '/planes/international'},
    'myreservations':  { label: 'My Reservations', url: user ? "/reservations" : "/login", filterFunction: null },
  };

  
  return (
    <BrowserRouter>
      <Container fluid className='App'>
        <Navigation logout={handleLogout} user={user} loggedIn={loggedIn} /> 
        <Routes>
          <Route path="/" element={ <DefaultLayout filters={filters}  /> } >
            <Route index element={ <MainLayout  filters={filters} user={user} loggedIn={loggedIn} /> } />
            <Route path="/planes/:filterLabel" element={ <MainLayout  filters={filters} user={user} loggedIn={loggedIn} /> } />
            <Route path="/reservations" element={ loggedIn ? <ReservationLayout filters={filters} user={user}/> : <Navigate replace to='/' /> }/>
            <Route path="/*" element={<NotFoundLayout/>} />
          </Route>
          <Route path="/login" element={!loggedIn ? <LoginLayout login={handleLogin} /> : <Navigate replace to='/' />} />
        </Routes>

        <Toast show={message !== ''} onClose={() => setMessage('')} delay={4000} autohide bg="danger">
            <Toast.Body>{message}</Toast.Body>
          </Toast>

      </Container>
    </BrowserRouter>
  );
}

export default App;