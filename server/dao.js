/* Data Access Object (DAO) module for accessing users data */

const db = require('./db');
const crypto = require('crypto');

// This function returns user's information given its id.
exports.getUserById = (id) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM Users WHERE iduser=?';
      db.get(sql, [id], (err, row) => {
        if (err)
          reject(err);
        else if (row === undefined)
          resolve({ error: 'User not found.' });
        else {
          // By default, the local strategy looks for "username": 
          // for simplicity, instead of using "email", we create an object with that property.
          const user = { id: row.iduser, username: row.username, email: row.email}
          resolve(user);
        }
      });
    });
  };
  
  // This function is used at log-in time to verify username and password.
exports.getUser = (email, password) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM Users WHERE email=?';
      db.get(sql, [email], (err, row) => {
        if (err) {
          reject(err);
        } else if (row === undefined) {
          resolve(false);
        }
        else {
          const user = { id: row.iduser, username: row.username, email: row.email };
  
          // Check the hashes with an async call, this operation may be CPU-intensive (and we don't want to block the server)
          crypto.scrypt(password, row.passwordsalt, 32, function (err, hashedPassword) { // WARN: it is 64 and not 32 (as in the week example) in the DB
            if (err) reject(err);
            if (!crypto.timingSafeEqual(Buffer.from(row.passwordhash, 'hex'), hashedPassword)) // WARN: it is hash and not password (as in the week example) in the DB
              resolve(false);
            else
              resolve(user);
          });
        }
      });
    });
  };


exports.getUserReservations = (userId) => {
  return new Promise((resolve, reject) => {
      const sql = `
        SELECT R.idreservation, P.typeplane, S.seat, U.username
        FROM Reservations AS R
        JOIN Reservedseats AS S ON R.idreservation = S.reservation
        JOIN Users AS U ON R.iduser = U.iduser
        JOIN Planes AS P ON R.plane = P.idplane
        WHERE U.iduser = ?
      `;
      db.all(sql, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const reservations = {};
          rows.forEach(row => {
            const { idreservation, username, typeplane, seat } = row;
            if (!reservations.hasOwnProperty(idreservation)) {
              reservations[idreservation] = {
                id: idreservation,
                username: username,
                typeplane: typeplane,
                seats: [seat]
              };
            } else {
              reservations[idreservation].seats.push(seat);
            }
          });
        
          resolve(Object.values(reservations)); //un array contenente tutti gli oggetti delle prenotazioni

        }
      });
 });
};
  
exports.createReservation = (userId, planeId, seats) => {
  return new Promise((resolve, reject) => {
    const checkAvailabilitySql = `
      SELECT seat
      FROM ReservedSeats
      WHERE seat IN (${seats.map(() => "?").join(",")}) 
        AND idplane = ?;
    `;
//I posti devono essere inclusi nell'array seats fornito come parametro alla funzione.
    db.serialize(() => {
      db.all(checkAvailabilitySql, [...seats, planeId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          if (rows && rows.length > 0) { //alcuni posti specificati nell'array seats sono già prenotati e quindi non sono disponibili.
            const unavailableSeats = rows.map((row) => row.seat);
            resolve({error: "Seats not available", seats: unavailableSeats })
          } else { // tutti i posti sono disponibili e la prenotazione può essere creata
            const insertBookingSql = `
              INSERT INTO Reservations (iduser, plane)
              VALUES (?, ?);
            `;
            db.run(insertBookingSql, [userId, planeId], function (err) {
              if (err) {
                reject(err);
              } else {
                const reservationId = this.lastID;
                const insertSeatSql = `
                  INSERT INTO ReservedSeats (reservation, seat, idplane)
                  VALUES (?, ?, ?);
                `;
                const statements = seats.map((seat) => ({
                  sql: insertSeatSql,
                  params: [reservationId, seat, planeId],
                }));

                db.serialize(() => {
                  statements.forEach((stmt) => {
                    db.run(stmt.sql, stmt.params, function (err) {
                      if (err) {
                        reject(err);
                      }
                    });
                  });
                });

                resolve({
                  reservationId,
                  planeId,
                  userId,
                  seats,
                });
              }
            });
          }
        }
      });
    });
  });
};

exports.deleteReservation = (reservationId) => {
  return new Promise((resolve, reject) => {
    const deleteReservationSql = `
      DELETE FROM Reservations
      WHERE idreservation = ?;
    `;

    const deleteReservedSeatsSql = `
      DELETE FROM Reservedseats
      WHERE reservation = ?;
    `;

    db.serialize(() => {
      db.run("BEGIN"); // Inizia la transazione

      db.run(deleteReservationSql, [reservationId], function (err) {
        if (err) {
          db.run("ROLLBACK"); // Annulla la transazione in caso di errore
          reject(err);
        } else {
          const rowsAffectedReservations = this.changes;

          db.run(deleteReservedSeatsSql, [reservationId], function (err) {
            if (err) {
              db.run("ROLLBACK"); // Annulla la transazione in caso di errore
              reject(err);
            } else {
              const rowsAffectedReservedSeats = this.changes;

              db.run("COMMIT", function (err) {
                if (err) {
                  reject(err);
                } else {
                  resolve({ rowsAffectedReservations, rowsAffectedReservedSeats });
                }
              });
            }
          });
        }
      });
    });
  });
};

exports.getPlaneSeats = (typeplane) => {
    return new Promise((resolve, reject) => {
      const planeSeats = [];
      const reservedSeats = [];
  
      db.serialize(() => {
        db.get("SELECT seatsinrow, rowstot, idplane FROM Planes WHERE typeplane = ?",[typeplane], (err, row) => {
            if (err) {
              reject(err);
              return;
            }
  
            if (!row) {
              resolve({error :`Plane with  ${typeplane} not found`});
              return;
            }
            const { seatsinrow, rowstot } = row;
            db.all('SELECT seat FROM Reservedseats WHERE reservation IN (SELECT idreservation FROM Reservations WHERE Plane IN (SELECT idplane FROM Planes WHERE typeplane = ?))',[typeplane], (err, rows) => {
                if (err) {
                  reject(err);
                  return;
                }
               
                rows.forEach((row) => {
                  reservedSeats.push(row.seat);
                });
  
                for (let row = 1; row <= rowstot; row++) {
                  for (let seat = 1; seat <= seatsinrow; seat++) {
                    planeSeats.push(`${row}${String.fromCharCode(96 + seat)}`); //97 è l'ASCII di 'a';  Nella tabella ASCII, i caratteri alfabetici minuscoli sono rappresentati dai numeri da 97 a 122.
                  }
                }
  
                resolve({
                  idplane : row.idplane,
                  typeplane: typeplane,
                  seatsPerRow: seatsinrow,
                  totalRows: rowstot,
                  planeSeats,
                  reservedSeats,
                });
              }
            );
          }
        );
      });
    });
  };


exports.checkUserReservation = (userId, planeId) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT COUNT(*) AS count FROM Reservations WHERE iduser = ? AND plane = ?';
    const params = [userId, planeId];
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.count > 0);
      }
    });
  });
};

/* La funzione checkUserReservation restituisce una promessa che si risolve con il valore booleano true se l'utente ha effettuato una prenotazione per l'aereo specifico identificato dagli ID forniti, e false altrimenti. */

  
  
  
  


  

  