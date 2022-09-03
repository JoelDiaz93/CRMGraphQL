// Importando modelos
const Usuario = require("../models/Usuario");
const Cliente = require("../models/Cliente");
const Producto = require("../models/Producto");
const Pedido = require("../models/Pedido");

const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "variables.env" });

const crearToken = (usuario, secreta, expiresIn) => {
  const { id, email, nombre, apellido } = usuario;

  return jwt.sign({ id, email, nombre, apellido }, secreta, { expiresIn });
};

//resolvers
const resolvers = {
  Query: {
    obtenerUsuario: async (_, { token }) => {
      const usuarioId = await jwt.verify(token, process.env.SECRETA);
      return usuarioId;
    },
    obtenerProductos: async () => {
      try {
        const productos = await Producto.find({});
        return productos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerProducto: async (_, { id }) => {
      //revisamos si existe elproducto
      const producto = await Producto.findById(id);

      if (!producto) {
        throw new Error("Producto no encontrado");
      }

      return producto;
    },
    obtenerClientes: async () => {
      try {
        const clientes = await Cliente.find({});
        return clientes;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerClientesVendedor: async (_, {}, ctx) => {
      try {
        const clientes = await Cliente.find({
          vendedor: ctx.usuario.id.toString(),
        });
        return clientes;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerCliente: async (_, { id }, ctx) => {
      //Reviasr si existe el cliente
      const cliente = await Cliente.findById(id);

      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }
      //Solo quien lo creo puede verlo
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      return cliente;
    },
  },
  Mutation: {
    nuevoUsuario: async (_, { input }) => {
      const { email, password } = input;

      //Revisando si el usuario ya esta registrado
      const existeUsuario = await Usuario.findOne({ email });
      if (existeUsuario) {
        throw new Error("El usuario ya esta registrado");
      }
      //Hashear password
      const salt = await bcryptjs.genSalt(10);
      input.password = await bcryptjs.hash(password, salt);

      //Guardar en la base de datos
      try {
        const usuario = new Usuario(input);
        usuario.save();
        return usuario;
      } catch (error) {
        console.log(error);
      }
    },
    autenticarUsuario: async (_, { input }) => {
      const { email, password } = input;

      //Verificamos si existe el usuario
      const existeUsuario = await Usuario.findOne({ email });
      if (!existeUsuario) {
        throw new Error("Verifique sus credenciales...");
      }

      //Verificar si es correcto el password
      const passwordCorrecto = await bcryptjs.compare(
        password,
        existeUsuario.password
      );
      if (!passwordCorrecto) {
        throw new Error("Verifique sus credenciales...");
      }

      //Crear token
      return {
        token: crearToken(existeUsuario, process.env.SECRETA, "24h"),
      };
    },
    nuevoProducto: async (_, { input }) => {
      try {
        const nuevoProducto = new Producto(input);

        //guardar en la base de datos
        const resultado = await nuevoProducto.save();

        return resultado;
      } catch (error) {
        console.log(error);
      }
    },
    actualizarProducto: async (_, { id, input }) => {
      //revisamos si existe elproducto
      let producto = await Producto.findById(id);

      if (!producto) {
        throw new Error("Producto no encontrado");
      }

      //Guardar en la base de datos
      producto = await Producto.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });

      return producto;
    },
    eliminarProducto: async (_, { id }) => {
      //revisamos si existe elproducto
      let producto = await Producto.findById(id);

      if (!producto) {
        throw new Error("Producto no encontrado");
      }

      //Eliminar producto
      await Producto.findByIdAndDelete({ _id: id });

      return "Producto Eliminado";
    },
    nuevoCliente: async (_, { input }, ctx) => {
      console.log(ctx);
      const { email } = input;
      //Verificar si el cliente ya esta registrado
      const cliente = await Cliente.findOne({ email });
      if (cliente) {
        throw new Error("Ese cliente ya esta registrado");
      }

      const nuevoCliente = new Cliente(input);
      //asignar el vendedor mediante el context y el objeto usuario
      nuevoCliente.vendedor = ctx.usuario.id;
      //guardarlo en la base de datos
      try {
        const resultado = await nuevoCliente.save();
        return resultado;
      } catch (error) {
        console.log(error);
      }
    },
    actualizarCliente: async (_, { id, input }, ctx) => {
      //Verificar si existe
      let cliente = await Cliente.findById(id);

      if (!cliente) {
        throw new Error("No existe el cliente");
      }

      //Verificar si el vendedor es quien ediat
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      //Guardar cambios al cliente

      cliente = await Cliente.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return cliente;
    },
    eliminarCliente: async (_, { id }, ctx) => {
      //Verificar si existe
      let cliente = await Cliente.findById(id);

      if (!cliente) {
        throw new Error("No existe el cliente");
      }

      //Verificar si el vendedor es quien ediat
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      //Eliminar al cliente

      cliente = await Cliente.findOneAndDelete({ _id: id });
      return "Cliente eliminado";
    },
    nuevoPedido: async (_, { input }, ctx) => {
      const { cliente } = input;

      //Verificar si el cliente existe
      let clienteExiste = await Cliente.findById(cliente);

      if (!clienteExiste) {
        throw new Error("No existe el cliente");
      }

      //Verificar si el cliente es del vendedor
      if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      //Revisar si el stock esta disponible
      for await (const articulo of input.pedido) {
        const { id } = articulo;

        const producto = await Producto.findById(id);
        if (articulo.cantidad > producto.existencia) {
          throw new Error(
            `El articulo: ${producto.nombre} excede la cantidad disponible`
          );
        }else{
          //Restando la cantidad vendida
          producto.existencia = producto.existencia - articulo.cantidad;

          await producto.save();
        }
      }
      //Crear el nuevo pedido
      const nuevoPedido = new Pedido(input);
      
      //Asignar el vendedor
      nuevoPedido.vendedor = ctx.usuario.id;

      //Guardar en la base de datos
      const resultado = await nuevoPedido.save();
      return resultado;
    },
  },
};

module.exports = resolvers;
