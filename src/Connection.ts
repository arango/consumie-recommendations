import * as mysql from "mysql2";
import { config } from "dotenv";

config();

type ConnectionObject = {
	conn?: any;
};

let connection: ConnectionObject = {};

let connection_object = {
	host: process.env.DB_HOST || "",
	user: process.env.DB_USER || "",
	password: process.env.DB_PASS || "",
	database: process.env.DB_NAME || "",
	ssl: process.env.DB_SSL === "1" ? "Amazon RDS" : undefined,
	connectionLimit: 10,
	multipleStatements: true
};

console.log("Init MYSQL Pool");
const pool = mysql.createPool(connection_object);
connection.conn = pool.promise();
console.log("MYSQL Pool initialized");

export const Connection = () => {
	return connection;
};
