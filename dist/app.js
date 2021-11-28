"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = require("dotenv");
const fs = __importStar(require("fs"));
(0, dotenv_1.config)();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use((0, express_1.json)());
const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || "development";
app.get("/", (_req, res) => {
    return res.send("API Running!");
});
try {
    const ssl_config = {
        key: fs.readFileSync(process.env.SSL_PRIVATE_KEY, "utf8"),
        cert: fs.readFileSync(process.env.SSL_CERT, "utf8"),
        ca: fs.readFileSync(process.env.SSL_CA, "utf8")
    };
    console.log(ssl_config);
    //	https.createServer(ssl_config, app).listen(config.post, () => {
    //		console.log(`HTTPS Server on ${config.port}`);
    //	});
}
catch (e) {
    console.log(e);
}
app.listen(PORT, () => console.log(`Running in ${ENV} mode on port ${PORT}`));
