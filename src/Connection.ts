import * as mysql from "mysql2";
import { config } from "dotenv";

config();

let conn: any;

let mysql_config: MYSQLconfig = {
	host: process.env.DB_HOST || "",
	user: process.env.DB_USER || "",
	password: process.env.DB_PASS || "",
	database: process.env.DB_NAME || "",
	ssl: process.env.DB_SSL === "1" ? "Amazon RDS" : undefined,
	connectionLimit: 10,
	multipleStatements: true
};

console.log("Init MYSQL Pool");
const pool = mysql.createPool(mysql_config);
pool.getConnection(function (err, c) {
	if (err) {
		console.log(err);
		return;
	}
	conn = pool.promise();
	console.log("MYSQL Pool initialized");
});


export const CallProcedure = async({proc, args} : {proc: string, args: any[]}) => {
	let data:any[] = [];
	try {
		[data] = await conn.query(`CALL ${proc} (${args.map((f) => {
			return "?"
		}).join(", ")})`, args);
		if (data.length > 0) {
			return data[0];
		} else {
			return [];
		}
	} catch (e) {
		console.log(e);
		return [];
	}
}


type MYSQLconfig = {
	host: string;
	user: string;
	password: string;
	database: string;
	ssl: string | undefined;
	connectionLimit: number;
	multipleStatements: boolean;
}
