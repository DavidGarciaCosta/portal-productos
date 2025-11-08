# Portal de Productos David - Práctica 1

## Decisiones tomadas durante el desarrollo de mi app
En esta práctica he decidido seguir una arquitectura de aplicación con clara separación entre frontend  y backend. 
Organicé el código en modelos, rutas, middleware y frontend porque es necesaria la separación de responsabilidades 
para mejorar la mantenibilidad y comprensión del proyecto y porque tambié se pedía así.

Para la autenticación implementé JWT, me costó un poco ya que no lo conseguía poner ni tampoco ver en google, 
hasta que pude conseguirlo y también pude ver el token con F12 cuando inicio sesión con un usuario o admin. 

Como he visto durante la universidad y como era un requisito elegí MongoDB, 
me resulta bastante fácil su uso y el hecho de hacer los esquemas. 

Para el chat en tiempo real, he utilizado Socket.IO como hemos visto en las anteriores clases, 
y ya que tenía una base hecha en clase la he utilizado en esta práctica y me ha sido muy útil.
Para guardar los mensajes simplemente era crear un esquema para que se guarde en la base de datos.

He de decir que el chat me costó un poco tener en cada localhost distintos usuarios para autenticarse 
y poder hablar con los 2 ya que a pesar de tener la practica y que fuera útil lo quise hacer por mi cuenta, lo logré 
y simplemente era cambiar el localStorage por sessionStorage para guardarlo ahi y que no se reescriba cada vez que 
refresco la página.

Los endpoints para cada cosa son simples y me resulto sencillo ya que eran cosas que ya hice en otro proyecto 
de la universidad, por lo tanto hacer el CRUD para los productos fue sencillo(cabe resaltar que si coges la URL de 
una imágen en Google se añade).

Diseñé la app utilizando CSS y creo que visualmente es atractiva. Opté por un diseño oscuro para reducir la fatiga visual.

Básicamente en las cosas que no lograba hacer bien me ayudaba de la IA y trataba de entenderlo y de que funcionara correctamente.

## Estructura del proyecto
portal-productos/

├── node_modules

├── src/

├── models/

User.js          # Modelo de usuario con autenticación

Product.js       # Modelo de producto con validaciones

Message.js       # Modelo de mensajes de chat

├── routes/

authRoutes.js    # Autenticación y gestión de usuarios

productRoutes.js # CRUD de productos

├── middleware/

authenticateJWT.js # Middleware de autenticación JWT

├── public/

index.html       # Página principal

login.html       # Página de login

register.html    # Página de registro

products.html    # Gestión de productos

chat.html        # Chat en tiempo real

styles.css       # Estilos principales

client.js        # Utilidades del frontend

server.js            # Servidor principal con Socket.IO

├── config.js                # Configuración de la aplicación

├── package.json

├── package-log.json


--------------------------------------------------------------------------------------------------

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![MongoDB](https://img.shields.io/badge/MongoDB-5.0+-green)
![Express](https://img.shields.io/badge/Express-4.18-blue)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-orange)

Aplicación web para la Práctica_1 que integra un sistema completo de portal de productos con autenticación JWT, gestión de productos con roles diferenciados y chat en tiempo real.

## Características

- 🔐 **Autenticación JWT** 
- 🛒 **CRUD completo de productos** 
- 💬 **Chat en tiempo real** c
- 🗄️ **Persistencia en MongoDB** 
- 🎨 **Interfaz moderna** 
- 🔒 **Seguridad robusta** 
  
## Instalación

### Prerrequisitos
- **Node.js** 
- **MongoDB** 
- **npm**

### Pasos de Instalación y Manejo

```bash
# 1. Clonar el repositorio o descargar zip
github -> DavidGarciaCosta
Entrar -> portal-productos
git clone [URL_DEL_REPOSITORIO] o descargar zip

# 2.Instalar dependencias
npm install

# 3. Ejecutar la aplicación
Al clonar o descargar el zip tienes que hacer cd Practica1/ cd src (hasta llegar a /src) y ahi hay que poner nmp server.js o npm start.


# 4. Abrir en el navegador y manejo
# http://localhost:3000
Ahi podrás registrarte como usuario o como admin, una vez registrado podrás iniciar sesión.
Entrarás al portal de productos o al chat, con admin tendras privelegios(CRUD) en productos y
con usuario normal solo podras verlo, los 2 podrán hablar en el chat y además se guardarán los mensajes.

NOTA: Si da algún error, instalar node, mongoose, cors, path, ( npm install express mongoose cors path ) aunque con el npm install ya debería dejar.
