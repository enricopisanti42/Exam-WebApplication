import React from 'react';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Navbar, Nav, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { LogoutButton, LoginButton } from './Auth';

const Navigation = (props) => {

  return (
    <Navbar bg="success" expand="sm" variant="dark" fixed="top" className="navbar-padding">
      <Link style={{ textDecoration: 'none' }} to="/">
        <Navbar.Brand><i className="bi bi-airplane"></i>Enrico AIRLINES<i className="bi bi-pin-map"></i></Navbar.Brand>
      </Link>

    <Nav className="ms-auto" fixed="top-right">
          <Navbar.Text className="mx-2">
            {(props.user && props.user.username ) ? `Welcome, ${props.user.username}` : "Welcome anonymous!"}
          </Navbar.Text>
            <Form className="mx-2">
                {props.loggedIn ? <LogoutButton logout={props.logout}/> : <LoginButton/>}
            </Form>
        </Nav>
    </Navbar>
    
  );
}

export { Navigation };