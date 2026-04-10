import { config } from "dotenv";

import { assertNotProductionEnvironment } from "../lib/env/safety";

config({ path: ".env.local" });
config();

const command = process.argv[2] ?? "database command";

assertNotProductionEnvironment(command);
