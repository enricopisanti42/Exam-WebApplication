import { Table, Form, Button } from 'react-bootstrap/'
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

function ReservationTable(props) {
  const filteredreservations = props.reservations;

  return (
    <Table striped>
      <thead>
        <tr>
          <th></th>
          <th>Reservation ID</th>
          <th>Plane</th>
          <th>Seats reserved</th>
        </tr>
      </thead>
      <tbody>
        { filteredreservations.map((reservation) => <ReservationRow key={reservation.id} reservationData={reservation} deleteReservation={props.deleteReservation} />) }
      </tbody>
    </Table>
  );
}
  
function ReservationRow(props) {

  // location is used to pass state to the edit (or add) view so that we may be able to come back to the last filter view
  const location = useLocation();

  return(
    <tr>
      <td className='auto'>
      <Button variant='danger' onClick={() => props.deleteReservation(props.reservationData.id, props.reservationData.typeplane) }>
          <i className="bi bi-trash"/>
        </Button>
      </td>
      <td>
        <p>
          {props.reservationData.id}
        </p>
      </td>
      <td>
        <p>
          {props.reservationData.typeplane}
        </p>
      </td>
      <td>
        <p>
          {props.reservationData.seats.join(',')}
        </p>
      </td>
    </tr>
  );
}
export {ReservationTable};
