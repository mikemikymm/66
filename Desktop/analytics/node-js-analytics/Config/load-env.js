// This file is responsible for loading environment variables from AWS Secrets Manager.
// It sets the AWS_PROFILE environment variable and fetches the secrets.

const { execSync } = require("child_process");

const AWS_SECRET_NAME = "internAnalyticsDotEnv";
const BASTION_HOST_SECRET_NAME = "prod/bastion-ec2-private-key";
const AWS_REGION = "ap-southeast-2";

function fetchSecret(secretName) {
    const command = `aws secretsmanager get-secret-value --secret-id ${secretName} --region ${AWS_REGION} --query SecretString --output text`;
    return execSync(command, {
        encoding: "utf8",
        env: process.env
    }).trim();
}

function parseDotenvAndSetEnv(dotenvString) {
    dotenvString.split("\n").forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("#")) {
            const [key, ...valueParts] = trimmedLine.split("=");
            const keyTrimmed = key?.trim();
            if (keyTrimmed && valueParts.length > 0) {
                const value = valueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
                process.env[keyTrimmed] = value;
            }
        }
    });
}

function loadEnvFromAWS() {
    try {
        console.log("🔒 Fetching secrets from AWS Secrets Manager...");

        const secretJSON = fetchSecret(AWS_SECRET_NAME);
        parseDotenvAndSetEnv(secretJSON);

        const bastionKey = fetchSecret(BASTION_HOST_SECRET_NAME);
        process.env.BASTION_PRIVATE_KEY = bastionKey;

        console.log("✅ All secrets loaded successfully.");
    } catch (err) {
        console.error("❌ Error loading secrets from AWS:", err.message);
        if (err.stderr) console.error("   AWS CLI stderr:", err.stderr.toString());
        process.exit(1);
    }
}

// Immediately load the environment variables when this module is required/run.
loadEnvFromAWS();

// --- END OF FILE config/load-env.js ---