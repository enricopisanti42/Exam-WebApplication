import dayjs from 'dayjs';

const SERVER_URL = 'http://localhost:3001/api/';


/**
 * A utility function for parsing the HTTP response.
 */
function getJson(httpResponsePromise) {
  // server API always return JSON, in case of error the format is the following { error: <message> } 
  return new Promise((resolve, reject) => {
    httpResponsePromise
      .then((response) => {
        if (response.ok) {

         // the server always returns a JSON, even empty {}. Never null or non json, otherwise the method will fail
         response.json()
            .then( json => resolve(json) )
            .catch( err => reject({ error: "Cannot parse server response" }))

        } else {
          // analyzing the cause of error
          response.json()
            .then(obj => 
              reject(obj)
              ) // error msg in the response body
            .catch(err => reject({ error: "Cannot parse server response" })) // something else
        }
      })
      .catch(err => 
        reject({ error: "Cannot communicate"  })
      ) // connection error
  });
}

/**
 * This function wants username and password inside a "credentials" object.
 * It executes the log-in.
 */
const logIn = async (credentials) => {
    return getJson(fetch(SERVER_URL + 'sessions', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include',  // this parameter specifies that authentication cookie must be forwared
      body: JSON.stringify(credentials),
    })
    )
  };
  
  /**
   * This function is used to verify if the user is still logged-in.
   * It returns a JSON object with the user info.
   */
  const getUserInfo = async () => {
    return getJson(fetch(SERVER_URL + 'sessions/current', {
      // this parameter specifies that authentication cookie must be forwared
      credentials: 'include'
    })
    )
  };
  
  /**
   * This function destroy the current user's session and execute the log-out.
   */
  const logOut = async() => {
    return getJson(fetch(SERVER_URL + 'sessions/current', {
      method: 'DELETE',
      credentials: 'include'  // this parameter specifies that authentication cookie must be forwared
    })
    )
  }

const getReservations = async (iduser) => {
    const response = await fetch(SERVER_URL + `reservations/${iduser}`, {
      credentials: "include",
    });
  
    if (response.ok) {
      return response.json(); // Restituisci il corpo della risposta come JSON
    } else {
      const errorData = await response.json(); // Ottieni l'oggetto JSON dell'errore
      throw new Error(errorData.message || "Errore nella richiesta"); // Lancio un'eccezione con un messaggio personalizzato
    }
  };

const getAirplaneParams = async (airplanetype) => {
    return getJson(fetch(SERVER_URL + `airplanes/${airplanetype}`));
  }

const createReservation = async(reservation) => {
  return getJson(fetch(SERVER_URL + 'reservations', {
    method : 'POST',
    headers: {
      "Content-Type": "application/json",
    },
    credentials: 'include', // this parameter specifies that authentication cookie must be forwared
    body: JSON.stringify(reservation),

  })
  );
};

const deleteReservation = async(idreservation) => {
  return getJson(fetch(SERVER_URL + `reservations/${idreservation}`, {
    method : 'DELETE',
    credentials: 'include', // this parameter specifies that authentication cookie must be forwared
  })
  );
};


  const API = {logIn, getUserInfo, logOut, getAirplaneParams, getReservations, createReservation, deleteReservation};
  export default API;