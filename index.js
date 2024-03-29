const { ApolloServer } = require("apollo-server");
const typeDefs = require("./db/schema");
const resolvers = require("./db/resolvers");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "variables.env" });

const conectarDB = require("./config/db");

conectarDB();

//servidor
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    //console.log(req.headers["authorization"]);

    console.log(req.headers);

    const token = req.headers["authorization"] || "";
    if (token) {
      try {
        //Verificar si el token es valido
        const usuario = jwt.verify(token.replace('Bearer ', ''), process.env.SECRETA);
        console.log(usuario);
        return {
          usuario,
        };
      } catch (error) {
        console.log("Hubo un error");
        console.log(error);
      }
    }
  },
});

// arrancar el servidor
server.listen({ port : process.env.PORT || 4000}).then(({ url }) => {
  console.log(`Servidor listo en la URL ${url}`);
});
