const { ApolloServer } = require("apollo-server");
const typeDefs = require("./db/schema");
const resolvers = require("./db/resolvers");

const conectarDB = require("./config/db");

conectarDB();

//servidor
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// arrancar el servidor
server.listen().then(({ url }) => {
  console.log(`Servidor listo en la URL ${url}`);
});
