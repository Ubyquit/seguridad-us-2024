const express = require('express');
const mysql = require('mysql');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const bodyParser = require('body-parser');

const app = express();
const puerto = 3000;

// Configuración de la conexión a MySQL
const conexion = mysql.createConnection({
	host:"mysql-opset.alwaysdata.net",
	user:"opset_us",
	password:"Holamundo",
	database:"opset_us"
});

// Conexión a MySQL
conexion.connect((err) => {
  if (err) {
    console.error('Error de conexión:', err);
    return;
  }
  console.log('Conexión a MySQL establecida.');
});

// Middleware para procesar JSON y formularios
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Ruta para generar código QR y mostrar formulario de registro
app.get('/', (req, res) => {
  res.send(`
    <h1>Registro de Usuario</h1>
    <form action="/" method="post">
      <label for="username">Nombre de Usuario:</label><br>
      <input type="text" id="username" name="username" required><br><br>
      <input type="submit" value="Registrar">
    </form>
  `);
});

// Ruta para manejar el registro de usuario
app.post('/', (req, res) => {
  const { username } = req.body;

  // Verificar si el usuario ya existe en la base de datos
  const consulta = `SELECT * FROM users WHERE username = '${username}'`;
  conexion.query(consulta, (error, resultados) => {
    if (error) {
      console.error('Error al consultar la base de datos:', error);
      res.send("Error al verificar la autenticación.");
      return;
    }

    if (resultados.length > 0) {
      // Si el usuario ya existe, mostrar formulario de autenticación
      res.send(`
        <h1>Autenticación de Usuario</h1>
        <form action="/verificar" method="post">
          <label for="token">Ingresa el código de Google Authenticator:</label><br>
          <input type="text" id="token" name="token" required><br><br>
          <input type="hidden" id="username" name="username" value="${username}">
          <input type="submit" value="Verificar">
        </form>
      `);
    } else {
      // Si el usuario no existe, generar clave secreta y código QR
      const secret = speakeasy.generateSecret({ length: 20 });
      qrcode.toDataURL(secret.otpauth_url, (err, imageUrl) => {
        if (err) {
          console.error('Error al generar el código QR:', err);
          res.send('Error al generar el código QR.');
          return;
        }

        // Insertar nuevo usuario y su clave secreta en la base de datos
        const nuevoUsuario = { username: username, secret: secret.base32 };
        conexion.query('INSERT INTO users SET ?', nuevoUsuario, (error) => {
          if (error) {
            console.error('Error al insertar usuario en la base de datos:', error);
            res.send('Error al insertar usuario en la base de datos.');
            return;
          }

          // Mostrar página con código QR y formulario de autenticación
          res.send(`
            <h1>Escanea este código QR con Google Authenticator</h1>
            <img src="${imageUrl}" alt="QR Code"><br><br>
            <form action="/verificar" method="post">
              <label for="token">Ingresa el código de Google Authenticator:</label><br>
              <input type="text" id="token" name="token" required><br><br>
              <input type="hidden" id="username" name="username" value="${username}">
              <input type="submit" value="Verificar">
            </form>
          `);
        });
      });
    }
  });
});

//SEGURIDAD POR OSCURIDAD

// Ruta para verificar el código TOTP
app.post('/verificar', (req, res) => {
  const { token, username } = req.body;

  // Consultar la clave secreta del usuario desde MySQL
  const consulta = `SELECT secret FROM users WHERE username = '${username}'`;
  conexion.query(consulta, (error, resultados) => {
    if (error) {
      console.error('Error al consultar la base de datos:', error);
      res.send("Error al verificar la autenticación.");
      return;
    }

    if (resultados.length > 0) {
      const secret = resultados[0].secret;
      const esValido = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
      });

      if (esValido) {
        res.send("Código TOTP válido. Autenticación exitosa.");
      } else {
        res.send("Código TOTP inválido. Autenticación fallida.");
      }
    } else {
      res.send("Usuario no encontrado.");
    }
  });
});

// Iniciar servidor
app.listen(puerto, () => {
  console.log(`Servidor en ejecución en http://localhost:${puerto}`);
});
