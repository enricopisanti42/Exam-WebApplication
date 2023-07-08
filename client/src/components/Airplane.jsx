import React, { useEffect, useState } from 'react';
import { Container, Table, Button, Col, Row, Form, Toast } from 'react-bootstrap';
import API from '../API';
import './seat.css';


function Seatreservation(props) {
 
  const filterLabel = props.typeplane;
  const [airplaneinfo, setairplaneinfo] = useState([]);
  const [error, setError] = useState("");
  const [errorSeatMessage, setErrorSeatMessage] = useState(""); // Nuovo stato per il messaggio di errore del posto
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [showValidToast, setShowValidToast] = useState(false);
  const [prenotazione, setprenotazione] = useState();
  const [loading, setLoading] = useState(true); //"loading": a state used to indicate if the data are in a loading phase
  const [numSeats, setNumSeats] = useState(0); // State to store the number of seats to book
  const [blinkedseat,setblinkedseat] = useState(null);

  const [seatSelected, setSeatSelected] = useState({
    local: [],
    regional: [],
    international: [],
  });


  useEffect(() => {
  
    const funzioneblink = () => {
      // Apply the "color" to the td element
      const tdElements = blinkedseat.map(seat => document.getElementById(`seat-${seat}`));
      tdElements.forEach(tdElement =>{
        if (tdElement) {
          tdElement.classList.add('blink');
        }
      });
        // Remove the "blinking" after 5 seconds
        setTimeout(() => {
          tdElements.forEach(tdElement => {
            if(tdElement){
              tdElement.classList.remove('blink');
            }
          });
        }, 5000);
      }
    if (blinkedseat && blinkedseat.length > 0){
      funzioneblink();
    }
  }, [blinkedseat]);


  useEffect(() => {
    const getAirplaneParams = async () => {
      try{
        const airplaneinfo= await API.getAirplaneParams(filterLabel);
        setairplaneinfo(airplaneinfo);
        setLoading(false);
      } catch(err){
        setError(airplaneinfo.error);
      }
    }
      getAirplaneParams();
    }, [filterLabel,prenotazione]);  //avrei potuto mettere seatSelected nel dependency array ma avrei dovuto fare una fetch ogni volta che cliccavo un posto



  const checktrue = (seat) => { //controllo se non è nei reserved quel determinato posto per una specifica tipologia di aereo. 
    return airplaneinfo.reservedSeats.indexOf(seat) === -1; //Restituisce true se il posto non è riservato e false se il posto è già stato prenotato.
  }; 

  const onClickData = (seat, tipologiaaereo) => {
      if (seatSelected[tipologiaaereo].indexOf(seat) > -1) {
        setSeatSelected((oldseatSelected) => ({
          ...oldseatSelected,
          [tipologiaaereo]: oldseatSelected[tipologiaaereo].filter((res) => res !== seat),
        }));
      } else {
        setSeatSelected((oldseatSelected) => ({
          ...oldseatSelected,
          [tipologiaaereo]: [...oldseatSelected[tipologiaaereo], seat],
        }));
      }
    };
   
 
const handleSubmited = async (tipologiaaereo) => {
     
  const newReservation = {
        idplane: airplaneinfo.idplane,
        seats: [...seatSelected[tipologiaaereo]],
      };
    
      try {
      // Controlla se l'utente ha già prenotato posti per lo stesso tipo di aereo
      const userReservations = await API.getReservations(props.user.id); // Ottieni le prenotazioni dell'utente
      const hasReservation = userReservations.some((reservation) => reservation.typeplane === airplaneinfo.typeplane);
      if (hasReservation) {
        throw new Error("You have already made a reservation for this airplane.");
      }

      const x = await API.createReservation(newReservation);
        setprenotazione(x);
        setError("Seat reserved correctly");
        setShowValidToast(true);
        setTimeout(() => {setShowValidToast(false);}, 5000);

      setSeatSelected((oldseatSelected) => ({
        ...oldseatSelected,
          [tipologiaaereo]: [],
        }));
      } catch (error) {

        if(error.seats){
          setblinkedseat([...error.seats]);
          setErrorSeatMessage("This seat is just reserved"); // Imposta il messaggio di errore specifico
        }

        setError(error.error);
        if  ( error.message && error.message  === "You have already made a reservation for this airplane.") {
          setError("Oops! You have already made a reservation for this airplane.");
        }

        setShowErrorToast(true);
      }
    };


  const unselect = () => {
    setSeatSelected((oldseatSelected) => ({
      ...oldseatSelected,
        [airplaneinfo.typeplane]: [],
    }));
    }

  const handleSubmitedFromForm = async (tipologiaaereo, selectedSeats) => {
     const newReservation = {
        idplane: airplaneinfo.idplane,
        seats: [...selectedSeats],
      };
    
      try {
        
      // Controlla se l'utente ha già prenotato posti per lo stesso tipo di aereo
      const userReservations = await API.getReservations(props.user.id); // Ottieni le prenotazioni dell'utente
      const hasReservation = userReservations.some((reservation) => reservation.typeplane === airplaneinfo.typeplane);
      if (hasReservation) {
        throw new Error("You have already made a reservation for this airplane.");
        }
    
      const x = await API.createReservation(newReservation);
      setprenotazione(x);
      setError("Seat reserved correctly");
      setShowValidToast(true); //Viene impostato lo stato showValidToast su true per mostrare il toast di successo.
      setTimeout(() => {setShowValidToast(false);}, 5000);
    
      setSeatSelected((oldseatSelected) => ({
        ...oldseatSelected, 
        [tipologiaaereo]: [],
        }));
      } catch (error) {

        if(error.seats){
          setblinkedseat([...error.seats]);
          setErrorSeatMessage("This seat is just reserved"); // Imposta il messaggio di errore specifico
        }
        setError(error.message);
        if (error.message === "You have already made a reservation for this airplane.") {
          setError("Oops! You have already made a reservation for this airplane.");
        }
        setShowErrorToast(true);
      }
    };
    
  const handleNumSeatsChange = (event) => { //The "handleNumSeatsChange" function is called whenever the user changes the number of seats to reserve. Update the "numSeats" status with the user-selected value
    event.preventDefault();
    setNumSeats(parseInt(event.target.value));
  };

  const handleFormSubmit = (event) => {
    event.preventDefault(); //per prevenire il comportamento di default del modulo di ricaricare la pagina.
    
    if (numSeats === 0 ) {
     handleSubmited(airplaneinfo.typeplane);
    } else {
      const availableSeats = airplaneinfo.planeSeats.filter((seat) => !airplaneinfo.reservedSeats.includes(seat));

      if (availableSeats.length < numSeats) {
        setError("Not enough available seats"); 
        setShowErrorToast(true);
        return;
      }
      const selectedSeats = availableSeats.slice(0, numSeats); //vengono selezionati i primi numSeats elementi dell'array.
      handleSubmitedFromForm(airplaneinfo.typeplane, selectedSeats);
      setNumSeats(0);
    }
  };

  if(loading){
    return <p>Loading...</p>;
  }
  if(!airplaneinfo){
    return error;
  }

  return (
    
  <div className="centered-container">
    <Container>
      <Row>
        <Table>
          <tbody>
            <tr>
              <td>Reserved seats: {airplaneinfo.reservedSeats.length}</td>
              <td>Available seats: {airplaneinfo.planeSeats.length - airplaneinfo.reservedSeats.length}</td>
              <td>Total seats: {airplaneinfo.planeSeats.length}</td>
            </tr>
          </tbody>
        </Table>
      </Row>

      <Container>
        <Table className="grid">
          <tbody>
            {airplaneinfo.planeSeats.map((row, index) => {
              if (index % airplaneinfo.seatsPerRow === 0) {
                return (
                  <tr key={index}>
                    {airplaneinfo.planeSeats.slice(index, index + airplaneinfo.seatsPerRow).map((seat) => (
                      <td
                      id={`seat-${seat}`} //ad ogni casella associamo un id
                        className={
                          airplaneinfo.reservedSeats.includes(seat)
                            ? 'reserved'
                            : seatSelected[airplaneinfo.typeplane].includes(seat)
                            ? 'selected'
                              : 'available'
                        }
                        key={seat}
                        onClick={checktrue(seat) && props.loggedIn ? () => {onClickData(seat, airplaneinfo.typeplane); setNumSeats(0);} : null}
                        >
                        {seat}
                      </td>
                    ))}
                  </tr>
                );
              }
              return null;
            })}
          </tbody>
        </Table>
      </Container>
        <ReservationForm numSeats={numSeats} handleNumSeatsChange={handleNumSeatsChange} onSubmit={handleFormSubmit} loggedIn={props.loggedIn} setNumSeats={setNumSeats} unselect={unselect} />
          <Toast show={showErrorToast} onClose={() => setShowErrorToast(false)} delay={5000} autohide bg="danger">
            <Toast.Header> <strong className="mr-auto">Error</strong> </Toast.Header>
                <Toast.Body>{error || errorSeatMessage}</Toast.Body>
          </Toast>
       {/* Show the success toast when showSuccessToast is true */}
          <Toast show={showValidToast} onClose={() => setShowValidToast(false)} delay={5000} autohide bg="success">
            <Toast.Header closeButton={true}> <strong className="me-auto">Success</strong> </Toast.Header>
            <Toast.Body md="auto">{error}</Toast.Body>
          </Toast>
    </Container>
  </div>
  );
}

function ReservationForm(props) {
  const handleSubmit = (event) => {
    event.preventDefault();
    props.onSubmit(event);
  };

  return (
    <>
      {props.loggedIn ? (
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Number of seats</Form.Label>
            <Form.Control type="number" min="0" value={props.numSeats} onChange={props.handleNumSeatsChange} />
          </Form.Group>
          <div className="button-container">
            <Button type="submit" className="btn-success"> Confirm Booking </Button>
            <Button variant="secondary" onClick={() =>{props.unselect(); props.setNumSeats(0)}}> Cancel  </Button>
          </div>
        </Form>
      ) : (
        <></>
      )}
    </>
  );
}

export { Seatreservation };

//La classe mb-3 applicherà un margine inferiore al gruppo del form, creando lo spazio desiderato.