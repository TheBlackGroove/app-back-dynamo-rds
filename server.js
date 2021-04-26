var dynamo = require('dynamodb');
var express = require('express');
var Joi = require('joi');
const async = require('async');

const { v4 } = require('uuid');

var mysql = require('mysql');

const mysql_connection = mysql.createConnection({
  host: 'database-1.cz6aompqw5al.us-east-2.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'administrator',
  database: 'capacitacion_aws'
})

dynamo.AWS.config.update({
  accessKeyId: 'AKIA3XK6SHOAB3JB5YOK',
  secretAccessKey: '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',
  region: "us-east-2"
});

var auditorias_libros = dynamo.define('auditorias_libro', {
  hashKey: 'hash_auditoria',
  schema: {
    hash_auditoria: Joi.string(),
    timestamp: Joi.string()
  }
})

const app = express();

app.post('/registro', (req, res) => {

  let nombre = req.query.name;
  let autor = req.query.autor;

  let hash_auditoria =  v4();
  let timestamp = new Date().getTime().toString();

  auditorias_libros.create({
    hash_auditoria: hash_auditoria,
    timestamp: timestamp
  }).then(response => {
    mysql_connection.query(`INSERT INTO libros (\`nombre\`, \`autor\`, \`hash_auditoria\`) VALUES ( '${nombre}', '${autor}', '${hash_auditoria}' );`, (err, response) => {
      if(err) {
        return res.status(500).send('Error MySQL => ' + err);
      }

      res.json({ hash_auditoria: hash_auditoria, timestamp: timestamp });
      return;
    })
  }).catch(err => {
    console.error(err);
  })


})

app.get('/libros', (req, res) => {
  mysql_connection.query(`SELECT * FROM capacitacion_aws.libros;`, (err, response) => {

    if(Array.isArray(response)) {

      async.parallel(response.map(libro => {

        return (cb) => {
          auditorias_libros.get(libro.hash_auditoria, (err, hash_item) => {
            return cb(null, hash_item);
          })
        }

      }), (err , auditoria_items) => {
        // console.log(auditoria_item.map(item => item.attrs));

        let response_formatted = response.map(item => {
          return {
            id             : item.id,
            nombre         : item.nombre,
            autor          : item.autor,
            hash_auditoria : item.hash_auditoria,
            timestamp      : auditoria_items.find(x => x.attrs.hash_auditoria == item.hash_auditoria).attrs.timestamp
          }
        });

        return res.json(response_formatted)
      })

    }

  });
})

mysql_connection.connect(err => {
  if(err) {
    console.error(err);
    return;
  }

  console.log('Conección a MySQL creada');

  dynamo.createTables().then(response => {

    console.log('Conección y replicación de tablas de DynamoDB realizadas');
  
    app.listen(8080, () => {
      console.log('Listo escuchando al puerto 8080');
    })
  }).catch(err => {
    console.error(err);
  })
})



// dynamo.createTables((err, res) => {
//   if(err) {
//     console.error(err);
//     return;
//   }

  // orden_compra.create({
  //   timestamp: 'prueba2'
  // }, (err , response) => {
  //   console.log(response);

    // orden_compra.get('prueba2', (err, responseeee) => {
    //   if(err) {
    //     console.error(err);
    //   }
    //   console.log(responseeee.attrs)
    // })
  // })
// })