import React from 'react';
import { Row, Col, Button, Toast } from 'react-bootstrap';
import { useNavigate, Link, useParams, useLocation, Outlet } from 'react-router-dom';
import { Seatreservation } from './Airplane';
import {ReservationTable} from './Reservation';
import { RouteFilters } from './Filters';
import { LoginForm } from './Auth';
import { useState, useEffect } from 'react';
import API from '../API';
//className="vh-100"

function DefaultLayout(props) {

  const { filterLabel } = useParams();
  const filterId = filterLabel;
  
  return (
    <Row>
      <Col md={4} xl={3} bg="light" className="below-nav" id="left-sidebar">
        <RouteFilters items={props.filters} selected={filterId} />
      </Col>
      <Col md={8} xl={9} className="below-nav">
        <Outlet/>
      </Col>
    </Row>
  );
}

function MainLayout(props) {

  const navigate = useNavigate();
  const { filterLabel } = useParams();
  useEffect(() => {
    if (filterLabel && !props.filters[filterLabel]) { // se filterLabel è definito e se non esiste una corrispondente voce filterLabel nell'oggetto props.filters.
      // Redirect to a different page when filterName is not found - ( se filterLabel è definito e se non esiste una corrispondente voce filterLabel nell'oggetto props.filters.)
      navigate("/notfound"); // Replace '/other-page' with the desired URL
    }
  }, [filterLabel, navigate, props.filters]);

  return (
    <>
    {(filterLabel in props.filters) ? <> <Seatreservation typeplane ={filterLabel} loggedIn={props.loggedIn} user={props.user} /> </> : <h1 className="pb-3">Please select a plane</h1>}
    </>
  )
}

function LoginLayout(props) {
  return (
    <>
      <LoginForm login={props.login} />
    </>
  );
}



function ReservationLayout(props) {

  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [elimination, setElimination] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showValidToast, setShowValidToast] = useState(false);

  const location = useLocation();

 
    const deleteReservation = async (idreservation, typeplane) => {
      try{
        const elimination = await API.deleteReservation(idreservation);
        setElimination(elimination);
        setError(elimination.message);
        setShowValidToast(true);
        setTimeout(() => {
        setShowValidToast(false);  
        navigate(`/planes/${typeplane}`);
        }, 2000);

      }  catch(err){
        setError(err.error);
      }
    }

  

  useEffect(() => {
    const getReservations = async () => {
      try{
        const reservations= await API.getReservations(props.user.id);
        setReservations(reservations);
        setLoading(false);
      } catch(err){
        setError(reservations.error);
      }
    }
      getReservations();
    }, [props.user.id,elimination]);
  
  
  return (
    <>
      <h1 className="pb-3">Reservations:</h1>
      
      <ReservationTable deleteReservation={deleteReservation} reservations={reservations} />
      {/* Show the success toast when setShowValidToast is true */}
      <Toast show={showValidToast} onClose={() => setShowValidToast(false)} delay={5000} autohide bg="success">
            <Toast.Header closeButton={true}>
              <strong className="me-auto">Success</strong>
            </Toast.Header>
            <Toast.Body md="auto">{error}</Toast.Body>
          </Toast>
    </>
  )
}

function NotFoundLayout() {
    return(
        <>
          <h2>This is not the route you are looking for!</h2>
          <Link to="/">
            <Button className="custom-btn" variant="primary">Go Home!</Button>
          </Link>
        </>
    );
  }


export { DefaultLayout, ReservationLayout, NotFoundLayout, MainLayout, LoginLayout };