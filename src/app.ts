import express, {
	Application,
	json,
	Request,
	Response,
	NextFunction
} from "express";
import cors from "cors";
import { config } from "dotenv";
import * as https from "https";
import * as fs from "fs";

import { Content } from "./Content";
import { User } from "./User";

config();

const app: Application = express();

app.use(cors());
app.use(json());

app.use((_req: Request, res: Response, next: NextFunction) => {
	if (
		_req.connection.remoteAddress === "::ffff:45.33.48.224" ||
		_req.connection.remoteAddress === "::ffff:104.152.255.78"
	) {
		next();
	} else {
		res.status(401).json({ error: { message: "Invalid IP Address" } });
	}
});

app.get("/", (_req: Request, res: Response) => {
	res.json({ ok: true });
});

app.get("/similar/:contentID", async (_req: Request, res: Response) => {
	const contentID: number = Number(_req.params.contentID);
	if (isNaN(contentID)) {
		res.status(500);
		res.json({ error: { message: "ID must be a number" } });
		return;
	}
	const c: Content = new Content({ id: contentID });
	const similar = await c.getSimilarContent();
	res.json(similar);
});

app.get("/recommended/:userID/:type", async (_req: Request, res: Response) => {
	const userID: number = Number(_req.params.userID);
	const type: string = String(_req.params.type);
	if (isNaN(userID)) {
		res.status(500);
		res.json({ error: { message: "ID must be a number" } });
		return;
	}
	const u: User = new User({ id: userID });
	const recommendations = await u.getRecommendedContent({ type: type });
	res.json(recommendations);
});

const PORT: string | number = process.env.PORT || 5000;
const ENV: string = process.env.NODE_ENV || "development";
try {
	const ssl_config = {
		key: fs.readFileSync(process.env.SSL_PRIVATE_KEY || "", "utf8"),
		cert: fs.readFileSync(process.env.SSL_CERT || "", "utf8"),
		ca: fs.readFileSync(process.env.SSL_CA || "", "utf8")
	};
	https.createServer(ssl_config, app).listen(PORT, () => {
		console.log(`Running HTTPS in ${ENV} mode on port ${PORT}`);
	});
} catch (e) {
	app.listen(PORT, () =>
		console.log(`Running HTTP in ${ENV} mode on port ${PORT}`)
	);
}
