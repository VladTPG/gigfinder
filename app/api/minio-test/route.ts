import { NextResponse } from "next/server";
import * as Minio from "minio";

interface ConnectionResult {
  success: boolean;
  error: string | null;
  bucketsList?: string[];
  rawError?: any;
}

interface BucketResult {
  success: boolean;
  error: string | null;
  exists?: boolean;
}

interface BucketCreateResult {
  success: boolean;
  error: string | null;
  attempted: boolean;
}

interface EnvCheckResult {
  missing: string[];
  values: Record<string, string>;
}

interface DiagnosticResults {
  config: any;
  envCheck: EnvCheckResult;
  connection: ConnectionResult;
  bucketExists: BucketResult;
  bucketCreate: BucketCreateResult;
  troubleshooting: string[];
}

export async function GET() {
  const results: DiagnosticResults = {
    config: {},
    envCheck: { missing: [], values: {} },
    connection: { success: false, error: null },
    bucketExists: { success: false, error: null },
    bucketCreate: { success: false, error: null, attempted: false },
    troubleshooting: [],
  };

  // Check environment variables
  const requiredEnvVars = [
    "MINIO_ENDPOINT",
    "MINIO_PORT",
    "MINIO_ACCESS_KEY",
    "MINIO_SECRET_KEY",
    "MINIO_BUCKET",
  ];
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      results.envCheck.missing.push(varName);
      results.troubleshooting.push(`Missing environment variable: ${varName}`);
    } else {
      // Only show partial values for sensitive information
      if (varName.includes("KEY")) {
        const value = process.env[varName] || "";
        results.envCheck.values[varName] =
          value.length > 4
            ? value.substring(0, 2) + "..." + value.substring(value.length - 2)
            : "(too short)";
      } else {
        results.envCheck.values[varName] = process.env[varName] || "";
      }
    }
  });

  if (results.envCheck.missing.length > 0) {
    results.troubleshooting.push(
      "Create or update your .env.local file with the missing variables"
    );
  }

  try {
    // Get configuration (excluding sensitive information)
    const config = {
      endPoint: process.env.MINIO_ENDPOINT || "localhost",
      port: parseInt(process.env.MINIO_PORT || "9000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      // Not logging credentials
      bucket: process.env.MINIO_BUCKET || "gigfinder",
    };

    results.config = config;

    // Check if Minio endpoint looks valid
    if (!config.endPoint || config.endPoint === "localhost") {
      results.troubleshooting.push(
        "Using localhost as Minio endpoint. If your Minio server is on another machine, update MINIO_ENDPOINT."
      );
    }

    // Initialize Minio client
    const minioClient = new Minio.Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY || "",
      secretKey: process.env.MINIO_SECRET_KEY || "",
    });

    // Test connection with a simple listBuckets operation
    try {
      const buckets = await minioClient.listBuckets();
      results.connection.success = true;
      results.connection.bucketsList = buckets.map((b) => b.name);
    } catch (err) {
      results.connection.success = false;

      // Store the raw error for debugging
      results.connection.rawError = err;

      // Capture the error message
      results.connection.error =
        err instanceof Error ? err.message : String(err);

      // Add troubleshooting advice based on the error
      if (err instanceof Error) {
        if (err.message.includes("connect")) {
          results.troubleshooting.push(
            "Connection refused. Check if Minio server is running and accessible."
          );
        } else if (err.message.includes("certificate")) {
          results.troubleshooting.push(
            "SSL/TLS error. Try setting MINIO_USE_SSL=false if using an unsecured connection."
          );
        } else if (err.message.includes("credentials")) {
          results.troubleshooting.push(
            "Authentication failed. Check your MINIO_ACCESS_KEY and MINIO_SECRET_KEY values."
          );
        }
      } else {
        results.troubleshooting.push(
          "Unknown connection error. Check if Minio server is running."
        );
      }

      if (results.connection.error === "") {
        results.connection.error =
          "Empty error message. This usually means the server was unreachable.";
        results.troubleshooting.push(
          "Connection error with empty message. This typically means the Minio server is not running or is not accessible."
        );
      }
    }

    // Check if our target bucket exists
    if (results.connection.success) {
      try {
        const exists = await minioClient.bucketExists(config.bucket);
        results.bucketExists.success = true;
        results.bucketExists.exists = exists;

        if (!exists) {
          results.troubleshooting.push(
            `Bucket "${config.bucket}" does not exist. Will attempt to create it.`
          );
        }
      } catch (err) {
        results.bucketExists.error =
          err instanceof Error ? err.message : String(err);
        results.troubleshooting.push(
          `Failed to check if bucket "${config.bucket}" exists. Check permissions.`
        );
      }

      // Try to create the bucket if it doesn't exist
      if (results.bucketExists.exists === false) {
        results.bucketCreate.attempted = true;
        try {
          await minioClient.makeBucket(config.bucket, "us-east-1");
          results.bucketCreate.success = true;
          results.troubleshooting.push(
            `Successfully created bucket "${config.bucket}".`
          );
        } catch (err) {
          results.bucketCreate.error =
            err instanceof Error ? err.message : String(err);
          results.troubleshooting.push(
            `Failed to create bucket "${config.bucket}". Check if you have sufficient permissions.`
          );
        }
      }
    } else {
      results.troubleshooting.push(
        "Skipping bucket operations because connection failed."
      );
    }

    // Provide a summary of troubleshooting steps
    if (!results.connection.success) {
      results.troubleshooting.push("1. Verify your Minio server is running");
      results.troubleshooting.push("2. Check if your credentials are correct");
      results.troubleshooting.push(
        "3. Make sure the network connection is not blocked by firewalls"
      );
      results.troubleshooting.push(
        "4. Try using the Minio browser console to verify server functionality"
      );
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Diagnostic test failed",
        details: error instanceof Error ? error.message : String(error),
        results,
      },
      { status: 500 }
    );
  }
}
