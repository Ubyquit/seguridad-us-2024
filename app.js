const express = require("express");
const mysql = require("mysql");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const bodyParser = require("body-parser");

const app = express();
const puerto = 3000;

// Configurar conexion a la base de datos

const conexion = mysql.createConnection({
	host:"mysql-opset.alwaysdata.net",
	user:"opset_us",
	password:"Holamundo",
	database:"opset_us"
});

// Conexion a MySql

conexion.connect((err)=>{
    if(err){
        console.error('Error de conexión', err);
        return;
    }
    console.log('Conexión exitosa');
})

// Middleware para procesar JSON y formularios 
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json())

// Ruta para generar el codigo QR y mostrar el formulario
app.get('/', (req,res) => {
    res.send(`
    <h1>Registro usuario</h1>
    <form action="/" method="post">
        <label for="username">Nombre de usuario:</label><br>
        <input type="text" id="username" name="username" required><br><br>
        <input type="submit" value="Registrar">
    </form>
    `);
});

// Ruta para el manejo del registro

app.post('/',(req,res)=>{
    const {username} = req.body;

    // Generar clave secreta para el usuario
    const secret = speakeasy.generateSecret({length:20});

    qrcode.toDataURL(secret.otpauth_url,(err,imageUrl)=>{
        if(err){
            console.error('Error al generar codigo QR', err);
            res.send('Error al generar el codigo QR');
            return;
        }

        const usuario = {username: username, secret:secret.base32};
        conexion.query('INSERT INTO users SET ?', usuario, (error,resultado) => {
            if(error){
                console.error('Error al insertar el usuario', error);
                return;
            }

            res.send(`
                <h1>Escanea el codigo QR con Google Authenticator</h1>
                <img src="${imageUrl}" alt="QR Code"><br><br>
                <form action="/verificar" method="post">
                    <label for="token">Ingresa el codigo generado por Google Authenticator</label>
                    <input type="text" id="token" name="token" required><br><br>
                    <input type="hidden" id="username" name="username" value="${username}">
                    <input type="submit" value="Verificar">
                </form>
            `);
        });
    });
});

app.post('/verificar',(req,res)=>{
    const {token,username} = req.body;

    // Consultar a la base datos
    const  consulta = `SELECT secret FROM users WHERE username = '${username}'`;

    conexion.query(consulta, (error, resultado, campos)=>{
        if(error){
            console.error('Error al consultar la base de datos', error);
            res.send("Error al verificar la autenticación");
            return;
        }

        if(resultado.length > 0){
            const secret = resultado[0].secret;
            const esValido = speakeasy.totp.verify({
                secret:secret,
                encoding:'base32',
                token:token,
            });

            if(esValido){
                res.send("La autenticacion por TOTP es exitosa");
            }else{
                res.send("La autenticacion por TOTP fue fallida");
            }
        }else{
            res.send("El usuario no fue encontrado");
        }
    });
});


app.listen(puerto,()=>{
    console.log(`Servidor en ejecución en http://localhost:${puerto}`);
})